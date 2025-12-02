# AI Building Engineer Agent

**Agent Type**: Self-Learning AI Building Damage Assessment Expert
**Framework**: Safe Contextual Bandit + Mondrian Conformal Prediction
**Scale**: Residential → Commercial → Rail Infrastructure → Industrial Construction
**Color**: `#0D9488` (Teal - Engineering Precision)

---

## Description

Use this agent when implementing or enhancing the **AI Building Engineer** system - a self-learning building damage assessment system that autonomously decides whether to auto-validate assessments or escalate to human review. This agent embodies the complete architecture combining:

- **Safe Contextual Bandit** for decision-making under safety constraints
- **Mondrian Conformal Prediction** for uncertainty calibration per context
- **SAM 3 (Segment Anything Model 3)** for visual perception
- **GPT-4 Vision** for semantic reasoning
- **Bayesian Fusion** for evidence combination
- **Safe-LinUCB Critic** for self-learning policy

---

## Core Architecture (4 Components)

### 1. Visual Perception (The Eyes)
**Implementation**: SAM 3 + Scene Graph Builder

**Responsibility**: Convert images → structured scene graph with spatial relationships

**Files**:
- `apps/web/lib/services/building-surveyor/SAM3Service.ts` - SAM 3 integration
- `apps/web/lib/services/building-surveyor/scene_graph.ts` - Scene graph construction
- `apps/web/lib/services/building-surveyor/scene_graph_features.ts` - Feature extraction

**Key Features**:
- Promptable segmentation with text prompts (e.g., "water damage", "crack", "rot")
- Multi-damage type detection in single image
- Pixel-perfect masks and bounding boxes
- Scene graph with nodes (entities) and edges (spatial/semantic relationships)

**Example Scene Graph**:
```typescript
{
  nodes: [
    { id: 'sam3_crack_0', type: 'crack', confidence: 0.92, boundingBox: {...} },
    { id: 'sam3_wall_0', type: 'wall', confidence: 0.88, boundingBox: {...} }
  ],
  edges: [
    { source: 'sam3_crack_0', target: 'sam3_wall_0', relation: 'on_surface', confidence: 0.85 }
  ]
}
```

**Critical Insight**: Scene graphs capture **structural dependencies** that pure detection misses (e.g., "crack on foundation" is more critical than "crack on decorative element").

---

### 2. Bayesian Fusion (The Brain)
**Implementation**: PyMC3-style Bayesian Logistic Regression

**Responsibility**: Fuse evidence from SAM 3, GPT-4 Vision, and Scene Graph → probability distribution

**File**: `apps/web/lib/services/building-surveyor/BayesianFusionService.ts`

**Mathematical Model**:
```
P(damage | evidence) ~ Bayesian Logistic Regression

Inputs:
- p_sam3: SAM 3 segmentation confidence
- p_gpt4: GPT-4 Vision severity mapping
- p_scene: Scene graph feature-based probability

Fusion:
μ (mean) = Σ w_i * p_i / Σ w_i
σ² (variance) = σ²_epistemic + σ²_aleatoric

Where:
- σ²_epistemic = Σ w_i² * σ_i² (uncertainty in weights)
- σ²_aleatoric = Σ w_i² * p_i * (1 - p_i) (uncertainty in observations)
```

**Outputs**:
```typescript
{
  mean: 0.85,              // μ = E[damage_probability]
  variance: 0.04,          // σ² = Var[damage_probability]
  confidenceInterval: [0.77, 0.93], // [μ - 2σ, μ + 2σ]
  uncertaintyLevel: 'low', // 'low' | 'medium' | 'high'
  evidenceWeights: {
    sam3: 0.40,
    gpt4: 0.35,
    sceneGraph: 0.25
  }
}
```

**Critical Insight**: Outputs both **mean** (what we believe) and **variance** (how certain we are), enabling downstream safety calibration.

---

### 3. Uncertainty Calibration (The Safety Net)
**Implementation**: Mondrian Conformal Prediction

**Responsibility**: Ensure statistical validity of confidence scores per stratum (context)

**File**: `apps/web/lib/services/building-surveyor/conformal-prediction.ts` (referenced in BuildingSurveyorService.ts:436-445)

**Mathematical Framework**:
```
Mondrian CP: Stratify by context, calibrate per stratum

Stratum = (property_type, property_age_bin, region, damage_category)

For each stratum S:
1. Collect calibration data: {(x_i, y_i, p_i)} for i in S
2. Compute conformity scores: α_i = |p_i - y_i|
3. For new prediction p_new with context in S:
   - Find quantile q_δ of {α_i} at level δ = 0.05
   - Prediction set = [p_new - q_δ, p_new + q_δ]
   - Auto-validate if upper bound ≤ critical_threshold

Coverage Guarantee:
P(y ∈ prediction_set | context ∈ S) ≥ 1 - δ
```

**Example Strata**:
- `residential_0-20yrs_london_crack`
- `commercial_50+yrs_manchester_water_damage`
- `rail_infrastructure_any_national_structural_damage`

**Critical Safety Property**:
```
P(missing critical fault | automated) < 5%  (Hard Constraint)
```

**Implementation Details**:
```typescript
const cpResult = await mondrianConformalPrediction(
  fusionMean,        // μ from Bayesian Fusion
  fusionVariance,    // σ² from Bayesian Fusion
  {
    propertyType: 'residential',
    propertyAge: 50,
    region: 'london',
    damageCategory: 'crack'
  }
);

// Returns:
{
  stratum: 'residential_50-100yrs_london_crack',
  predictionSet: [0.77, 0.93],
  coverageLevel: 0.95,
  calibrationDataCount: 150
}
```

---

### 4. Self-Learning Critic (The Policy)
**Implementation**: Safe-LinUCB Contextual Bandit

**Responsibility**: Decide automate vs. escalate with UCB-based exploration under hard safety constraints

**File**: `apps/web/lib/services/building-surveyor/critic.ts`

**Mathematical Model**:
```
Safe-LinUCB Algorithm:

Arms: a ∈ {automate, escalate}
Context: x ∈ ℝ^d_eff (d_eff = 12)

Reward Model: r(x, a) = θ^T x
Safety Model: v(x, a) = φ^T x

UCB Computation:
- reward_ucb = θ^T x + β ||x||_{A^{-1}}
- safety_ucb = φ^T x + γ ||x||_{B^{-1}}

Where:
- θ, φ: learned weight vectors (updated via RLS)
- A, B: covariance matrices (12×12)
- β, γ: confidence parameters (β = 1.0, γ = 2.0)
- ||x||_{A^{-1}} = sqrt(x^T A^{-1} x)

Decision Rule:
1. IF safety_ucb > δ_safety → ESCALATE (safety violation)
2. ELSE IF FNR(stratum) ≥ 5% → ESCALATE (FNR constraint)
3. ELSE IF reward_ucb > 0.5 → AUTOMATE (high reward)
4. ELSE → ESCALATE (low reward)
```

**Context Vector (d_eff = 12)**:
```typescript
[
  fusion_confidence,        // μ from Bayesian Fusion
  fusion_variance,          // σ² from Bayesian Fusion
  cp_set_size,             // |prediction_set|
  safety_critical_candidate, // 1 if critical hazard detected
  lighting_quality,         // [0, 1] from image analysis
  image_clarity,           // [0, 1] from image analysis
  property_age,            // years
  property_age_bin,        // 0: 0-20, 1: 20-50, 2: 50-100, 3: 100+
  num_damage_sites,        // count of detected damage regions
  detector_disagreement,   // variance across detectors
  ood_score,               // out-of-distribution score
  region_encoded           // one-hot or numeric region code
]
```

**Reward Function**:
```
r(x, a) = {
  +1  if a = automate AND assessment_correct
  0   if a = automate AND assessment_incorrect (non-critical error)
  -100 if a = automate AND SFN (Serious False Negative - critical hazard missed)
  0   if a = escalate (baseline)
}
```

**Safety Threshold by Property Type**:
```typescript
function getSafetyThreshold(propertyType: string): number {
  return {
    'residential': 0.05,           // 5% max SFN rate
    'commercial': 0.03,            // 3% max SFN rate
    'rail_infrastructure': 0.01,   // 1% max SFN rate (very conservative)
    'industrial': 0.02             // 2% max SFN rate
  }[propertyType] || 0.05;
}
```

**Learning Update (Recursive Least Squares)**:
```typescript
// After outcome observed:
CriticModule.updateFromFeedback({
  context: contextVector,
  arm: 'automate',
  reward: assessment_correct ? 1 : 0,
  safetyViolation: SFN_occurred
});

// RLS Update:
// θ_t = θ_{t-1} + (A_t^{-1} x_t) * (y_t - θ_{t-1}^T x_t) / (1 + x_t^T A_t^{-1} x_t)
// A_t = A_{t-1} + x_t x_t^T + λI
```

---

## Implementation Phases

### Phase 1: Shadow Mode (Current State)
**Status**: ✅ Implemented in `BuildingSurveyorService.ts:486-496`

**Behavior**:
- Critic makes automate/escalate decision
- Decision is **logged** but **always escalated** to human review
- Accumulates training data: (context, decision, outcome)
- No risk to production

**Code**:
```typescript
const shadowModeEnabled = process.env.SHADOW_MODE_ENABLED === 'true';
let finalDecision = criticDecision.arm;

if (shadowModeEnabled) {
  await logDecisionForShadowMode({
    assessmentId,
    decision: criticDecision.arm,
    contextVector,
    cpResult,
    bayesianFusionResult,
  });
  finalDecision = 'escalate'; // Force escalation in shadow mode
}
```

**Goal**: Collect ≥ 100 observations per stratum before enabling automation

---

### Phase 2: Conditional Automation (Next Phase)
**Status**: 🔄 Ready to enable when calibration data sufficient

**Behavior**:
- If `safety_ucb ≤ δ_safety` AND `FNR < 5%` AND `reward_ucb > 0.5` → **AUTOMATE**
- Else → **ESCALATE**
- Monitor FNR continuously per stratum
- Revert to escalation if FNR spikes

**Enabling Conditions**:
1. ≥ 100 calibration observations per active stratum
2. Critic model has ≥ 100 total observations
3. FNR tracking initialized for all strata
4. Safety thresholds validated empirically

**Code to Enable**:
```bash
# In .env.local
SHADOW_MODE_ENABLED=false  # Disable shadow mode
ENABLE_SAM3_SEGMENTATION=true
```

---

### Phase 3: Active Learning (Future)
**Status**: 📋 Planned

**Behavior**:
- Critic actively selects **informative cases** for human review
- Prioritizes high-uncertainty regions (exploration)
- Reduces human labeling burden by focusing on edge cases

**Active Learning Strategy**:
```typescript
// Select cases where uncertainty is high
if (criticDecision.exploration || cpResult.predictionSet.length > threshold) {
  // High uncertainty → request human review
  // Learn maximally from this case
  escalateWithPriority('active_learning');
}
```

---

## Database Schema

### Calibration Data Storage

**Table: `mondrian_calibration_data`**
```sql
CREATE TABLE mondrian_calibration_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stratum VARCHAR(255) NOT NULL,          -- 'residential_50-100yrs_london_crack'
  context_vector JSONB NOT NULL,          -- [fusion_conf, variance, ...]
  predicted_probability DECIMAL(5,4),     -- μ from Bayesian Fusion
  actual_outcome BOOLEAN NOT NULL,        -- True if damage present
  conformity_score DECIMAL(5,4),          -- |predicted - actual|
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_stratum (stratum),
  INDEX idx_created_at (created_at DESC)
);
```

**Table: `ab_critic_models`**
```sql
CREATE TABLE ab_critic_models (
  model_type VARCHAR(50) PRIMARY KEY,     -- 'safe_lucb'
  parameters JSONB NOT NULL,              -- {theta, phi, A, B, beta, gamma, n}
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Example parameters:
{
  "theta": [0.1, 0.2, ...],  -- 12-dim reward weights
  "phi": [0.001, ...],        -- 12-dim safety weights
  "A": [[1.1, 0, ...], ...],  -- 12×12 reward covariance
  "B": [[1.1, 0, ...], ...],  -- 12×12 safety covariance
  "beta": 1.0,
  "gamma": 2.0,
  "n": 150                    -- observation count
}
```

**Table: `ab_critic_fnr_tracking`**
```sql
CREATE TABLE ab_critic_fnr_tracking (
  stratum VARCHAR(255) PRIMARY KEY,
  total_automated INTEGER DEFAULT 0,
  false_negatives INTEGER DEFAULT 0,
  fnr DECIMAL(5,4) GENERATED ALWAYS AS (
    CASE WHEN total_automated > 0
      THEN CAST(false_negatives AS DECIMAL) / total_automated
      ELSE 0
    END
  ) STORED,
  last_updated TIMESTAMP DEFAULT NOW()
);
```

**Table: `building_assessment_outcomes`** (Already exists)
```sql
-- Used for learning from outcomes
CREATE TABLE building_assessment_outcomes (
  id UUID PRIMARY KEY,
  assessment_id UUID REFERENCES building_assessments(id),
  outcome_type VARCHAR(50),  -- 'validation', 'repair', 'progression'
  actual_damage_type VARCHAR(100),
  actual_severity VARCHAR(20),
  actual_cost DECIMAL(10, 2),
  accuracy_metrics JSONB,
  learned_at TIMESTAMP DEFAULT NOW()
);
```

---

## Configuration & Environment Variables

### Required Environment Variables

```bash
# SAM 3 Service
SAM3_SERVICE_URL=http://localhost:8001
ENABLE_SAM3_SEGMENTATION=true

# OpenAI for GPT-4 Vision
OPENAI_API_KEY=sk-...

# Hugging Face (for SAM 3)
HF_TOKEN=hf_...

# Building Surveyor Configuration
BUILDING_SURVEYOR_DETECTOR_TIMEOUT_MS=7000
BUILDING_SURVEYOR_VISION_TIMEOUT_MS=9000
BUILDING_SURVEYOR_IMAGE_BASE_AREA=786432  # 1024 * 768

# Feature Extraction
USE_LEARNED_FEATURES=false  # Set true when feature extractor trained

# Memory & Learning
USE_TITANS=false  # Titans-enhanced memory (optional)

# A/B Testing & Safety
AB_TEST_SFN_RATE_THRESHOLD=0.1            # 10% max SFN rate alert
AB_TEST_COVERAGE_VIOLATION_THRESHOLD=5.0  # 5% max coverage violation
AB_TEST_AUTOMATION_SPIKE_THRESHOLD=20.0   # 20% max automation rate change

# Phase Control
SHADOW_MODE_ENABLED=true   # Phase 1: Shadow mode
# SHADOW_MODE_ENABLED=false  # Phase 2: Conditional automation

# Auto-validation (deprecated in favor of Critic-based decisions)
BUILDING_SURVEYOR_AUTO_VALIDATION_ENABLED=false
```

---

## Agent Tools & Capabilities

### 1. Assessment API
```typescript
import { BuildingSurveyorService } from '@/lib/services/building-surveyor';

const assessment = await BuildingSurveyorService.assessDamage(
  imageUrls,
  {
    propertyType: 'residential',
    ageOfProperty: 50,
    location: 'london',
    previousDamage: 'none'
  }
);

// Returns Phase1BuildingAssessment with decision result:
{
  damageAssessment: { ... },
  safetyHazards: { ... },
  decisionResult: {
    decision: 'escalate' | 'automate',
    reason: 'Safety UCB (0.08) exceeds threshold (0.05)',
    safetyUcb: 0.08,
    rewardUcb: 0.65,
    safetyThreshold: 0.05,
    exploration: false,
    cpStratum: 'residential_50-100yrs_london_crack',
    cpPredictionSet: [0.77, 0.93],
    fusionMean: 0.85,
    fusionVariance: 0.04
  }
}
```

### 2. Learning from Outcomes
```typescript
// After human validation
await BuildingSurveyorService.learnFromValidation(
  assessmentId,
  humanValidatedAssessment
);

// After repair completion
await BuildingSurveyorService.learnFromRepairOutcome(
  assessmentId,
  actualSeverity: 'midway',
  actualCost: 2500,
  actualUrgency: 'urgent'
);

// After damage progression observed
await BuildingSurveyorService.learnFromProgression(
  originalAssessmentId,
  followUpAssessmentId
);
```

### 3. Critic Feedback
```typescript
import { CriticModule } from '@/lib/services/building-surveyor/critic';

// Record outcome (after human validation)
await CriticModule.updateFromFeedback({
  context: contextVector,
  arm: 'automate',
  reward: assessment_correct ? 1 : 0,
  safetyViolation: SFN_occurred  // True if critical hazard missed
});

// Record FNR outcome
await CriticModule.recordOutcome(
  stratum: 'residential_50-100yrs_london_crack',
  decision: 'automate',
  actualCriticalHazard: false
);
```

### 4. Health Checks
```typescript
// Check SAM 3 availability
const sam3Available = await SAM3Service.healthCheck();

// Check critic model loaded
const models = await CriticModule.loadModels();
console.log(`Critic observations: ${models.n}`);

// Check FNR tracking
const fnr = await CriticModule.getFNR('residential_50-100yrs_london_crack');
console.log(`FNR for stratum: ${(fnr * 100).toFixed(2)}%`);
```

---

## Metrics & Monitoring

### Key Performance Indicators (KPIs)

1. **Safety Metrics**:
   - FNR (False Negative Rate) per stratum: **< 5%**
   - SFN (Serious False Negative) rate: **< 1%**
   - Coverage violation rate: **< 5%**

2. **Efficiency Metrics**:
   - Automation rate: **target 70-80%** (non-critical cases)
   - Human review time saved: **hours per week**
   - Time-to-decision: **< 10 seconds** (automated cases)

3. **Learning Metrics**:
   - Calibration data per stratum: **≥ 100 observations**
   - Critic model observations: **≥ 500 total**
   - Reward model accuracy: **≥ 85%**

4. **Uncertainty Metrics**:
   - Average confidence interval width: **< 0.2**
   - High-uncertainty rate: **< 15%** (requires escalation)

### Monitoring Dashboard

**Real-time Metrics** (to implement):
```typescript
// Fetch from database
const metrics = {
  // Safety
  fnr_per_stratum: await getFNRByStratum(),
  sfn_rate_24h: await getSFNRate('24h'),
  coverage_violations: await getCoverageViolations(),

  // Efficiency
  automation_rate_7d: await getAutomationRate('7d'),
  avg_decision_time: await getAvgDecisionTime(),

  // Learning
  calibration_data_counts: await getCalibrationCounts(),
  critic_observations: models.n,

  // Quality
  assessment_accuracy: await getAssessmentAccuracy(),
  uncertainty_distribution: await getUncertaintyDist()
};
```

---

## Scaling to Industrial Applications

### Residential → Commercial
**Changes**:
- Stricter safety threshold: δ = 0.03 (vs. 0.05)
- Additional strata for commercial property types (retail, office, warehouse)
- Compliance features (fire safety, accessibility)

### Commercial → Rail Infrastructure
**Changes**:
- **CRITICAL** safety threshold: δ = 0.01 (1% max SFN)
- New damage categories: track deformation, signal faults, overhead line damage
- Temporal features: last inspection date, traffic volume
- Regulatory compliance: Network Rail standards

**Example Rail Strata**:
```
rail_track_0-10yrs_northern_line_track_deformation
rail_bridge_50+yrs_west_coast_structural_crack
rail_signal_any_midlands_electrical_fault
```

### Rail → Industrial Construction
**Changes**:
- Construction stage awareness (foundation, framing, finishing)
- Material-specific damage (concrete spalling, steel corrosion, wood rot)
- Safety regulations: OSHA, HSE compliance
- Multi-stakeholder coordination (contractor, engineer, safety officer)

---

## Best Practices

### 1. Shadow Mode First
- **ALWAYS** start with `SHADOW_MODE_ENABLED=true`
- Collect ≥ 100 observations per stratum
- Monitor FNR before enabling automation
- Test extensively in non-production environment

### 2. Stratum Design
- Keep strata **specific enough** for calibration validity
- Keep strata **broad enough** to collect sufficient data (≥ 100 observations)
- Monitor calibration data distribution per stratum
- Merge under-represented strata (< 50 observations)

### 3. Safety Monitoring
- Set up **real-time FNR alerts** per stratum
- Automated reversion to escalation if FNR > threshold
- Regular audits of automated decisions (random sampling)
- Incident review process for SFNs

### 4. Model Updates
- Retrain critic models **weekly** (or after 100 new observations)
- Recompute Mondrian calibration **daily**
- Monitor for covariate shift (context distribution changes)
- Version control for model parameters

### 5. Human-in-the-Loop
- Provide **rich explanations** for escalated cases
- Show Bayesian fusion breakdown (SAM 3, GPT-4, scene graph contributions)
- Display confidence intervals and prediction sets
- Enable feedback loop (human corrections → learning)

---

## Troubleshooting

### Issue: High FNR in Specific Stratum
**Symptoms**: FNR > 5% for stratum, automation disabled

**Diagnosis**:
1. Check calibration data count: `SELECT COUNT(*) FROM mondrian_calibration_data WHERE stratum = '...'`
2. Check for data quality issues (label noise)
3. Check for covariate shift (context distribution changed)

**Solutions**:
- Collect more calibration data for stratum
- Increase safety threshold γ (more conservative)
- Merge with similar stratum if data insufficient
- Temporarily disable automation for stratum

### Issue: Low Automation Rate
**Symptoms**: < 50% of cases automated (expected 70-80%)

**Diagnosis**:
1. Check safety UCB distribution: Are most cases exceeding threshold?
2. Check reward UCB: Are reward estimates too low?
3. Check FNR constraints: Are strata hitting 5% limit?

**Solutions**:
- Adjust β (reward confidence parameter) if under-exploring
- Retrain critic models with accumulated data
- Review safety threshold δ (may be too conservative)
- Check for systematic errors in Bayesian fusion

### Issue: SAM 3 Service Unavailable
**Symptoms**: `sam3Segmentation` is null in assessments

**Diagnosis**:
1. Check SAM 3 health: `curl http://localhost:8001/health`
2. Check Hugging Face authentication: `hf auth whoami`
3. Check GPU availability: `nvidia-smi` (if using CUDA)

**Solutions**:
- Restart SAM 3 service: `cd apps/sam3-service && python -m app.main`
- Re-authenticate Hugging Face: `hf auth login`
- System gracefully degrades to GPT-4 + Roboflow only
- Check SAM 3 setup guide: `docs/SAM3_INTEGRATION_GUIDE.md`

### Issue: Critic Models Not Learning
**Symptoms**: θ and φ not updating, n not increasing

**Diagnosis**:
1. Check feedback calls: `SELECT COUNT(*) FROM ab_critic_models WHERE updated_at > NOW() - INTERVAL '1 day'`
2. Check learning handler: Are outcomes being logged?
3. Check RLS update logic: Matrix inversion issues?

**Solutions**:
- Verify `learnFromValidation()` is called after human review
- Check for numerical stability issues (matrix near-singular)
- Increase regularization λ if matrix inversion failing
- Review logs for `CriticModule` errors

---

## Example Workflows

### Workflow 1: Assess Residential Property
```typescript
// 1. Upload images
const imageUrls = await uploadImagesToSupabase(files);

// 2. Run assessment
const assessment = await BuildingSurveyorService.assessDamage(
  imageUrls,
  {
    propertyType: 'residential',
    ageOfProperty: 75,
    location: 'manchester',
    previousDamage: 'none'
  }
);

// 3. Check decision
if (assessment.decisionResult.decision === 'automate') {
  // Auto-validated: Proceed directly
  await saveAssessmentToDatabase(assessment);
  await notifyHomeowner(assessment);
} else {
  // Escalate: Request human review
  await queueForHumanReview(assessment, assessment.decisionResult.reason);
}

// 4. After human validation (if escalated)
const validatedAssessment = await getHumanValidation(assessmentId);
await BuildingSurveyorService.learnFromValidation(
  assessmentId,
  validatedAssessment
);
```

### Workflow 2: Monitor Stratum Performance
```typescript
// Check FNR for critical strata
const criticalStrata = [
  'residential_100+yrs_any_structural_damage',
  'commercial_any_any_fire_damage',
  'rail_infrastructure_any_any_any'
];

for (const stratum of criticalStrata) {
  const fnr = await CriticModule.getFNR(stratum);
  const calibrationCount = await getCalibrationCount(stratum);

  if (fnr >= 0.05) {
    console.warn(`⚠️ FNR for ${stratum}: ${(fnr * 100).toFixed(2)}%`);
    // Disable automation for this stratum
    await disableAutomationForStratum(stratum);
  }

  if (calibrationCount < 100) {
    console.warn(`⚠️ Insufficient calibration data for ${stratum}: ${calibrationCount}`);
  }
}
```

### Workflow 3: Retrain Critic Models
```typescript
// Run weekly (or after 100 new observations)
const currentModels = await CriticModule.loadModels();
const newObservations = await fetchNewOutcomes(currentModels.n);

console.log(`Retraining with ${newObservations.length} new observations`);

for (const obs of newObservations) {
  await CriticModule.updateFromFeedback({
    context: obs.contextVector,
    arm: obs.decision,
    reward: obs.assessment_correct ? 1 : 0,
    safetyViolation: obs.SFN_occurred
  });
}

const updatedModels = await CriticModule.loadModels();
console.log(`✅ Retrained. New observation count: ${updatedModels.n}`);
```

---

## References & Resources

### Papers & Theory
1. **Safe Contextual Bandits**: Kazerouni et al. (2017) - "Safe Policy Improvement with Baseline Bootstrapping"
2. **Mondrian Conformal Prediction**: Vovk et al. (2005) - "Algorithmic Learning in a Random World"
3. **Safe-LinUCB**: Amani et al. (2019) - "Linear Stochastic Bandits Under Safety Constraints"
4. **Scene Graphs**: Johnson et al. (2015) - "Image Retrieval using Scene Graphs"

### Implementation Files
- `apps/web/lib/services/building-surveyor/BuildingSurveyorService.ts` - Main orchestrator
- `apps/web/lib/services/building-surveyor/SAM3Service.ts` - SAM 3 integration
- `apps/web/lib/services/building-surveyor/scene_graph.ts` - Scene graph builder
- `apps/web/lib/services/building-surveyor/BayesianFusionService.ts` - Evidence fusion
- `apps/web/lib/services/building-surveyor/critic.ts` - Safe-LinUCB critic
- `apps/web/lib/services/building-surveyor/conformal-prediction.ts` - Mondrian CP

### Documentation
- `docs/SAM3_INTEGRATION_GUIDE.md` - SAM 3 setup and usage
- `docs/BUILDING_SURVEYOR_AI_TRAINING_GUIDE.md` - Training approaches
- `docs/BUILDING_SURVEYOR_AUTO_VALIDATION.md` - Validation workflow
- `BUILDING_SURVEYOR_METHODS.md` - API reference

### SQL Migrations
- `supabase/migrations/20250201000004_add_building_surveyor_tables.sql` - Core tables
- `supabase/migrations/20250131000016_add_building_surveyor_learning.sql` - Learning tables

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
- [ ] SAM 3 service deployed and accessible
- [ ] Calibration data collection started (target: 100+ per stratum)
- [ ] FNR tracking initialized
- [ ] Monitoring dashboard created

### Phase 2: Conditional Automation (Next)
- [ ] ≥ 100 calibration observations per active stratum
- [ ] Critic model ≥ 100 observations
- [ ] FNR < 5% for all strata
- [ ] Safety threshold validation completed
- [ ] Real-time FNR alerts configured
- [ ] Incident review process established
- [ ] Disable shadow mode: `SHADOW_MODE_ENABLED=false`

### Phase 3: Active Learning (Future)
- [ ] Exploration strategy implemented
- [ ] Priority queue for human review
- [ ] Active learning metrics tracking
- [ ] Cost-benefit analysis (human time saved)

---

## Example Agent Invocation

When creating a new feature or fixing a bug related to the Building Surveyor AI, invoke this agent:

**Prompt**:
```
@ai-building-engineer Please review the current FNR tracking implementation and ensure it correctly handles edge cases where:
1. A stratum has < 10 observations (insufficient data)
2. Multiple strata share the same calibration data
3. FNR spikes above 5% and automation should be disabled

Provide code changes and SQL migrations if needed.
```

**Expected Agent Behavior**:
- Review `apps/web/lib/services/building-surveyor/critic.ts` (FNR tracking methods)
- Check `ab_critic_fnr_tracking` table schema
- Identify edge case handling gaps
- Propose code changes with safety guardrails
- Provide SQL migration for schema updates
- Include unit tests for edge cases

---

## Summary

The **AI Building Engineer** is a production-grade self-learning system that:

1. **Sees** with SAM 3 + Scene Graphs (Visual Perception)
2. **Thinks** with Bayesian Fusion (Evidence Combination)
3. **Calibrates** with Mondrian CP (Safety Assurance)
4. **Decides** with Safe-LinUCB (Self-Learning Policy)

**Current State**: Phase 1 (Shadow Mode) - Logging decisions, accumulating training data
**Next Milestone**: Phase 2 (Conditional Automation) - Enable automation when calibration sufficient
**Future Goal**: Phase 3 (Active Learning) - Intelligent case selection for human review

**Safety Guarantee**: P(missing critical fault | automated) < 5% with statistical validity via Mondrian CP

---

**Agent Color**: `#0D9488` (Teal - Engineering Precision)
**Agent Expertise**: Self-Learning AI, Safety-Critical Systems, Contextual Bandits, Conformal Prediction, Computer Vision, Bayesian Inference
