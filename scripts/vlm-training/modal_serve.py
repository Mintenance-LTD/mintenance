"""Serve Mint AI (Qwen2.5-VL-7B + LoRA) with an OpenAI-compatible API.

Recovered from /root/modal_serve.py in gloire/main/mint-ai-serve v6,
function fu-Xv8miC5Sub7n0SXzJhmJd4, on 2026-10-29.
The app/class/endpoint names, adapter volume, model and prompt are preserved.

Validate a candidate without replacing the deployed app:
    modal run --env main scripts/vlm-training/modal_serve.py::validate_candidate
Deploy after validation:
    modal deploy --env main scripts/vlm-training/modal_serve.py
Verify the deployed endpoint:
    modal run --env main scripts/vlm-training/modal_serve.py::verify_production
"""

import base64
import hmac
import importlib.metadata
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import time
import urllib.error
import urllib.request

import modal

# Install one resolved serving environment; never overlay the training stack.
IMAGE = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("git")
    .pip_install_from_requirements(str(Path(__file__).with_name("requirements-serve.lock")))
    .run_commands("python -m pip check")
)

ADAPTER_VOLUME = modal.Volume.from_name("mint-ai-adapters")
app = modal.App("mint-ai-serve", image=IMAGE)
HF_SECRET = modal.Secret.from_name("mint-ai-hf-token")
API_KEY_SECRET = modal.Secret.from_name("mint-ai-api-key")
BASE_MODEL = "Qwen/Qwen2.5-VL-7B-Instruct"
DEFAULT_ADAPTER_NAME = "mint-ai-vlm-v2"
PRODUCTION_URL = "https://gloire--mint-ai-serve-mintaiserver-openai.modal.run"
EXPECTED_VERSIONS = {"torch": "2.13.0", "torchvision": "0.28.0", "vllm": "0.32.0"}

# Preserve the prompt used to train the deployed adapter.
SYSTEM_PROMPT = (
    "You are Mint AI, a visual inspection assistant trained to detect "
    "building and infrastructure defects. For each image, return a JSON "
    "object with: detections (array of {bbox_2d: [x1,y1,x2,y2], label, "
    "confidence}), damageAssessment, safetyHazards, compliance, "
    "insuranceRisk, urgency, homeownerExplanation, contractorAdvice. "
    'Use 4-tier severity: "early" (cosmetic/minor), "developing" '
    '(progressing, needs attention), "significant" (serious, risk of '
    'spread), "dangerous" (structural/safety risk, urgent repair). '
    "Report bbox_2d in absolute pixel coordinates on the input image. "
    "Be precise, safety-conscious, and evidence-based."
)


def server_command(adapter_name: str, adapter_path: Path) -> list[str]:
    return [
        sys.executable, "-m", "vllm.entrypoints.openai.api_server",
        "--model", BASE_MODEL,
        "--served-model-name", f"mint-ai-{adapter_name.replace('mint-ai-vlm-', '')}",
        "--enable-lora", "--lora-modules", f"mint-ai-served={adapter_path}",
        "--max-loras", "1", "--max-lora-rank", "16",
        "--max-model-len", "4096", "--gpu-memory-utilization", "0.92",
        "--max-num-seqs", "4", "--enforce-eager",
        "--host", "127.0.0.1", "--port", "8000", "--dtype", "bfloat16",
    ]


def wait_for_server(proc, timeout: float = 900) -> None:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if proc.poll() is not None:
            raise RuntimeError(f"vLLM exited with code {proc.returncode}")
        try:
            with urllib.request.urlopen("http://127.0.0.1:8000/health", timeout=2):
                return
        except (urllib.error.URLError, ConnectionResetError, TimeoutError):
            time.sleep(1)
    proc.terminate()
    raise RuntimeError(f"vLLM failed to start within {timeout}s")


def create_web_app(adapter_name: str):
    from fastapi import FastAPI, Request
    from fastapi.responses import Response, StreamingResponse
    import httpx

    expected_api_key = os.environ.get("MINT_AI_API_KEY", "").strip()
    if not expected_api_key:
        raise RuntimeError("MINT_AI_API_KEY must be configured before serving")
    web = FastAPI(title="Mint AI")

    @web.get("/health")
    async def health():
        return {"status": "ok", "model": adapter_name, "adapter": adapter_name}

    @web.api_route("/v1/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
    async def proxy(request: Request, path: str):
        auth = request.headers.get("authorization", "")
        presented = auth[7:].strip() if auth.lower().startswith("bearer ") else auth.strip()
        if not hmac.compare_digest(presented.encode(), expected_api_key.encode()):
            return Response(content='{"error":"unauthorized"}', status_code=401,
                            media_type="application/json")
        body = await request.body()
        headers = {k: v for k, v in request.headers.items()
                   if k.lower() not in ("host", "content-length", "authorization")}
        if path == "chat/completions" and body:
            try:
                payload = json.loads(body)
                payload["model"] = "mint-ai-served"
                body = json.dumps(payload).encode()
            except (ValueError, TypeError):
                pass  # vLLM returns the validation error for malformed payloads.
        # Keep the client open until an SSE response has finished streaming.
        client = httpx.AsyncClient(timeout=300.0)
        try:
            upstream = await client.send(client.build_request(
                request.method, f"http://127.0.0.1:8000/v1/{path}",
                content=body, headers=headers, params=request.query_params,
            ), stream=True)
        except BaseException:
            await client.aclose()
            raise
        if "text/event-stream" in upstream.headers.get("content-type", ""):
            async def chunks():
                try:
                    async for chunk in upstream.aiter_bytes():
                        yield chunk
                finally:
                    await upstream.aclose()
                    await client.aclose()
            return StreamingResponse(chunks(), status_code=upstream.status_code,
                                     media_type="text/event-stream")
        try:
            return Response(content=await upstream.aread(), status_code=upstream.status_code,
                            media_type=upstream.headers.get("content-type"))
        finally:
            await upstream.aclose()
            await client.aclose()
    return web


def smoke_payload():
    """Use a synthetic image: no customer data or external image host required."""
    from PIL import Image
    buffer = io.BytesIO()
    Image.new("RGB", (224, 224), (180, 180, 180)).save(buffer, format="PNG")
    data_url = "data:image/png;base64," + base64.b64encode(buffer.getvalue()).decode("ascii")
    return {"model": "mint-ai-served", "messages": [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": [
            {"type": "image_url", "image_url": {"url": data_url}},
            {"type": "text", "text": "Inspect this image for defects. Return the full JSON assessment."},
        ]},
    ], "max_tokens": 128, "temperature": 0.2, "frequency_penalty": 0.5}


def check_completion(response):
    response.raise_for_status()
    result = response.json()
    content = result["choices"][0]["message"]["content"]
    if not isinstance(content, str) or not content.strip():
        raise RuntimeError("Model returned an empty completion")
    return {"model": result.get("model"), "completion_characters": len(content)}


@app.cls(gpu="A10G", timeout=20 * 60, startup_timeout=20 * 60,
         scaledown_window=300, volumes={"/adapters": ADAPTER_VOLUME},
         secrets=[HF_SECRET, API_KEY_SECRET], memory=32 * 1024)
@modal.concurrent(max_inputs=4)
class MintAIServer:
    adapter_name: str = modal.parameter(default=DEFAULT_ADAPTER_NAME)

    @modal.enter()
    def load_model(self):
        os.environ.setdefault("HF_HOME", "/adapters/.hf_cache")
        Path(os.environ["HF_HOME"]).mkdir(parents=True, exist_ok=True)
        adapter_path = Path(f"/adapters/{self.adapter_name}/final")
        if not adapter_path.exists():
            raise RuntimeError(f"Adapter {adapter_path} not found")
        self.proc = subprocess.Popen(server_command(self.adapter_name, adapter_path), shell=False)
        wait_for_server(self.proc)

    @modal.exit()
    def cleanup(self):
        if hasattr(self, "proc") and self.proc.poll() is None:
            self.proc.terminate()
            self.proc.wait(timeout=10)

    @modal.asgi_app()
    def openai(self):
        return create_web_app(self.adapter_name)

    @modal.method()
    def validate(self):
        import httpx
        import torch
        import torchvision
        versions = {name: importlib.metadata.version(name) for name in EXPECTED_VERSIONS}
        for name, expected in EXPECTED_VERSIONS.items():
            if versions[name].split("+")[0] != expected:
                raise RuntimeError(f"Unexpected {name} version: {versions[name]}")
        if not torch.cuda.is_available():
            raise RuntimeError("CUDA unavailable")
        boxes = torch.tensor([[0., 0., 10., 10.]], device="cuda")
        assert torchvision.ops.nms(boxes, torch.tensor([1.], device="cuda"), 0.5).tolist() == [0]
        models = httpx.get("http://127.0.0.1:8000/v1/models", timeout=30)
        models.raise_for_status()
        assert "mint-ai-served" in {model["id"] for model in models.json()["data"]}
        result = check_completion(httpx.post("http://127.0.0.1:8000/v1/chat/completions",
                                            json=smoke_payload(), timeout=300))
        return {"versions": versions, "gpu": torch.cuda.get_device_name(), **result}


@app.local_entrypoint()
def validate_candidate():
    print(json.dumps(MintAIServer().validate.remote(), indent=2))


@app.function(image=modal.Image.debian_slim(python_version="3.11").pip_install(
    "httpx==0.28.1", "pillow==12.3.0"), secrets=[API_KEY_SECRET], timeout=20 * 60)
def verify_endpoint():
    import httpx
    key = os.environ["MINT_AI_API_KEY"]
    with httpx.Client(timeout=900) as client:
        health = client.get(PRODUCTION_URL + "/health")
        health.raise_for_status()
        assert health.json()["adapter"] == DEFAULT_ADAPTER_NAME
        assert client.get(PRODUCTION_URL + "/v1/models").status_code == 401
        headers = {"Authorization": f"Bearer {key}"}
        models = client.get(PRODUCTION_URL + "/v1/models", headers=headers)
        models.raise_for_status()
        assert "mint-ai-served" in {item["id"] for item in models.json()["data"]}
        return check_completion(client.post(PRODUCTION_URL + "/v1/chat/completions",
                                            headers=headers, json=smoke_payload()))


@app.local_entrypoint()
def verify_production():
    deployed = modal.Cls.from_name("mint-ai-serve", "MintAIServer", environment_name="main")
    print(json.dumps(deployed().validate.remote(), indent=2))
    print(json.dumps(verify_endpoint.remote(), indent=2))
