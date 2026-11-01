"""Offline behavioral regressions for the Transformers security backport."""
import json
import os
from pathlib import Path
import tempfile
import unittest

from tokenizers import Tokenizer, models
from transformers import BertConfig, BertModel, PreTrainedTokenizerFast, ProcessorMixin


class LocalProcessor(ProcessorMixin):
    attributes = ["tokenizer"]
    tokenizer_class = "PreTrainedTokenizerFast"


def tokenizer():
    return PreTrainedTokenizerFast(
        tokenizer_object=Tokenizer(models.WordLevel({"<unk>": 0}, unk_token="<unk>")),
        unk_token="<unk>",
    )


class TransformersSecurityTests(unittest.TestCase):
    def test_named_templates_cannot_escape_save_directory(self):
        for kind in ("tokenizer", "processor"):
            with tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                for name in ("../../escaped", str(root / "absolute")):
                    with self.subTest(kind=kind, name=name):
                        obj = tokenizer() if kind == "tokenizer" else LocalProcessor(tokenizer())
                        obj.chat_template = {"default": "hello", name: "untrusted content"}
                        with self.assertRaisesRegex(ValueError, "Invalid chat template name"):
                            obj.save_pretrained(root / "save")
                        self.assertFalse((root / "escaped.jinja").exists())
                        self.assertFalse((root / "absolute.jinja").exists())

    def test_valid_named_templates_still_save_and_tokenizer_reloads(self):
        for kind in ("tokenizer", "processor"):
            with self.subTest(kind=kind), tempfile.TemporaryDirectory() as directory:
                obj = tokenizer() if kind == "tokenizer" else LocalProcessor(tokenizer())
                obj.chat_template = {"default": "hello", "tool_use": "tools"}
                obj.save_pretrained(directory)
                root = Path(directory)
                self.assertEqual((root / "chat_template.jinja").read_text(), "hello")
                self.assertEqual((root / "additional_chat_templates/tool_use.jinja").read_text(), "tools")
                restored = PreTrainedTokenizerFast.from_pretrained(directory, local_files_only=True)
                self.assertEqual(restored.chat_template, obj.chat_template)

    def test_weights_config_cannot_load_outside_model_directory(self):
        config = BertConfig(vocab_size=16, hidden_size=8, num_hidden_layers=1,
                            num_attention_heads=1, intermediate_size=8, max_position_embeddings=8)
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            repo, outside = root / "repo", root / "outside"
            BertModel(config).save_pretrained(repo)
            BertModel(config).save_pretrained(outside)
            config_file = repo / "config.json"
            data = json.loads(config_file.read_text())
            for name in ("../outside/model.safetensors", str(outside / "model.safetensors"),
                         "../outside/model.safetensors.index.json"):
                with self.subTest(name=name):
                    data["transformers_weights"] = name
                    config_file.write_text(json.dumps(data))
                    with self.assertRaisesRegex(ValueError, "must reference a file inside the model directory"):
                        BertModel.from_pretrained(repo, local_files_only=True)
            data["transformers_weights"] = "model.safetensors"
            config_file.write_text(json.dumps(data))
            self.assertIsInstance(BertModel.from_pretrained(repo, local_files_only=True), BertModel)

    @unittest.skipIf(os.name == "nt", "Windows symlinks require extra privileges")
    def test_hub_style_symlinked_weights_still_load(self):
        config = BertConfig(vocab_size=16, hidden_size=8, num_hidden_layers=1,
                            num_attention_heads=1, intermediate_size=8, max_position_embeddings=8)
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            blobs, snapshot = root / "blobs", root / "snapshot"
            BertModel(config).save_pretrained(blobs)
            snapshot.mkdir()
            config.transformers_weights = "model.safetensors"
            config.save_pretrained(snapshot)
            (snapshot / "model.safetensors").symlink_to(blobs / "model.safetensors")
            self.assertIsInstance(BertModel.from_pretrained(snapshot, local_files_only=True), BertModel)


if __name__ == "__main__":
    unittest.main()
