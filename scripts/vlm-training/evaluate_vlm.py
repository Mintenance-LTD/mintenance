#!/usr/bin/env python3
"""
Evaluate fine-tuned Qwen2.5-VL on held-out validation data.

Sends each sample through the model's OpenAI-compatible endpoint and
compares against reference labels, producing metrics JSON. Teacher labels
measure teacher agreement, not model accuracy against independently reviewed evidence.

Usage:
    python evaluate_vlm.py \
        --data validation.jsonl \
        --endpoint http://localhost:8000/v1/chat/completions \
        --output eval_results.json

Per-class release gates (v3): pass --taxonomy taxonomy_v3.json to normalise
damage-type labels onto the v3 surveyor taxonomy and score each class against
its release gate (minAccuracy / minSafetyRecall at minEvalSamples). Add
--enforce-gates to exit non-zero when any gated class fails â€” wire this into
CI so a retrain can't ship on aggregate accuracy alone.

    python evaluate_vlm.py \
        --data validation.jsonl \
        --endpoint https://.../v1/chat/completions \
        --taxonomy apps/web/lib/services/building-surveyor/taxonomy/taxonomy_v3.json \
        --reference-kind human-reviewed --enforce-gates

The canonical taxonomy lives in the web app (it is injected into the live
assessment prompt from there); this script only ever reads it by path.
"""

import argparse
import hashlib
import json
import os
import sys
import time
from collections import Counter, defaultdict


def parse_jsonl(data: bytes) -> list[tuple[int, object]]:
    rows = []
    for line_number, line in enumerate(data.decode("utf-8-sig").splitlines(), start=1):
        if line.strip():
            try:
                rows.append((line_number, json.loads(line)))
            except json.JSONDecodeError:
                rows.append((line_number, None))
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
    label = raw.strip().lower() if isinstance(raw, str) else ""
    label = label or "unknown"
    if not taxonomy:
        return label
    alias_map = taxonomy["_alias_map"]
    if label in alias_map:
        return alias_map[label]
    # Tolerate underscore/space variants before giving up
    return alias_map.get(label.replace("_", " "), label)


def evaluate_gates(per_category: dict, taxonomy: dict) -> dict:
    """Score each taxonomy class against its release gate.

    Verdicts: PASS, FAIL, INSUFFICIENT_SAMPLES (n < minEvalSamples â€” never
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

        min_examples = gates.get("minEvalSamples", 25)
        min_acc = gates.get("minAccuracy", 0.75)
        min_safety = gates.get("minSafetyRecall", 0.95)
        # A safety-critical class needs its own positive evidence. Clean
        # images cannot fill that quota, even if all predictions were correct.
        min_positive = gates.get("minHazardSamples", min_examples if cls.get("safetyCritical") else 0)
        if not stats or not stats["total"]:
            verdict, detail = "NO_DATA", "no reference samples mapped to this class"
        elif stats["total"] < min_examples:
            verdict, detail = "INSUFFICIENT_SAMPLES", f"{stats['total']} < {min_examples} samples"
        elif stats["hazard_positive_samples"] < min_positive:
            verdict = "INSUFFICIENT_SAFETY_SAMPLES"
            detail = f"{stats['hazard_positive_samples']} < {min_positive} hazard-positive samples"
        else:
            recall = stats["mean_safety_recall"]
            safety_ok = recall is None or recall >= min_safety
            verdict = "PASS" if stats["accuracy"] >= min_acc and safety_ok else "FAIL"
            safety = f"{recall:.1%} vs {min_safety:.0%}" if recall is not None else "not applicable (no positives)"
            detail = f"accuracy {stats['accuracy']:.1%} vs {min_acc:.0%}, safety {safety}"

        gate_results[class_id] = {
            "verdict": verdict,
            "detail": detail,
            "safety_critical": bool(cls.get("safetyCritical")),
            "gates": gates,
            "samples": stats["total"] if stats else 0,
        }

    return gate_results


def call_model(endpoint: str, messages: list[dict], api_key: str, model: str) -> dict | None:
    """Call the VLM endpoint and return parsed JSON response."""
    import requests

    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    payload = {
        "model": model,
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
        print(f"  Request/response error: {type(e).__name__}")
        return None


def label(value) -> str:
    return value.strip().lower() if isinstance(value, str) else ""


def section(record: dict, key: str) -> dict:
    value = record.get(key)
    return value if isinstance(value, dict) else {}


def hazard_types(record: dict) -> set[str] | None:
    """None means unlabelled/malformed, not a reviewed clean image."""
    hazards = section(record, "safetyHazards").get("hazards")
    if not isinstance(hazards, list):
        return None
    values = {label(h.get("type") if isinstance(h, dict) else h) for h in hazards}
    return values if "" not in values else None


def valid_reference(messages, taxonomy):
    if not isinstance(messages, list) or len(messages) < 3:
        return None
    if not all(isinstance(message, dict) for message in messages[:3]):
        return None
    if [message.get("role") for message in messages[:3]] != ["system", "user", "assistant"]:
        return None
    content = messages[2].get("content")
    try:
        reference = json.loads(content) if isinstance(content, str) else content
    except json.JSONDecodeError:
        return None
    if not isinstance(reference, dict):
        return None
    category = normalize_category(section(reference, "damageAssessment").get("damageType"), taxonomy)
    if category in ("unknown", "none", "n/a") or hazard_types(reference) is None:
        return None
    return reference, category


def aggregate(rows: list[dict]) -> dict:
    total = len(rows)
    hits = [r for r in rows if r["safety_recall"] is not None]
    negative = [r for r in rows if r["hazard_negative"]]
    valid_negative = [r for r in negative if r["success"]]
    return {
        "total": total,
        "successful_calls": sum(r["success"] for r in rows),
        "failed_calls": sum(not r["success"] for r in rows),
        "accuracy": sum(r["damage_type_match"] for r in rows) / total if total else None,
        "severity_accuracy": field_accuracy(rows, "severity_match"),
        "urgency_accuracy": field_accuracy(rows, "urgency_match"),
        "hazard_positive_samples": len(hits),
        "hazard_negative_samples": len(negative),
        "hazard_negative_valid_predictions": len(valid_negative),
        "mean_safety_recall": sum(r["safety_recall"] for r in hits) / len(hits) if hits else None,
        "hazard_false_alarm_rate": (
            sum(r["hazard_false_alarm"] for r in valid_negative) / len(valid_negative)
            if valid_negative else None
        ),
        "avg_latency_ms": sum(r["latency_ms"] for r in rows) / total if total else None,
    }


def field_accuracy(rows: list[dict], key: str) -> float | None:
    scores = [r[key] for r in rows if r[key] is not None]
    return sum(scores) / len(scores) if scores else None


def open_data(path: str) -> bytes:
    with open(path, "rb") as f:
        return f.read()


def evaluate(args: argparse.Namespace) -> dict:
    """Every valid reference is scored, including unavailable model responses."""
    data = open_data(args.data)
    rows = parse_jsonl(data)
    taxonomy = load_taxonomy(args.taxonomy) if args.taxonomy else None
    known_categories = {cls["id"] for cls in taxonomy["classes"]} if taxonomy else set()
    print(f"Evaluating {len(rows)} samples against model {args.model}")

    results = []
    invalid = []
    unmapped = Counter()
    predictions = Counter()
    confusion = defaultdict(Counter)
    failed_lines = []
    category_rows = defaultdict(list)
    for i, (line_number, row) in enumerate(rows, start=1):
        messages = row.get("messages") if isinstance(row, dict) else None
        parsed = valid_reference(messages, taxonomy)
        if parsed is None:
            invalid.append(line_number)
            continue
        reference, category = parsed
        if taxonomy and category not in known_categories:
            unmapped[category] += 1
        start = time.monotonic()
        student = call_model(args.endpoint, messages, args.api_key, args.model)
        latency = time.monotonic() - start
        student = student if isinstance(student, dict) else {}
        student_damage = section(student, "damageAssessment")
        prediction = normalize_category(student_damage.get("damageType"), taxonomy)
        predicted_hazards = hazard_types(student)
        success = prediction not in ("unknown", "none", "n/a") and predicted_hazards is not None
        # Score an incomplete prediction as a failure, not a success on
        # one matching field. Count failures on positive rows as misses.
        reference_hazards = hazard_types(reference)
        safety_recall = None
        if reference_hazards:
            safety_recall = len(reference_hazards & predicted_hazards) / len(reference_hazards) if success else 0.0
        expected_severity = label(section(reference, "damageAssessment").get("severity"))
        expected_urgency = label(section(reference, "urgency").get("urgency"))
        if success:
            predictions[prediction] += 1
            confusion[category][prediction] += 1
        else:
            failed_lines.append(line_number)
        result = {
            "success": success,
            "latency_ms": round(latency * 1000),
            "damage_type_match": success and category == prediction,
            "severity_match": success and label(student_damage.get("severity")) == expected_severity if expected_severity else None,
            "urgency_match": success and label(section(student, "urgency").get("urgency")) == expected_urgency if expected_urgency else None,
            "safety_recall": safety_recall,
            "hazard_negative": not reference_hazards,
            "hazard_false_alarm": not reference_hazards and bool(predicted_hazards) and success,
        }
        category_rows[category].append(result)
        results.append(result)
        status = "FAILED" if not success else "OK" if result["damage_type_match"] else "MISS"
        print(f"  [{i}/{len(rows)}] {status} ({latency:.1f}s)")

    overall = aggregate(results)
    overall["total_samples"] = len(rows)
    overall["invalid_reference_rows"] = len(invalid)
    overall["prediction_coverage"] = overall["successful_calls"] / len(results) if results else None
    per_category = {}
    for cat in sorted(category_rows.keys() | predictions.keys()):
        stats = aggregate(category_rows.get(cat, []))
        predicted_count = predictions[cat]
        stats["predicted_samples"] = predicted_count
        stats["precision"] = sum(r["damage_type_match"] for r in category_rows.get(cat, [])) / predicted_count if predicted_count else None
        per_category[cat] = stats

    output = {
        "overall": overall,
        "per_category": per_category,
        "data_file": os.fspath(args.data),
        "data_sha256": hashlib.sha256(data).hexdigest(),
        "model": args.model,
        "reference_kind": args.reference_kind,
        "invalid_reference_record_numbers": invalid,
        "unmapped_reference_categories": dict(unmapped),
        "failed_prediction_record_numbers": failed_lines,
        "confusion": confusion,
    }

    # Per-class release gates (taxonomy mode)
    if taxonomy:
        gate_results = evaluate_gates(per_category, taxonomy)
        output["gates"] = gate_results
        output["taxonomy_version"] = taxonomy.get("version")

    # Save results
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2)
    print(f"\nResults saved to {args.output}")

    # Summary
    print(f"\n{'='*50}")
    for caption, key in [
        ("Accuracy", "accuracy"),
        ("Severity", "severity_accuracy"),
        ("Urgency", "urgency_accuracy"),
        ("Safety recall", "mean_safety_recall"),
        ("Coverage", "prediction_coverage"),
    ]:
        value = overall[key]
        print(f"{caption:<16}{'N/A' if value is None else format(value, '.1%')}")
    print(f"Invalid references: {len(invalid)}; unmapped references: {sum(unmapped.values())}")

    if taxonomy:
        print("\nPer-class release gates:")
        print(f"{'class':<28} {'verdict':<22} detail")
        for class_id, gate in sorted(
            output["gates"].items(),
            key=lambda kv: (kv[1]["verdict"] != "FAIL", kv[0]),
        ):
            flag = " [SAFETY-CRITICAL]" if gate["safety_critical"] else ""
            print(f"{class_id:<28} {gate['verdict']:<22} {gate['detail']}{flag}")
    return output


def main():
    parser = argparse.ArgumentParser(description="Evaluate fine-tuned VLM")
    parser.add_argument("--data", required=True, help="Validation JSONL file")
    parser.add_argument("--endpoint", default="http://localhost:8000/v1/chat/completions", help="VLM endpoint URL")
    parser.add_argument("--api-key", default="", help="API key for endpoint")
    parser.add_argument("--model", default="mint-ai-vlm", help="Model served by the endpoint")
    parser.add_argument(
        "--reference-kind", choices=["teacher", "human-reviewed"], default="teacher",
        help="Declare provenance; human-reviewed requires independently checked labels.",
    )
    parser.add_argument("--output", default="eval_results.json", help="Output metrics JSON path")
    parser.add_argument(
        "--taxonomy",
        default="",
        help="Path to taxonomy_v3.json â€” enables label normalisation + per-class release gates",
    )
    parser.add_argument(
        "--enforce-gates",
        action="store_true",
        help="Exit 1 on non-passing gates or invalid references; requires reviewed data and taxonomy.",
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
        blocked = gate_blockers(output)
        if blocked:
            print(f"\nGate enforcement: BLOCKED ({'; '.join(blocked)})", file=sys.stderr)
            sys.exit(1)
        print("\nGate enforcement: all gates pass")


def gate_blockers(output: dict) -> list[str]:
    blockers = []
    if output["reference_kind"] != "human-reviewed":
        blockers.append("teacher-labelled data cannot qualify a release")
    if output["invalid_reference_record_numbers"]:
        blockers.append("invalid reference records")
    if output["unmapped_reference_categories"]:
        blockers.append("unmapped reference categories")
    gates = output.get("gates") or {}
    if not gates:
        blockers.append("no configured class gates")
    blockers.extend(
        f"{category}: {gate['verdict']}"
        for category, gate in sorted(gates.items())
        if gate["verdict"] != "PASS"
    )
    return blockers


if __name__ == "__main__":
    main()
