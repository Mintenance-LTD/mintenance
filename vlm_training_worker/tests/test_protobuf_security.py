"""CVE-2026-0994 regressions; needs protobuf, but no model weights or GPU."""
import ast
from pathlib import Path
import unittest

from google.protobuf import any_pb2, json_format, wrappers_pb2

ROOT = Path(__file__).resolve().parents[2]


def nested_any(depth):
    value = {"@type": "type.googleapis.com/google.protobuf.StringValue", "value": "fixture"}
    for _ in range(depth):
        value = {"@type": "type.googleapis.com/google.protobuf.Any", "value": value}
    return value


class ProtobufSecurityTests(unittest.TestCase):
    def test_nested_any_cannot_bypass_recursion_limit(self):
        with self.assertRaisesRegex(json_format.ParseError, "recursion depth"):
            json_format.ParseDict(nested_any(40), any_pb2.Any(), max_recursion_depth=8)

    def test_valid_any_round_trip(self):
        message = json_format.ParseDict(nested_any(2), any_pb2.Any(), max_recursion_depth=8)
        restored = any_pb2.Any.FromString(message.SerializeToString())
        for _ in range(2):
            child = any_pb2.Any()
            self.assertTrue(restored.Unpack(child))
            restored = child
        value = wrappers_pb2.StringValue()
        self.assertTrue(restored.Unpack(value))
        self.assertEqual(value.value, "fixture")

    def test_all_model_dependency_inputs_require_the_patched_release(self):
        for relative in (
            "vlm_training_worker/requirements.txt",
            "scripts/vlm-training/requirements-vlm.in",
            "scripts/vlm-training/requirements-serve.in",
            "scripts/vlm-training/requirements-serve.lock",
        ):
            with self.subTest(path=relative):
                pins = [line.split("#", 1)[0].strip() for line in (ROOT / relative).read_text().splitlines()]
                self.assertIn("protobuf==7.36.2", pins)
        for relative in ("vlm_training_worker/modal_train.py", "vlm_training_worker/modal_inference.py"):
            tree = ast.parse((ROOT / relative).read_text(encoding="utf-8"))
            dependencies = [ast.literal_eval(arg) for node in ast.walk(tree)
                            if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute)
                            and node.func.attr == "pip_install" for arg in node.args]
            with self.subTest(image=relative):
                self.assertIn("protobuf==7.36.2", dependencies)


if __name__ == "__main__":
    unittest.main()
