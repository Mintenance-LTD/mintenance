# Mint AI capture quality milestone

The current model remains unchanged. No additional paid model calls were made.

## Implemented

The still-photo validation stage now supports a pixel-based capture gate via
`MINT_PHOTO_QUALITY_GATE_ENABLED=true`. The flag is off unless explicitly set; it has not been
enabled on a deployed environment in this milestone.

Checks run before evidence collection in BuildingSurveyorService. They reject photos smaller than
128 pixels on either side, or with at least 98% of grayscale pixels at the extreme dark/bright
thresholds (8/247). Download size, timeout, decoded pixel count and supported formats are bounded.
Remote downloads use the existing SSRF-resistant fetch helper. Decode/download errors remain
technical errors rather than being labelled healthy or insufficient evidence.

A rejected photo raises the existing insufficient-evidence outcome, with a photo number and
recapture instruction in the error. Existing asynchronous status responses still show the general
recapture message. Mixed local/remote image ordering is preserved; bad photos are not silently
removed from a batch.

Low detail is diagnostic only: a smooth healthy wall must not automatically be called blurry. The
gate does not certify that a photo is assessable.

## Offline evaluation

| Existing pilot group          | Rejected / total |
| ----------------------------- | ---------------: |
| Original concrete photos      |          0 / 160 |
| Deliberately darkened         |          10 / 10 |
| Deliberately overexposed      |          10 / 10 |
| Deliberately blurred          |           0 / 10 |
| Low resolution, then enlarged |           0 / 10 |

These are development diagnostics on synthetic transformations. Independent human assessability
labels and fresh site images are still needed. In particular, blur and upscaled pixelation remain
open problems. Pure white building surfaces can also trigger the exposure threshold; staging review
must measure this.

Reproduce with `node node_modules/tsx/dist/cli.mjs scripts/mint-eval/check_capture_quality.ts`.
Per-image results are in `.vercel/mint-eval/capture-quality-v1.json`.

## Reviewer collection priorities

Use the existing pilot review sheet and paired response gallery for diagnosis, not training. Collect
a separate consented set for student training. Each example needs an asset/site identifier, original
image and capture date, image hash, reviewer identity, review date, visible defect label, image
location, assessability and any unresolved uncertainty. Review without displaying the teacher answer
first; then adjudicate disagreement. Preserve original and corrected labels.

Start with crack misses, joints/shadows that resemble cracks, intact smooth surfaces, darkness/glare
and genuine handheld blur. Add damp, corrosion and surface loss as separately labelled tasks. Split
by site before selecting images; keep all near-duplicates, crops and video frames from a site in the
same split.

Human-reviewed examples remain required by the existing export safeguards. No new labels have been
fabricated, marked reviewed, or used for training.

## Remaining staging work

Enable the flag on a preview deployment and exercise upload → assessment → recapture with an
authenticated test user. Check mixed-photo batches and genuine white surfaces. The observation-only
stage and reviewed-data provenance/split automation remain subsequent milestones; neither is claimed
complete here.
