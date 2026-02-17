#!/usr/bin/env python3
"""
Serve fine-tuned Qwen2.5-VL with vLLM (OpenAI-compatible API).

Exposes /v1/chat/completions which callMintAiVLM() already calls.
Supports LoRA hot-swapping for zero-downtime adapter updates.

Usage:
    python serve_qwen_vlm.py \
        --model Qwen/Qwen2.5-VL-3B-Instruct \
        --lora-adapter ./adapters/mint-vlm-v1/adapter \
        --port 8000

    # Update adapter without restart:
    curl -X POST http://localhost:8000/v1/load-adapter \
        -d '{"path": "./adapters/mint-vlm-v2/adapter"}'
"""

import argparse
import subprocess
import sys


def main():
    parser = argparse.ArgumentParser(description="Serve Qwen2.5-VL with vLLM")
    parser.add_argument("--model", default="Qwen/Qwen2.5-VL-3B-Instruct", help="Base model")
    parser.add_argument("--lora-adapter", default=None, help="Path to LoRA adapter directory")
    parser.add_argument("--port", type=int, default=8000, help="Server port")
    parser.add_argument("--host", default="0.0.0.0", help="Server host")
    parser.add_argument("--gpu-memory-utilization", type=float, default=0.85, help="GPU memory fraction")
    parser.add_argument("--max-model-len", type=int, default=4096, help="Max sequence length")
    parser.add_argument("--quantization", default="awq", help="Quantization method (awq, gptq, None)")
    args = parser.parse_args()

    cmd = [
        sys.executable, "-m", "vllm.entrypoints.openai.api_server",
        "--model", args.model,
        "--served-model-name", "mint-ai-vlm",
        "--port", str(args.port),
        "--host", args.host,
        "--gpu-memory-utilization", str(args.gpu_memory_utilization),
        "--max-model-len", str(args.max_model_len),
        "--trust-remote-code",
        "--enable-lora",
        "--max-lora-rank", "32",
    ]

    if args.lora_adapter:
        cmd.extend(["--lora-modules", f"mint-ai-vlm={args.lora_adapter}"])

    if args.quantization and args.quantization.lower() != "none":
        cmd.extend(["--quantization", args.quantization])

    print(f"Starting vLLM server on {args.host}:{args.port}")
    print(f"  Model: {args.model}")
    if args.lora_adapter:
        print(f"  LoRA: {args.lora_adapter}")
    print(f"  Endpoint: http://{args.host}:{args.port}/v1/chat/completions")

    try:
        subprocess.run(cmd, check=True)
    except KeyboardInterrupt:
        print("\nServer stopped.")
    except FileNotFoundError:
        print("Error: vLLM not installed. Run: pip install vllm", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
