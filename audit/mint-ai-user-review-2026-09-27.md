# User photo review — 27 September 2026

## Evidence and reconciliation

All 20 submitted case IDs and image SHA-256 hashes match the original review pack and local images.
The original JSON is preserved byte-for-byte in `.vercel/mint-eval/human-review-v1/` under a
filename containing its SHA-256. The reconciled derivative is `reconciled.json` in that directory.

The user explicitly clarified in chat that photos 4, 5, 6, 7 and 9 should be “I am unsure”. Their
original answers and notes remain preserved. For photos marked unreadable, the analysis uses
“unassessable” rather than treating the selected “no crack” as a negative defect label.

- 20 photos answered; 15 include notes, 5 do not.
- 16 readable; 4 unreadable.
- Reconciled crack judgments: 7 yes, 3 no, 6 uncertain, 4 unassessable.
- Personal observations; qualifications not verified; training remains disabled.

## Existing model comparison

No new model calls. Existing `4o-observations` experimental results overlap 11 reviewed photos,
checked by exact image hash. Six have definite human crack judgments and definite model predictions:
five agree, one disagrees. This is descriptive agreement on a small selected development sample, not
model accuracy or an independent test. This observation-only trial is not the full deployed
assessment pipeline.

Photo 10 (`sdnet-059`): user selected crack=yes and noted a hole at top right; model crack=false.
Retain as a disagreement for adjudication, not an automatically corrected training label. Photos 6
and 9 have model crack=true but human uncertainty; exclude from binary agreement scoring.

The observation trial abstained on all three overlapping unreadable images (photos 1, 3 and 8). It
has no result for photo 16 in this comparison.

## Capture gate findings

The deterministic gate rejects unreadable photos 1 (overexposure) and 16 (darkness). Photos 3 and 8
are also unreadable according to the user but receive low-detail warnings only. This supports
testing an evidence-sufficiency decision after capture warnings; it does not justify rejecting every
low-texture wall. Validate on additional readable smooth surfaces before changing thresholds.

## Next implementation priorities

1. Separate visible observations from speculative causes, severity and costs in production output.
2. Carry low-detail warnings into a decision to request better evidence when the model cannot assess
   the image.
3. Improve the review form: readability first, disable crack yes/no for unreadable images, and
   clearly distinguish holes/texture from cracks.
4. Resolve photo 10 and collect fresh, property-linked photos before assessing training readiness.

No database labels, training approvals or production settings were changed by this import.
