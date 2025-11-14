# Context Features Specification

## Overview

The Safe-LUCB critic uses a 12-dimensional context vector to make automation decisions. This document specifies the exact feature ordering and semantics.

## Feature Vector (d_eff = 12)

| Index | Feature | Type | Range | Description |
|-------|---------|------|-------|-------------|
| 0 | `fusion_confidence` | number | 0-1 | Weighted average confidence from detector fusion |
| 1 | `fusion_variance` | number | 0-1 | Predictive variance from Bayesian fusion |
| 2 | `cp_set_size_normalized` | number | 0-1 | Conformal prediction set size / 10 |
| 3 | `safety_critical_candidate` | number | 0 or 1 | Binary: 1 if safety-critical damage detected |
| 4 | `lighting_quality` | number | 0-1 | Image lighting quality (higher = better) |
| 5 | `image_clarity` | number | 0-1 | Image sharpness/clarity (higher = sharper) |
| 6 | `property_age_normalized` | number | 0-1 | Property age / 100 |
| 7 | `num_damage_sites_normalized` | number | 0-1 | Number of damage sites / 10 |
| 8 | `detector_disagreement` | number | 0-1 | Disagreement variance between detectors |
| 9 | `ood_score` | number | 0-1 | Out-of-distribution score (higher = more OOD) |
| 10 | `region_encoded` | number | 0-1 | Hash-based encoding of region |
| 11 | `property_age_bin_encoded` | number | 0-1 | Categorical encoding of age bin |

## Feature Construction

All context vectors must be constructed using `ContextFeatureService.constructContextVector()` to ensure consistency:

```typescript
import { ContextFeatureService } from '@/lib/services/building-surveyor/ContextFeatureService';

const contextVector = ContextFeatureService.constructContextVector({
  fusion_confidence: 0.8,
  fusion_variance: 0.1,
  cp_set_size: 5,
  safety_critical_candidate: 1,
  lighting_quality: 0.9,
  image_clarity: 0.85,
  property_age: 50,
  property_age_bin: '50-100',
  num_damage_sites: 3,
  detector_disagreement: 0.05,
  ood_score: 0.1,
  region: 'northeast',
});
```

## Feature Details

### Fusion Confidence (Index 0)
- **Source**: `DetectorFusionService.fuseDetectors()`
- **Calculation**: Weighted average of YOLO, Mask R-CNN, SAM confidences
- **Range**: 0-1 (0 = no confidence, 1 = high confidence)

### Fusion Variance (Index 1)
- **Source**: `DetectorFusionService.fuseDetectors()`
- **Calculation**: Epistemic variance + disagreement variance + correlation term
- **Range**: 0-1 (0 = low uncertainty, 1 = high uncertainty)

### CP Set Size Normalized (Index 2)
- **Source**: Conformal prediction output
- **Calculation**: `predictionSet.length / 10`
- **Range**: 0-1 (larger sets = more uncertainty)

### Safety Critical Candidate (Index 3)
- **Source**: `SafetyAnalysisService.isSafetyCritical()`
- **Calculation**: Binary (1 if safety-critical, 0 otherwise)
- **Range**: 0 or 1

### Lighting Quality (Index 4)
- **Source**: `ImageQualityService.extractQualityMetrics()`
- **Calculation**: Inferred from vision analysis confidence and condition
- **Range**: 0-1 (0 = poor lighting, 1 = excellent lighting)

### Image Clarity (Index 5)
- **Source**: `ImageQualityService.extractQualityMetrics()`
- **Calculation**: Inferred from detected features and text detection
- **Range**: 0-1 (0 = blurry, 1 = sharp)

### Property Age Normalized (Index 6)
- **Source**: Assessment context
- **Calculation**: `propertyAge / 100`
- **Range**: 0-1 (normalized age)

### Num Damage Sites Normalized (Index 7)
- **Source**: Assessment damage detection
- **Calculation**: `detectedItems.length / 10`
- **Range**: 0-1 (normalized count)

### Detector Disagreement (Index 8)
- **Source**: `DetectorFusionService.fuseDetectors()`
- **Calculation**: `Math.sqrt(disagreementVariance)`
- **Range**: 0-1 (0 = agreement, 1 = high disagreement)

### OOD Score (Index 9)
- **Source**: `ABTestIntegration.computeOODScore()`
- **Calculation**: Based on low confidence, high variance, no detections
- **Range**: 0-1 (0 = in-distribution, 1 = out-of-distribution)

### Region Encoded (Index 10)
- **Source**: Assessment context
- **Calculation**: Hash-based encoding via `ContextFeatureService.encodeRegion()`
- **Range**: 0-1 (deterministic hash)

### Property Age Bin Encoded (Index 11)
- **Source**: Assessment context
- **Calculation**: Categorical encoding via `ContextFeatureService.encodePropertyAgeBin()`
- **Range**: 0-1
  - '0-20': 0.1
  - '20-50': 0.3
  - '50-100': 0.6
  - '100+': 0.9

## Validation

All context vectors must pass validation:

```typescript
const validation = ContextFeatureService.validateContextVector(contextVector);
if (!validation.valid) {
  throw new Error(validation.error);
}
```

Validation checks:
- Dimension is exactly 12
- All values are finite (no NaN or Infinity)

## Consistency Requirements

1. **Feature Ordering**: All services must use the same feature ordering
2. **Normalization**: All features must be normalized to 0-1 range
3. **Encoding**: Region and age bin must use consistent encoding functions
4. **Construction**: Always use `ContextFeatureService.constructContextVector()`

## Versioning

If context features need to change:
1. Update `ContextFeatureService.D_EFF` if dimension changes
2. Update critic model initialization to match new dimension
3. Migrate existing context vectors in database
4. Update all consumers of context vectors

## Examples

### High Confidence, Safe Context
```typescript
const context = ContextFeatureService.constructContextVector({
  fusion_confidence: 0.9,
  fusion_variance: 0.05,
  cp_set_size: 2,
  safety_critical_candidate: 0,
  lighting_quality: 0.9,
  image_clarity: 0.9,
  property_age: 30,
  property_age_bin: '20-50',
  num_damage_sites: 1,
  detector_disagreement: 0.02,
  ood_score: 0.1,
  region: 'northeast',
});
// Likely to result in AUTOMATE decision
```

### Low Confidence, Safety-Critical Context
```typescript
const context = ContextFeatureService.constructContextVector({
  fusion_confidence: 0.3,
  fusion_variance: 0.4,
  cp_set_size: 8,
  safety_critical_candidate: 1,
  lighting_quality: 0.3,
  image_clarity: 0.3,
  property_age: 100,
  property_age_bin: '100+',
  num_damage_sites: 10,
  detector_disagreement: 0.3,
  ood_score: 0.8,
  region: 'unknown',
});
// Likely to result in ESCALATE decision
```

