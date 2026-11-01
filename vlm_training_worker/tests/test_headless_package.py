"""Verify the vendored CLI-only package and its installation wiring (stdlib only)."""
import ast
import base64
import csv
from email import message_from_bytes
import hashlib
import io
from pathlib import Path
import unittest
import zipfile

ROOT = Path(__file__).resolve().parents[2]
VERSION = "0.9.5+mintenance.1"
WHEEL = ROOT / "vlm_training_worker/vendor" / f"llamafactory-{VERSION}-py3-none-any.whl"


class HeadlessPackageTests(unittest.TestCase):
    def test_transformers_security_wheel_and_modal_installation(self):
        version = "4.57.6+mintenance.1"
        wheel_path = ROOT / "vlm_training_worker/vendor" / f"transformers-{version}-py3-none-any.whl"
        self.assertEqual(hashlib.sha256(wheel_path.read_bytes()).hexdigest(),
                         "92012040669aa983b3dcd496e83189a28d496167c73744eeb320c6f42b81d4ae")
        with zipfile.ZipFile(wheel_path) as wheel:
            info = f"transformers-{version}.dist-info"
            self.assertEqual(message_from_bytes(wheel.read(f"{info}/METADATA"))["Version"], version)
            self.assertTrue(any(name.endswith("/LICENSE") for name in wheel.namelist()))
            records = list(csv.reader(io.StringIO(wheel.read(f"{info}/RECORD").decode())))
            self.assertEqual({row[0] for row in records}, set(wheel.namelist()))
            for name, digest, size in records:
                if name.endswith("/RECORD"):
                    continue
                content = wheel.read(name)
                actual = base64.urlsafe_b64encode(hashlib.sha256(content).digest()).rstrip(b"=").decode()
                self.assertEqual(digest, "sha256=" + actual, name)
                self.assertEqual(int(size), len(content), name)
        for filename in ("modal_train.py", "modal_inference.py"):
            with self.subTest(image=filename):
                tree = ast.parse((ROOT / "vlm_training_worker" / filename).read_text(encoding="utf-8"))
                install = next(node for node in ast.walk(tree) if isinstance(node, ast.Call)
                               and isinstance(node.func, ast.Attribute) and node.func.attr == "pip_install")
                self.assertIn(f"transformers=={version}", [ast.literal_eval(arg) for arg in install.args])
                self.assertEqual({kw.arg: ast.literal_eval(kw.value) for kw in install.keywords},
                                 {"extra_options": "--find-links=/opt/wheels"})
                copies = [node for node in ast.walk(install.func.value) if isinstance(node, ast.Call)
                          and isinstance(node.func, ast.Attribute) and node.func.attr == "add_local_file"]
                copy = next(node for node in copies if ast.literal_eval(node.args[1]) == "/opt/wheels/" + wheel_path.name)
                self.assertEqual({kw.arg: ast.literal_eval(kw.value) for kw in copy.keywords}, {"copy": True})
        requirements = (ROOT / "vlm_training_worker/requirements.txt").read_text(encoding="utf-8")
        self.assertIn("./" + wheel_path.relative_to(ROOT).as_posix(), requirements)
        self.assertIn(f"transformers=={version}", requirements)

    def test_wheel_integrity_and_optional_webui(self):
        with zipfile.ZipFile(WHEEL) as wheel:
            info = f"llamafactory-{VERSION}.dist-info"
            metadata = message_from_bytes(wheel.read(f"{info}/METADATA"))
            self.assertEqual(metadata["Version"], VERSION)
            gradio = [req for req in metadata.get_all("Requires-Dist") if req.startswith("gradio")]
            self.assertEqual(gradio, ['gradio<=5.50.0,>=4.38.0; extra == "webui"'])
            self.assertIn("webui", metadata.get_all("Provides-Extra"))
            records = list(csv.reader(io.StringIO(wheel.read(f"{info}/RECORD").decode())))
            self.assertEqual({row[0] for row in records}, set(wheel.namelist()))
            for name, digest, size in records:
                if name.endswith("/RECORD"):
                    continue
                content = wheel.read(name)
                actual = base64.urlsafe_b64encode(hashlib.sha256(content).digest()).rstrip(b"=").decode()
                self.assertEqual(digest, "sha256=" + actual, name)
                self.assertEqual(int(size), len(content), name)
            self.assertTrue(any("licenses/LICENSE" in name for name in wheel.namelist()))

    def test_modal_copies_wheel_before_resolving_and_keeps_pillow(self):
        tree = ast.parse((ROOT / "vlm_training_worker/modal_train.py").read_text(encoding="utf-8"))
        install = next(node for node in ast.walk(tree) if isinstance(node, ast.Call)
                       and isinstance(node.func, ast.Attribute) and node.func.attr == "pip_install")
        deps = [ast.literal_eval(arg) for arg in install.args]
        self.assertIn(f"llamafactory=={VERSION}", deps)
        self.assertIn("pillow==13.0.0", deps)
        self.assertEqual({kw.arg: ast.literal_eval(kw.value) for kw in install.keywords},
                         {"extra_options": "--find-links=/opt/wheels"})
        copy = install.func.value
        self.assertEqual(copy.func.attr, "add_local_file")
        self.assertEqual(ast.literal_eval(copy.args[1]), "/opt/wheels/" + WHEEL.name)
        self.assertEqual({kw.arg: ast.literal_eval(kw.value) for kw in copy.keywords}, {"copy": True})
        requirements = (ROOT / "vlm_training_worker/requirements.txt").read_text(encoding="utf-8")
        self.assertIn("./" + WHEEL.relative_to(ROOT).as_posix(), requirements)
        self.assertIn("pillow==13.0.0", requirements)


if __name__ == "__main__":
    unittest.main()
