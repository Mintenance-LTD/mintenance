"""Resolve the worker and Modal training dependencies for Linux/Python 3.11.

Requires uv on PATH; writes temporary lock files but does not install packages.
Run from any directory: python scripts/check_headless_dependencies.py
"""
import ast
from pathlib import Path
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]


def main():
    tree = ast.parse((ROOT / "vlm_training_worker/modal_train.py").read_text(encoding="utf-8"))
    packages = [ast.literal_eval(arg) for node in ast.walk(tree)
                if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute)
                and node.func.attr == "pip_install" for arg in node.args]
    with tempfile.TemporaryDirectory() as directory:
        temp = Path(directory)
        modal_input = temp / "modal-training.in"
        modal_input.write_text("\n".join(packages) + "\n", encoding="utf-8")
        for name, source in [("worker", ROOT / "vlm_training_worker/requirements.txt"),
                             ("modal-training", modal_input)]:
            lock = temp / f"{name}.lock"
            subprocess.run([
                "uv", "pip", "compile", str(source), "--python", sys.executable, "--python-version", "3.11",
                "--python-platform", "x86_64-unknown-linux-gnu", "--only-binary", ":all:",
                "--find-links", str(ROOT / "vlm_training_worker/vendor"),
                "--output-file", str(lock), "--quiet",
            ], cwd=ROOT, check=True)
            resolved = lock.read_text(encoding="utf-8").splitlines()
            if "pillow==13.0.0" not in resolved or "protobuf==7.36.2" not in resolved:
                raise RuntimeError(f"{name}: security pins changed")
            if any(line.startswith(("gradio==", "gradio-client==")) for line in resolved):
                raise RuntimeError(f"{name}: unexpected web UI dependencies")
            print(f"{name}: resolved with patched Pillow and protobuf, without Gradio")


if __name__ == "__main__":
    main()
