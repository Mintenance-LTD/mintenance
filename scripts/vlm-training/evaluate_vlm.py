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

Per-class release gates (v3): pass --taxonomy taxonomy_v3.json to normalise
damage-type labels onto the v3 surveyor taxonomy and score each class against
its release gate (minAccuracy / minSafetyRecall at minEvalSamples). Add
--enforce-gates to exit non-zero when any gated class fails — wire this into
CI so a retrain can't ship on aggregate accuracy alone.

    python evaluate_vlm.py \
        --data validation.jsonl \
        --endpoint https://.../v1/chat/completions \
        --taxonomy apps/web/lib/services/building-surveyor/taxonomy/taxonomy_v3.json \
        --enforce-gates

The canonical taxonomy lives in the web app (it is injected into the live
assessment prompt from there); this script only ever reads it by path.
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


def load_taxonomy(path: str) -> dict:
    """Load taxonomy_v3.json and build an alias -> class-id lookup."""
    with open(path, "r", encoding="utf-8") as f:
        taxonomy = json.load(f)

    alias_map: dict[str, str] = {}
    for cls in taxonomy.get("classes", []):
        class_id = cls["id"]
        alias_map[class_id.lower()] = class_id
        alias_map[cls.get("label", "").lower()] = class_id
        for alias in cls.get("aliases", []):
            alias_map[alias.lower()] = class_id

    taxonomy["_alias_map"] = alias_map
    return taxonomy


def normalize_category(raw: str, taxonomy: dict | None) -> str:
    """Map a free-text damageType onto a taxonomy class id (or pass through)."""
    label = (raw or "unknown").strip().lower()
    if not taxonomy:
        return label
    alias_map = taxonomy["_alias_map"]
    if label in alias_map:
        return alias_map[label]
    # Tolerate underscore/space variants before giving up
    return alias_map.get(label.replace("_", " "), label)


def evaluate_gates(per_category: dict, taxonomy: dict) -> dict:
    """Score each taxonomy class against its release gate.

    Verdicts: PASS, FAIL, INSUFFICIENT_SAMPLES (n < minEvalSamples — never
    treated as a pass; an untested class is an unreleased class), NO_DATA.
    """
    default_gates = taxonomy.get("defaultGates", {})
    safety_gates = taxonomy.get("safetyCriticalGates", default_gates)

    gate_results = {}
    for cls in taxonomy.get("classes", []):
        class_id = cls["id"]
        gates = cls.get(
            "gates", safety_gates if cls.get("safetyCritical") else default_gates
        )
        stats = per_category.get(class_id)

        if not stats:
            verdict = "NO_DATA"
            detail = "no eval samples mapped to this class"
        elif stats["total"] < gates.get("minEvalSamples", 25):
            verdict = "INSUFFICIENT_SAMPLES"
            detail = f"{stats['total']} < {gates.get('minEvalSamples', 25)} samples"
        else:
            acc_ok = stats["accuracy"] >= gates.get("minAccuracy", 0.75)
            safety_ok = stats["mean_safety_recall"] >= gates.get("minSafetyRecall", 0.95)
            verdict = "PASS" if (acc_ok and safety_ok) else "FAIL"
            detail = (
                f"accuracy {stats['accuracy']:.1%} vs {gates.get('minAccuracy', 0.75):.0%}, "
                f"safety {stats['mean_safety_recall']:.1%} vs {gates.get('minSafetyRecall', 0.95):.0%}"
            )

        gate_results[class_id] = {
            "verdict": verdict,
            "detail": detail,
            "safety_critical": bool(cls.get("safetyCritical")),
            "gates": gates,
            "samples": stats["total"] if stats else 0,
        }

    return gate_results


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
    taxonomy = load_taxonomy(args.taxonomy) if args.taxonomy else None
    if taxonomy:
        print(f"Taxonomy: {args.taxonomy} (version {taxonomy.get('version', '?')}, "
              f"{len(taxonomy.get('classes', []))} classes)")
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
        category = normalize_category(
            teacher_response.get("damageAssessment", {}).get("damageType", "unknown"),
            taxonomy,
        )

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

    # Per-class release gates (taxonomy mode)
    if taxonomy:
        gate_results = evaluate_gates(per_category, taxonomy)
        output["gates"] = gate_results
        output["taxonomy_version"] = taxonomy.get("version")

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

    if taxonomy:
        print("\nPer-class release gates:")
        print(f"{'class':<28} {'verdict':<22} detail")
        for class_id, gate in sorted(
            output["gates"].items(),
            key=lambda kv: (kv[1]["verdict"] != "FAIL", kv[0]),
        ):
            flag = " [SAFETY-CRITICAL]" if gate["safety_critical"] else ""
            print(f"{class_id:<28} {gate['verdict']:<22} {gate['detail']}{flag}")
        failed = [c for c, g in output["gates"].items() if g["verdict"] == "FAIL"]
        untested = [
            c for c, g in output["gates"].items()
            if g["verdict"] in ("NO_DATA", "INSUFFICIENT_SAMPLES")
        ]
        print(f"\nGates: {len(failed)} FAIL, {len(untested)} untested "
              f"(untested classes are NOT releasable)")

    return output


def main():
    parser = argparse.ArgumentParser(description="Evaluate fine-tuned VLM")
    parser.add_argument("--data", required=True, help="Validation JSONL file")
    parser.add_argument("--endpoint", default="http://localhost:8000/v1/chat/completions", help="VLM endpoint URL")
    parser.add_argument("--api-key", default="", help="API key for endpoint")
    parser.add_argument("--output", default="eval_results.json", help="Output metrics JSON path")
    parser.add_argument(
        "--taxonomy",
        default="",
        help="Path to taxonomy_v3.json — enables label normalisation + per-class release gates",
    )
    parser.add_argument(
        "--enforce-gates",
        action="store_true",
        help="Exit 1 if any per-class gate FAILs (requires --taxonomy). For CI.",
    )
    args = parser.parse_args()

    if not os.path.exists(args.data):
        print(f"Error: data file not found: {args.data}", file=sys.stderr)
        sys.exit(1)
    if args.enforce_gates and not args.taxonomy:
        print("Error: --enforce-gates requires --taxonomy", file=sys.stderr)
        sys.exit(1)
    if args.taxonomy and not os.path.exists(args.taxonomy):
        print(f"Error: taxonomy file not found: {args.taxonomy}", file=sys.stderr)
        sys.exit(1)

    output = evaluate(args)

    if args.enforce_gates:
        failed = [
            c for c, g in output.get("gates", {}).items() if g["verdict"] == "FAIL"
        ]
        if failed:
            print(f"\nGate enforcement: FAILED ({', '.join(sorted(failed))})", file=sys.stderr)
            sys.exit(1)
        print("\nGate enforcement: all measured gates pass")


if __name__ == "__main__":
    main()
