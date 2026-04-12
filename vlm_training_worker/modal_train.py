"""
Mint AI VLM Training Worker — Modal Serverless GPU (LLaMA-Factory)
===================================================================
Receives a webhook POST from KnowledgeDistillationService.trainStudentVLM(),
downloads the Qwen-format JSONL from Supabase Storage, runs QLoRA fine-tuning
via LLaMA-Factory on Qwen/Qwen2.5-VL-7B-Instruct, uploads the LoRA adapter
to Supabase Storage, then POSTs completion/failure back to the Next.js callback.

LLaMA-Factory benefits over custom HF Trainer:
  - Built-in DPO/RLHF support for future reward modeling
  - Multi-GPU training with DeepSpeed ZeRO
  - Proper Qwen2-VL template support (chat_template="qwen2_vl")
  - Curriculum learning, data mixing, eval suite
  - Checkpoint resume on failure

Deploy:
    modal deploy vlm_training_worker/modal_train.py
"""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
import os
import re
import subprocess
import tempfile
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import modal

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s — %(message)s")
logger = logging.getLogger("mint-vlm-train")

BASE_MODEL = "Qwen/Qwen2.5-VL-7B-Instruct"

vlm_image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        "torch==2.4.1",
        "torchvision==0.19.1",
        # LLaMA-Factory manages its own transformers/peft/trl versions
        "llamafactory>=0.9.3",
        "qwen-vl-utils==0.0.8",
        "datasets>=3.2.0",
        "supabase==2.10.0",
        "httpx==0.27.2",
        "pillow==11.0.0",
        "fastapi[standard]",
    )
    .env({"HF_HOME": "/model-cache", "TRANSFORMERS_CACHE": "/model-cache"})
)

model_cache = modal.Volume.from_name("mint-vlm-model-cache", create_if_missing=True)
adapter_store = modal.Volume.from_name("mint-vlm-adapters", create_if_missing=True)

app = modal.App("mint-ai-vlm-training", image=vlm_image)


@dataclass
class TrainingConfig:
    job_id: str
    model_version: str
    storage_path: str
    samples_count: int
    lora_rank: int = 16
    lora_alpha: int = 32
    batch_size: int = 2
    grad_accum: int = 4
    epochs: int = 3
    learning_rate: float = 2e-4
    max_seq_length: int = 2048
    validation_split: float = 0.1
    use_qlora: bool = False
    output_adapter_path: str = field(init=False)

    def __post_init__(self) -> None:
        self.output_adapter_path = f"vlm-adapters/{self.job_id}/lora-adapter"

    @classmethod
    def from_payload(cls, payload: dict[str, Any]) -> "TrainingConfig":
        cfg = payload.get("config", {})
        return cls(
            job_id=payload["jobId"],
            model_version=payload["modelVersion"],
            storage_path=payload["storagePath"],
            samples_count=payload.get("samplesCount", 0),
            lora_rank=int(cfg.get("loraRank", 16)),
            lora_alpha=int(cfg.get("loraAlpha", 32)),
            batch_size=int(cfg.get("batchSize", 2)),
            epochs=int(cfg.get("epochs", 3)),
            learning_rate=float(cfg.get("learningRate", 2e-4)),
            use_qlora=bool(cfg.get("useQLoRA", False)),
        )


# ---------------------------------------------------------------------------
# Supabase helpers
# ---------------------------------------------------------------------------
def _download_jsonl(storage_path: str) -> list[dict]:
    import httpx
    url = os.environ["SUPABASE_URL"].rstrip("/")
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    bucket, *rest = storage_path.split("/", 1)
    object_path = rest[0] if rest else storage_path

    logger.info("Downloading JSONL: %s", storage_path)
    resp = httpx.get(
        f"{url}/storage/v1/object/{bucket}/{object_path}",
        headers={"Authorization": f"Bearer {key}", "apikey": key},
        timeout=120, follow_redirects=True,
    )
    resp.raise_for_status()
    records = [json.loads(line) for line in resp.text.splitlines() if line.strip()]
    logger.info("Downloaded %d training examples", len(records))
    return records


_SUPABASE_MAX_BYTES = 48 * 1024 * 1024


def _upload_adapter(local_dir: Path, storage_path: str) -> None:
    import httpx
    url = os.environ["SUPABASE_URL"].rstrip("/")
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    bucket, *rest = storage_path.split("/", 1)
    prefix = rest[0] if rest else ""

    for fp in sorted(local_dir.rglob("*")):
        if not fp.is_file():
            continue
        rel = fp.relative_to(local_dir)
        obj_key = f"{prefix}/{rel}".lstrip("/")
        size = fp.stat().st_size
        if size > _SUPABASE_MAX_BYTES:
            logger.info("Skipping large file (%.1f MB): %s — in Modal Volume", size / 1_048_576, obj_key)
            continue
        logger.info("Uploading: %s (%d bytes)", obj_key, size)
        with open(fp, "rb") as fh:
            resp = httpx.put(
                f"{url}/storage/v1/object/{bucket}/{obj_key}",
                headers={"Authorization": f"Bearer {key}", "apikey": key,
                         "Content-Type": "application/octet-stream", "x-upsert": "true"},
                content=fh.read(), timeout=120,
            )
            if not resp.is_success:
                logger.error("Upload failed: %s — %d", obj_key, resp.status_code)
                resp.raise_for_status()


def _save_adapter_to_volume(local_dir: Path, job_id: str) -> None:
    import shutil
    dest = Path("/adapters") / job_id / "lora-adapter"
    dest.mkdir(parents=True, exist_ok=True)
    for src in sorted(local_dir.rglob("*")):
        if src.is_file():
            target = dest / src.relative_to(local_dir)
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, target)
    logger.info("Adapter copied to Volume: %s", dest)


def _post_callback(job_id: str, success: bool, adapter_storage_path: str | None,
                   metrics: dict, error_message: str | None = None) -> None:
    import httpx
    callback_url = os.environ.get("MINTENANCE_CALLBACK_URL", "")
    if not callback_url:
        return
    secret = os.environ.get("MINTENANCE_CALLBACK_SECRET", "")
    payload = json.dumps({"jobId": job_id, "success": success,
                          "adapterStoragePath": adapter_storage_path,
                          "metrics": metrics, "errorMessage": error_message})
    sig = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest() if secret else ""
    try:
        resp = httpx.post(callback_url, content=payload,
                          headers={"Content-Type": "application/json", "X-Mint-Signature": sig}, timeout=30)
        resp.raise_for_status()
        logger.info("Callback delivered: %d", resp.status_code)
    except Exception as exc:
        logger.error("Callback failed: %s", exc)


# ---------------------------------------------------------------------------
# LLaMA-Factory config generation
# ---------------------------------------------------------------------------
def _write_dataset_info(data_dir: Path, dataset_name: str) -> None:
    info = {
        dataset_name: {
            "file_name": "training_data.jsonl",
            "formatting": "sharegpt",
            "columns": {"messages": "messages"},
            "tags": {"role_tag": "role", "content_tag": "content"},
        }
    }
    with open(data_dir / "dataset_info.json", "w") as f:
        json.dump(info, f, indent=2)


def _write_train_config(config: TrainingConfig, data_dir: Path, output_dir: Path,
                        dataset_name: str, has_eval: bool) -> Path:
    lines = [
        f"model_name_or_path: {BASE_MODEL}",
        "cache_dir: /model-cache",
        "trust_remote_code: true",
        "",
        "stage: sft",
        "do_train: true",
        "finetuning_type: lora",
        f"lora_rank: {config.lora_rank}",
        f"lora_alpha: {config.lora_alpha}",
        "lora_dropout: 0.05",
        "lora_target: q_proj,k_proj,v_proj,o_proj,gate_proj,up_proj,down_proj",
    ]
    if config.use_qlora:
        lines += ["quantization_bit: 4", "quantization_method: bitsandbytes"]
    lines += [
        "",
        f"dataset_dir: {data_dir}",
        f"dataset: {dataset_name}",
        "template: qwen2_vl",
        f"cutoff_len: {config.max_seq_length}",
        "preprocessing_num_workers: 4",
        "",
        f"output_dir: {output_dir}",
        "overwrite_output_dir: true",
        f"per_device_train_batch_size: {config.batch_size}",
        f"gradient_accumulation_steps: {config.grad_accum}",
        f"learning_rate: {config.learning_rate}",
        f"num_train_epochs: {config.epochs}",
        "lr_scheduler_type: cosine",
        "warmup_ratio: 0.05",
        "bf16: true",
        "optim: adamw_torch",
        "logging_steps: 10",
        "save_strategy: epoch",
        "save_total_limit: 2",
        "report_to: none",
    ]
    if has_eval:
        lines += ["do_eval: true", "eval_strategy: epoch", "load_best_model_at_end: true"]

    cfg_path = data_dir / "train_config.yaml"
    with open(cfg_path, "w") as f:
        f.write("\n".join(lines) + "\n")
    logger.info("LLaMA-Factory config: %s", cfg_path)
    return cfg_path


# ---------------------------------------------------------------------------
# Training execution
# ---------------------------------------------------------------------------
def _prepare_data(records: list[dict], data_dir: Path, val_split: float) -> bool:
    import random
    random.seed(42)
    if val_split > 0 and len(records) > 20:
        random.shuffle(records)
        idx = max(1, int(len(records) * (1 - val_split)))
        train, val = records[:idx], records[idx:]
    else:
        train, val = records, []

    with open(data_dir / "training_data.jsonl", "w") as f:
        for r in train:
            f.write(json.dumps(r) + "\n")
    if val:
        with open(data_dir / "eval_data.jsonl", "w") as f:
            for r in val:
                f.write(json.dumps(r) + "\n")

    logger.info("Data: %d train, %d eval", len(train), len(val))
    return len(val) > 0


def _parse_metrics_from_output(stdout: str) -> tuple[float | None, float | None]:
    """Extract loss values from LLaMA-Factory stdout using regex."""
    train_loss = None
    eval_loss = None
    for line in stdout.splitlines():
        if "'loss'" in line and train_loss is None:
            m = re.search(r"'loss'\s*:\s*([\d.]+)", line)
            if m:
                train_loss = float(m.group(1))
        if "'eval_loss'" in line:
            m = re.search(r"'eval_loss'\s*:\s*([\d.]+)", line)
            if m:
                eval_loss = float(m.group(1))
    return train_loss, eval_loss


def _run_llamafactory_training(config: TrainingConfig, records: list[dict]) -> dict:
    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp = Path(tmp_dir)
        data_dir = tmp / "data"
        data_dir.mkdir()
        output_dir = tmp / "output"
        output_dir.mkdir()

        dataset_name = "mint_building_damage"
        has_eval = _prepare_data(records, data_dir, config.validation_split)
        _write_dataset_info(data_dir, dataset_name)
        cfg_path = _write_train_config(config, data_dir, output_dir, dataset_name, has_eval)

        logger.info("Starting LLaMA-Factory (epochs=%d, batch=%dx%d)...",
                     config.epochs, config.batch_size, config.grad_accum)
        t0 = time.time()

        result = subprocess.run(
            ["llamafactory-cli", "train", str(cfg_path)],
            capture_output=True, text=True, timeout=6000,
        )
        duration_s = int(time.time() - t0)

        if result.returncode != 0:
            logger.error("LLaMA-Factory failed:\n%s", result.stderr[-2000:])
            raise RuntimeError(f"llamafactory-cli exit {result.returncode}: {result.stderr[-500:]}")

        logger.info("Training complete in %ds", duration_s)

        train_loss, eval_loss = _parse_metrics_from_output(result.stdout)

        # Find adapter output
        adapter_local = output_dir
        checkpoints = sorted(output_dir.glob("checkpoint-*"))
        if checkpoints:
            adapter_local = checkpoints[-1]
        if not (adapter_local / "adapter_config.json").exists():
            if (output_dir / "adapter_config.json").exists():
                adapter_local = output_dir
            else:
                raise RuntimeError(f"No adapter_config.json in {output_dir}")

        _save_adapter_to_volume(adapter_local, config.job_id)
        _upload_adapter(adapter_local, f"training-data/{config.output_adapter_path}")

        metrics: dict[str, Any] = {
            "durationSeconds": duration_s,
            "samplesUsed": len(records),
            "loraRank": config.lora_rank,
            "epochs": config.epochs,
            "trainingFramework": "llamafactory",
            "baseModel": BASE_MODEL,
        }
        if train_loss is not None:
            metrics["finalTrainLoss"] = round(train_loss, 4)
        if eval_loss is not None:
            metrics["finalEvalLoss"] = round(eval_loss, 4)
        return metrics


# ---------------------------------------------------------------------------
# Modal endpoints
# ---------------------------------------------------------------------------
@app.function(
    gpu="A100-40GB",
    timeout=7200,
    memory=32768,
    volumes={"/model-cache": model_cache, "/adapters": adapter_store},
    secrets=[modal.Secret.from_name("mintenance-vlm-training")],
    retries=0,
)
def train(payload: dict[str, Any]) -> dict[str, Any]:
    config = TrainingConfig.from_payload(payload)
    logger.info("Job %s — %s, %d samples, llamafactory", config.job_id, BASE_MODEL, config.samples_count)
    try:
        records = _download_jsonl(config.storage_path)
        if len(records) < 10:
            raise ValueError(f"Too few examples: {len(records)}")
        metrics = _run_llamafactory_training(config, records)
        adapter_path = f"training-data/{config.output_adapter_path}"
        _post_callback(config.job_id, True, adapter_path, metrics)
        return {"status": "completed", "jobId": config.job_id, "metrics": metrics}
    except Exception as exc:
        error_msg = str(exc)
        logger.error("Job %s FAILED: %s", config.job_id, error_msg, exc_info=True)
        _post_callback(config.job_id, False, None, {}, error_msg)
        return {"status": "failed", "jobId": config.job_id, "error": error_msg}


@app.function(
    cpu=0.5, memory=512, timeout=30,
    secrets=[modal.Secret.from_name("mintenance-vlm-training")],
)
@modal.fastapi_endpoint(method="POST", label="mint-vlm-train")
def webhook(payload: dict[str, Any]) -> dict[str, Any]:
    secret = os.environ.get("MINTENANCE_WEBHOOK_SECRET", "")
    if not secret:
        return {"error": "Webhook auth not configured"}, 503  # type: ignore[return-value]
    provided_sig = payload.pop("authSignature", "")
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    expected = hmac.new(secret.encode(), canonical.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(str(provided_sig), expected):
        return {"error": "Unauthorized"}, 401  # type: ignore[return-value]
    missing = {"jobId", "modelVersion", "storagePath", "samplesCount", "config"} - set(payload.keys())
    if missing:
        return {"error": f"Missing: {missing}"}, 400  # type: ignore[return-value]
    logger.info("Webhook: job %s — spawning LLaMA-Factory training", payload["jobId"])
    train.spawn(payload)
    return {"status": "accepted", "jobId": payload["jobId"],
            "message": "Training queued (LLaMA-Factory)."}
