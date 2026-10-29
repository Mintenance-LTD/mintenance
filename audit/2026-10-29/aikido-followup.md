# Aikido follow-up after PR #1435

Inspected the signed-in Aikido queue on 29 October 2026. It still reported
92 grouped issues, including the mobile workflow, PyTorch, command injection,
Markdown and node-forge findings addressed by PR #1435. Those entries said
last detected one day ago; this is not confirmation of a post-merge rescan.
The Aikido MCP issue/scan tools remain unavailable.

## Changes

Issue #1: protobuf denial of service through nested Any messages
- ID: 54457369
- Issue type: open_source
- Severity: 76 (High)
- Remediation: Require protobuf 7.36.2 in the legacy worker requirements,
  both Modal image definitions, active training input and serving input.
- Link: https://app.aikido.dev/queue?sidebarIssue=54457369

Aikido identified protobuf 4.25.9 and CVE-2026-0994. The serving lock already
contains 7.36.2; its package versions are unchanged. Explicit input pins prevent
an older transitive version from returning. Added behavior tests for nested Any
recursion-limit enforcement and a valid binary round trip, plus checks that all
model dependency inputs retain the pin. CI runs both native and pure Python
protobuf implementations without model downloads or GPU use.

Issue #2: Third-party GitHub Action is not pinned
- ID: 54457955
- Issue type: sast
- Severity: 70 (High)
- Remediation: Pin softprops/action-gh-release and the three official actions in
  demo-video.yml to full commits verified against their upstream major tags.
- Link: https://app.aikido.dev/issues/54457955/detail?status=open

Also removed Git ref interpolation from shell source. Render, workflow artifact
and release upload now consistently use out/demo.mp4. The artifact display name
still identifies the Git ref. Composition input passes through an environment
variable, must be a valid composition ID, and remains one quoted argument.
The existing security workflow now exercises the demo workflow too.

## Validation

- 36 workflow tests passed, including actual Bash execution of render arguments,
  rejection of shell payloads, and Android/iOS profile regressions.
- 14 model/protobuf CPU tests passed, including Qwen/SFT imports, LoRA
  train/save/reload/merge, torchvision operators and image preprocessing.
- All three protobuf tests also passed with the pure Python implementation.
- The recursion-limit test failed as expected on protobuf 4.25.9 in a separate
  ephemeral environment: the nested Any payload incorrectly parsed successfully.
- actionlint 1.7.12 passed for both changed workflows (external shellcheck and
  pyflakes disabled); the workflow tests separately check Bash syntax.
- uv resolved active training, legacy inference and production serving for
  Linux/Python 3.11 using wheels only. Production lock package versions did not change.

## Remaining limitations and triage

The legacy worker requirements and modal_train.py do NOT currently resolve.
LLaMA-Factory 0.9.5 requires Gradio <=5.50.0, which requires Pillow <12, while
this repository pins patched Pillow 13.0.0. Reproduced the identical error using
unchanged main's requirements. No newer LLaMA-Factory release is published on
PyPI at inspection. This pre-existing conflict remains; do not downgrade Pillow
or claim the full legacy image build passed. The previously recorded resolution
used Pillow 11.0.0 before the merge; it does not validate the final Pillow 13 stack.

The SQL groups 54458042 and 54457958 were inspected: the Python audit scripts
use synthetic UUIDs/fixture strings, SyncStore allowlists table identifiers, and
the encryption key is constrained to 64 hexadecimal characters and escaped.
The timing finding 54457964 compares two values from the same request, not a
stored password. No finding was suppressed or marked resolved in Aikido.
Other queue entries remain to be investigated. No Modal redeployment was done;
the production serving lock's protobuf version was already patched.

Sources:
- https://github.com/advisories/GHSA-7gcm-g887-7qv7
- https://github.com/protocolbuffers/protobuf/pull/25239
- https://pypi.org/pypi/llamafactory/0.9.5/json
- https://pillow.readthedocs.io/en/stable/releasenotes/12.3.0.html
