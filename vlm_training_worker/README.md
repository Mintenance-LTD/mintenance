# vlm_training_worker — DEPRECATED

> ⚠️ **This directory contains an earlier, unused design** that assumed LLaMA-Factory + sharegpt
> format + A100 40GB. **The actual Mint AI VLM training shipped with a different stack**:
> `transformers` + `peft` + `bitsandbytes` directly, running on A10G via
> [`scripts/vlm-training/modal_train.py`](../scripts/vlm-training/modal_train.py).

## What this directory was meant to be

An alternative Modal worker that:

- Received training webhooks from the Next.js app
- Downloaded JSONL from Supabase Storage
- Ran LLaMA-Factory CLI for LoRA fine-tuning
- Called back to the app when training finished

This was never completed end-to-end. The `modal_train.py` and `modal_inference.py` files here are
older drafts that do not match what currently runs in production.

## Where the working pipeline lives

| Purpose              | Active file                                                                                                     |
| -------------------- | --------------------------------------------------------------------------------------------------------------- |
| Modal LoRA training  | [`scripts/vlm-training/modal_train.py`](../scripts/vlm-training/modal_train.py)                                 |
| Modal vLLM serving   | [`scripts/vlm-training/modal_serve.py`](../scripts/vlm-training/modal_serve.py)                                 |
| Training data export | [`scripts/vlm-training/export_roboflow_to_qwen_v2.mjs`](../scripts/vlm-training/export_roboflow_to_qwen_v2.mjs) |
| Image upload         | [`scripts/vlm-training/upload_images_to_supabase.mjs`](../scripts/vlm-training/upload_images_to_supabase.mjs)   |
| Evaluation harness   | [`scripts/vlm-training/evaluate_mint_ai.py`](../scripts/vlm-training/evaluate_mint_ai.py)                       |

## Current state reference

Read [`docs/MINT_AI_VLM_v2.md`](../docs/MINT_AI_VLM_v2.md) for the authoritative description of Mint
AI v2 architecture, training, deployment, and metrics.

## Why this directory still exists

The draft `modal_train.py` and `modal_inference.py` files may still be useful as a template if
anyone wants to migrate to LLaMA-Factory in the future. Delete if not relevant.
