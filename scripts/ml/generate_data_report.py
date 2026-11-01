#!/usr/bin/env python3
"""Report tooling readiness without reading datasets or contacting services."""
import argparse
import ast
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
AVAILABLE_TOOLS = (
    "scripts/ml/fetch_training_data.py",
    "scripts/ml/train_yolo.py",
    "scripts/ml/deploy_model.py",
)
# Missing legacy prerequisites are readiness evidence, not synthetic metrics.
LEGACY_PREREQUISITES = (
    "requirements-ml-yolo.txt",
    "requirements-ml-sam3.txt",
    "scripts/ml/auth_supabase.py",
    "scripts/ml/validate_dataset.py",
    "scripts/ml/configure_training.py",
    "scripts/ml/train_sam3.py",
    "scripts/ml/evaluate_model.py",
    "scripts/ml/check_safety_criteria.py",
    "scripts/ml/package_model.py",
    "scripts/ml/configure_ab_test.js",
    "scripts/ml/deploy_ab_config.js",
    "scripts/ml/setup_monitoring.js",
    "scripts/ml/update_edge_functions.js",
    "scripts/ml/verify_deployment.py",
    "scripts/ml/monitor_deployment.py",
    "scripts/ml/detect_anomalies.py",
    "scripts/ml/rollback_deployment.py",
)


def inspect_tools(root):
    """Parse source only; never import or execute training/deployment tools."""
    errors = []
    for relative in AVAILABLE_TOOLS:
        try:
            ast.parse((root / relative).read_text(encoding="utf-8"), filename=relative)
        except (OSError, SyntaxError, UnicodeError):
            errors.append(relative)
    missing = [name for name in LEGACY_PREREQUISITES if not (root / name).is_file()]
    return errors, missing


def render_report(errors, missing):
    def items(values):
        return "".join("<li>" + escape(value) + "</li>" for value in values)
    return (
        '<!doctype html><html lang="en"><meta charset="utf-8">'
        "<title>ML tooling readiness — training held</title><body>"
        "<h1>Training and deployment remain on hold</h1>"
        "<p>This run validates local tooling only. No datasets were fetched, "
        "models trained, quality metrics measured, or production changes made.</p>"
        "<h2>Available-tool source validation</h2><p>"
        + ("FAILED" if errors else "PASSED (syntax only)")
        + "</p><ul>" + items(errors) + "</ul>"
        "<h2>Unimplemented legacy prerequisites</h2><ul>" + items(missing) + "</ul>"
        "<p>Even if every file exists, training is not authorized or certified. "
        "Reviewed data permissions, independent evaluation, dependency validation "
        "and a separately approved release workflow are required.</p></body></html>"
    )


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args(argv)
    errors, missing = inspect_tools(ROOT)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(render_report(errors, missing), encoding="utf-8")
    print("ML tooling: " + ("FAILED" if errors else "validated") + "; training/deployment HELD")
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
