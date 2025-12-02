# Hybrid Inference Quick Start Guide

## TL;DR

The system routes damage assessments between internal ML models and GPT-4 Vision based on confidence. Currently disabled by default until models are trained.

## Quick Setup

### 1. Run Migration

```bash
npx supabase db diff --local
# Check that 20251203000002_add_hybrid_routing_system.sql is applied
```

### 2. Enable (Optional - when ready)

```bash
# .env
USE_HYBRID_INFERENCE=true
```

### 3. Use It

```typescript
import { HybridInferenceService } from '@/lib/services/building-surveyor';

const result = await HybridInferenceService.assessDamage(imageUrls, context);
```

## Routes Explained

| Route | When | Speed | Cost | Use Case |
|-------|------|-------|------|----------|
| **Internal** | High confidence (≥85%) | ⚡ Fast | 💰 Cheap | Routine assessments |
| **GPT-4 Vision** | Low confidence (<70%) or safety-critical | 🐌 Slower | 💸 Expensive | Complex/critical cases |
| **Hybrid** | Medium confidence (70-85%) | 🐢 Slowest | 💸💸 Most expensive | Learning & validation |

## Decision Tree

```
1. Is model trained? NO → GPT-4
2. Is it safety-critical? YES → GPT-4
3. Confidence ≥85%? YES → Internal
4. Confidence ≥70%? YES → Hybrid
5. Otherwise → GPT-4
```

## Common Queries

### Check Model Status

```typescript
const isReady = await InternalDamageClassifier.isModelReady();
const info = InternalDamageClassifier.getModelInfo();
console.log(`Ready: ${isReady}, Accuracy: ${info.accuracy}`);
```

### View Statistics

```typescript
const stats = await HybridInferenceService.getRoutingStatistics();
console.log(stats.routeDistribution);
```

### SQL Analytics

```sql
-- Route distribution (last 30 days)
SELECT * FROM get_routing_statistics(NOW() - INTERVAL '30 days', NOW());

-- Model performance trend
SELECT * FROM get_model_performance_trend('internal', 30);

-- Calibration accuracy by confidence
SELECT
  FLOOR(internal_confidence / 10) * 10 as bucket,
  COUNT(*) as total,
  ROUND(100.0 * SUM(CASE WHEN was_correct THEN 1 ELSE 0 END) / COUNT(*), 1) as accuracy_pct
FROM confidence_calibration_data
GROUP BY bucket
ORDER BY bucket;
```

## Training Pipeline (Future)

### When to Train

Train when:
- ✅ 100+ validated assessments collected
- ✅ Validation data is diverse (various damage types)
- ✅ Average confidence in GPT-4 results >80%

### How to Train

```typescript
// 1. Check training data
const stats = await InternalDamageClassifier.getTrainingDataStats();
console.log(`Samples: ${stats.totalValidatedSamples}`);

// 2. Trigger training job
const result = await InternalDamageClassifier.triggerRetraining();
console.log(`Job ID: ${result.jobId}`);

// 3. Monitor training (SQL)
// SELECT * FROM model_training_jobs ORDER BY created_at DESC LIMIT 1;

// 4. Activate model when ready (SQL)
// SELECT activate_model('model-uuid');
```

## Monitoring Checklist

Daily:
- [ ] Check route distribution (should match expectations)
- [ ] Monitor average inference time
- [ ] Review any failed assessments

Weekly:
- [ ] Analyze agreement scores (hybrid mode)
- [ ] Check calibration accuracy
- [ ] Review cost vs GPT-4 baseline

Monthly:
- [ ] Retrain model with new data
- [ ] Adjust confidence thresholds if needed
- [ ] Review cost savings

## Troubleshooting

### All routes going to GPT-4?
- ✅ Expected if `USE_HYBRID_INFERENCE=false`
- ✅ Expected if no model trained yet
- ❌ Check model registry: `SELECT * FROM internal_model_registry WHERE is_active = true;`

### Low agreement scores in hybrid mode?
- Model may need retraining
- Check calibration data for systematic errors
- Consider adjusting confidence thresholds

### Slow inference times?
- Hybrid mode runs both models (expected to be slower)
- Check GPT-4 API latency
- Consider increasing confidence thresholds to use more internal

## Environment Variables

```bash
# Enable hybrid inference
USE_HYBRID_INFERENCE=true

# Optional: Override confidence thresholds (defaults shown)
HYBRID_CONFIDENCE_HIGH=0.85
HYBRID_CONFIDENCE_MEDIUM=0.70
HYBRID_CONFIDENCE_LOW=0.50
```

## Important Notes

⚠️ **Safety First**: Critical cases always use GPT-4 regardless of confidence

⚠️ **Start Disabled**: System defaults to GPT-4 only until models are trained

⚠️ **Gradual Rollout**: Use feature flag to control when hybrid inference activates

✅ **Backward Compatible**: Works seamlessly with existing AssessmentOrchestrator

## Quick Reference

### Key Files

```
apps/web/lib/services/building-surveyor/
├── HybridInferenceService.ts       # Main routing
├── InternalDamageClassifier.ts     # Model wrapper
└── HYBRID_INFERENCE_README.md      # Full docs
```

### Key Tables

```
hybrid_routing_decisions          # All routing decisions
confidence_calibration_data       # Human validation
internal_model_registry           # Trained models
model_training_jobs              # Training status
```

### Key Functions

```typescript
// Route an assessment
HybridInferenceService.assessDamage(urls, context)

// Check model status
InternalDamageClassifier.isModelReady()
InternalDamageClassifier.getModelInfo()

// Get statistics
HybridInferenceService.getRoutingStatistics(timeRange)

// Calibrate after validation
HybridInferenceService.calibrateConfidence(id, outcome)

// Trigger training
InternalDamageClassifier.triggerRetraining()
```

## Support

- 📖 Full docs: `HYBRID_INFERENCE_README.md`
- 🧪 Tests: `__tests__/HybridInferenceService.test.ts`
- 💾 Schema: `supabase/migrations/20251203000002_add_hybrid_routing_system.sql`
- 📊 Summary: `HYBRID_INFERENCE_IMPLEMENTATION_COMPLETE.md`
