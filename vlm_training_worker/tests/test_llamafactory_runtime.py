"""Exercise the actual headless LLaMA-Factory CLI without network or GPU access."""
import importlib.metadata
import importlib.util
import json
import math
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


class HeadlessTrainingTests(unittest.TestCase):
    def test_cli_trains_and_saves_lora_with_patched_pillow(self):
        from tokenizers import Tokenizer, models, pre_tokenizers
        from transformers import PreTrainedTokenizerFast, Qwen2Config, Qwen2ForCausalLM

        self.assertEqual(importlib.metadata.version("pillow"), "13.0.0")
        self.assertEqual(importlib.metadata.version("llamafactory"), "0.9.5+mintenance.1")
        self.assertIsNone(importlib.util.find_spec("gradio"), "Run in a headless environment")
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            model_path = root / "model"
            vocab = {token: i for i, token in enumerate([
                "<unk>", "<pad>", "<|im_start|>", "<|im_end|>", "<|endoftext|>",
                "user", "assistant", "system", "Name", "a", "color", "red", "blue", "green", ".",
            ])}
            tokenizer = Tokenizer(models.WordLevel(vocab, unk_token="<unk>"))
            tokenizer.pre_tokenizer = pre_tokenizers.WhitespaceSplit()
            fast = PreTrainedTokenizerFast(tokenizer_object=tokenizer, unk_token="<unk>",
                                          pad_token="<pad>", eos_token="<|im_end|>",
                                          additional_special_tokens=["<|im_start|>", "<|endoftext|>"])
            fast.save_pretrained(model_path)
            model = Qwen2ForCausalLM(Qwen2Config(
                vocab_size=len(vocab), hidden_size=16, intermediate_size=32,
                num_hidden_layers=1, num_attention_heads=2, num_key_value_heads=2,
                max_position_embeddings=128, eos_token_id=3, pad_token_id=1,
            ))
            model.save_pretrained(model_path)
            (root / "tiny.json").write_text(json.dumps([
                {"instruction": "Name a color", "input": "", "output": color}
                for color in ("red", "blue", "green")
            ]), encoding="utf-8")
            (root / "dataset_info.json").write_text(json.dumps({"tiny": {"file_name": "tiny.json"}}), encoding="utf-8")
            config = {
                "model_name_or_path": str(model_path), "stage": "sft", "do_train": True,
                "finetuning_type": "lora", "lora_target": "q_proj,v_proj", "lora_rank": 2,
                "dataset": "tiny", "dataset_dir": str(root), "template": "qwen",
                "cutoff_len": 64, "max_steps": 1, "per_device_train_batch_size": 1,
                "learning_rate": 0.001, "output_dir": str(root / "adapter"),
                "overwrite_output_dir": True, "report_to": "none", "use_cpu": True,
                "bf16": False, "fp16": False, "save_strategy": "no", "logging_steps": 1,
                "dataloader_num_workers": 0, "preprocessing_num_workers": 1,
            }
            config_path = root / "train.yaml"
            config_path.write_text(json.dumps(config), encoding="utf-8")
            env = {**os.environ, "HF_HUB_OFFLINE": "1", "TRANSFORMERS_OFFLINE": "1",
                   "PYTHONIOENCODING": "utf-8", "TOKENIZERS_PARALLELISM": "false",
                   "OMP_NUM_THREADS": "1"}
            result = subprocess.run([sys.executable, "-m", "llamafactory.cli", "train", str(config_path)],
                                    env=env, capture_output=True, text=True, encoding="utf-8", timeout=180)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            self.assertTrue((root / "adapter/adapter_model.safetensors").is_file())
            self.assertTrue((root / "adapter/adapter_config.json").is_file())
            metrics = json.loads((root / "adapter/train_results.json").read_text(encoding="utf-8"))
            self.assertTrue(math.isfinite(metrics["train_loss"]))


if __name__ == "__main__":
    unittest.main()
