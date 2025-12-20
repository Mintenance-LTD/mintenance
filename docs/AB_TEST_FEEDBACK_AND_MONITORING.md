# A/B Test Feedback Collection and Monitoring Guide

## Overview

This guide explains how to collect feedback for training the Safe-LUCB critic models and monitor A/B test metrics.

## Feedback Collection

### Automatic Collection

Feedback is **automatically collected** when assessments are validated or rejected:

1. **When an assessment is validated**:
   - Reward = 1.0 (correct)
   - Safety violation = false (no SFN)
   - Critic models (θ, φ) are updated

2. **When an assessment is rejected**:
   - Reward = 0.0 (incorrect)
   - Safety violation = determined from damage type
   - Critic models are updated

### How It Works

The `ABTestFeedbackService` is integrated into `DataCollectionService`:

- **`validateAssessment()`**: Automatically calls `ABTestFeedbackService.collectFeedback()` with `isCorrect=true`
- **`rejectAssessment()`**: Automatically calls `ABTestFeedbackService.collectFeedback()` with `isCorrect=false`

### Manual Feedback Collection

You can also manually collect feedback:

```typescript
import { ABTestFeedbackService } from '@/lib/services/building-surveyor/ABTestFeedbackService';

// Collect feedback for a single assessment
await ABTestFeedbackService.collectFeedback(
  assessmentId,
  validatedBy,
  isCorrect, // true if validated, false if rejected
  hasSafetyViolation // true if SFN occurred
);

// Batch collect feedback
await ABTestFeedbackService.batchCollectFeedback(
  assessmentIds,
  validatedBy
);
```

## Monitoring Metrics

### Using the API Endpoint

**GET** `/api/building-surveyor/ab-test-metrics`

Query parameters:
- `include_violations=true` - Include coverage violation details
- `days=7` - Number of days for time series data

Example:
```bash
curl http://localhost:3000/api/building-surveyor/ab-test-metrics?include_violations=true&days=7
```

Response:
```json
{
  "metrics": {
    "automationRate": 15.5,
    "escalationRate": 84.5,
    "sfnRate": 0.0,
    "averageDecisionTime": 0.234,
    "coverageRate": 92.3,
    "calibrationDataPoints": 1250,
    "historicalValidations": 850,
    "seedSafeSetSize": 2,
    "criticModelObservations": 45
  },
  "coverageViolations": [...],
  "automationRateOverTime": [...],
  "timestamp": "2025-11-13T12:00:00Z"
}
```

### Using the Monitoring Script

Run the monitoring script:

```bash
npx tsx scripts/monitor-ab-test-metrics-simple.ts
```

This will display:
- Current metrics (automation rate, SFN rate, etc.)
- Coverage violations (if any)
- Recommendations for improvement

## Training Initial Models

### Step 1: Collect Validated Assessments

1. Validate assessments through the admin panel
2. Feedback is automatically collected
3. Critic models are updated in real-time

### Step 2: Check Model Progress

Monitor critic model observations:
```bash
npx tsx scripts/monitor-ab-test-metrics-simple.ts
```

Look for `Critic Observations` - should increase as assessments are validated.

### Step 3: Populate Historical Data

Once you have validated assessments:

```bash
# Populate historical validations (for seed safe set)
npx tsx scripts/populate-ab-test-historical-validations.ts

# Populate calibration data (for conformal prediction)
npx tsx scripts/populate-ab-test-calibration-data.ts
```

### Step 4: Monitor Seed Safe Set

The seed safe set requires:
- ≥1000 validations per context
- SFN = 0 (no safety false negatives)
- Wilson upper bound ≤ 0.5%

Check seed safe set size in metrics - when > 0, automation can begin.

## Metrics Explained

### Automation Rate
Percentage of assessments that were automated (not escalated to human review).

**Target**: Gradually increase as models improve.

### SFN Rate (Safety False Negative Rate)
Percentage of assessments where a critical safety hazard was missed.

**Target**: < 0.1% (very low)

### Coverage Rate
Percentage of conformal prediction sets that contain the true class.

**Target**: ≥ 90% (matches expected coverage)

### Critic Model Observations
Number of feedback samples used to train the critic models.

**Target**: ≥ 100 for initial model, ≥ 1000 for production

## Troubleshooting

### No Automation Happening

**Possible causes**:
1. Seed safe set is empty (need ≥1000 validations per context)
2. Critic models are too conservative (need more training data)
3. Safety UCB exceeds threshold (δ=0.001)

**Solutions**:
- Validate more assessments to build seed safe set
- Check `seedSafeSetSize` in metrics
- Review safety UCB values in decision logs

### High SFN Rate

**Possible causes**:
1. Model is missing critical hazards
2. Safety threshold is too permissive

**Solutions**:
- Review rejected assessments with safety-critical damage types
- Adjust safety threshold (δ) if needed
- Improve safety model (φ) with more feedback

### Low Coverage Rate

**Possible causes**:
1. Insufficient calibration data
2. Distribution shift (new contexts not in calibration set)

**Solutions**:
- Run `populate-ab-test-calibration-data.ts` with more validated assessments
- Check coverage violations for specific strata
- Add more calibration data for underperforming strata

## Next Steps

1. **Start Validating Assessments**: Use admin panel to validate/reject assessments
2. **Monitor Metrics**: Run monitoring script weekly
3. **Check Seed Safe Set**: Once size > 0, automation can begin
4. **Review Coverage**: Ensure coverage rate stays ≥ 90%
5. **Iterate**: Use feedback to improve models

## API Integration Example

```typescript
// In your dashboard component
const response = await fetch('/api/building-surveyor/ab-test-metrics?include_violations=true');
const data = await response.json();

console.log(`Automation Rate: ${data.metrics.automationRate}%`);
console.log(`SFN Rate: ${data.metrics.sfnRate}%`);

if (data.coverageViolations.length > 0) {
  console.warn('Coverage violations detected!');
}
```

## Database Tables

- **`ab_decisions`**: All A/B test decisions (automate/escalate)
- **`ab_outcomes`**: Feedback outcomes (reward, SFN)
- **`ab_critic_models`**: Critic model parameters (θ, φ, covariance matrices)
- **`ab_calibration_data`**: Calibration data for conformal prediction
- **`ab_historical_validations`**: Historical validations for seed safe set

