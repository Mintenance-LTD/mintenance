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

## Production evidence and remaining verification

The legacy worker README calls scripts/vlm-training/modal_train.py and
modal_serve.py the deployed pipeline. Neither file exists on GitHub main, in
the available local Git history, or in the searched Downloads/Documents/OneDrive
copies. The tracked alternatives are train_qwen_vlm.py and serve_qwen_vlm.py;
the latter launches a separately installed vLLM.

Authenticated, read-only inspection of Modal confirmed the production deployment
in workspace `gloire`, environment `main`, app `mint-ai-serve`, version `v6`
(April 23, 12:14:23 GMT). The function is `MintAIServer.*`, ID
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

**Production is still affected by the vulnerable PyTorch versions.** Updating
the repository training requirements and legacy image definitions does not
update this independently deployed image. The dashboard showed zero live
containers at inspection, so this is deployed-image metadata, not an in-process
runtime probe. No inference request, GPU job, or deployment was triggered.

The production follow-up is to recover `/root/modal_serve.py`, upgrade and resolve
its complete vLLM/torch/vision/audio/xformers serving stack together, then run
an A10G model-and-adapter smoke test before replacing production. Keep that
serving environment separate from the validated LLaMA-Factory training stack.

Evidence: [Modal production function details](https://modal.com/apps/gloire/main/deployed/mint-ai-serve?activeTab=functions&functionId=fu-Xv8miC5Sub7n0SXzJhmJd4&functionSection=details),
[deployed serving source](https://modal.com/apps/gloire/main/deployed/mint-ai-serve?activeTab=functions&functionId=fu-Xv8miC5Sub7n0SXzJhmJd4&functionSection=files&file=root%2Fmodal_serve.py).

Sources: [LLaMA-Factory 0.9.5 metadata](https://pypi.org/pypi/llamafactory/0.9.5/json),
[torchvision compatibility](https://github.com/pytorch/vision#installation),
[PyTorch checkpoint advisory](https://github.com/pytorch/pytorch/security/advisories/GHSA-63cw-57p8-fm3p).
