"""Offline regressions: no credentials, data access, training, or deployment."""
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import generate_data_report as report


class PipelineReadinessTest(unittest.TestCase):
    def test_current_source_parses_without_execution(self):
        errors, missing = report.inspect_tools(report.ROOT)
        self.assertEqual(errors, [])
        self.assertIn("scripts/ml/train_sam3.py", missing)

    def test_missing_and_invalid_tools_fail(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            tool = root / report.AVAILABLE_TOOLS[0]
            tool.parent.mkdir(parents=True)
            tool.write_text("def broken(", encoding="utf-8")
            self.assertEqual(set(report.inspect_tools(root)[0]), set(report.AVAILABLE_TOOLS))

    def test_does_not_execute_source(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for name in report.AVAILABLE_TOOLS:
                tool = root / name
                tool.parent.mkdir(parents=True, exist_ok=True)
                tool.write_text("raise RuntimeError('must not execute')", encoding="utf-8")
            self.assertEqual(report.inspect_tools(root)[0], [])

    def test_report_escapes_text_and_never_claims_training_success(self):
        html = report.render_report(["<script>alert(1)</script>"], [])
        self.assertNotIn("<script>", html)
        self.assertIn("&lt;script&gt;", html)
        self.assertIn("FAILED", html)
        self.assertIn("training is not authorized", html)
        self.assertIn("No datasets were fetched", html)

    def test_report_retained_when_source_validation_fails(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "report.html"
            with patch.object(report, "inspect_tools", return_value=(["missing.py"], [])):
                self.assertEqual(report.main(["--output", str(output)]), 1)
            self.assertIn("FAILED", output.read_text(encoding="utf-8"))

    def test_active_workflow_has_no_training_or_release_path(self):
        workflow = (report.ROOT / ".github/workflows/ml-training-pipeline.yml").read_text()
        for forbidden in (
            "secrets.", "self-hosted", "repository_dispatch", "deploy_environment",
            "fetch_training_data.py", "train_yolo.py", "deploy_model.py", "aws s3",
        ):
            self.assertNotIn(forbidden, workflow)
        self.assertIn("--no-index -r requirements-ml.txt", workflow)
        self.assertIn("if-no-files-found: error", workflow)
        self.assertIn("if: always()", workflow)
        requirements = (report.ROOT / "requirements-ml.txt").read_text()
        self.assertTrue(all(not line.strip() or line.lstrip().startswith("#")
                            for line in requirements.splitlines()))


if __name__ == "__main__":
    unittest.main()
