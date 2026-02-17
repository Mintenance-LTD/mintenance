#!/usr/bin/env python3
"""
Evaluate fine-tuned Qwen2.5-VL on held-out validation data.

Sends each sample through the model's OpenAI-compatible endpoint and
compares against teacher (GPT-4o) ground truth, producing metrics JSON.

Usage:
    python evaluate_vlm.py \
        --data validation.jsonl \
        --endpoint http://localhost:8000/v1/chat/completions \
        --output eval_results.json
"""

import argparse
import json
import os
import sys
import time
from collections import defaultdict

import requests


def load_jsonl(path: str) -> list[dict]:
    rows = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def call_model(endpoint: str, messages: list[dict], api_key: str = "") -> dict | None:
    """Call the VLM endpoint and return parsed JSON response."""
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    payload = {
        "model": "mint-ai-vlm",
        "messages": messages[:2],  # system + user only
        "max_tokens": 2000,
        "temperature": 0.1,
        "response_format": {"type": "json_object"},
    }

    try:
        resp = requests.post(endpoint, json=payload, headers=headers, timeout=120)
        resp.raise_for_status()
        data = resp.json()
        content = data.get("choices", [{}])[0].get("message", {}).get("content", "{}")
        return json.loads(content)
    except Exception as e:
        print(f"  Error: {e}")
        return None


def compare_assessments(student: dict, teacher: dict) -> dict:
    """Compare student vs teacher assessment fields."""
    teacher_damage = teacher.get("damageAssessment", {})
    student_damage = student.get("damageAssessment", {})

    damage_type_match = (
        student_damage.get("damageType", "").lower() == teacher_damage.get("damageType", "").lower()
    )
    severity_match = student_damage.get("severity") == teacher_damage.get("severity")

    teacher_urgency = teacher.get("urgency", {}).get("urgency", "")
    student_urgency = student.get("urgency", {}).get("urgency", "")
    urgency_match = student_urgency == teacher_urgency

    # Safety recall: fraction of teacher hazards detected by student
    teacher_hazards = set()
    for h in teacher.get("safetyHazards", {}).get("hazards", []):
        if isinstance(h, dict):
            teacher_hazards.add(h.get("type", "").lower())
        elif isinstance(h, str):
            teacher_hazards.add(h.lower())

    student_hazards = set()
    for h in student.get("safetyHazards", {}).get("hazards", []):
        if isinstance(h, dict):
            student_hazards.add(h.get("type", "").lower())
        elif isinstance(h, str):
            student_hazards.add(h.lower())

    safety_recall = 1.0
    if teacher_hazards:
        caught = len(teacher_hazards & student_hazards)
        safety_recall = caught / len(teacher_hazards)

    return {
        "damage_type_match": damage_type_match,
        "severity_match": severity_match,
        "urgency_match": urgency_match,
        "safety_recall": safety_recall,
        "teacher_damage_type": teacher_damage.get("damageType", "unknown"),
    }


def evaluate(args: argparse.Namespace) -> dict:
    """Run evaluation on all samples."""
    rows = load_jsonl(args.data)
    print(f"Evaluating {len(rows)} samples against {args.endpoint}")

    results = []
    category_stats = defaultdict(lambda: {
        "total": 0, "damage_match": 0, "severity_match": 0,
        "urgency_match": 0, "safety_recall_sum": 0.0,
    })

    for i, row in enumerate(rows):
        messages = row.get("messages", [])
        if len(messages) < 3:
            continue

        # Teacher response is the ground truth (assistant message)
        teacher_response = json.loads(messages[2]["content"]) if isinstance(messages[2]["content"], str) else messages[2]["content"]

        print(f"  [{i + 1}/{len(rows)}] ", end="", flush=True)
        start = time.time()
        student_response = call_model(args.endpoint, messages, args.api_key)
        latency = time.time() - start

        if student_response is None:
            print("FAILED")
            results.append({"index": i, "success": False, "latency_ms": round(latency * 1000)})
            continue

        comparison = compare_assessments(student_response, teacher_response)
        category = teacher_response.get("damageAssessment", {}).get("damageType", "unknown").lower()

        # Update category stats
        cat = category_stats[category]
        cat["total"] += 1
        if comparison["damage_type_match"]:
            cat["damage_match"] += 1
        if comparison["severity_match"]:
            cat["severity_match"] += 1
        if comparison["urgency_match"]:
            cat["urgency_match"] += 1
        cat["safety_recall_sum"] += comparison["safety_recall"]

        status = "OK" if comparison["damage_type_match"] and comparison["safety_recall"] >= 0.95 else "MISS"
        print(f"{status} ({latency:.1f}s) type={comparison['damage_type_match']} sev={comparison['severity_match']} safety={comparison['safety_recall']:.2f}")

        results.append({
            "index": i,
            "success": True,
            "latency_ms": round(latency * 1000),
            **comparison,
        })

    # Aggregate metrics
    successful = [r for r in results if r.get("success")]
    total = len(successful)

    overall = {
        "total_samples": len(rows),
        "successful_calls": total,
        "failed_calls": len(results) - total,
    }

    if total > 0:
        overall["accuracy"] = sum(1 for r in successful if r["damage_type_match"]) / total
        overall["severity_accuracy"] = sum(1 for r in successful if r["severity_match"]) / total
        overall["urgency_accuracy"] = sum(1 for r in successful if r["urgency_match"]) / total
        overall["mean_safety_recall"] = sum(r["safety_recall"] for r in successful) / total
        overall["avg_latency_ms"] = sum(r["latency_ms"] for r in successful) / total

    # Per-category metrics
    per_category = {}
    for cat, stats in category_stats.items():
        n = stats["total"]
        if n == 0:
            continue
        per_category[cat] = {
            "total": n,
            "accuracy": stats["damage_match"] / n,
            "severity_accuracy": stats["severity_match"] / n,
            "urgency_accuracy": stats["urgency_match"] / n,
            "mean_safety_recall": stats["safety_recall_sum"] / n,
        }

    output = {
        "overall": overall,
        "per_category": per_category,
        "endpoint": args.endpoint,
        "data_file": args.data,
    }

    # Save results
    with open(args.output, "w") as f:
        json.dump(output, f, indent=2)
    print(f"\nResults saved to {args.output}")

    # Summary
    print(f"\n{'='*50}")
    print(f"Accuracy:       {overall.get('accuracy', 0):.1%}")
    print(f"Severity:       {overall.get('severity_accuracy', 0):.1%}")
    print(f"Urgency:        {overall.get('urgency_accuracy', 0):.1%}")
    print(f"Safety Recall:  {overall.get('mean_safety_recall', 0):.1%}")
    print(f"Avg Latency:    {overall.get('avg_latency_ms', 0):.0f}ms")
    print(f"{'='*50}")

    return output


def main():
    parser = argparse.ArgumentParser(description="Evaluate fine-tuned VLM")
    parser.add_argument("--data", required=True, help="Validation JSONL file")
    parser.add_argument("--endpoint", default="http://localhost:8000/v1/chat/completions", help="VLM endpoint URL")
    parser.add_argument("--api-key", default="", help="API key for endpoint")
    parser.add_argument("--output", default="eval_results.json", help="Output metrics JSON path")
    args = parser.parse_args()

    if not os.path.exists(args.data):
        print(f"Error: data file not found: {args.data}", file=sys.stderr)
        sys.exit(1)

    evaluate(args)


if __name__ == "__main__":
    main()
