# Mint AI VLM Training Worker

Serverless GPU fine-tuning and inference for the Mint AI Vision Language Model.

**Base model**: `Qwen/Qwen2.5-VL-7B-Instruct` (Apache 2.0) **Fine-tuning framework**:
[LLaMA-Factory](https://github.com/hiyouga/LLaMA-Factory) (LoRA / QLoRA) **Platform**:
[Modal](https://modal.com) (pay-per-second, scales to zero)

---

## Architecture

```
Next.js app (KnowledgeDistillationService.trainStudentVLM)
    |
    | POST /train  (VLM_TRAINING_WEBHOOK_URL)
    v
modal_train.py::webhook()          <- returns immediately (async spawn)
    |
    | (GPU container - A100 40GB)
    v
modal_train.py::train()
    1. Download JSONL from Supabase Storage (vlm-training/<jobId>/training_data.jsonl)
    2. Generate LLaMA-Factory YAML config + dataset_info.json
    3. Run: llamafactory-cli train train_config.yaml
    4. Upload LoRA adapter to Supabase Storage + Modal Volume
    5. POST result to /api/training/vlm-callback

                                   modal_inference.py::MintVLM
                                       Loaded once per container
                                       Serves /v1/chat/completions
                                       Drop-in for GPT-4o
```

---

## LLaMA-Factory Training Config

Each training run generates a YAML config like:

```yaml
model_name_or_path: Qwen/Qwen2.5-VL-7B-Instruct
stage: sft
finetuning_type: lora
lora_rank: 16
lora_alpha: 32
lora_target: q_proj,k_proj,v_proj,o_proj,gate_proj,up_proj,down_proj
template: qwen2_vl
dataset: mint_building_damage
num_train_epochs: 3
per_device_train_batch_size: 2
gradient_accumulation_steps: 4
learning_rate: 0.0002
bf16: true
lr_scheduler_type: cosine
```

The dataset uses **sharegpt format** (system/user/assistant conversation JSONL).

---

## Prerequisites

```bash
pip install modal
modal token new          # authenticates your Modal account
```

---

## One-Time Setup

### 1. Create Modal secrets

**Training worker secrets:**

```bash
modal secret create mintenance-vlm-training \
  SUPABASE_URL="https://your-project.supabase.co" \
  SUPABASE_SERVICE_ROLE_KEY="eyJ..." \
  MINTENANCE_CALLBACK_URL="https://your-app.mintenance.com/api/training/vlm-callback" \
  MINTENANCE_CALLBACK_SECRET="$(openssl rand -hex 32)" \
  MINTENANCE_WEBHOOK_SECRET="$(openssl rand -hex 32)" \
  HF_TOKEN="hf_..."      # optional, for gated models
```

**Inference endpoint secrets:**

```bash
modal secret create mintenance-vlm-inference \
  SUPABASE_URL="https://your-project.supabase.co" \
  SUPABASE_SERVICE_ROLE_KEY="eyJ..." \
  MINTENANCE_INFERENCE_SECRET="$(openssl rand -hex 32)"
```

### 2. Create Modal volumes (one-time)

```bash
modal volume create mint-vlm-model-cache   # caches base model weights (~14GB for 7B)
modal volume create mint-vlm-adapters      # stores trained LoRA adapters
```

### 3. Deploy

```bash
# Training webhook
modal deploy vlm_training_worker/modal_train.py
# -> Outputs: https://your-org--mint-ai-vlm-training-webhook.modal.run/train

# Inference endpoint
modal deploy vlm_training_worker/modal_inference.py
# -> Outputs: https://your-org--mint-vlm-infer.modal.run/v1/chat/completions
```

---

## Connecting to the Next.js App

Add these to `apps/web/.env.local`:

```env
# Training pipeline
VLM_TRAINING_WEBHOOK_URL=https://your-org--mint-ai-vlm-training-webhook.modal.run/train
MINTENANCE_CALLBACK_SECRET=<same secret used in Modal mintenance-vlm-training>

# Inference (activate after first training run completes)
MINT_AI_VLM_ENDPOINT=https://your-org--mint-vlm-infer.modal.run/v1/chat/completions
MINT_AI_VLM_API_KEY=<same secret used in Modal mintenance-vlm-inference>

# Confidence-based routing (student vs GPT-4o per damage category)
VLM_ROUTING_MODE=auto
```

---

## Cost Estimates

| Scenario                | GPU       | Time     | Cost    |
| ----------------------- | --------- | -------- | ------- |
| 200 samples, 3 epochs   | A100 40GB | ~45 min  | ~$0.83  |
| 1,000 samples, 3 epochs | A100 40GB | ~2.5 hr  | ~$2.75  |
| 5,000 samples, 3 epochs | A100 40GB | ~8 hr    | ~$8.80  |
| Inference (per request) | A10G      | ~2-5 sec | ~$0.002 |

**vs GPT-4o**: Each assessment costs ~$0.05-0.10 with GPT-4o. After distillation, Mint AI VLM costs
~$0.002 per inference - ~96% reduction.

---

## Files

| File                 | Purpose                                                |
| -------------------- | ------------------------------------------------------ |
| `modal_train.py`     | Webhook + LLaMA-Factory LoRA fine-tuning GPU function  |
| `modal_inference.py` | OpenAI-compatible inference endpoint (7B + LoRA merge) |
| `requirements.txt`   | Python dependencies                                    |

---

## Monitoring

- Modal dashboard: https://modal.com/apps - view logs, GPU utilisation, function history
- Training job status: `knowledge_distillation_jobs` table in Supabase
- LoRA adapters: `mint-vlm-adapters` Modal volume
- Shadow comparisons: `vlm_shadow_comparisons` table
- Training buffer: `vlm_training_buffer` table
