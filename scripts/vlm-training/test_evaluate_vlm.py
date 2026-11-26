"""Offline regression cases; no provider calls and no real property images."""
import argparse
import contextlib
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import evaluate_vlm as evaluator


def response(category, hazards=(), severity=None, urgency=None):
    return {
        "damageAssessment": {"damageType": category, "severity": severity},
        "safetyHazards": {"hazards": [{"type": hazard} for hazard in hazards]},
        "urgency": {"urgency": urgency},
    }


def row(reference):
    return {"messages": [
        {"role": "system", "content": "Review the photo."},
        {"role": "user", "content": "Synthetic test fixture."},
        {"role": "assistant", "content": json.dumps(reference)},
    ]}


class EvaluateVlmTest(unittest.TestCase):
    def evaluate(self, references, predictions, *, kind="human-reviewed"):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder)
            data = path / "holdout.jsonl"
            data.write_text("\n".join(v if isinstance(v, str) else json.dumps(v) for v in references), encoding="utf-8")
            taxonomy = path / "taxonomy.json"
            taxonomy.write_text(json.dumps({
                "version": "fixture",
                "defaultGates": {"minEvalSamples": 1},
                "safetyCriticalGates": {"minEvalSamples": 1},
                "classes": [
                    {"id": "leak", "aliases": ["pipe leak"], "safetyCritical": True},
                    {"id": "no_defect"},
                ],
            }), encoding="utf-8")
            with patch.object(evaluator, "call_model", side_effect=predictions) as model, contextlib.redirect_stdout(io.StringIO()):
                result = evaluator.evaluate(argparse.Namespace(
                    data=data, taxonomy=taxonomy, output=path / "result.json",
                    endpoint="unused", api_key="", model="fixture-v2", reference_kind=kind,
                ))
            self.assertEqual(len(result["data_sha256"]), 64)
            self.assertEqual(result["model"], "fixture-v2")
            return result, model.call_count

    def test_clean_images_cannot_hide_missed_hazards_or_failed_calls(self):
        refs = [row(response("leak", ["water near electrics"]))] + [row(response("no_defect"))] * 9
        result, _ = self.evaluate(refs, [None] + [response("no_defect")] * 9)
        overall = result["overall"]
        self.assertEqual(overall["accuracy"], 0.9)
        self.assertEqual(overall["prediction_coverage"], 0.9)
        self.assertEqual(overall["failed_calls"], 1)
        self.assertEqual(overall["hazard_positive_samples"], 1)
        self.assertEqual(overall["mean_safety_recall"], 0)
        self.assertEqual(result["per_category"]["no_defect"]["mean_safety_recall"], None)
        self.assertEqual(result["gates"]["leak"]["verdict"], "FAIL")

    def test_safety_gate_needs_hazard_positive_evidence(self):
        result, _ = self.evaluate([row(response("leak"))], [response("leak")])
        self.assertEqual(result["gates"]["leak"]["verdict"], "INSUFFICIENT_SAFETY_SAMPLES")
        self.assertEqual(result["gates"]["no_defect"]["verdict"], "NO_DATA")
        self.assertTrue(evaluator.gate_blockers(result))

    def test_aliases_match_and_false_alarms_are_counted(self):
        leak = response("leak", ["water near electrics"])
        negative = response("no_defect")
        result, _ = self.evaluate(
            [row(leak), row(negative), row(negative)],
            [response("pipe leak", ["Water near electrics"]), response("leak", ["water near electrics"]), negative],
        )
        self.assertEqual(result["overall"]["mean_safety_recall"], 1)
        self.assertEqual(result["overall"]["hazard_false_alarm_rate"], 0.5)
        self.assertEqual(result["per_category"]["leak"]["precision"], 0.5)
        self.assertIsNone(result["overall"]["severity_accuracy"])
        self.assertIsNone(result["overall"]["urgency_accuracy"])

    def test_invalid_references_are_visible_and_dont_call_provider(self):
        missing_hazards = {"damageAssessment": {"damageType": "leak"}}
        unknown = response("unknown")
        result, calls = self.evaluate(["not json", row(missing_hazards), row(unknown), row(response("typo"))], [response("typo")])
        self.assertEqual(calls, 1)
        self.assertEqual(result["overall"]["invalid_reference_rows"], 3)
        self.assertEqual(result["unmapped_reference_categories"], {"typo": 1})
        self.assertIn("invalid reference records", evaluator.gate_blockers(result))
        self.assertIn("unmapped reference categories", evaluator.gate_blockers(result))

    def test_malformed_predictions_cannot_pass_on_type_alone(self):
        ref = response("leak", ["water"], "major", "urgent")
        result, _ = self.evaluate([row(ref)] * 3, [
            ["not a record"],
            {"damageAssessment": {"damageType": "leak"}},
            response("", ["water"]),
        ])
        self.assertEqual(result["overall"]["accuracy"], 0)
        self.assertEqual(result["overall"]["mean_safety_recall"], 0)
        self.assertEqual(result["overall"]["urgency_accuracy"], 0)
        self.assertEqual(result["overall"]["failed_calls"], 3)

    def test_teacher_agreement_cannot_qualify_release(self):
        examples = [response("leak", ["water"]), response("no_defect")]
        result, _ = self.evaluate([row(v) for v in examples], examples, kind="teacher")
        self.assertEqual(evaluator.gate_blockers(result), ["teacher-labelled data cannot qualify a release"])

    def test_independently_reviewed_perfect_example_can_pass_all_gates(self):
        examples = [response("leak", ["water"]), response("no_defect")]
        result, _ = self.evaluate([row(v) for v in examples], examples)
        self.assertEqual(evaluator.gate_blockers(result), [])

    def test_empty_reference_set_can_never_pass(self):
        result, calls = self.evaluate([], [])
        self.assertEqual(calls, 0)
        self.assertIsNone(result["overall"]["accuracy"])
        self.assertTrue(evaluator.gate_blockers(result))


if __name__ == "__main__":
    unittest.main()
