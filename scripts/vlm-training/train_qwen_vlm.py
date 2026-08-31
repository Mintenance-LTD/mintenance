#!/usr/bin/env python3
"""
Qwen2.5-VL-7B LoRA Fine-Tuning for Mintenance Building Damage Assessment.

Trains a LoRA adapter on teacher (GPT-4o) distillation data exported from
TrainingDataExporter in Qwen2.5-VL conversation JSONL format.

Usage:
    python train_qwen_vlm.py \
        --data training_data.jsonl \
        --output ./adapters/mint-vlm-v1 \
        --epochs 3 \
        --batch-size 2 \
        --lr 2e-4

Environment:
    Requires a GPU with >= 16 GB VRAM (4-bit QLoRA).
    Install deps: pip install -r requirements-vlm.in
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path

import torch
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training, TaskType
from qwen_vl_utils import process_vision_info
from transformers import (
    AutoProcessor,
    BitsAndBytesConfig,
    Qwen2_5_VLForConditionalGeneration,
    TrainingArguments,
    Trainer,
)


DEFAULT_MODEL = "Qwen/Qwen2.5-VL-7B-Instruct"
LORA_RANK = 16
LORA_ALPHA = 32
LORA_DROPOUT = 0.05
LORA_TARGET_MODULES = ["q_proj", "v_proj"]


def load_jsonl(path: str) -> list[dict]:
    """Load Qwen-format conversation JSONL."""
    rows = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    print(f"Loaded {len(rows)} training examples from {path}")
    return rows


def build_dataset(rows: list[dict]) -> list[dict]:
    """Validate and retain multimodal conversations for lazy collation."""
    examples = []
    for row in rows:
        messages = row.get("messages", [])
        if len(messages) < 3 or messages[-1].get("role") != "assistant":
            continue
        image_count = sum(
            1
            for message in messages
            for part in (message.get("content") if isinstance(message.get("content"), list) else [])
            if part.get("type") in {"image", "image_url"}
        )
        if image_count == 0:
            raise ValueError(
                "Training example has no image. Refusing text-only VLM fine-tuning."
            )
        examples.append({"messages": messages})

    if not examples:
        raise ValueError("No valid multimodal training examples after validation")
    return examples


class QwenVLCollator:
    """Build Qwen2.5-VL tensors and train only on assistant response tokens."""

    def __init__(self, processor):
        self.processor = processor

    def __call__(self, examples: list[dict]) -> dict[str, torch.Tensor]:
        conversations = [example["messages"] for example in examples]
        prompts = [messages[:-1] for messages in conversations]

        full_texts = [
            self.processor.apply_chat_template(
                messages, tokenize=False, add_generation_prompt=False
            )
            for messages in conversations
        ]
        prompt_texts = [
            self.processor.apply_chat_template(
                messages, tokenize=False, add_generation_prompt=True
            )
            for messages in prompts
        ]

        full_images, full_videos = process_vision_info(conversations)
        prompt_images, prompt_videos = process_vision_info(prompts)
        batch = self.processor(
            text=full_texts,
            images=full_images,
            videos=full_videos,
            padding=True,
            truncation=True,
            max_length=4096,
            return_tensors="pt",
        )
        prompt_batch = self.processor(
            text=prompt_texts,
            images=prompt_images,
            videos=prompt_videos,
            padding=True,
            truncation=True,
            max_length=4096,
            return_tensors="pt",
        )

        labels = batch["input_ids"].clone()
        prompt_lengths = prompt_batch["attention_mask"].sum(dim=1)
        for index, prompt_length in enumerate(prompt_lengths.tolist()):
            labels[index, :prompt_length] = -100
        labels[batch["attention_mask"] == 0] = -100
        batch["labels"] = labels
        return batch


def train(args: argparse.Namespace) -> dict:
    """Run LoRA fine-tuning."""
    print(f"Loading base model: {args.model}")
    start = time.time()

    # 4-bit quantization config for QLoRA
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16,
        bnb_4bit_use_double_quant=True,
    )

    model = Qwen2_5_VLForConditionalGeneration.from_pretrained(
        args.model,
        quantization_config=bnb_config,
        device_map="auto",
        trust_remote_code=True,
    )
    processor = AutoProcessor.from_pretrained(args.model, trust_remote_code=True)
    processor.tokenizer.padding_side = "right"
    model.config.use_cache = False
    model.gradient_checkpointing_enable()

    # Prepare for k-bit training
    model = prepare_model_for_kbit_training(model)

    # LoRA configuration
    lora_config = LoraConfig(
        r=args.lora_rank,
        lora_alpha=args.lora_alpha,
        lora_dropout=LORA_DROPOUT,
        target_modules=LORA_TARGET_MODULES,
        task_type=TaskType.CAUSAL_LM,
        bias="none",
    )
    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()

    # Load and tokenize data
    rows = load_jsonl(args.data)
    if args.val_data:
        val_rows = load_jsonl(args.val_data)
    else:
        # Split 90/10 for validation
        split_idx = max(1, int(len(rows) * 0.9))
        val_rows = rows[split_idx:]
        rows = rows[:split_idx]

    train_dataset = build_dataset(rows)
    val_dataset = build_dataset(val_rows) if val_rows else None

    print(f"Training samples: {len(train_dataset)}")
    if val_dataset:
        print(f"Validation samples: {len(val_dataset)}")

    # Training arguments
    output_dir = args.output
    training_args = TrainingArguments(
        output_dir=output_dir,
        num_train_epochs=args.epochs,
        per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=args.batch_size,
        gradient_accumulation_steps=args.gradient_accumulation,
        learning_rate=args.lr,
        warmup_ratio=0.1,
        weight_decay=0.01,
        logging_steps=10,
        eval_strategy="epoch" if val_dataset else "no",
        save_strategy="epoch",
        save_total_limit=2,
        bf16=torch.cuda.is_bf16_supported(),
        fp16=not torch.cuda.is_bf16_supported(),
        dataloader_num_workers=0,
        report_to="none",
        remove_unused_columns=False,
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=val_dataset,
        data_collator=QwenVLCollator(processor),
    )

    # Train
    print("Starting LoRA fine-tuning...")
    train_result = trainer.train()

    # Save adapter weights only (not full model)
    adapter_path = os.path.join(output_dir, "adapter")
    model.save_pretrained(adapter_path)
    processor.save_pretrained(adapter_path)
    print(f"Adapter saved to {adapter_path}")

    duration = time.time() - start

    # Collect metrics
    metrics = {
        "train_loss": train_result.metrics.get("train_loss", 0),
        "train_runtime": train_result.metrics.get("train_runtime", 0),
        "train_samples_per_second": train_result.metrics.get("train_samples_per_second", 0),
        "epochs": args.epochs,
        "learning_rate": args.lr,
        "lora_rank": args.lora_rank,
        "lora_alpha": args.lora_alpha,
        "training_samples": len(train_dataset),
        "duration_seconds": round(duration, 1),
        "adapter_path": adapter_path,
        "base_model": args.model,
    }

    # Evaluate if validation set exists
    if val_dataset:
        eval_result = trainer.evaluate()
        metrics["eval_loss"] = eval_result.get("eval_loss", 0)

    # Save metrics
    metrics_path = os.path.join(output_dir, "training_metrics.json")
    with open(metrics_path, "w") as f:
        json.dump(metrics, f, indent=2)
    print(f"Metrics saved to {metrics_path}")

    return metrics


def main():
    parser = argparse.ArgumentParser(description="Qwen2.5-VL LoRA fine-tuning for Mintenance")
    parser.add_argument("--data", required=True, help="Path to training JSONL file")
    parser.add_argument("--val-data", default=None, help="Path to validation JSONL (optional; defaults to 10%% split)")
    parser.add_argument("--output", required=True, help="Output directory for adapter weights")
    parser.add_argument("--model", default=DEFAULT_MODEL, help=f"Base model (default: {DEFAULT_MODEL})")
    parser.add_argument("--epochs", type=int, default=3, help="Number of training epochs")
    parser.add_argument("--batch-size", type=int, default=2, help="Per-device batch size")
    parser.add_argument("--gradient-accumulation", type=int, default=4, help="Gradient accumulation steps")
    parser.add_argument("--lr", type=float, default=2e-4, help="Learning rate")
    parser.add_argument("--lora-rank", type=int, default=LORA_RANK, help="LoRA rank")
    parser.add_argument("--lora-alpha", type=int, default=LORA_ALPHA, help="LoRA alpha")
    args = parser.parse_args()

    if not os.path.exists(args.data):
        print(f"Error: training data file not found: {args.data}", file=sys.stderr)
        sys.exit(1)

    Path(args.output).mkdir(parents=True, exist_ok=True)

    metrics = train(args)
    print(f"\nTraining complete in {metrics['duration_seconds']}s")
    print(f"  Loss: {metrics['train_loss']:.4f}")
    if "eval_loss" in metrics:
        print(f"  Val Loss: {metrics['eval_loss']:.4f}")
    print(f"  Adapter: {metrics['adapter_path']}")


if __name__ == "__main__":
    main()
