# Mint AI: first SDNET2018 baseline

Completed results: **200/200**. Model snapshot: **gpt-4o-2024-08-06**.

This evaluates the app's existing GPT-4o prompt and response parser with single 256×256 images. It
does not evaluate detector enrichment, database overrides, orchestration, final app scoring, or the
UI. No live database or training writes were made.

## Original images (160)

| Reference class | Crack detected | No crack detected | Abstained | Error | Unresolved |
| --------------- | -------------: | ----------------: | --------: | ----: | ---------: |
| Crack (80)      |             49 |                 5 |        26 |     0 |          0 |
| No crack (80)   |              3 |                10 |        65 |     2 |          0 |

Pending original images: 0.

- Crack detection against all 80 positive labels: **61.3%**.
- False crack detections against all 80 negative labels: **3.8%**.
- Classification coverage: **41.9%**.
- Correct among classified images only: **88.1%**; correct classifications across all originals:
  **36.9%**.

Abstentions, errors and unresolved outputs are not correct negatives. Low false-positive rates must
be read alongside coverage. Structured damage/taxonomy labels determine crack detection; repair
advice and incidental descriptions do not. Labels containing explicit negation do not count as crack
detections.

### Results by surface

| Surface   | Labelled cracks detected | False crack detections | Classification coverage |
| --------- | -----------------------: | ---------------------: | ----------------------: |
| walls     |                    24/36 |                   0/36 |                   38.9% |
| decks     |                     9/20 |                   1/20 |                   30.0% |
| pavements |                    16/24 |                   2/24 |                   56.3% |

## Degraded images (40)

Abstained: **37/40 (92.5%)**; assessed: **0**; errors: **3**; pending: **0**.

| Transformation | Abstained | Assessed | Errors | Pending |
| -------------- | --------: | -------: | -----: | ------: |
| dark           |         9 |        0 |      1 |       0 |
| overexposed    |         8 |        0 |      2 |       0 |
| blurred        |        10 |        0 |      0 |       0 |
| low_resolution |        10 |        0 |      0 |       0 |

Pre-prediction AI visual triage suggested recapture for all 40, but independent human assessability
labels remain pending. These figures are response rates, not certified abstention accuracy.

## Offline parser fix comparison

The local optional-trade fix was replayed against all saved responses, with **zero new model
calls**. Accepted assessments: **67 → 68**. Original-image errors: **2 → 1**.

Changed cases: sdnet-051. Crack detections: **49 → 49**; false crack detections: **3 → 4**.
Recovering a response does not validate its diagnosis. The recovered sdnet-051 response contains a
crack taxonomy label despite the publisher's no-crack label.

The fix filters unsupported optional trade codes while preserving valid core evidence. It is local
and has not been deployed. Candidate schema hash:
b3101c9c40f0fcf82ae18e30fe53e2aa670c4a42342773d65e05363287460b8e. Full comparison:
../parser-replay-v1/comparison.json.

## Provenance and limitations

- Conservative request-cost allowance: **$2.6170**, including full-price cached input and worst-case
  reservations for errors; not an invoice. Cap: $9.
- Tokens reported: 837193 input; 45635 output.
- Source: [SDNET2018](https://digitalcommons.usu.edu/all_datasets/48/), CC BY 4.0; Maguire,
  Dorafshan & Thomas (2018), [DOI](https://doi.org/10.15142/T3TD19). Downloaded from the documented
  public mirror.
- 160 source groups; 40 derivatives are dependent on their parents. No claim of 200 independent
  samples.
- Publisher labels are retained, including difficult cases. AI triage is separate and is not an
  independent surveyor review. No image was excluded because of its prediction.
- A no-crack label does not mean no other defect or a safe building. No ground truth for severity,
  cause, repair cost, RICS rating or structural safety exists here.
- Public pretraining exposure cannot be ruled out. This is a development baseline, not a release
  certification or evidence of rail/site performance.
- Prompt hash: f9b781465c391553384acacc5cedbb1e9f7e562494d92244d2a3362300314be6; manifest hash:
  bc414c1de76099998cbb2ee3addead4796bf0b8e4087765c5e3bca54e58e8956; repository commit:
  52f83ede8d7482c57a14ea611c0570c4e187dc4b.

## Review files

Open results.html for every image, publisher label, status and raw response. summary.json includes
per-surface results. QUALITATIVE-NOTES.md documents limitations and examples that a binary crack
metric cannot validate. Human labels belong in ../pilot/review.csv; ai-triage.jsonl records the
separate pre-prediction AI review.

## Interpretation and checks

The main limitation is coverage: 91/160 original images received insufficient-evidence responses,
and two failed. The model also supplied causal and repair claims that the dataset cannot validate.
Independent surveyor review remains pending. In one case (sdnet-123), cracking appears in prose but
not in structured defect labels; the reported detection rate follows the documented structured-label
rule.

The optional-trade fix passes 19 focused parser tests; both scoring tests pass. No full app build or
new end-to-end staging run was performed for this local fix. Node 22.15.0 was available (the
repository requests 20.19.4). No deployment, database write or training export was performed.

Raw results, image provenance, an offline gallery and qualitative examples are retained locally
under `.vercel/mint-eval/`. The baseline model/prompt/parser scope and reference-label limitations
above are essential when interpreting these figures.
