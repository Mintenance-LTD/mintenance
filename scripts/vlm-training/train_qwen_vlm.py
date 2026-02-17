#!/usr/bin/env python3
"""
Qwen2.5-VL-3B LoRA Fine-Tuning for Mintenance Building Damage Assessment.

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
    Install deps: pip install -r requirements.txt
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path

import torch
from datasets import Dataset
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training, TaskType
from transformers import (
    AutoModelForCausalLM,
    AutoProcessor,
    BitsAndBytesConfig,
    TrainingArguments,
    Trainer,
)


DEFAULT_MODEL = "Qwen/Qwen2.5-VL-3B-Instruct"
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


def build_dataset(rows: list[dict], processor) -> Dataset:
    """Convert conversation rows into tokenized dataset."""
    input_ids_list = []
    attention_mask_list = []
    labels_list = []

    for row in rows:
        messages = row.get("messages", [])
        if len(messages) < 3:
            continue

        # Build text from system + user messages (input) and assistant message (target)
        system_msg = messages[0].get("content", "") if messages[0]["role"] == "system" else ""
        user_content = messages[1].get("content", "") if messages[1]["role"] == "user" else ""
        assistant_msg = messages[2].get("content", "") if messages[2]["role"] == "assistant" else ""

        # Extract text from user content (may contain image references)
        if isinstance(user_content, list):
            user_text = " ".join(
                part.get("text", "") for part in user_content if part.get("type") == "text"
            )
        else:
            user_text = user_content

        # Format as chat template
        prompt = f"<|im_start|>system\n{system_msg}<|im_end|>\n<|im_start|>user\n{user_text}<|im_end|>\n<|im_start|>assistant\n"
        full_text = prompt + assistant_msg + "<|im_end|>"

        tokenized = processor.tokenizer(
            full_text,
            truncation=True,
            max_length=2048,
            padding="max_length",
            return_tensors="pt",
        )

        input_ids = tokenized["input_ids"].squeeze(0)
        attention_mask = tokenized["attention_mask"].squeeze(0)

        # Labels: mask input tokens with -100, only train on assistant response
        prompt_tokenized = processor.tokenizer(prompt, truncation=True, max_length=2048)
        prompt_len = len(prompt_tokenized["input_ids"])

        labels = input_ids.clone()
        labels[:prompt_len] = -100  # mask prompt tokens

        input_ids_list.append(input_ids)
        attention_mask_list.append(attention_mask)
        labels_list.append(labels)

    if not input_ids_list:
        raise ValueError("No valid training examples after processing")

    return Dataset.from_dict({
        "input_ids": torch.stack(input_ids_list),
        "attention_mask": torch.stack(attention_mask_list),
        "labels": torch.stack(labels_list),
    })


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

    model = AutoModelForCausalLM.from_pretrained(
        args.model,
        quantization_config=bnb_config,
        device_map="auto",
        trust_remote_code=True,
    )
    processor = AutoProcessor.from_pretrained(args.model, trust_remote_code=True)

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

    train_dataset = build_dataset(rows, processor)
    val_dataset = build_dataset(val_rows, processor) if val_rows else None

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
    )

    # Train
    print("Starting LoRA fine-tuning...")
    train_result = trainer.train()

    # Save adapter weights only (not full model)
    adapter_path = os.path.join(output_dir, "adapter")
    model.save_pretrained(adapter_path)
    processor.tokenizer.save_pretrained(adapter_path)
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
