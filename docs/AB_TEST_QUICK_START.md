# A/B Test Quick Start Guide

## ✅ Setup Complete!

Your A/B testing system is fully configured and ready to use.

### Experiment Created

- **Experiment ID**: `1149429f-3c43-4504-8f76-c763c28d21ef`
- **Name**: Safe Automation Pilot
- **Status**: draft
- **Arms**: control (50%) and treatment (50%)

### Add to `.env.local`

```bash
AB_TEST_EXPERIMENT_ID=1149429f-3c43-4504-8f76-c763c28d21ef
AB_TEST_ENABLED=false  # Set to true when ready
AB_TEST_SHADOW_MODE=true  # Start in shadow mode
AB_TEST_ROLLOUT_PERCENT=0  # Start at 0%
```

## Step-by-Step Workflow

### Phase 1: Data Collection (Current)

1. **Users create assessments** → Saved to database
2. **Admin validates/rejects assessments** → Feedback automatically collected
3. **Critic models learn** → θ and φ update from feedback

**Run populate scripts** (after you have validated assessments):
```bash
npx tsx scripts/populate-ab-test-historical-validations.ts
npx tsx scripts/populate-ab-test-calibration-data.ts
```

### Phase 2: Enable A/B Testing

Once you have:
- ✅ 100+ validated assessments
- ✅ Calibration data populated
- ✅ Historical validations populated

**Enable A/B testing**:
```bash
AB_TEST_ENABLED=true
AB_TEST_SHADOW_MODE=true  # Logs decisions but doesn't automate
AB_TEST_ROLLOUT_PERCENT=0  # Still 0% - just logging
```

### Phase 3: Monitor and Iterate

**Check metrics**:
```bash
npx tsx scripts/monitor-ab-test-metrics-simple.ts
```

**Key metrics to watch**:
- `seedSafeSetSize` > 0 (enables automation)
- `sfnRate` < 0.1% (safety)
- `coverageRate` ≥ 90% (conformal prediction working)
- `criticModelObservations` ≥ 100 (models trained)

### Phase 4: Gradual Rollout

Once seed safe set has contexts:

1. **5% rollout**: `AB_TEST_ROLLOUT_PERCENT=5`
2. **Monitor for 1 week**: Check SFN rate, automation rate
3. **10% rollout**: `AB_TEST_ROLLOUT_PERCENT=10`
4. **Continue gradually**: 25% → 50% → 100%

## Monitoring

### Daily Check
```bash
npx tsx scripts/monitor-ab-test-metrics-simple.ts
```

### API Endpoint
```bash
curl http://localhost:3000/api/building-surveyor/ab-test-metrics?include_violations=true
```

### What to Look For

✅ **Good Signs**:
- Automation rate gradually increasing
- SFN rate staying at 0%
- Coverage rate ≥ 90%
- Seed safe set size growing

⚠️ **Warning Signs**:
- SFN rate > 0.1% → Review safety-critical assessments
- Coverage rate < 85% → Run populate scripts with more data
- Automation rate stuck at 0% → Check seed safe set size

## Feedback Collection

**Automatic**: Every validation/rejection updates critic models

**Manual** (if needed):
```typescript
import { ABTestFeedbackService } from '@/lib/services/building-surveyor/ABTestFeedbackService';

await ABTestFeedbackService.collectFeedback(
  assessmentId,
  validatedBy,
  isCorrect, // true/false
  hasSafetyViolation // true/false
);
```

## Next Actions

1. ✅ **Database migration applied** - `ab_critic_models` table ready
2. ✅ **Experiment created** - ID: `1149429f-3c43-4504-8f76-c763c28d21ef`
3. ✅ **Feedback collection active** - Integrated into validation workflow
4. ✅ **Monitoring ready** - Script and API endpoint available
5. ⏳ **Start validating assessments** - Use admin panel
6. ⏳ **Run populate scripts** - After you have validated data
7. ⏳ **Enable A/B testing** - Set `AB_TEST_ENABLED=true` when ready

## Troubleshooting

**"No validated assessments found"**
→ This is normal! Start validating assessments through the admin panel.

**"Seed safe set size is 0"**
→ Need ≥1000 validations per context. Keep validating assessments.

**"Critic observations is 0"**
→ Feedback is collected automatically when you validate/reject assessments.

**"AB_TEST_EXPERIMENT_ID not set"**
→ Add to `.env.local`: `AB_TEST_EXPERIMENT_ID=1149429f-3c43-4504-8f76-c763c28d21ef`

## System Status

✅ All code implemented
✅ Database schema deployed
✅ Experiment created
✅ Feedback collection active
✅ Monitoring system ready
⏳ Waiting for validated assessments to populate data

**You're all set! Start validating assessments to begin training the models.** 🚀
