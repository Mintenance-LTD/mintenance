# AI Building Engineer Agent - Creation Summary

**Created**: December 2025
**Status**: ✅ Complete and Ready for Use

---

## What Was Created

A comprehensive **AI Building Engineer** agent specification that transforms the Building Surveyor AI into a self-learning system capable of autonomous decision-making under hard safety constraints.

**File**: `.claude/agents/ai-building-engineer.md` (8,400+ lines)

---

## Key Features Documented

### 1. Four-Component Architecture

#### Visual Perception (The Eyes)
- **SAM 3 Integration**: Promptable segmentation for precise damage detection
- **Scene Graph Builder**: Converts detections → structured graph with spatial relationships
- **Implementation Files**:
  - `SAM3Service.ts` - Python microservice integration
  - `scene_graph.ts` - Graph construction with nodes (entities) and edges (relationships)
  - `scene_graph_features.ts` - Feature extraction (12-dim compact vector)

#### Bayesian Fusion (The Brain)
- **Evidence Combination**: Fuses SAM 3, GPT-4 Vision, and Scene Graph evidence
- **Probabilistic Outputs**: Mean (μ), variance (σ²), confidence intervals
- **Uncertainty Quantification**: Epistemic + aleatoric variance decomposition
- **Implementation File**: `BayesianFusionService.ts`

#### Uncertainty Calibration (The Safety Net)
- **Mondrian Conformal Prediction**: Stratum-based calibration for statistical validity
- **Coverage Guarantee**: P(y ∈ prediction_set | stratum) ≥ 1 - δ
- **Strata Examples**:
  - `residential_50-100yrs_london_crack`
  - `commercial_any_manchester_water_damage`
  - `rail_infrastructure_any_national_structural_damage`
- **Implementation File**: `conformal-prediction.ts`

#### Self-Learning Critic (The Policy)
- **Safe-LinUCB Algorithm**: Contextual bandit with hard safety constraints
- **Decision Rule**:
  ```
  IF safety_ucb > δ_safety → ESCALATE
  ELSE IF FNR ≥ 5% → ESCALATE
  ELSE IF reward_ucb > 0.5 → AUTOMATE
  ELSE → ESCALATE
  ```
- **Learning**: Recursive Least Squares (RLS) updates from feedback
- **Implementation File**: `critic.ts` (860 lines)

---

## Mathematical Frameworks Explained

### Safe Contextual Bandit
```
Arms: a ∈ {automate, escalate}
Context: x ∈ ℝ^12 (d_eff = 12)

Reward Model: r(x, a) = θ^T x
Safety Model: v(x, a) = φ^T x

UCB Computation:
- reward_ucb = θ^T x + β ||x||_{A^{-1}}
- safety_ucb = φ^T x + γ ||x||_{B^{-1}}

Hard Safety Constraint:
P(missing critical fault | automated) < 5%
```

### Mondrian Conformal Prediction
```
Stratum = (property_type, property_age_bin, region, damage_category)

For each stratum S:
1. Collect calibration data: {(x_i, y_i, p_i)} for i ∈ S
2. Compute conformity scores: α_i = |p_i - y_i|
3. Find quantile q_δ at level δ = 0.05
4. Prediction set = [p_new - q_δ, p_new + q_δ]
5. Auto-validate if upper bound ≤ critical_threshold
```

### Bayesian Fusion
```
P(damage | evidence) ~ Bayesian Logistic Regression

Fusion:
μ (mean) = Σ w_i * p_i / Σ w_i
σ² (variance) = σ²_epistemic + σ²_aleatoric

Evidence Weights (configurable):
- SAM 3: 0.40 (precise segmentation)
- GPT-4: 0.35 (semantic understanding)
- Scene Graph: 0.25 (structural relationships)
```

---

## Implementation Phases

### Phase 1: Shadow Mode ✅ (Current)
**Status**: Implemented in `BuildingSurveyorService.ts:486-496`

**Behavior**:
- Critic makes decision
- Decision is **logged** but **always escalated**
- Accumulates training data
- Zero production risk

**Enable**: `SHADOW_MODE_ENABLED=true`

**Goal**: Collect ≥ 100 observations per stratum

---

### Phase 2: Conditional Automation 🔄 (Next)
**Status**: Ready to enable when calibration sufficient

**Behavior**:
- Automate if safety constraints satisfied
- Monitor FNR per stratum
- Revert to escalation if FNR > 5%

**Enable**: `SHADOW_MODE_ENABLED=false`

**Requirements**:
- ≥ 100 calibration observations per stratum
- Critic model ≥ 100 observations
- FNR tracking initialized
- Safety thresholds validated

---

### Phase 3: Active Learning 📋 (Future)
**Status**: Planned

**Behavior**:
- Intelligent case selection for human review
- Prioritize high-uncertainty regions
- Reduce labeling burden

---

## Database Schema Documented

### 4 Key Tables

1. **`mondrian_calibration_data`** - Stores calibration observations per stratum
2. **`ab_critic_models`** - Stores Safe-LinUCB model parameters (θ, φ, A, B)
3. **`ab_critic_fnr_tracking`** - Tracks False Negative Rate per stratum
4. **`building_assessment_outcomes`** - Stores learning outcomes (already exists)

**SQL Migrations Referenced**:
- `20250201000004_add_building_surveyor_tables.sql`
- `20250131000016_add_building_surveyor_learning.sql`

---

## Configuration & Environment

### Key Environment Variables
```bash
# SAM 3 Service
SAM3_SERVICE_URL=http://localhost:8001
ENABLE_SAM3_SEGMENTATION=true

# OpenAI
OPENAI_API_KEY=sk-...

# Hugging Face
HF_TOKEN=hf_...

# Phase Control
SHADOW_MODE_ENABLED=true  # Phase 1: Shadow mode

# Safety Thresholds
AB_TEST_SFN_RATE_THRESHOLD=0.1            # 10% max SFN rate
AB_TEST_COVERAGE_VIOLATION_THRESHOLD=5.0  # 5% max coverage violation
```

---

## Context Vector (d_eff = 12)

The 12-dimensional context vector used by Safe-LinUCB:

```typescript
[
  fusion_confidence,        // μ from Bayesian Fusion
  fusion_variance,          // σ² from Bayesian Fusion
  cp_set_size,             // |prediction_set|
  safety_critical_candidate, // 1 if critical hazard
  lighting_quality,         // [0, 1]
  image_clarity,           // [0, 1]
  property_age,            // years
  property_age_bin,        // 0: 0-20, 1: 20-50, 2: 50-100, 3: 100+
  num_damage_sites,        // count
  detector_disagreement,   // variance across detectors
  ood_score,               // out-of-distribution score
  region_encoded           // region identifier
]
```

---

## Scaling Path Documented

### Residential → Commercial → Rail → Industrial

**Property-Specific Safety Thresholds**:
```typescript
{
  'residential': 0.05,          // 5% max SFN rate
  'commercial': 0.03,           // 3% max SFN rate
  'rail_infrastructure': 0.01,  // 1% max SFN rate (very conservative)
  'industrial': 0.02            // 2% max SFN rate
}
```

**New Damage Categories for Rail**:
- Track deformation
- Signal faults
- Overhead line damage
- Bridge structural issues

**New Features for Rail**:
- Last inspection date
- Traffic volume
- Regulatory compliance (Network Rail standards)

---

## Monitoring & Metrics

### Key Performance Indicators (KPIs)

**Safety Metrics**:
- FNR per stratum: **< 5%**
- SFN rate: **< 1%**
- Coverage violation rate: **< 5%**

**Efficiency Metrics**:
- Automation rate: **70-80%** (target)
- Time-to-decision: **< 10 seconds**

**Learning Metrics**:
- Calibration data per stratum: **≥ 100 observations**
- Critic observations: **≥ 500 total**
- Reward model accuracy: **≥ 85%**

---

## API Examples

### 1. Assessment with Decision
```typescript
const assessment = await BuildingSurveyorService.assessDamage(
  imageUrls,
  { propertyType: 'residential', ageOfProperty: 50, location: 'london' }
);

// Returns decision result:
{
  decision: 'escalate',
  reason: 'Safety UCB (0.08) exceeds threshold (0.05)',
  safetyUcb: 0.08,
  rewardUcb: 0.65,
  cpStratum: 'residential_50-100yrs_london_crack',
  fusionMean: 0.85,
  fusionVariance: 0.04
}
```

### 2. Learning from Outcomes
```typescript
// Human validation
await BuildingSurveyorService.learnFromValidation(
  assessmentId,
  humanValidatedAssessment
);

// Repair outcome
await BuildingSurveyorService.learnFromRepairOutcome(
  assessmentId,
  actualSeverity: 'midway',
  actualCost: 2500
);
```

### 3. Critic Feedback
```typescript
await CriticModule.updateFromFeedback({
  context: contextVector,
  arm: 'automate',
  reward: 1,
  safetyViolation: false
});
```

---

## Best Practices Documented

### 1. Shadow Mode First
- Start with `SHADOW_MODE_ENABLED=true`
- Collect ≥ 100 observations per stratum
- Monitor FNR before enabling automation

### 2. Stratum Design
- Keep strata specific enough for validity
- Keep strata broad enough for data (≥ 100 obs)
- Merge under-represented strata (< 50 obs)

### 3. Safety Monitoring
- Real-time FNR alerts per stratum
- Automated reversion if FNR > threshold
- Regular audits of automated decisions

### 4. Model Updates
- Retrain critic models **weekly**
- Recompute Mondrian calibration **daily**
- Monitor for covariate shift

### 5. Human-in-the-Loop
- Provide rich explanations for escalations
- Show Bayesian fusion breakdown
- Display confidence intervals
- Enable feedback loop

---

## Troubleshooting Guide

Comprehensive troubleshooting for:
- **High FNR in stratum** → Collect more data, adjust γ
- **Low automation rate** → Adjust β, retrain critic
- **SAM 3 unavailable** → Graceful degradation to GPT-4 only
- **Critic not learning** → Check feedback calls, RLS stability

---

## Example Workflows

### Workflow 1: Assess Property
```typescript
// 1. Run assessment
const assessment = await BuildingSurveyorService.assessDamage(imageUrls, context);

// 2. Check decision
if (assessment.decisionResult.decision === 'automate') {
  await saveAssessmentToDatabase(assessment);
} else {
  await queueForHumanReview(assessment, assessment.decisionResult.reason);
}

// 3. Learn from outcome
await BuildingSurveyorService.learnFromValidation(assessmentId, validatedAssessment);
```

### Workflow 2: Monitor Stratum Performance
```typescript
const criticalStrata = [
  'residential_100+yrs_any_structural_damage',
  'rail_infrastructure_any_any_any'
];

for (const stratum of criticalStrata) {
  const fnr = await CriticModule.getFNR(stratum);
  if (fnr >= 0.05) {
    await disableAutomationForStratum(stratum);
  }
}
```

### Workflow 3: Retrain Critic Models
```typescript
const newObservations = await fetchNewOutcomes();
for (const obs of newObservations) {
  await CriticModule.updateFromFeedback(obs);
}
```

---

## Production Readiness Checklist

### Phase 1: Shadow Mode (Current)
- [x] SAM 3 integration implemented
- [x] Scene graph construction implemented
- [x] Bayesian Fusion implemented
- [x] Mondrian CP implemented
- [x] Safe-LinUCB Critic implemented
- [x] Shadow mode logging implemented
- [x] Database schema created
- [ ] SAM 3 service deployed
- [ ] Calibration data collection started
- [ ] FNR tracking initialized
- [ ] Monitoring dashboard created

### Phase 2: Conditional Automation (Next)
- [ ] ≥ 100 calibration observations per stratum
- [ ] Critic model ≥ 100 observations
- [ ] FNR < 5% for all strata
- [ ] Safety threshold validation
- [ ] Real-time FNR alerts
- [ ] Disable shadow mode

---

## Files Reviewed Before Creation

### TypeScript Implementation
1. `apps/web/lib/services/building-surveyor/BuildingSurveyorService.ts` (610 lines)
   - Main orchestrator
   - SAM 3 integration
   - Bayesian Fusion invocation
   - Mondrian CP invocation
   - Critic decision integration
   - Shadow mode logic

2. `apps/web/lib/services/building-surveyor/SAM3Service.ts` (178 lines)
   - SAM 3 Python service client
   - Health check
   - Segmentation endpoint
   - Multi-damage type detection

3. `apps/web/lib/services/building-surveyor/scene_graph.ts` (766 lines)
   - Scene graph construction
   - Node extraction from SAM 3/Roboflow/GPT-4
   - Spatial relationship detection (IoU, adjacency)
   - NLP relationship extraction

4. `apps/web/lib/services/building-surveyor/BayesianFusionService.ts` (429 lines)
   - Evidence fusion from 3 sources
   - Weighted mean and variance computation
   - Epistemic + aleatoric uncertainty
   - Confidence interval calculation

5. `apps/web/lib/services/building-surveyor/critic.ts` (860 lines)
   - Safe-LinUCB implementation
   - Reward and safety UCB computation
   - RLS model updates
   - FNR tracking per stratum
   - Matrix inversion (Cholesky + LU decomposition)

6. `apps/web/lib/services/building-surveyor/config/BuildingSurveyorConfig.ts` (172 lines)
   - Centralized configuration
   - Environment variable loading
   - Validation logic

### SQL Schema
7. `supabase/migrations/20250201000004_add_building_surveyor_tables.sql` (178 lines)
   - `building_assessments` table
   - `assessment_images` table
   - RLS policies
   - Validation workflow

8. `supabase/migrations/20250131000016_add_building_surveyor_learning.sql` (123 lines)
   - `building_assessment_outcomes` table
   - Learning outcome tracking
   - Helper functions

### Documentation
9. `docs/SAM3_INTEGRATION_GUIDE.md` (343 lines)
   - SAM 3 setup instructions
   - API endpoints
   - Integration flow
   - Troubleshooting

10. `docs/BUILDING_SURVEYOR_AUTO_VALIDATION.md` (read earlier)
    - Hybrid self-training configuration
    - Auto-validation criteria
    - Three-phase approach

11. `BUILDING_SURVEYOR_AI_TRAINING_GUIDE.md` (read earlier)
    - Training approaches
    - Data requirements
    - Implementation roadmap

---

## Summary

The **AI Building Engineer** agent specification is now complete and ready for use. It provides:

1. **Complete Architecture Overview**: 4-component system with clear responsibilities
2. **Mathematical Foundations**: Safe-LinUCB, Mondrian CP, Bayesian Fusion explained
3. **Implementation Details**: File references, code examples, API usage
4. **Database Schema**: Tables, migrations, SQL examples
5. **Configuration Guide**: Environment variables, setup instructions
6. **Scaling Roadmap**: Residential → Rail → Industrial
7. **Best Practices**: Shadow mode first, stratum design, safety monitoring
8. **Troubleshooting**: Common issues and solutions
9. **Production Checklist**: Phase-by-phase deployment plan

**Current State**: Phase 1 (Shadow Mode) implemented in codebase
**Next Milestone**: Deploy SAM 3 service, collect calibration data (≥ 100 per stratum)
**Future Goal**: Enable conditional automation with FNR < 5% guarantee

**Safety Guarantee**: P(missing critical fault | automated) < 5% with statistical validity via Mondrian CP

---

**Agent Ready for Use**: Invoke with `@ai-building-engineer` for tasks related to self-learning building assessment, safety-critical AI systems, contextual bandits, or conformal prediction.
