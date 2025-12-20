# Building Surveyor AI - Hybrid Self-Training Configuration

## Overview

The Building Surveyor AI system implements a **hybrid self-training approach** that automatically validates high-confidence assessments while requiring human review for uncertain or high-risk cases.

## How It Works

### Phase 1: Human Validation (Current)
- **Status**: Active until 100 validated assessments
- **Behavior**: All assessments require human review
- **Purpose**: Build quality baseline dataset

### Phase 2: Confidence-Based Auto-Validation (After 100 validated)
- **Status**: Automatically activates when threshold reached
- **Behavior**: High-confidence assessments auto-validate
- **Purpose**: Scale data collection while maintaining quality

### Phase 3: Active Learning (Future)
- **Status**: Planned enhancement
- **Behavior**: Model identifies edge cases for priority review
- **Purpose**: Continuous improvement

## Auto-Validation Criteria

An assessment is **auto-validated** if ALL of these conditions are met:

1. ✅ **High Confidence**: Confidence score ≥ 90%
2. ✅ **No Critical Hazards**: No critical safety hazards detected
3. ✅ **Good Safety Score**: Safety score ≥ 70/100
4. ✅ **Low Insurance Risk**: Insurance risk score ≤ 50/100
5. ✅ **Standard Damage Type**: Not an edge case (structural_failure, asbestos, etc.)
6. ✅ **Low Urgency**: Not "immediate" or "urgent"
7. ✅ **No Violations**: No compliance violations detected

**If ANY condition fails**, the assessment requires human review.

## Configuration

### Environment Variables

Add to `.env.local`:

```bash
# Enable/disable auto-validation (default: disabled)
BUILDING_SURVEYOR_AUTO_VALIDATION_ENABLED=true
```

### Thresholds (in DataCollectionService.ts)

```typescript
const AUTO_VALIDATION_CONFIG = {
  MIN_CONFIDENCE: 90,              // Minimum confidence to auto-validate
  MAX_INSURANCE_RISK: 50,          // Maximum insurance risk to auto-validate
  MIN_SAFETY_SCORE: 70,            // Minimum safety score to auto-validate
  MIN_VALIDATED_COUNT: 100,        // Minimum validated assessments before enabling
  ENABLED: process.env.BUILDING_SURVEYOR_AUTO_VALIDATION_ENABLED === 'true',
};
```

## Edge Cases (Always Require Review)

These damage types **always** require human review:
- `unknown_damage`
- `structural_failure`
- `foundation_issue`
- `asbestos`
- `mold_toxicity`
- `lead_paint`

## Monitoring

### Admin Dashboard
- View auto-validation status at `/admin/building-assessments`
- See statistics: total, pending, validated, rejected
- Monitor auto-validation activation status

### Logs
All auto-validations are logged with:
- Assessment ID
- Confidence score
- Damage type
- Reason for auto-validation

## Safety Features

1. **Fail-Safe Default**: On error, defaults to requiring human review
2. **Audit Trail**: All auto-validations logged with reason
3. **Reversible**: Admins can reject auto-validated assessments
4. **Gradual Rollout**: Requires minimum validated count before activation
5. **Risk-Based**: High-risk assessments always require review

## Usage

### Current State (Phase 1)
- All assessments saved with `validation_status: 'pending'`
- Admins review and validate manually
- System collects validated data

### After 100 Validated (Phase 2)
- Auto-validation automatically activates
- High-confidence assessments auto-validate
- Uncertain/high-risk still require review
- Faster data collection while maintaining quality

## Future Enhancements

1. **Active Learning**: Model identifies uncertain predictions
2. **Confidence Calibration**: Adjust thresholds based on accuracy metrics
3. **Spot-Check Audits**: Random sampling of auto-validated assessments
4. **Performance Monitoring**: Track auto-validation accuracy over time

