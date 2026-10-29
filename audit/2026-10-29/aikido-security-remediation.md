# Aikido security remediation — 2026-10-29

## Changes

- Mobile build profile selection, Android/iOS commands, and summaries pass values
  through environment variables rather than inserting expressions into shell source.
  Only development, staging, and production profiles reach EAS.
- ModelEvaluationService invokes Python with execFileSync and shell disabled,
  preserving paths and options as separate arguments.
- The legacy worker requirements and both Modal image definitions use
  torch 2.13.0 / torchvision 0.28.0.
- The legacy training stack uses LLaMA-Factory 0.9.5, TRL 0.24.0,
  PEFT 0.18.1, Transformers 4.57.6, and Accelerate 1.11.0. These satisfy
  the published LLaMA-Factory constraints. Shared inference dependencies match
  training so that adapters can be loaded with the same library versions.
- scripts/vlm-training/requirements-vlm.in previously allowed torch >=2.4;
  it now pins the same patched torch/torchvision pair.

## Validation

- 49 web tests passed: model evaluation argument safety/failure handling,
  distillation, and VLM callback durability.
- 26 Node tests passed: mobile workflow behavior/injection regression tests
  and reviewed VLM dataset export/splitting.
- 11 CPU model-stack tests passed, including Qwen/SFT API imports, a small
  LoRA training step, adapter save/reload/merge, weights-only checkpoint loading,
  torchvision NMS, and image preprocessing.
- 4 Python reviewed-split tests passed.
- actionlint 1.7.12 validated the workflow (external ShellCheck/Pyflakes disabled).
- All four dependency inputs resolved with uv for Linux x86_64 / Python 3.11,
  using wheels only: legacy requirements, training image, inference image,
  and scripts/vlm-training/requirements-vlm.in.
- CPU execution used an isolated Windows Python 3.12 environment. GPU execution,
  full-size Qwen weights, and deployment were not exercised.
- Aikido MCP scan tools were unavailable; a server-side rescan is still needed.

Reproduce the local regression checks from the repository root:

```sh
node --test scripts/__tests__/mobile-build-workflow.test.cjs scripts/vlm-training/reviewed-bootstrap.test.mjs scripts/vlm-training/split-reviewed-sites.test.mjs
npm run test:web -- run lib/services/building-surveyor/__tests__/ModelEvaluationService.test.ts lib/services/building-surveyor/__tests__/distillation.test.ts __tests__/api/training/vlm-callback.test.ts
python -m unittest discover -s vlm_training_worker/tests -v
python -m unittest discover -s scripts/vlm-training -p 'test_*.py' -v
```

The Node workflow tests require Bash (or BASH_PATH). The CPU smoke tests require
the pinned torch/vision, Transformers, PEFT, TRL, and Accelerate stack.

## Initial production v6 inspection

The legacy worker README calls scripts/vlm-training/modal_train.py and
modal_serve.py the deployed pipeline. Neither file exists on GitHub main, in
the available local Git history, or in the searched Downloads/Documents/OneDrive
copies. The tracked alternatives are train_qwen_vlm.py and serve_qwen_vlm.py;
the latter launches a separately installed vLLM.

Authenticated, read-only inspection of Modal confirmed the production deployment
in workspace `gloire`, environment `main`, app `mint-ai-serve`, version `v6`
(April 23, 11:14:22 UTC according to the CLI). The function is `MintAIServer.*`, ID
`fu-Xv8miC5Sub7n0SXzJhmJd4`, configured for A10G. Its Python Environment panel
reports Python 3.11.12 and the following installed packages:

| Package | Deployed version |
| --- | --- |
| torch | 2.5.1+cu121 |
| torchvision | 0.20.1+cu121 |
| torchaudio | 2.5.1 |
| vllm | 0.7.3 |
| transformers | 4.49.0 |
| xformers | 0.0.28.post3 |

The missing serving source is present inside that deployment at
`/root/modal_serve.py` (337 lines, 13.7 KiB), visible in the function's Files tab.
Lines 50-68 explicitly install torch 2.5.1 / torchvision 0.20.1 from the CUDA 12.1
index, followed by vLLM 0.7.3 and Transformers 4.49.0. The source identifies the
deployment command as `modal deploy scripts/vlm-training/modal_serve.py` and the
default adapter as `mint-ai-vlm-v2`. This establishes where a recoverable copy of
the missing serving source lives; it does not establish its original checkout.

**Production v6 was affected by the vulnerable PyTorch versions.** Updating
the repository training requirements and legacy image definitions does not
update this independently deployed image. The dashboard showed zero live
containers at inspection, so this is deployed-image metadata, not an in-process
runtime probe. No inference request, GPU job, or deployment was triggered.

That finding led to the recovery and deployment described below. The serving
environment remains separate from the validated LLaMA-Factory training stack.

Evidence: [Modal production function details](https://modal.com/apps/gloire/main/deployed/mint-ai-serve?activeTab=functions&functionId=fu-Xv8miC5Sub7n0SXzJhmJd4&functionSection=details),
[deployed serving source](https://modal.com/apps/gloire/main/deployed/mint-ai-serve?activeTab=functions&functionId=fu-Xv8miC5Sub7n0SXzJhmJd4&functionSection=files&file=root%2Fmodal_serve.py).

## Production v7 remediation and verification

Recovered all 337 lines of the deployed v6 source through Modal's file viewer.
SHA-256 of the recovered UTF-8/LF text:
`968f187ebf891cd9a8cf84c3757237e05e839320e3b9860d2e1e5dc7c15cb11f`.
The maintained source is now `scripts/vlm-training/modal_serve.py`.

- Added a separate, fully pinned `requirements-serve.lock`, resolved for
  Linux x86_64 / Python 3.11 / glibc 2.36. Installed the complete stack together
  and ran `pip check` inside the actual Modal image with no broken requirements.
- Serving versions: torch 2.13.0, torchvision 0.28.0, vLLM 0.32.0,
  torchaudio 2.11.0 (as required by vLLM), Transformers 5.19.0 and Pillow 13.0.0.
  The new vLLM stack does not require the old xformers package.
- Preserved the app/class/endpoint names, A10G, adapter volume, base model,
  adapter name `mint-ai-vlm-v2`, LoRA rank, model alias and training prompt.
- Enforced API-key presence, used constant-time key comparison, bound the
  internal vLLM listener to loopback, and removed remote-code trust (native
  Qwen support was verified). Kept upstream streaming connections open until
  completion and closed them on success/failure.
- Limited engine scheduling to four sequences and used eager execution to
  avoid CUDA graph/compilation memory overhead on A10G. The candidate fit with
  2.55 GiB of KV cache. This is a functional smoke test, not a throughput or
  model-quality benchmark.

Validation after recovery:

- 19 CPU tests passed: 15 serving/auth/proxy/startup regressions and four
  existing reviewed-dataset split tests. The proxy tests used the same FastAPI,
  Starlette and HTTPX versions as the serving lock.
- `pip-audit` checked all 197 pinned dependencies: no known vulnerabilities,
  no skipped packages. This does not replace the unavailable Aikido SAST rescan.
- Candidate [A10G run](https://modal.com/apps/gloire/main/ap-qtMBxUolu4GTYPSO9dzZWN)
  loaded the actual adapter, passed CUDA torchvision NMS, confirmed installed
  package versions, and generated a 488-character response to a synthetic image.
- Deployed source commit `d0b7abef74649576328f01dcf5613adf7b238c30` as production
  **v7** at **2026-10-29 20:28:50 UTC**, tag `security-d0b7abef`, using Modal 1.6.3.
- [Post-deployment verification](https://modal.com/apps/gloire/main/ap-zBYTVJW0b1A3RfPNXUXHZn)
  confirmed the production GPU runs torch 2.13.0 / torchvision 0.28.0 / vLLM
  0.32.0, passed another CUDA operator/model test, and checked the stable public
  endpoint: health 200 with the correct adapter, unauthenticated models 401,
  authenticated models 200 with `mint-ai-served`, and image completion 200 with
  a nonempty 488-character response. No customer data was used.

The user authorized a two-hour Modal CLI token for this operation. Its local
configuration was temporary and was removed after verification; the token expires
automatically. The production app keeps its existing five-minute scale-to-zero
window and existing API-key/Hugging Face secrets.

Sources: [LLaMA-Factory 0.9.5 metadata](https://pypi.org/pypi/llamafactory/0.9.5/json),
[torchvision compatibility](https://github.com/pytorch/vision#installation),
[PyTorch checkpoint advisory](https://github.com/pytorch/pytorch/security/advisories/GHSA-63cw-57p8-fm3p).
