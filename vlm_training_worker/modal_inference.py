"""
Mint AI VLM Inference Endpoint — Modal Serverless GPU
======================================================
Serves the fine-tuned Qwen2.5-VL-7B-Instruct + LoRA adapter as an
OpenAI-compatible /v1/chat/completions endpoint.

The existing AssessmentGenerator.callMintAiVLM() already speaks the
OpenAI chat completions wire format — this endpoint is a drop-in
replacement for GPT-4o once you set:

    MINT_AI_VLM_ENDPOINT=https://<your-modal-app>--mint-vlm-infer.modal.run/v1/chat/completions
    MINT_AI_VLM_API_KEY=<MINTENANCE_INFERENCE_SECRET>

Deploy:
    modal deploy vlm_training_worker/modal_inference.py

Set these Modal secrets (modal secret create mintenance-vlm-inference ...):
    SUPABASE_URL                  - your Supabase project URL
    SUPABASE_SERVICE_ROLE_KEY     - to fetch latest adapter path from DB
    MINTENANCE_INFERENCE_SECRET   - bearer token the Next.js app sends (recommended)

Scale-to-zero behaviour:
    - min_containers=0 -> zero cost when idle
    - Cold start: ~30-60s (model load). After first request, container stays warm.
    - Set min_containers=1 in production to eliminate cold starts (~$26/mo always-on).
"""

from __future__ import annotations

import hmac
import logging
import os
import time
from pathlib import Path
from typing import Any

import modal

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s - %(message)s")
logger = logging.getLogger("mint-vlm-infer")

BASE_MODEL = "Qwen/Qwen2.5-VL-7B-Instruct"
DEFAULT_MAX_NEW_TOKENS = 2000
DEFAULT_TEMPERATURE = 0.1

# ---------------------------------------------------------------------------
# Modal image — same base as training but lighter (no training libs needed)
# ---------------------------------------------------------------------------
infer_image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        "torch==2.4.1",
        "torchvision==0.19.1",
        "transformers>=4.49.2",  # 4.49.2+ required for Qwen2_5_VLForConditionalGeneration
        "peft==0.13.2",
        "accelerate==1.2.1",
        "qwen-vl-utils==0.0.8",
        "supabase==2.10.0",
        "httpx==0.27.2",
        "pillow==11.0.0",
        "fastapi==0.115.5",
        "uvicorn==0.32.1",
    )
    .env({"HF_HOME": "/model-cache", "TRANSFORMERS_CACHE": "/model-cache"})
)

model_cache = modal.Volume.from_name("mint-vlm-model-cache", create_if_missing=True)
adapter_store = modal.Volume.from_name("mint-vlm-adapters", create_if_missing=True)

app = modal.App("mint-ai-vlm-inference", image=infer_image)


# ---------------------------------------------------------------------------
# Model class — loaded once per container (not per request)
# ---------------------------------------------------------------------------
@app.cls(
    gpu="A10G",                         # A10G 24GB ~$1.10/hr — needed for 7B param inference
    timeout=300,                       # 5 min: cold start (60-90s model load) + inference
    memory=16384,
    min_containers=0,                  # scale to zero; set to 1 for always-warm serving
    volumes={
        "/model-cache": model_cache,
        "/adapters": adapter_store,
    },
    secrets=[modal.Secret.from_name("mintenance-vlm-inference")],
)
class MintVLM:
    model: Any
    processor: Any
    adapter_path: str | None

    @modal.enter()
    def load(self) -> None:
        """Load base model + latest LoRA adapter on container startup."""
        import torch
        from peft import PeftModel
        from transformers import AutoProcessor, Qwen2_5_VLForConditionalGeneration

        logger.info("Loading base model: %s", BASE_MODEL)
        self.processor = AutoProcessor.from_pretrained(
            BASE_MODEL,
            trust_remote_code=True,
            cache_dir="/model-cache",
        )
        base_model = Qwen2_5_VLForConditionalGeneration.from_pretrained(
            BASE_MODEL,
            torch_dtype=torch.bfloat16,
            device_map="auto",
            trust_remote_code=True,
            cache_dir="/model-cache",
        )

        # Attempt to load the latest trained LoRA adapter from Supabase DB
        self.adapter_path = self._find_latest_adapter()
        if self.adapter_path:
            logger.info("Loading LoRA adapter from: %s", self.adapter_path)
            try:
                peft_model = PeftModel.from_pretrained(base_model, self.adapter_path)
                self.model = peft_model.merge_and_unload()  # merge weights for faster inference
                logger.info("LoRA adapter merged successfully")
            except Exception as exc:  # noqa: BLE001
                logger.warning("Failed to load LoRA adapter (%s) - using base model only", exc)
                self.model = base_model
        else:
            logger.info("No LoRA adapter found - using base model (pre-distillation mode)")
            self.model = base_model

        self.model.eval()
        logger.info("Model ready for inference")

    def _find_latest_adapter(self) -> str | None:
        """
        Query Supabase for the most recent completed vlm_distillation job
        and return the local path to the adapter (if it exists in the volume).
        Returns None if no adapter is available yet.
        """
        try:
            import httpx

            url = os.environ.get("SUPABASE_URL", "").rstrip("/")
            key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
            if not url or not key:
                return None

            resp = httpx.get(
                f"{url}/rest/v1/knowledge_distillation_jobs",
                params={
                    "job_type": "eq.vlm_distillation",
                    "status": "eq.completed",
                    "order": "completed_at.desc",
                    "limit": "1",
                    "select": "output_model_path,id",
                },
                headers={"Authorization": f"Bearer {key}", "apikey": key},
                timeout=10,
            )
            if resp.status_code == 200:
                rows = resp.json()
                if rows:
                    path = rows[0].get("output_model_path", "")
                    # path is e.g. "training-data/vlm-adapters/<jobId>/lora-adapter"
                    # The Volume is mounted at /adapters; strip the bucket prefix
                    relative = path.removeprefix("training-data/")
                    local = Path("/adapters") / relative
                    if local.exists():
                        return str(local)
                    logger.info(
                        "Adapter path %s not in volume yet (training may still be in progress)",
                        local,
                    )
        except Exception as exc:  # noqa: BLE001
            logger.warning("Could not query Supabase for adapter path: %s", exc)
        return None

    def _convert_messages_for_qwen(self, messages: list[dict]) -> list[dict]:
        """
        Convert OpenAI-format messages to the format expected by Qwen2.5-VL.

        OpenAI format:
          content = [{ type: "text", text: "..." }, { type: "image_url", image_url: { url: "..." } }]

        Qwen format:
          content = [{ type: "text", text: "..." }, { type: "image", image: "<url or data-uri>" }]

        qwen_vl_utils.process_vision_info() then downloads/decodes the images.
        """
        converted: list[dict] = []
        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")

            if isinstance(content, str):
                converted.append({"role": role, "content": content})
            elif isinstance(content, list):
                qwen_content: list[dict] = []
                for item in content:
                    if not isinstance(item, dict):
                        continue
                    if item.get("type") == "text":
                        qwen_content.append({"type": "text", "text": item.get("text", "")})
                    elif item.get("type") == "image_url":
                        # OpenAI: { image_url: { url: "..." } }
                        # Qwen:   { image: "<url or data-uri>" }
                        url = (item.get("image_url") or {}).get("url", "")
                        if url:
                            qwen_content.append({"type": "image", "image": url})
                converted.append({"role": role, "content": qwen_content})

        return converted

    @modal.method()
    def generate(
        self,
        messages: list[dict],
        max_new_tokens: int = DEFAULT_MAX_NEW_TOKENS,
        temperature: float = DEFAULT_TEMPERATURE,
    ) -> dict[str, Any]:
        """Generate a completion with full multimodal support. Returns an OpenAI-compatible response dict."""
        import torch
        from qwen_vl_utils import process_vision_info

        # Convert OpenAI-format messages to Qwen2.5-VL format (image_url -> image)
        qwen_messages = self._convert_messages_for_qwen(messages)

        # Build the text prompt using the model's chat template
        text_prompt = self.processor.apply_chat_template(
            qwen_messages,
            tokenize=False,
            add_generation_prompt=True,
        )

        # Extract image tensors — handles HTTPS URLs and base64 data-URIs
        image_inputs, video_inputs = process_vision_info(qwen_messages)

        inputs = self.processor(
            text=[text_prompt],
            images=image_inputs if image_inputs else None,
            videos=video_inputs if video_inputs else None,
            padding=True,
            return_tensors="pt",
        ).to(self.model.device)

        prompt_len = inputs["input_ids"].shape[-1]

        t0 = time.time()
        with torch.no_grad():
            output_ids = self.model.generate(
                **inputs,
                max_new_tokens=max_new_tokens,
                temperature=max(temperature, 1e-6),
                do_sample=(temperature > 0.01),
                pad_token_id=self.processor.tokenizer.eos_token_id,
                eos_token_id=self.processor.tokenizer.eos_token_id,
            )
        latency_ms = int((time.time() - t0) * 1000)

        # Decode only the newly generated tokens (not the prompt tokens)
        generated_text = self.processor.decode(
            output_ids[0][prompt_len:],
            skip_special_tokens=True,
        ).strip()

        # Strip markdown code fences — the base model sometimes wraps JSON in ```json...```
        # despite explicit "no markdown" instructions. This is safe for pure JSON output.
        if generated_text.startswith("```"):
            lines = generated_text.split("\n")
            # Drop the opening fence line (```json or ```)
            lines = lines[1:]
            # Drop the closing fence line if present
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            generated_text = "\n".join(lines).strip()

        completion_token_count = output_ids.shape[-1] - prompt_len

        logger.info(
            "Generated %d tokens in %dms (prompt_tokens=%d, images=%d)",
            completion_token_count,
            latency_ms,
            prompt_len,
            len(image_inputs) if image_inputs else 0,
        )

        # OpenAI-compatible chat completions response format
        return {
            "id": f"chatcmpl-mint-{int(time.time())}",
            "object": "chat.completion",
            "created": int(time.time()),
            "model": "mint-ai-vlm",
            "choices": [
                {
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": generated_text,
                    },
                    "finish_reason": "stop",
                }
            ],
            "usage": {
                "prompt_tokens": prompt_len,
                "completion_tokens": completion_token_count,
                "total_tokens": prompt_len + completion_token_count,
            },
        }


# ---------------------------------------------------------------------------
# FastAPI web app — OpenAI-compatible /v1/chat/completions
# ---------------------------------------------------------------------------
from fastapi import FastAPI, HTTPException, Request  # noqa: E402
from fastapi.responses import JSONResponse  # noqa: E402

web_app = FastAPI(
    title="Mint AI VLM",
    description="OpenAI-compatible inference endpoint for Qwen2.5-VL-7B",
)


def _verify_auth(request: Request) -> bool:
    """Bearer token auth — configure MINTENANCE_INFERENCE_SECRET in Modal secrets.

    SECURITY: Fails CLOSED — if the secret is not configured, all requests are
    rejected. This prevents accidental exposure when Modal secrets are misconfigured.
    """
    secret = os.environ.get("MINTENANCE_INFERENCE_SECRET", "")
    if not secret:
        logger.error("MINTENANCE_INFERENCE_SECRET not configured — denying all inference requests")
        return False  # fail closed: deny all when secret is not set
    auth = request.headers.get("Authorization", "")
    return hmac.compare_digest(auth, f"Bearer {secret}")


@web_app.post("/v1/chat/completions")
async def chat_completions(request: Request) -> JSONResponse:
    """
    OpenAI-compatible chat completions endpoint.
    AssessmentGenerator.callMintAiVLM() posts here when MINT_AI_VLM_ENDPOINT is set.
    """
    if not _verify_auth(request):
        raise HTTPException(status_code=401, detail="Unauthorized")

    body = await request.json()
    messages: list[dict] = body.get("messages", [])
    max_new_tokens = int(body.get("max_tokens", DEFAULT_MAX_NEW_TOKENS))
    temperature = float(body.get("temperature", DEFAULT_TEMPERATURE))

    if not messages:
        raise HTTPException(status_code=400, detail="'messages' is required and must not be empty")

    vlm = MintVLM()
    result = await vlm.generate.remote.aio(
        messages,
        max_new_tokens=max_new_tokens,
        temperature=temperature,
    )
    return JSONResponse(content=result)


@web_app.get("/health")
async def health() -> JSONResponse:
    """Liveness probe — returns 200 when the endpoint is up."""
    return JSONResponse({"status": "ok", "model": "mint-ai-vlm", "base": BASE_MODEL})


@app.function(
    memory=256,
    timeout=360,                       # 6 min: outlasts MintVLM.generate 300s timeout + overhead
    secrets=[modal.Secret.from_name("mintenance-vlm-inference")],
)
@modal.asgi_app(label="mint-vlm-infer")
def fastapi_app() -> FastAPI:
    return web_app
