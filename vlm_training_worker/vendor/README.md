# Headless LLaMA-Factory 0.9.5

This worker uses the training CLI, not the Gradio web UI. Upstream 0.9.5 makes
Gradio mandatory; its supported Gradio range requires Pillow <12, conflicting
with our patched Pillow 13.0.0. The local distribution makes Gradio an optional
`webui` extra. Every upstream Python source file and license is unchanged.
The normal resolver still enforces all training dependencies. Do not install
`[webui]` alongside this worker's Pillow pin.

## Provenance and reproduction

- Upstream: https://pypi.org/project/llamafactory/0.9.5/
- Upstream wheel SHA-256: `10776e9b259798bf65f6c5343f6298f0302e92e9cd47472abe29eef69e286c6a`
- Local version: `0.9.5+mintenance.1`
- Local wheel SHA-256: `c4048f663f1283aecd359d5a3e3cc974fbc08dca208df3b0f04949db449ed032`

From the repository root:

```sh
python scripts/build_headless_llamafactory.py --check
python -m pip install -r vlm_training_worker/requirements.txt
python -m pip check
python -m unittest discover -s vlm_training_worker/tests -v
```

The build script downloads a fixed upstream wheel, verifies its SHA-256, changes
only METADATA (version and Gradio extra), renames the dist-info directory and
regenerates RECORD. Stored ZIP entries and fixed timestamps make reproduction
independent of compression-library versions. Omit `--check` to rebuild; use
`--upstream /path/to/upstream.whl` for offline verification. The upstream license
is preserved inside the wheel.

Modal copies this exact wheel into `/opt/wheels` before dependency installation
and resolves it with `--find-links`. No dependency checks are disabled. CI checks
reproduction and resolves the local requirements and both Modal images
for Linux/Python 3.11. The runtime test creates a tiny local Qwen model and trains
one LoRA step through the actual CLI without Gradio, downloads or GPU access.

When updating LLaMA-Factory, inspect the new upstream CLI/UI import boundaries,
update the verified source hash and metadata expectations, rebuild, then rerun
the resolver and training tests. Remove this local packaging change once upstream
supports a headless install with patched Pillow. This does not establish GPU,
QLoRA or production deployment compatibility.

# Transformers 4.57.6 security backport

The legacy requirements and both legacy Modal images use
`transformers==4.57.6+mintenance.1`. LLaMA-Factory 0.9.5 supports Transformers
`>=4.55.0,<=5.6.0` (with exclusions), while the two reported fixes ship in 5.10.1
and 5.14.0. This local wheel backports the upstream fixes without relaxing
LLaMA-Factory's dependency checks or changing its training APIs:

- [PR #46191](https://github.com/huggingface/transformers/pull/46191): reject named
  chat templates whose resolved output escapes the additional-template directory,
  in both tokenizer and processor `save_pretrained` (CVE-2026-9856 / AIKIDO-2026-262955).
- [PR #46890](https://github.com/huggingface/transformers/pull/46890): reject
  `transformers_weights` paths outside the model directory (AIKIDO-2026-614493).
  Upstream's lexical containment deliberately retains Hugging Face cache symlinks.

Provenance:

- [Upstream release](https://pypi.org/project/transformers/4.57.6/)
- Upstream wheel SHA-256: `4c9e9de11333ddfe5114bc872c9f370509198acf0b87a832a0ab9458e2bd0550`
- Local wheel SHA-256: `92012040669aa983b3dcd496e83189a28d496167c73744eeb320c6f42b81d4ae`
- Builder: `scripts/build_patched_transformers.py`; downloads the fixed upstream
  wheel, verifies its hash, applies exact source replacements and regenerates
  wheel metadata/RECORD. All other source, dependencies and licenses are unchanged.

```sh
python scripts/build_patched_transformers.py --check
python scripts/check_headless_dependencies.py  # requires uv
python -m unittest discover -s vlm_training_worker/tests -v
```

`--check` compares every uncompressed wheel entry with the rebuilt payload,
including RECORD; the packaging test separately verifies the checked-in archive's
SHA-256. Compression is used to avoid a large binary artifact, so a rebuild with
a different zlib revision may produce different archive bytes. Omit `--check` to
rebuild and use `--upstream PATH` for offline reproduction. If the archive changes,
review its payload and update the documented/tested archive hash together.

Both Modal definitions copy the wheel before normal dependency resolution via
`--find-links`. CI verifies reproduction, resolves all three Linux/Python 3.11
dependency sets, and runs offline traversal and valid-serialization regressions
on Linux (including cache symlinks). The full local runtime suite also exercises
LLaMA-Factory training and LoRA save/reload/merge. These CPU checks do not establish
GPU/QLoRA compatibility or deploy either image.

Version-based scanners may continue to flag the 4.57.6 base version. Do not suppress
the findings automatically: review this backport's provenance and behavioral
evidence. Replace the local wheel with an upstream patched release once a
compatible LLaMA-Factory release supports it. The separate production serving
pipeline under `scripts/vlm-training` is unchanged.
