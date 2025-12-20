# Enable Hybrid AI Inference - Setup Guide

## 🎯 Goal
Switch from GPT-4 first (expensive, $0.01-0.05/assessment) to Local YOLO first (cheap, $0.001/assessment) with GPT-4 fallback for complex cases.

## ✅ Step 1: Add Environment Variables

Add these to your `.env.local` file:

```env
# ============================================================================
# HYBRID AI INFERENCE CONFIGURATION
# ============================================================================

# Enable hybrid inference (local YOLO first, GPT-4 fallback)
USE_HYBRID_INFERENCE=true

# Use learned features from training data
USE_LEARNED_FEATURES=true

# Enable TITANS memory system for pattern learning
USE_TITANS=true

# Enable automatic validation to improve models
BUILDING_SURVEYOR_AUTO_VALIDATION_ENABLED=true

# ============================================================================
# OPTIONAL: GPT-4 Configuration (for fallback only)
# ============================================================================

# OpenAI API key - only used when local model isn't confident enough
# OPENAI_API_KEY=sk-your-key-here

# ============================================================================
# OPTIONAL: SAM3 Segmentation (for precise damage boundaries)
# ============================================================================

# Enable SAM3 for precise segmentation (requires docker service)
# ENABLE_SAM3_SEGMENTATION=true
# SAM3_SERVICE_URL=http://localhost:8001
# SAM3_ROLLOUT_PERCENTAGE=100
```

## ✅ Step 2: Verify YOLO Models Exist

Check if YOLO models are in your database:

```sql
-- Run this query in Supabase SQL Editor
SELECT
  id,
  model_name,
  version,
  format,
  is_active,
  created_at
FROM yolo_models
WHERE is_active = true
ORDER BY created_at DESC;
```

### Expected Output:
```
id | model_name                    | version | format | is_active
---+-------------------------------+---------+--------+-----------
1  | building-damage-detector-v11  | 1.0     | onnx   | true
```

### If No Models Exist:

You have two options:

#### Option A: Use Mock Model for Testing
```env
# Add to .env.local
ENABLE_MOCK_AI=true
```

#### Option B: Deploy YOLO Model
You have model files in your repo:
- `best_model_final_v2.onnx` (ready to deploy)
- Upload to Supabase Storage `yolo-models` bucket
- Create record in `yolo_models` table

## ✅ Step 3: How Hybrid Routing Works

With `USE_HYBRID_INFERENCE=true`, the system routes intelligently:

```
Photo Upload
  ↓
Extract Features (damage type, complexity, safety)
  ↓
Decision Tree:
  ├─ No local model available → GPT-4
  ├─ Safety hazard detected → GPT-4
  ├─ Confidence ≥ 75% → Local ONLY
  ├─ Confidence ≥ 55% → Local + GPT-4 (hybrid)
  └─ Confidence < 55% → GPT-4 ONLY
```

### Confidence Scoring:

**High Confidence (≥75%) - Local Only:**
- Simple cracks
- Water stains
- Paint peeling
- Minor surface damage

**Medium Confidence (55-74%) - Hybrid:**
- Structural cracks
- Roof damage
- Multiple damage types
- Moderate complexity

**Low Confidence (<55%) - GPT-4 Only:**
- Electrical hazards
- Gas leaks
- Major structural issues
- Complex multi-system failures

## ✅ Step 4: Cost Savings Calculator

### Current (GPT-4 First):
- Per assessment: $0.01 - $0.05
- 1,000 assessments/month: **$10 - $50**
- 10,000 assessments/month: **$100 - $500**

### With Hybrid (Local First):
- Local only (75%): $0.001 × 750 = **$0.75**
- Hybrid (15%): $0.025 × 150 = **$3.75**
- GPT-4 only (10%): $0.05 × 100 = **$5.00**
- **Total: $9.50 for 1,000 assessments** (81% savings!)

## ✅ Step 5: Monitor Performance

After enabling, monitor in your database:

```sql
-- Check routing decisions
SELECT
  route_decision,
  COUNT(*) as count,
  AVG(internal_confidence) as avg_confidence,
  AVG(processing_time_ms) as avg_time_ms
FROM hybrid_routing_decisions
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY route_decision;
```

Expected distribution:
- `internal_only`: ~75% (fast, cheap)
- `hybrid`: ~15% (moderate cost)
- `gpt4_only`: ~10% (expensive but necessary)

## ✅ Step 6: Gradual Rollout (Optional)

If you want to test carefully:

```env
# Start with 10% of traffic using hybrid
HYBRID_ROLLOUT_PERCENTAGE=10

# Gradually increase as confidence improves
# 10% → 25% → 50% → 100%
```

## ✅ Step 7: Test It

1. **Restart your dev server**:
   ```bash
   npm run dev
   ```

2. **Create a job with photos**:
   - Upload simple damage (water stain)
   - Should use local model (fast, <500ms)

3. **Create a job with complex damage**:
   - Upload electrical hazards
   - Should use GPT-4 (safer, more accurate)

4. **Check console logs**:
   ```
   [HybridInference] Route: internal_only, Confidence: 0.82
   [HybridInference] Processing time: 287ms
   ```

## 🎯 Benefits of Hybrid Approach

1. **Cost Savings**: 80-90% reduction in AI costs
2. **Speed**: 10x faster (300ms vs 4-8s)
3. **Scalability**: Can handle 10,000s of assessments/day
4. **Quality**: GPT-4 fallback for complex cases
5. **Learning**: System improves over time from validation data

## ⚠️ Important Notes

- **Safety First**: System always routes safety hazards to GPT-4
- **Gradual Learning**: Local models improve as you validate assessments
- **Fallback**: If local model fails, automatically falls back to GPT-4
- **No OpenAI Key Needed**: System works without GPT-4 if you're okay with local-only

## 🚀 Next Steps

After enabling hybrid inference:

1. **Monitor routing decisions** in database
2. **Validate assessments** to improve local models
3. **Adjust confidence thresholds** based on accuracy
4. **Enable continuous learning** for automatic retraining
5. **Scale up** to handle thousands of assessments

---

**Ready to enable?** Just add the environment variables and restart your server! 🎉