"""Resolve the worker and both Modal images for Linux/Python 3.11.

Requires uv on PATH; writes temporary lock files but does not install packages.
Run from any directory: python scripts/check_headless_dependencies.py
"""
import ast
from pathlib import Path
import subprocess
import sys
import tempfile
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1]


def main():
    with tempfile.TemporaryDirectory() as directory:
        temp = Path(directory)
        sources = [("worker", ROOT / "vlm_training_worker/requirements.txt")]
        for name in ("modal_train", "modal_inference"):
            tree = ast.parse((ROOT / f"vlm_training_worker/{name}.py").read_text(encoding="utf-8"))
            packages = [ast.literal_eval(arg) for node in ast.walk(tree)
                        if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute)
                        and node.func.attr == "pip_install" for arg in node.args]
            modal_input = temp / f"{name}.in"
            modal_input.write_text("\n".join(packages) + "\n", encoding="utf-8")
            sources.append((name, modal_input))
        for name, source in sources:
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
            if not any(line == "transformers==4.57.6+mintenance.1" or
                       (not line.startswith((" ", "#")) and
                        Path(unquote(line).replace("\\", "/")).name ==
                        "transformers-4.57.6+mintenance.1-py3-none-any.whl")
                       for line in resolved):
                raise RuntimeError(f"{name}: patched Transformers wheel missing")
            if any(line.startswith(("gradio==", "gradio-client==")) for line in resolved):
                raise RuntimeError(f"{name}: unexpected web UI dependencies")
            print(f"{name}: resolved with patched Transformers, Pillow and protobuf, without Gradio")


if __name__ == "__main__":
    main()
