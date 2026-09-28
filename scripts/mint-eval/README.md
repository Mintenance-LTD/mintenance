# Mint AI: SDNET2018 evaluation pilot

The preparation scripts create a local **evaluation-only** pack: 80 cracked crops, 80 non-cracked
crops, and 40 pixel-degraded derivatives. Preparation makes no model calls. The separate baseline
runner below calls the configured provider with a spending cap. None of these scripts trains a model
or writes to Supabase.

## Source and licence

- Publisher: https://digitalcommons.usu.edu/all_datasets/48/
- Licence: CC BY 4.0, https://creativecommons.org/licenses/by/4.0/
- Attribution: Maguire, M., Dorafshan, S., & Thomas, R. J. (2018). _SDNET2018: A concrete crack
  image dataset for machine learning applications._ Utah State University.
  https://doi.org/10.15142/T3TD19
- The publisher's download returned HTTP 403 on 27 September 2026. We used the public Kaggle mirror:
  https://www.kaggle.com/datasets/aniruddhsharma/structural-defects-network-concrete-crack-images
- The mirror archive SHA-256 is recorded in the generated provenance file. It has not been verified
  against the publisher's differently packaged archive.
- Originals retain their source bytes. The stress cases record the source image, transformation and
  parameters. Dataset authors do not endorse Mintenance.

## Reproduce

From the repository root, with Python 3.10+ and the repository's Node dependencies:

```powershell
python scripts/mint-eval/prepare_sdnet.py --archive .vercel/mint-eval/downloads/SDNET2018.zip --output .vercel/mint-eval/pilot
node scripts/mint-eval/build_pilot.mjs .vercel/mint-eval/pilot
```

The public mirror download endpoint is:
`https://www.kaggle.com/api/v1/datasets/download/aniruddhsharma/structural-defects-network-concrete-crack-images`.
Download it as the archive above before running the commands. No Kaggle credential was needed for
this run. Future access conditions may differ.

Open `.vercel/mint-eval/pilot/index.html` in a browser. The gallery works offline, filters
originals/stress cases, and initially hides reference labels. `review.csv` is preserved on rebuild
so human edits are not overwritten.

## Selection and checks

- Deterministic SHA-256 ranking, seed `mint-sdnet-pilot-v1`.
- Per class: 36 walls, 20 decks, 24 pavements.
- Filename prefix identifies the source photograph. The 160 original crops use 160 distinct source
  groups; this grouping convention still needs auditing.
- Ten stress cases each: near-black, near-white, Gaussian blur and 8x8 reduction. Each degradation
  has five cracked and five non-cracked parents.
- Checks require 200 unique output hashes and successful 256x256 decoding.
- Source paths, labels, hashes and derivative relationships are in `manifest.jsonl`.

## Evaluation boundaries

`Non-cracked` means no crack label in that crop, **not** a healthy or safe building. Severity,
hidden causes, compliance, repair cost and urgency have no ground truth in this pack. These must not
be scored from these labels.

The 40 degraded images have **unknown** visible-defect and assessability labels until a person
reviews them. An inherited crack label may no longer be visible after degradation. Do not
automatically score every degraded image as requiring abstention. Reviewers fill `assessable`,
`crack_present`, `reviewer` and `notes`.

The original labels come from the dataset mirror and are not an independent surveyor review. Some
cracks are subtle. Report disagreement cases for review. This is a narrow concrete-crack pilot, not
evidence of general surveying accuracy.

## Keep it out of training

The downloaded files live under ignored `.vercel/mint-eval/`, outside existing database training
exports. Every manifest row says `training_allowed: false`. `exclude-from-training.json` lists all
source groups and hashes; any future SDNET training importer must reject **all crops from these
groups**, not just the 160 selected filenames. Derivatives stay with their parents and are reported
separately.

These are public images, so we cannot rule out prior exposure in a foundation model's pretraining. A
later fresh, private, surveyor-labelled set is needed for an independent release evaluation.

## Run the frozen baseline

```powershell
node node_modules/tsx/dist/cli.mjs scripts/mint-eval/run_baseline.ts --dry-run
node node_modules/tsx/dist/cli.mjs scripts/mint-eval/run_baseline.ts
node --test scripts/mint-eval/score_baseline.test.mjs
node scripts/mint-eval/score_baseline.mjs
```

The runner uses `OPENAI_API_KEY` from the process environment or `apps/web/.env.local`; it never
prints the key. The endpoint is OpenAI's chat completions API, with `store: false`, `gpt-4o`,
temperature 0.1, 2,000 maximum output tokens and the actual app prompt/parser. It sends image bytes
and the app prompt, without filenames or reference labels. It does not invoke auxiliary detectors,
the database, training exporters or final app scoring.

Output lives in `.vercel/mint-eval/baseline-v1/`. Configuration, prompt and image hashes bind each
result to its input. Existing results are preserved and skipped on resume, including failures. A
changed prompt/configuration refuses to resume in the same directory. Do not overwrite failures to
improve a headline score: any later retry must retain the original attempt and its cost separately.

The $9 cap reserves a conservative maximum before each request; cached tokens are charged at full
input price for budgeting. Failed requests without usage retain the maximum reservation. Requests
are paced for the provider's token limit, and authorization/rate-limit failures stop the run. This
is a conservative allowance, not a billing invoice. Do not run concurrent copies in one directory.

`score_baseline.mjs` writes `REPORT.md`, `summary.json` and an offline `results.html` gallery.
Structured defect/taxonomy names determine crack predictions. Descriptions and repair advice are not
used as incidental keyword matches. Abstentions, request failures and malformed responses remain
separate; none are counted as correct negatives. Coverage accompanies detection rates.

## Review and interpretation

The first pilot includes a separate `ai-triage.jsonl`, recorded before predictions after visual
inspection of all 200 images. This is **AI-assisted triage, not independent human or surveyor
review**. Publisher labels remain unchanged, and `review.csv` remains available for a human to fill.
Degraded-image abstention rates are descriptive until assessability is independently reviewed.

Keep the frozen run as a development baseline. Do not adjust labels to agree with predictions or
optimize repeatedly against this same set and then call it an unseen test. A model/prompt comparison
needs another versioned run; a release decision needs a fresh independently reviewed set covering
the intended assets.

## Offline parser comparison

After all 200 results exist, a changed parser can be checked without new model calls using
`node node_modules/tsx/dist/cli.mjs scripts/mint-eval/replay_parser.ts`. It preserves the baseline
files and writes a separate `.vercel/mint-eval/parser-replay-v1/comparison.json`, including hashes
of every source response and the candidate parser/schema. It refuses to overwrite an existing
comparison. A recovered response may still contain an incorrect classification; parsing success must
never be presented as model accuracy.

The first run initially hit one HTTP 429. It resumed at a slower pace, preserving that failure.
Refusal details were captured from result 37 onwards; two earlier empty responses cannot be
retrospectively classified as provider refusals.

## Paired teacher comparison

`compare_teachers.ts --dry-run` prepares a deterministic 60-image subset: 24 cracks, 24 non-cracks
and 12 degraded derivatives. Run with the repository's tsx CLI. `--canary` makes one request;
without either flag it resumes the three new arms, under a $6 conservative cost cap. It uses the
configured OpenAI key. The frozen arms compare GPT-6 Sol with the existing prompt and both GPT-6 Sol
and GPT-4o with a narrow visible-observation contract. Baseline GPT-4o responses provide a fourth,
reused control. This is a consumed development set, never training data or an independent release
test.

After completion, run `node node_modules/tsx/dist/cli.mjs scripts/mint-eval/score_teachers.ts` on
one line. It checks provenance, reparses the control with the frozen current parser, and writes a
report, JSON scores and a paired image gallery in `.vercel/mint-eval/teacher-comparison-v1/`. All
180 new responses are required. Do not change frozen source files midway through a run.
Observation-only output is experimental and is not connected to the production report generator.
