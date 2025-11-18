# Conformal Prediction Improvements

## Overview

This document describes the improvements made to the conformal prediction system, including enhanced stratification, improved beta quantile computation, and per-stratum monitoring.

## Enhanced Stratification

### Previous Stratification

Previously, stratification used only 3 dimensions:
- Property type
- Age bin
- Region

### Enhanced Stratification

Now includes 4 dimensions with hierarchical fallback:
- Property type
- Age bin
- Region
- **Damage category** (new)

### Stratum Hierarchy

The system uses a hierarchical fallback strategy:

1. **Leaf**: `propertyType_ageBin_region_damageCategory`
2. **Parent**: `propertyType_ageBin_region` (drop damage category)
3. **Grandparent**: `propertyType_ageBin` (drop region)
4. **Great-grandparent**: `propertyType` (drop age bin)
5. **Global**: `global` (fallback)

Fallback occurs when calibration data < 50 samples.

### Damage Category Normalization

Damage types are normalized to canonical categories:

- `structural` - Structural/foundation damage
- `water_damage` - Water leaks, flooding
- `electrical` - Electrical/wiring issues
- `mold` - Mold/fungus
- `pest` - Pest/termite/rodent damage
- `fire` - Fire/smoke damage
- `exterior` - Roof/siding/exterior damage
- `cosmetic` - Cosmetic or unknown damage

## Improved Beta Quantile

### Previous Implementation

Used simplified approximation:
```typescript
if (a < 50) {
  return p * 0.45; // Conservative for small n
}
return p * 0.66;
```

### New Implementation

Uses proper Beta inverse CDF with numerical methods:

1. **Special Cases**:
   - Beta(n+1, 1): `p^(1/(n+1))`
   - Beta(1, n+1): `1 - (1-p)^(1/(n+1))`

2. **General Case**: Newton-Raphson method
   - Solves `BetaCDF(x; a, b) = p` numerically
   - Uses Beta CDF with series expansion
   - Uses Beta PDF for derivative
   - Uses log Gamma for numerical stability

### Beta Function Computation

Uses Stirling's approximation for log Gamma:
- Handles large values efficiently
- Uses recurrence for small values
- Numerically stable

## Per-Stratum Coverage Monitoring

### ConformalPredictionMonitoringService

New service for tracking coverage per stratum:

**Features**:
- Coverage metrics per stratum
- Coverage trends over time
- Violation detection and alerts
- Recalibration suggestions

**Usage**:
```typescript
import { ConformalPredictionMonitoringService } from '@/lib/services/building-surveyor/ConformalPredictionMonitoringService';

// Get coverage metrics for all strata
const metrics = await ConformalPredictionMonitoringService.getStratumCoverageMetrics(experimentId);

// Get coverage trend for a specific stratum
const trend = await ConformalPredictionMonitoringService.getCoverageTrend(
  experimentId,
  'residential_50-100_northeast_water_damage',
  30 // days
);

// Check for violations
const violations = await ConformalPredictionMonitoringService.checkCoverageViolations(experimentId);

// Get recalibration suggestions
const suggestions = await ConformalPredictionMonitoringService.getRecalibrationSuggestions(experimentId);
```

## Coverage Violation Detection

### Thresholds

- **Target Coverage**: 90% (0.90)
- **Violation Threshold**: 5% (0.05)
- **Recalibration Threshold**: 3 persistent violations

### Violation Criteria

A stratum has a coverage violation if:
- `actualCoverage < expectedCoverage - violationThreshold`
- Sample size >= 50 (to avoid false positives from small samples)

### Recalibration Suggestions

The system suggests recalibration when:
- Violation count >= 3
- Violation > 5%
- OR: Low sample size (< 100) with violation

## Calibration Data Quality

### Validation

The populate script now validates:
- Duplicate entries
- Nonconformity score ranges
- Stratum consistency

### Importance Weighting

Future enhancement: Weight calibration data by recency (newer data = higher weight).

## Future Enhancements

### Learned CART Tree

Planned: Use a learned CART (Classification and Regression Tree) to determine optimal stratification (18 strata).

**Benefits**:
- Data-driven stratification
- Optimal coverage per stratum
- Reduced calibration data requirements

### Adaptive Stratification

Planned: Dynamically adjust stratification based on:
- Coverage performance
- Sample size per stratum
- Prediction accuracy

## Testing

### Unit Tests

- Beta quantile computation
- Stratum normalization
- Coverage calculation

### Integration Tests

- End-to-end conformal prediction flow
- Edge cases (empty calibration, single stratum)
- Violation detection

## Performance Considerations

### Calibration Data Queries

- Indexed on `stratum` and `created_at`
- Limited to 10,000 most recent points
- Cached for frequently accessed strata

### Coverage Calculation

- Batch processing for large datasets
- Sampling for very large outcome sets
- Incremental updates for real-time monitoring

## Best Practices

1. **Monitor Coverage Regularly**: Check per-stratum coverage weekly
2. **Recalibrate When Needed**: Follow recalibration suggestions
3. **Collect Sufficient Data**: Aim for >= 100 samples per stratum
4. **Review Violations**: Investigate persistent violations
5. **Update Stratification**: Adjust stratification as data grows

