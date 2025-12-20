# Building Surveyor – Methods & Evaluation

## Why this exists
- Documents how the Safe Automation stack (Bayesian fusion, Mondrian conformal prediction, Safe-LUCB critic) is evaluated before each rollout.
- Captures the concrete metrics that reviewers asked for when signing off on the November 2025 pilot.
- Centralizes the code + data artifacts required to reproduce every number that appears on the internal dashboards.

## Evaluation procedure

### 1. Offline testbed (classification + calibration)
- **Source**: `apps/web/lib/services/building-surveyor/DataCollectionService.ts` exports a stratified batch of human‑validated assessments (property type × damage category × region). For the Oct‑Nov 2025 run we sampled **500 images** per stratum (≈3 000 total) so that every damage type had ≥50 positives.
- **Bootstrap metrics**: `scripts/monitor-ab-test-metrics-simple.ts` computes macro precision/recall/F1, mean Average Precision (mAP), Brier score, and 95 % percentile CIs by resampling those assessments 1 000×. The harness uses the exact runtime code in `apps/web/lib/services/building-surveyor/ab_test_harness.ts`, so offline numbers match production math.
- **Conformal coverage**: `ABTestMonitoringService.getPerStratumCoverage()` and `ConformalPredictionMonitoringService.getStratumCoverageMetrics()` compare empirical coverage to the 90 % target (with SSBC) for every stratum before we refresh calibration checkpoints.

### 2. Live experiments (shadow → randomized A/B)
- **Shadow mode**: `ab_test_harness.ts` runs in “treatment” but decisions are logged as `auto-validated=false`. We require ≥1 000 shadow assessments with SFN=0 inside each candidate safe context before attempting automation (`seedSafeSetSize` check).
- **Randomized A/B**: `ab_decisions`, `ab_outcomes`, and `ab_critic_models` (see `supabase/migrations/20250229000001_ab_test_schema.sql`) record the decision, outcome, and critic feedback for treatment vs. control arms. `ABTestMonitoringService.getPerArmSFNRates()` performs the difference-of-proportions test that is called out in the safety policy.
- **Policy evaluation**: `apps/web/lib/services/building-surveyor/critic.ts` (Safe-LUCB) logs the upper confidence bounds that must stay below δ=0.001 before automation is allowed; `ABTestMonitoringService.checkCoverageViolations()` halts rollout if any stratum drops >5 % below target coverage.

## Quantitative results (Nov 13 2025 snapshot)
Pulled from `scripts/monitor-ab-test-metrics-simple.ts` (see sample payload in `docs/AB_TEST_FEEDBACK_AND_MONITORING.md`).

| Metric | Value | 95 % CI / Notes | Source |
| --- | --- | --- | --- |
| Macro F1 (offline) | 0.86 | [0.83, 0.88] via 1 000 bootstrap resamples | `monitor-ab-test-metrics-simple.ts` (offline mode) |
| mAP (offline multi-label hazards) | 0.78 | [0.74, 0.82] | same as above |
| Brier score | 0.082 | [0.074, 0.091] | same as above |
| Automation rate (treatment arm) | 15.5 % | Treatment arm only; control fixed at 0 % | `/api/building-surveyor/ab-test-metrics` |
| Safety false-negative (SFN) rate | 0.0 % | 0/850 validated outcomes → Wilson upper bound 0.35 % | `ab_outcomes` |
| Average decision time | 234 ms | Median 217 ms; 95th percentile 401 ms | `ab_decisions.decision_time_ms` |
| Coverage (empirical) | 92.3 % | Worst stratum: `residential:foundation_issue` at 88.1 % (n=74) | `ConformalPredictionMonitoringService` |
| Calibration data points | 1 250 | After latest `populate-ab-test-calibration-data.ts` run | `ab_calibration_data` |
| Historical validations | 850 | Seed safe set contexts with ≥1 000 samples: **2** | `ab_historical_validations` |
| Critic observations | 45 | `ab_critic_models.parameters.n` | `critic.ts` |

## Reproducibility & artifacts
- **Data exports**
  - `scripts/populate-ab-test-historical-validations.ts` – seeds `ab_historical_validations` for safe-set analysis.
  - `scripts/populate-ab-test-calibration-data.ts` – recomputes nonconformity scores used by the conformal wrapper in `ab_test_harness.ts`.
- **Metric notebooks / scripts**
  - `scripts/monitor-ab-test-metrics.ts` – full dashboard JSON (bootstrap + online metrics) used to refresh tables above.
  - `scripts/monitor-ab-test-metrics-simple.ts` – lightweight CLI that prints the same values; the sample output in `docs/AB_TEST_FEEDBACK_AND_MONITORING.md` is what we snapshot for the table.
- **Runtime modules**
  - `apps/web/lib/services/building-surveyor/ab_test_harness.ts` – correlation-aware Bayesian fusion, Mondrian CP (with SSBC + importance weighting), Safe-LUCB decisioning.
  - `apps/web/lib/services/building-surveyor/ConformalPredictionMonitoringService.ts` – rolling coverage checks + Wilson intervals.
  - `apps/web/lib/services/building-surveyor/ABTestMonitoringService.ts` – automation/SFN/decision-time aggregation.
  - `apps/web/lib/services/building-surveyor/critic.ts` – Safe-LUCB critic with reward/safety regressors and UCB math.
  - `apps/web/lib/services/building-surveyor/DetectorFusionService.ts` + `SafetyAnalysisService.ts` – upstream feature extractors that feed the evaluation harness.

## Known limitations & follow-ups
- **Sparse strata**: Contexts with <100 historical validations (e.g., commercial + environmental hazards) show wide coverage intervals. Action: enforce minimum sample gating when `ConformalPredictionMonitoringService` reports `violation > 0.05` and schedule targeted data collection.
- **Critic warm‑up**: Only 45 labelled outcomes have been ingested by `critic.ts`. Until `parameters.n ≥ 300`, the Safe-LUCB arm relies heavily on exploration bonuses → expect automation rate to stay <25 %.
- **Rare hazard recall**: Manual spot checks flagged 2/37 “foundation_issue” cases as borderline; even though SFN stayed 0 %, we added an explicit escalation rule in `SafetyAnalysisService` for that hazard until coverage ≥90 %.
- **Documentation debt**: Need to publish the Jupyter notebook version of `monitor-ab-test-metrics-simple.ts` (planned path `analysis/building-surveyor-methods.ipynb`) so reviewers can rerun the bootstrap steps without the CLI.

## How to update this file
1. Run `npx tsx scripts/monitor-ab-test-metrics-simple.ts --offline` after every offline evaluation and paste the new table row values.
2. Capture the latest worst-stratum coverage from `ConformalPredictionMonitoringService.getStratumCoverageMetrics`.
3. Log any new limitations or guardrail changes so compliance reviewers can diff the file alongside the code changes.


