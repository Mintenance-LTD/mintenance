# Mint AI VLM Training Worker

Serverless GPU fine-tuning and inference for the Mint AI Vision Language Model.

**Base model**: `Qwen/Qwen2.5-VL-3B-Instruct` (Apache 2.0)
**Fine-tuning method**: QLoRA (4-bit NF4 quantisation + LoRA rank-16)
**Platform**: [Modal](https://modal.com) (pay-per-second, scales to zero)

---

## Architecture

```
Next.js app (KnowledgeDistillationService.trainStudentVLM)
    |
    | POST /train  (VLM_TRAINING_WEBHOOK_URL)
    v
modal_train.py::webhook()          ← returns immediately (async spawn)
    |
    | (GPU container — A100 40GB)
    v
modal_train.py::train()
    1. Download JSONL from Supabase Storage (vlm-training/<jobId>/training_data.jsonl)
    2. QLoRA fine-tune Qwen2.5-VL-3B-Instruct
    3. Upload LoRA adapter to Supabase Storage (vlm-adapters/<jobId>/lora-adapter/)
    4. POST result to /api/training/vlm-callback

                                   modal_inference.py::MintVLM
                                       Loaded once per container
                                       Serves /v1/chat/completions
                                       Drop-in for GPT-4o
```

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
modal volume create mint-vlm-model-cache   # caches base model weights (~6GB)
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

# Optional: confidence-based routing (student vs GPT-4o per damage category)
VLM_ROUTING_MODE=auto
```

---

## Running a Training Job Manually

Training is normally triggered automatically when `KnowledgeDistillationService`
accumulates >= 100 labelled samples. You can also trigger it manually:

```bash
# Via the admin API (requires admin auth)
curl -X POST https://your-app.com/api/admin/training/trigger-vlm \
  -H "Authorization: Bearer <admin-token>"

# Or call the Modal function directly (for debugging)
modal run vlm_training_worker/modal_train.py::train \
  --payload '{"jobId":"test-1","modelVersion":"mint-vlm-test","storagePath":"vlm-training/test/training_data.jsonl","samplesCount":50,"config":{"loraRank":16,"loraAlpha":32,"batchSize":2,"epochs":1}}'
```

---

## Cost Estimates

| Scenario | GPU | Time | Cost |
|----------|-----|------|------|
| 100 samples, 1 epoch | A100 40GB | ~8 min | ~$0.15 |
| 1,000 samples, 3 epochs | A100 40GB | ~45 min | ~$0.83 |
| 5,000 samples, 3 epochs | A100 40GB | ~3.5 hr | ~$3.85 |
| Inference (per request) | T4 | ~1–3 sec | ~$0.0006 |

**vs GPT-4o**: Each assessment costs ~$0.05–0.10 with GPT-4o. After distillation,
Mint AI VLM costs ~$0.001 per inference — ~97% reduction.

---

## Files

| File | Purpose |
|------|---------|
| `modal_train.py` | Webhook + QLoRA fine-tuning GPU function |
| `modal_inference.py` | OpenAI-compatible inference endpoint |
| `requirements.txt` | Python dependencies |

---

## Monitoring

- Modal dashboard: https://modal.com/apps — view logs, GPU utilisation, function history
- Training job status: `knowledge_distillation_jobs` table in Supabase
- LoRA adapters: `mint-vlm-adapters` Modal volume
