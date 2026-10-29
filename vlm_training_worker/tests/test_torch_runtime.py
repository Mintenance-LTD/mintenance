"""CPU smoke tests; run with the pinned torch/vision and HF training stack.

python -m unittest discover -s vlm_training_worker/tests -v
These tests do not download models, contact Modal, or validate GPU execution.
"""

import ast
import io
from pathlib import Path
import tempfile
import unittest

from PIL import Image
import torch
import torchvision


ROOT = Path(__file__).resolve().parents[1]


def core_pins(requirements, packages=None):
    packages = packages or {"torch", "torchvision"}
    return {
        name: version
        for line in requirements
        if "==" in line
        for name, version in [line.split("#", 1)[0].strip().split("==", 1)]
        if name in packages
    }


class TorchRuntimeTests(unittest.TestCase):
    def test_qwen_and_sft_apis_import_together(self):
        from transformers import AutoProcessor, Qwen2_5_VLForConditionalGeneration
        from trl import SFTTrainer

        self.assertTrue(callable(AutoProcessor.from_pretrained))
        self.assertTrue(callable(Qwen2_5_VLForConditionalGeneration.from_pretrained))
        self.assertTrue(callable(SFTTrainer.train))

    def test_lora_training_adapter_round_trip_and_merge(self):
        from peft import LoraConfig, PeftModel, TaskType, get_peft_model
        from transformers import Qwen2Config, Qwen2ForCausalLM

        config = Qwen2Config(vocab_size=32, hidden_size=16, intermediate_size=32,
                            num_hidden_layers=1, num_attention_heads=2, num_key_value_heads=2)
        torch.manual_seed(7)
        model = get_peft_model(Qwen2ForCausalLM(config), LoraConfig(
            task_type=TaskType.CAUSAL_LM, r=2, lora_alpha=4, target_modules=["q_proj", "v_proj"]))
        tokens = torch.tensor([[1, 2, 3]])
        optimizer = torch.optim.AdamW((p for p in model.parameters() if p.requires_grad), lr=0.01)
        loss = model(input_ids=tokens, labels=tokens).loss
        loss.backward()
        optimizer.step()
        model.eval()
        with torch.no_grad():
            expected = model(input_ids=tokens).logits
        with tempfile.TemporaryDirectory() as directory:
            model.save_pretrained(directory)
            torch.manual_seed(7)
            restored = PeftModel.from_pretrained(Qwen2ForCausalLM(config), directory).eval()
            with torch.no_grad():
                torch.testing.assert_close(restored(input_ids=tokens).logits, expected)
                merged = restored.merge_and_unload().eval()
                torch.testing.assert_close(merged(input_ids=tokens).logits, expected)

    def test_active_training_pipeline_uses_the_patched_pair(self):
        pins = core_pins((ROOT / "requirements.txt").read_text().splitlines())
        active = ROOT.parent / "scripts/vlm-training/requirements-vlm.in"
        self.assertEqual(core_pins(active.read_text().splitlines()), pins)

    def test_modal_training_stack_stays_consistent(self):
        packages = {"torch", "torchvision", "transformers", "peft", "accelerate", "trl", "llamafactory"}
        pins = core_pins((ROOT / "requirements.txt").read_text().splitlines(), packages)
        for filename in ("modal_train.py", "modal_inference.py"):
            with self.subTest(image=filename):
                tree = ast.parse((ROOT / filename).read_text(encoding="utf-8"))
                deps = [ast.literal_eval(arg) for node in ast.walk(tree)
                        if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute)
                        and node.func.attr == "pip_install" for arg in node.args]
                expected = pins if filename == "modal_train.py" else {
                    name: version for name, version in pins.items() if name not in {"trl", "llamafactory"}
                }
                self.assertEqual(core_pins(deps, packages), expected)

    def test_installed_pair_matches_requirements(self):
        pins = core_pins((ROOT / "requirements.txt").read_text().splitlines())
        # Local wheel labels (+cpu/+cu130) do not change the release version.
        self.assertEqual(torch.__version__.split("+")[0], pins["torch"])
        self.assertEqual(torchvision.__version__.split("+")[0], pins["torchvision"])

    def test_modal_images_use_the_same_pair(self):
        pins = core_pins((ROOT / "requirements.txt").read_text().splitlines())
        for filename in ("modal_train.py", "modal_inference.py"):
            with self.subTest(image=filename):
                tree = ast.parse((ROOT / filename).read_text(encoding="utf-8"))
                dependencies = []
                for node in ast.walk(tree):
                    if (isinstance(node, ast.Call)
                            and isinstance(node.func, ast.Attribute)
                            and node.func.attr == "pip_install"):
                        dependencies.extend(ast.literal_eval(arg) for arg in node.args)
                self.assertEqual(core_pins(dependencies), pins)

    def test_weights_only_checkpoint_round_trip(self):
        state = {"weight": torch.arange(6, dtype=torch.float32).reshape(2, 3)}
        checkpoint = io.BytesIO()
        torch.save(state, checkpoint)
        checkpoint.seek(0)
        loaded = torch.load(checkpoint, weights_only=True, map_location="cpu")
        torch.testing.assert_close(loaded["weight"], state["weight"])

    def test_adamw_training_step(self):
        torch.manual_seed(0)
        model = torch.nn.Linear(3, 2)
        before = model.weight.detach().clone()
        optimizer = torch.optim.AdamW(model.parameters(), lr=0.01)
        loss = model(torch.ones(2, 3)).square().mean()
        loss.backward()
        optimizer.step()
        self.assertTrue(torch.isfinite(loss).item())
        self.assertFalse(torch.equal(before, model.weight))

    def test_bfloat16_inference(self):
        with torch.no_grad():
            result = torch.ones(2, 3, dtype=torch.bfloat16) @ torch.ones(3, 2, dtype=torch.bfloat16)
        torch.testing.assert_close(result, torch.full((2, 2), 3, dtype=torch.bfloat16))

    def test_torchvision_native_nms_operator(self):
        boxes = torch.tensor([[0., 0., 10., 10.], [1., 1., 9., 9.], [20., 20., 30., 30.]])
        keep = torchvision.ops.nms(boxes, torch.tensor([0.9, 0.8, 0.7]), 0.5)
        self.assertEqual(keep.tolist(), [0, 2])

    def test_image_preprocessing(self):
        image = Image.new("RGB", (32, 24), color=(255, 0, 0))
        tensor = torchvision.transforms.functional.to_tensor(image)
        resized = torchvision.transforms.functional.resize(tensor, [16, 16], antialias=True)
        self.assertEqual(tuple(resized.shape), (3, 16, 16))
        torch.testing.assert_close(resized[0], torch.ones(16, 16))
        torch.testing.assert_close(resized[1:], torch.zeros(2, 16, 16))


if __name__ == "__main__":
    unittest.main()
