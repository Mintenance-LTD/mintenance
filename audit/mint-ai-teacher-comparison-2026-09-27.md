# Mint AI: teacher upgrade and distillation checkpoint

## Result

Completed 180 new API calls on a deterministic 60-image subset of the public SDNET2018 pilot.
Estimated upper request cost: $1.0870, below the $6 cap. GPT-4o's saved existing-prompt responses
were reused and reparsed with the same current parser. All new requests returned HTTP 200 and valid
parsed outcomes.

| Configuration                     | Cracks detected /24 | False cracks /24 | Classified /48 | Correct /48 | Degraded abstentions /12 |
| --------------------------------- | ------------------: | ---------------: | -------------: | ----------: | -----------------------: |
| GPT-4o, existing survey prompt    |                  12 |                1 |             17 |          14 |            10 (2 errors) |
| GPT-6 Sol, existing survey prompt |                   7 |                0 |             42 |          27 |                       12 |
| GPT-6 Sol, observation prompt     |                  11 |                1 |             48 |          34 |          11 (1 assessed) |
| GPT-4o, observation prompt        |                  14 |                0 |             48 |          38 |                       12 |

Newer did not mean better here. GPT-6 Sol used reasoning_effort=none; this does not test other
reasoning levels or Astra. With the same existing prompt, Sol provided more classifications but
detected fewer publisher-labelled cracks. With the same observation prompt, GPT-4o performed better
on this subset. Sol described overexposed stress-026 as a readable, defect-free surface. The
observation contract improves separation of visible evidence from diagnosis, but still misses 10/24
labelled cracks even in the best configuration.

Do not deploy a teacher switch from these results. Broader performance remains unproven. The control
was reused rather than contemporaneously rerun; model aliases, stochastic variation, and differing
output contracts limit inference. The sample is small and already consumed for development. Public
pretraining exposure is unknown. Degraded-image human assessability review is pending. There is no
ground truth here for causes, costs, severity or structural safety.

## Implemented locally

- GPT-6 request compatibility, including correct output-token and reasoning parameters. Actual
  provider model retained. Default GPT-4o remains unchanged.
- Experimental visible-observation prompt and strict structural/consistency validation. This is not
  yet connected to the app's full report workflow.
- Reproducible, capped comparison runner; offline scoring and raw paired gallery.
- Main training export requires human_verified=true at query and export boundaries.
- Legacy bootstrap export also requires a reviewed target tied to the same ordered image URLs;
  signed Supabase token rotation is allowed. Human-corrected responses take precedence. Confidence
  alone no longer qualifies a label.

Read-only Supabase check: 3 buffer examples, 0 reviewed/unused/unreserved, 3 unreviewed and unused.
No database writes, export, training or deployment was performed in this comparison. Review flags
are workflow controls, not proof of reviewer expertise; reviewer identity/versioning still needs
stronger audit.

Verification: 65 focused request/parser/distillation tests passed; four bootstrap review-gate tests
passed. Live GPT-6 Sol requests succeeded. No full app build or browser end-to-end staging test was
performed for these local changes.

## Next implementation sequence

1. Independently review the crack misses and degraded cases; collect a fresh, site-separated
   evaluation set with healthy surfaces and actual building faults.
2. Add capture-quality checks and recapture guidance before model assessment. Keep visible
   observations separate from hypotheses and inspection requirements.
3. Integrate the observation stage behind a staging flag, with report adapters that cannot turn a
   readable crop into a whole-building safety conclusion.
4. Build reviewed training labels with image/label version, reviewer and evidence references. Audit
   confidence filters so corrected difficult examples are not excluded solely because the original
   teacher was uncertain.
5. Train the existing Qwen-based Mint student on approved examples only, with
   property/site-separated splits and pilot exclusions. Check leakage before export.
6. Compare the student on unseen sites for missed defects, false alarms, abstention, localization
   and latency before expanding to camera/video input.

A stronger teacher can improve distillation only if its labels are better. Changing the API model
does not update Mint's student weights. Keep training portable: OpenAI's hosted fine-tuning
documentation currently says it is winding down and unavailable to new users.

## Evidence

- Local frozen artifacts: `.vercel/mint-eval/teacher-comparison-v1/REPORT.md`, `summary.json`,
  `config.json`, `results.html`, and all 180 raw result files.
- [GPT-6 Sol model documentation](https://developers.openai.com/api/docs/models/gpt-6-sol)
- [OpenAI vision fine-tuning status](https://developers.openai.com/api/docs/guides/vision-fine-tuning)
- [SDNET2018 source and licence](https://digitalcommons.usu.edu/all_datasets/48/)

Maguire, Dorafshan & Thomas (2018), CC BY 4.0. Derivatives are dependent on their source images; 60
images are not 60 independent asset inspections.
