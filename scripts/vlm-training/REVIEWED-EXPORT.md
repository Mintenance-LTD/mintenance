# Reviewed export requirements

`export_bootstrap_dataset.mjs` exports only targets marked human-verified in `vlm_training_buffer`,
with the same ordered source images. A human correction takes precedence over the original teacher
response. Automated validation and high teacher confidence cannot substitute for review.

Each eligible assessment must also have `property_id`. The export now fails without this asset
grouping rather than treating individual photos as independent validation examples. Repeated
assessments of a property stay in one partition. Properties sharing the same source image URL are
merged into one group, including signed Supabase URLs whose access tokens have changed. At least two
independent groups are required; this minimum is not evidence of adequate dataset size.

The split is reproducible for the same dataset and seed, independent of row order. The `--split`
fraction applies to groups, so image counts may differ from the requested ratio. Save the
accompanying `.split.json` manifest with the dataset; do not independently regenerate train and
validation exports on different data. Adding/removing groups can change membership. A future fixed
benchmark should have an immutable assignment registry.

## Before exporting

1. Complete review with an appropriately qualified reviewer.
2. Link assessments to the correct property. Different property IDs for the same physical site must
   be reconciled before export.
3. Exclude QA fixtures and development/evaluation pilot images.
4. Check content hashes and near-duplicates across sites. The current URL-based merge cannot
   identify a renamed copy, crop, video frame or transformed image.
5. Review confidence filtering: the legacy bootstrap selection still applies its confidence
   threshold and can omit difficult corrected examples.
6. Run `--dry-run` first; investigate any missing-review or missing-site failures.

The Qwen training command now requires `--val-data` and `--split-manifest`. Before loading model
weights it verifies file hashes, partition counts, unique assessment IDs, and disjoint
property/shared-image groups. The exporter writes those file hashes into its split manifest. There
is no automatic row-split fallback.

The normal `TrainingDataExporter` enforces reviewed labels, but its output must also be grouped and
given a content-bound manifest before this training command will accept it. Other training entry
points still need their own provenance audit.

No export or training is justified solely because these software checks pass. Keep teacher version,
label version, reviewer and review date in the dataset's audit record. Do not mark AI-generated
labels as human-verified automatically.

Verify the guards locally with:

```text
node --test scripts/vlm-training/reviewed-bootstrap.test.mjs scripts/vlm-training/split-reviewed-sites.test.mjs
```
