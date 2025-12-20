# Detector Fusion Service - Implementation Status

## Current Status

The `DetectorFusionService` implements correlation-aware Bayesian fusion for multiple detector outputs.

### ✅ Implemented

- **YOLO (Roboflow)**: Fully integrated and working
  - Uses `RoboflowDetectionService` to get real detections
  - Confidence extracted from detection results

### ⚠️ Simulated (Placeholder)

- **Mask R-CNN**: Currently simulated as `yolo_confidence * 0.95`
- **SAM (Segment Anything Model)**: Currently simulated as `yolo_confidence * 0.90`

## Why Simulation?

The correlation matrix and fusion weights were designed for three detectors working together. To maintain the mathematical integrity of the fusion algorithm, we simulate the missing detectors based on YOLO results.

## Impact

1. **Correlation Matrix**: The empirical correlation values (0.31, 0.27, 0.35) may not accurately reflect real detector behavior when two detectors are simulated.

2. **Fusion Variance**: The correlation term `w^T Σ w` still contributes to variance, but the actual correlation structure may differ.

3. **Conservative Behavior**: The system will still work, but may be more conservative than intended until real detectors are integrated.

## Next Steps

### Option 1: Integrate Real Detectors (Recommended)

1. **Mask R-CNN Integration**:
   - Set up Mask R-CNN inference endpoint
   - Add `MaskRCNNDetectionService.ts` similar to `RoboflowDetectionService.ts`
   - Update `DetectorFusionService.fuseDetectors()` to call real service

2. **SAM Integration**:
   - Set up SAM inference endpoint
   - Add `SAMDetectionService.ts`
   - Update fusion service

3. **Recalibrate Correlation Matrix**:
   - Collect validation data with all three detectors
   - Compute empirical correlation matrix from real outputs
   - Update `CORRELATION_MATRIX` in `DetectorFusionService`

### Option 2: Remove Simulation (Simpler)

If Mask R-CNN and SAM won't be integrated:

1. Update fusion to use only YOLO
2. Remove correlation matrix (set to identity)
3. Simplify variance calculation
4. Update weights to `[1.0]` (single detector)

### Option 3: Keep Simulation (Current)

- Document that simulation is temporary
- Add TODO comments in code
- Plan for future integration

## Code Location

- **Fusion Logic**: `apps/web/lib/services/building-surveyor/DetectorFusionService.ts`
- **Simulation Code**: Lines 40-50 (maskrcnn and sam confidence calculation)
- **Usage**: Called from `ab_test_harness.ts` line 193

## Testing

When real detectors are integrated, update:
- Unit tests in `DetectorFusionService.test.ts`
- Integration tests in `ab_test_harness.test.ts`
- Correlation matrix validation

