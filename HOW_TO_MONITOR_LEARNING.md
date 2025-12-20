# 📊 How to Monitor Model Learning - Quick Reference

## Daily Monitoring (5 minutes)

### 1. Check Learning Dashboard API
```bash
curl http://localhost:3000/api/admin/model-learning?days=7
```

**Look for:**
- ✅ Predictions per day: Should be > 50
- ✅ High-quality examples: Growing steadily
- ✅ Internal model usage: Should increase over time
- ✅ Cost savings: Should show positive trend

### 2. Check Model Health
```sql
-- Run in Supabase SQL Editor
SELECT
    version,
    (metrics->>'mAP50')::numeric as map50,
    is_active,
    created_at
FROM yolo_models
ORDER BY created_at DESC
LIMIT 3;
```

### 3. Quick Drift Check
```sql
-- Check recent performance
SELECT
    performance_score,
    (metrics->>'avgConfidence')::numeric as confidence,
    sample_count,
    timestamp
FROM model_performance_snapshots
WHERE timestamp > NOW() - INTERVAL '7 days'
ORDER BY timestamp DESC;
```

---

## Weekly Review (15 minutes)

### 1. Training Data Quality
```sql
-- High-quality examples accumulated
SELECT COUNT(*) as high_quality_count
FROM model_predictions_log
WHERE gpt4_agreement = true
  AND confidence > 0.85
  AND created_at > NOW() - INTERVAL '7 days';

-- User corrections (should be decreasing)
SELECT
    was_correct,
    COUNT(*) as count
FROM user_corrections
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY was_correct;
```

**Decision Point:**
- If high_quality_count >= 1000: ✅ Ready to retrain
- If corrections > 20% of predictions: ⚠️ Model needs attention

### 2. Cost Tracking
```sql
-- Route distribution
SELECT
    route_selected,
    COUNT(*) as count,
    AVG(internal_confidence) as avg_confidence
FROM hybrid_routing_decisions
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY route_selected;
```

**Expected Trend:**
```
Month 1: 20% internal, 80% GPT-4
Month 2: 40% internal, 60% GPT-4
Month 3: 60% internal, 40% GPT-4
Month 6: 80% internal, 20% GPT-4
```

### 3. Class Balance Check
```sql
-- Ensure all damage types represented
SELECT
    damage_type,
    COUNT(*) as examples,
    AVG(confidence) as avg_confidence
FROM model_predictions_log
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY damage_type
ORDER BY COUNT(*) ASC;
```

**Action Items:**
- Classes with < 50 examples: 📸 Request more photos
- Classes with low confidence: 🎯 Focus training effort

---

## Monthly Retraining Process

### Step 1: Validate Data (10 minutes)
```bash
# Run data quality analyzer
npm run analyze-training-data

# Check output
cat yolo_training_quality_report.json
```

**Required Quality Score:** > 70

### Step 2: Trigger Retraining (Automated)
```bash
# Prepare new dataset
npm run prepare-training-data

# Upload to Google Colab and run progressive training
# (Use YOLO_Progressive_Training_Colab.ipynb)

# Or run locally:
python scripts/ml/progressive-unfreezing-trainer.py \
    --data dataset_with_new_data.yaml \
    --model current_best.onnx \
    --epochs 20
```

### Step 3: Validate New Model
```bash
# Test new model
npm run test-onnx ./new_model.onnx

# A/B test before full deployment
npm run ab-test-model ./new_model.onnx --traffic 0.10
```

### Step 4: Deploy if Better
```bash
# If validation passes
npm run upload-onnx ./new_model.onnx v1.1.0

# Automatically becomes active
# Monitor for 24 hours before considering stable
```

---

## Key Metrics to Watch

### 🟢 Healthy System
- **Data Growth**: 50+ predictions/day
- **Internal Usage**: Increasing trend
- **Confidence**: Stable or increasing
- **User Corrections**: < 15%
- **Performance Score**: > 70
- **Cost Savings**: Growing

### 🟡 Needs Attention
- **Data Growth**: 20-50 predictions/day
- **Internal Usage**: Flat
- **Confidence**: Slight decline
- **User Corrections**: 15-25%
- **Performance Score**: 60-70
- **Cost Savings**: Stable

### 🔴 Urgent Action Required
- **Data Growth**: < 20 predictions/day
- **Internal Usage**: Declining
- **Confidence**: Dropping
- **User Corrections**: > 25%
- **Performance Score**: < 60
- **Cost Savings**: Negative

---

## Automated Alerts

Set up these alerts in your monitoring system:

### Critical Alerts (Immediate Action)
```sql
-- Performance dropped below 60
SELECT * FROM model_performance_snapshots
WHERE performance_score < 60
  AND timestamp > NOW() - INTERVAL '1 day';

-- High correction rate
SELECT COUNT(*) * 100.0 / (
    SELECT COUNT(*) FROM model_predictions_log
    WHERE created_at > NOW() - INTERVAL '1 day'
) as correction_rate
FROM user_corrections
WHERE was_correct = false
  AND created_at > NOW() - INTERVAL '1 day'
HAVING correction_rate > 25;
```

### Warning Alerts (Monitor Closely)
```sql
-- Confidence declining
SELECT
    AVG((metrics->>'avgConfidence')::numeric) as avg_confidence
FROM model_performance_snapshots
WHERE timestamp > NOW() - INTERVAL '7 days'
HAVING AVG((metrics->>'avgConfidence')::numeric) < 0.70;

-- Slow data accumulation
SELECT COUNT(*) as daily_predictions
FROM model_predictions_log
WHERE created_at > NOW() - INTERVAL '1 day'
HAVING COUNT(*) < 50;
```

---

## Quick Actions

### If Performance Drops
```bash
# 1. Check recent predictions
npm run analyze-recent-predictions --days 7

# 2. Roll back to previous model version
npm run rollback-model v1.0.0

# 3. Investigate causes
npm run export-error-cases > errors.json
```

### If Learning Stalls
```bash
# 1. Review class balance
npm run check-class-balance

# 2. Request targeted data
npm run request-contractor-photos --classes underrepresented

# 3. Lower confidence thresholds temporarily
# Edit HybridInferenceService.CONFIDENCE_THRESHOLDS
```

### If Costs Increase
```sql
-- Check routing decisions
SELECT
    route_selected,
    AVG(internal_confidence) as confidence,
    COUNT(*) as count
FROM hybrid_routing_decisions
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY route_selected;

-- If too much GPT-4 usage:
-- 1. Lower confidence thresholds
-- 2. Retrain model with recent data
-- 3. Check for model drift
```

---

## Dashboard Queries (Copy-Paste Ready)

### Overall Health
```sql
WITH recent_stats AS (
    SELECT
        COUNT(*) as total_predictions,
        AVG(confidence) as avg_confidence,
        COUNT(*) FILTER (WHERE gpt4_agreement = true) as agreements
    FROM model_predictions_log
    WHERE created_at > NOW() - INTERVAL '7 days'
)
SELECT
    total_predictions,
    ROUND(avg_confidence::numeric, 2) as avg_confidence,
    ROUND(agreements::numeric * 100.0 / total_predictions, 1) as agreement_rate
FROM recent_stats;
```

### Cost Analysis
```sql
WITH routing_stats AS (
    SELECT
        route_selected,
        COUNT(*) as count
    FROM hybrid_routing_decisions
    WHERE created_at > NOW() - INTERVAL '30 days'
    GROUP BY route_selected
),
cost_calc AS (
    SELECT
        SUM(count) FILTER (WHERE route_selected = 'gpt4_vision') * 0.01275 as gpt4_cost,
        SUM(count) * 0.01275 as would_be_cost,
        SUM(count) as total_requests
    FROM routing_stats
)
SELECT
    ROUND(gpt4_cost, 2) as actual_cost,
    ROUND(would_be_cost, 2) as without_yolo_cost,
    ROUND(would_be_cost - gpt4_cost, 2) as savings,
    ROUND((would_be_cost - gpt4_cost) / would_be_cost * 100, 1) as savings_percent
FROM cost_calc;
```

### Training Readiness
```sql
SELECT
    (SELECT COUNT(*) FROM model_predictions_log
     WHERE gpt4_agreement = true
       AND confidence > 0.85
       AND created_at > (
           SELECT created_at FROM yolo_models
           WHERE is_active = true
       )
    ) as new_high_quality_examples,
    CASE
        WHEN COUNT(*) >= 1000 THEN '✅ Ready to retrain'
        WHEN COUNT(*) >= 500 THEN '🟡 Almost ready (need ' || (1000 - COUNT(*))::text || ' more)'
        ELSE '🔴 Not ready (need ' || (1000 - COUNT(*))::text || ' more)'
    END as status
FROM model_predictions_log
WHERE gpt4_agreement = true
  AND confidence > 0.85
  AND created_at > (
      SELECT created_at FROM yolo_models
      WHERE is_active = true
  );
```

---

## Best Practices

### DO ✅
- Monitor daily for trends
- Retrain when 1000+ quality examples accumulated
- A/B test new models before full deployment
- Keep previous model versions for rollback
- Track cost savings over time
- Collect user feedback systematically

### DON'T ❌
- Deploy models without validation
- Ignore drift warnings
- Delete old model versions
- Retrain without enough new data
- Skip A/B testing phase
- Ignore user corrections

---

## Emergency Procedures

### If Model Breaks Production
```sql
-- 1. Immediately switch to GPT-4 only
UPDATE system_config
SET value = 'false'::jsonb
WHERE key = 'use_internal_model';

-- 2. Roll back to previous model
UPDATE yolo_models
SET is_active = false
WHERE version = 'v1.1.0'; -- Bad version

UPDATE yolo_models
SET is_active = true
WHERE version = 'v1.0.0'; -- Stable version

-- 3. Investigate and log
INSERT INTO system_incidents (
    type,
    description,
    severity,
    timestamp
) VALUES (
    'model_failure',
    'Model v1.1.0 causing production issues',
    'critical',
    NOW()
);
```

### If Data Quality Issues
```bash
# 1. Pause data collection
npm run pause-training-collection

# 2. Audit recent data
npm run audit-training-data --since "7 days ago"

# 3. Remove bad examples
npm run clean-training-data --quality-threshold 0.8

# 4. Resume collection
npm run resume-training-collection
```

---

**Remember: The model learns continuously, but quality matters more than quantity!** 🎯