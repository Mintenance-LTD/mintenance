# Hybrid Inference System

## Overview

The Hybrid Inference System implements confidence-based routing between internal ML models and external APIs (GPT-4 Vision). This creates a gradual transition from 100% external APIs → hybrid → 100% internal models as the internal models are trained and improve over time.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  HybridInferenceService                      │
│                                                              │
│  1. Extract Features (YOLO detections)                      │
│  2. Select Route (based on confidence + context)            │
│  3. Execute Selected Route                                  │
│  4. Record Decision for Analytics                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
         ┌────────────────────┴────────────────────┐
         │                                          │
         ▼                                          ▼
┌─────────────────────┐                  ┌──────────────────────┐
│ InternalDamage      │                  │ AssessmentOrchestrator│
│ Classifier          │                  │ (GPT-4 Vision)        │
│                     │                  │                       │
│ - Loads trained     │                  │ - Existing GPT-4      │
│   models            │                  │   pipeline            │
│ - Predicts damage   │                  │ - High accuracy       │
│ - Returns confidence│                  │ - High cost           │
└─────────────────────┘                  └──────────────────────┘
```

## Routing Logic

### Confidence Thresholds

```typescript
const CONFIDENCE_THRESHOLDS = {
    high: 0.85,      // Use internal model confidently
    medium: 0.70,    // Use internal but verify with GPT-4
    low: 0.50,       // Use GPT-4 as primary
};
```

### Route Selection Algorithm

```
1. Check if internal model exists and is trained
   └─► NO → Use GPT-4 Vision

2. Get internal model prediction
   ↓
3. Check for critical safety indicators
   └─► YES → Use GPT-4 Vision (safety-critical)

4. Check confidence level:
   ├─► ≥ 0.85 → Internal only
   ├─► ≥ 0.70 → Hybrid (internal + GPT-4 for comparison)
   └─► < 0.70 → GPT-4 Vision
```

### Safety Override

Always use GPT-4 Vision for:
- Immediate urgency predictions
- Commercial properties
- Critical safety hazards

## Routes

### 1. Internal Route (High Confidence)

**When**: Internal confidence ≥ 85%
**How**: Uses internal model only
**Performance**: Fast, low cost
**Accuracy**: Depends on model training

```typescript
{
  route: 'internal',
  confidence: 90,
  reasoning: 'High confidence (90%) - using internal model',
  assessment: Phase1BuildingAssessment,
  internalPrediction: InternalPrediction
}
```

### 2. GPT-4 Vision Route (Low Confidence or Safety Critical)

**When**:
- No internal model available
- Internal confidence < 70%
- Safety-critical situation

**How**: Uses GPT-4 Vision only
**Performance**: Slower, higher cost
**Accuracy**: Very high

```typescript
{
  route: 'gpt4_vision',
  confidence: 95,
  reasoning: 'Low internal confidence - using GPT-4 Vision',
  assessment: Phase1BuildingAssessment,
  gpt4Prediction: Phase1BuildingAssessment
}
```

### 3. Hybrid Route (Medium Confidence)

**When**: Internal confidence 70-85%
**How**: Runs both internal and GPT-4, compares results
**Performance**: Slowest, highest cost (runs both)
**Accuracy**: Very high + training data

```typescript
{
  route: 'hybrid',
  confidence: 75,
  reasoning: 'Medium confidence (75%) - using hybrid for validation',
  assessment: Phase1BuildingAssessment,
  internalPrediction: InternalPrediction,
  gpt4Prediction: Phase1BuildingAssessment,
  agreementScore: 85 // How much they agreed (0-100)
}
```

## Database Schema

### hybrid_routing_decisions

Records every routing decision for analytics.

```sql
CREATE TABLE hybrid_routing_decisions (
  id UUID PRIMARY KEY,
  assessment_id UUID,
  route_selected TEXT,              -- 'internal' | 'gpt4_vision' | 'hybrid'
  internal_confidence FLOAT,
  internal_prediction JSONB,
  gpt4_prediction JSONB,
  final_assessment JSONB,
  route_reasoning TEXT,
  inference_time_ms INTEGER,
  image_count INTEGER,
  agreement_score FLOAT,            -- For hybrid mode
  created_at TIMESTAMPTZ
);
```

### confidence_calibration_data

Records human validation to calibrate thresholds.

```sql
CREATE TABLE confidence_calibration_data (
  id UUID PRIMARY KEY,
  routing_decision_id UUID,
  route_used TEXT,
  internal_confidence FLOAT,
  was_correct BOOLEAN,              -- Did prediction match validation?
  actual_severity TEXT,
  actual_urgency TEXT,
  validated_by UUID,
  created_at TIMESTAMPTZ
);
```

### internal_model_registry

Tracks trained models and their metadata.

```sql
CREATE TABLE internal_model_registry (
  id UUID PRIMARY KEY,
  model_type TEXT,                  -- 'damage_classifier'
  version TEXT,
  model_path TEXT,
  accuracy FLOAT,
  sample_count INTEGER,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ
);
```

## Usage

### Enable Hybrid Inference

Set environment variable:

```bash
USE_HYBRID_INFERENCE=true
```

### Basic Usage

```typescript
import { HybridInferenceService } from '@/lib/services/building-surveyor/HybridInferenceService';

const result = await HybridInferenceService.assessDamage(
  imageUrls,
  context
);

console.log(`Route: ${result.route}`);
console.log(`Confidence: ${result.confidence}`);
console.log(`Inference time: ${result.inferenceTimeMs}ms`);
console.log(result.assessment);
```

### Record Calibration Data

After human validation:

```typescript
await HybridInferenceService.calibrateConfidence(
  assessmentId,
  {
    wasCorrect: true,
    actualSeverity: 'midway',
    actualUrgency: 'soon'
  }
);
```

### Get Statistics

```typescript
const stats = await HybridInferenceService.getRoutingStatistics({
  start: new Date('2025-01-01'),
  end: new Date('2025-12-31')
});

console.log(`Total assessments: ${stats.totalAssessments}`);
console.log(`Route distribution:`, stats.routeDistribution);
console.log(`Average confidence:`, stats.averageConfidence);
console.log(`Average inference time:`, stats.averageInferenceTime);
```

## Internal Model Training

The InternalDamageClassifier is currently a placeholder. To enable true internal models:

### 1. Collect Training Data

```typescript
const stats = await InternalDamageClassifier.getTrainingDataStats();
console.log(`Validated samples: ${stats.totalValidatedSamples}`);
```

Need at least 100 validated assessments before training.

### 2. Trigger Training

```typescript
const result = await InternalDamageClassifier.triggerRetraining();
if (result.success) {
  console.log(`Training job created: ${result.jobId}`);
}
```

### 3. Training Pipeline (To Be Implemented)

```python
# Example training pipeline (Python)
# 1. Export training data from database
# 2. Extract features using YOLO + scene graph
# 3. Train classifier (Random Forest, Neural Net, etc.)
# 4. Evaluate on validation set
# 5. Save model checkpoint
# 6. Register in internal_model_registry
```

### 4. Model Deployment

```sql
-- Activate a trained model
SELECT activate_model('model-uuid');
```

## Monitoring

### Route Distribution Over Time

```sql
SELECT * FROM get_routing_statistics(
  NOW() - INTERVAL '30 days',
  NOW()
);
```

### Model Performance Trend

```sql
SELECT * FROM get_model_performance_trend('internal', 30);
```

### Key Metrics to Track

1. **Route Distribution**: % of each route type
2. **Average Confidence**: By route
3. **Inference Time**: By route
4. **Agreement Score**: For hybrid mode
5. **Accuracy**: After human validation
6. **Cost**: GPT-4 API calls vs internal

## Confidence Calibration

The system automatically records calibration data when human validation occurs. Periodically analyze this data to:

1. Adjust confidence thresholds
2. Identify systematic model biases
3. Determine when to retrain
4. Optimize route selection

### Example Analysis

```sql
-- Find optimal confidence threshold
SELECT
  FLOOR(internal_confidence / 10) * 10 as confidence_bucket,
  COUNT(*) as total,
  SUM(CASE WHEN was_correct THEN 1 ELSE 0 END) as correct,
  ROUND(100.0 * SUM(CASE WHEN was_correct THEN 1 ELSE 0 END) / COUNT(*), 2) as accuracy_pct
FROM confidence_calibration_data
GROUP BY confidence_bucket
ORDER BY confidence_bucket;
```

## Gradual Transition Plan

### Phase 1: GPT-4 Only (Current)
- `USE_HYBRID_INFERENCE=false`
- Collect validation data
- Build training dataset

### Phase 2: Hybrid (When 100+ validated samples)
- `USE_HYBRID_INFERENCE=true`
- Train initial model
- Most traffic still uses GPT-4
- Internal model learns from disagreements

### Phase 3: Mostly Internal (When model accuracy > 85%)
- Increase confidence threshold
- Most traffic uses internal
- GPT-4 for edge cases only

### Phase 4: Internal Primary (When model accuracy > 90%)
- Internal for all non-critical assessments
- GPT-4 only for safety-critical
- Significant cost savings

## Testing

Run comprehensive tests:

```bash
npm test -- HybridInferenceService.test.ts
npm test -- InternalDamageClassifier.test.ts
```

## Environment Variables

```bash
# Enable hybrid inference routing
USE_HYBRID_INFERENCE=true

# Confidence thresholds (optional, uses defaults)
HYBRID_CONFIDENCE_HIGH=0.85
HYBRID_CONFIDENCE_MEDIUM=0.70
HYBRID_CONFIDENCE_LOW=0.50
```

## Future Enhancements

1. **Adaptive Thresholds**: Automatically adjust based on calibration data
2. **Ensemble Models**: Combine multiple internal models
3. **Cost Optimization**: Dynamic routing based on API costs
4. **A/B Testing**: Compare routes for same assessment
5. **Model Versioning**: Track performance across model versions
6. **Real-time Training**: Continuous learning from validated data

## Support

For questions or issues:
1. Check logs for routing decisions
2. Query `hybrid_routing_decisions` table
3. Review calibration data for accuracy issues
4. Ensure sufficient training data before enabling internal models
