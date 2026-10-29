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
reproduction and resolves both the local requirements and Modal training image
for Linux/Python 3.11. The runtime test creates a tiny local Qwen model and trains
one LoRA step through the actual CLI without Gradio, downloads or GPU access.

When updating LLaMA-Factory, inspect the new upstream CLI/UI import boundaries,
update the verified source hash and metadata expectations, rebuild, then rerun
the resolver and training tests. Remove this local packaging change once upstream
supports a headless install with patched Pillow. This does not establish GPU,
QLoRA or production deployment compatibility.
