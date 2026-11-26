# Mint AI comparison protocol

Compare the unchanged foundation model, the deployed Mint AI v2 adapter, and optionally the teacher on the **same locked inputs**. Keep teacher-labelled agreement separate from independent human review. The evaluator does not certify provenance: only mark results `human-reviewed` after checking them. Use an approved, separately versioned manifest and independently review labels without looking at model output.

- Split by property/site, not photo. Check exact and near duplicates against training/export sets; preserve source permissions and keep property identifiers out of shared results.
- Include healthy surfaces, similar-looking non-defects, ambiguous/low-quality photos, and positive examples with independently reviewed hazard labels. Use an explicit empty hazard array only when reviewed. Don't infer causes or structural condition from appearance alone.
- Use the same survey prompt, image preprocessing, payload options and raw reference file across models. Record the exact model revision/adapter path and service configuration outside the result. Confirm each endpoint actually loads the expected model first.
- Start on visible cracks, water staining, mould-like patches and active leaks. Review uncommon and safety-relevant cases separately. In production release gating every configured class must pass, including independently labelled hazard positives for safety-critical classes. The default safety-critical minimum is its class minimum unless an explicitly reviewed `minHazardSamples` overrides it. Do not disable or narrow gates to pass a full-taxonomy release.
- Record whether a model points to the right image region and whether it asks for better imagery appropriately. **This script does not yet score localisation or calibrated abstention.** Score these separately before deciding to ship.
- Score visible observations independently from inferred causes. The production taxonomy has cause-oriented aliases, so a match on water staining or mould growth does not validate penetrating damp or condensation. Review a proposed cause separately and only with independent supporting evidence.
- Read raw denominators: failed/malformed predictions stay in the accuracy denominator and count as missed positive hazards. Hazard recall is not applicable on clean examples; false alarms are reported on clean examples that yielded a valid response, with coverage counts. Missing or unmapped references block enforcement. Do not present a passing threshold as a building safety determination.
- Full enforcement also needs at least 25 valid predictions on independently reviewed hazard-negative images, at least 95% complete predictions both overall and on hazard-negative images, and no unexpected hazard flags on the reviewed set, including extra flags on hazard-positive images. These are conservative engineering defaults (`hazardReviewGates`), not deployment safety guarantees. Use exhaustively reviewed hazard labels with consistent terminology; adjudicate disagreements rather than changing thresholds to pass. Twenty-five independent hazard-positive cases with zero misses still leave an exact one-sided 95% upper miss-rate bound of about 11.3%; repeated photos of the same issue are not independent cases.

Run offline regressions (no inference):

```sh
python -m unittest discover -s scripts/vlm-training -p test_evaluate_vlm.py
```

For each authorised evaluation endpoint set `--model` to the actual serving ID and write a separate results file. Use the same `--data` (check reported SHA-256), `--taxonomy` and `--reference-kind`. Add `--enforce-gates` only for release checks using a verified, independently reviewed benchmark, not diagnostic subsets. Do not use production tenancy images by default.
