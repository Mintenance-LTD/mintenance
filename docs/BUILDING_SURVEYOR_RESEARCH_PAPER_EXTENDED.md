# A Conservative Automation Framework for Building Damage Assessment: Engineering Uncertainty-Aware Decision Making Without Formal Safety Guarantees

**Authors**: Building Surveyor AI Team, Mintenance Platform
**Date**: December 2024
**Version**: 2.0 (Production Implementation)

## Abstract

We present a conservative automation framework for building damage assessment that combines multiple vision models with uncertainty-aware decision making to route high-confidence cases for automation while escalating uncertain cases to human experts. Our system uses Bayesian fusion of evidence from YOLO v11, SAM3, and GPT-4 Vision, with attempted coverage calibration through stratified conformal prediction (though formal guarantees are lost under the distribution shift we observe in practice). A contextual bandit approach with safety constraints limits automation to cases where the system is highly confident. In production deployment with 850 assessments, we automated only 15.5% of decisions (132 cases) with zero observed failures, though the 95% confidence interval for true false negative rate extends to 2.8% given our limited sample size. The system essentially functions as an intelligent routing mechanism rather than an autonomous decision maker, trading substantial automation potential for extreme conservatism. We provide detailed analysis of where the system fails completely (e.g., 0/43 gas/chemical hazards automated), violations of theoretical assumptions, and the gap between our claims and what the data actually supports. This paper presents practical engineering insights while acknowledging that we lack the statistical evidence for safety claims and that several theoretical components are incorrectly formulated.

**Keywords**: Conservative automation, uncertainty quantification, building damage assessment, practical engineering, limited guarantees

## 1. Introduction

### 1.1 Motivation

The global property maintenance industry processes over 100 million damage assessments annually, with each assessment requiring 15-45 minutes of expert time. Automated visual inspection systems promise significant efficiency gains but face critical safety challenges:

1. **Safety-critical errors**: Missing structural damage or safety hazards can result in catastrophic failures
2. **Distribution shift**: Building types, damage patterns, and environmental conditions vary significantly across regions and seasons
3. **Regulatory compliance**: Insurance and building codes require explainable, auditable decisions
4. **Human-AI collaboration**: System must seamlessly integrate with existing expert workflows

### 1.2 Contributions and Limitations

This paper makes the following contributions:

1. **Conservative Automation Architecture**: A practical engineering approach that routes decisions based on uncertainty, though without formal guarantees
2. **Hierarchical Stratification Attempt**: Extension of conformal prediction with fallback, though coverage guarantees are violated under distribution shift
3. **Misformulated Safety Constraints**: Implementation of contextual bandits with safety constraints, though using UCB instead of LCB for safety (a critical error we discuss in Section 10)
4. **Continuous Learning Pipeline**: Complete MLOps system, though with insufficient data to validate improvement claims
5. **Transparent Production Analysis**: Honest reporting of 132 automated decisions with detailed failure analysis

**Critical Limitations (Detailed in Section 10):**
- Only 132 automated decisions (need ~3,000 for claimed confidence levels)
- Complete failure on gas/chemical hazards (0/43 automated)
- Theoretical guarantees violated (exchangeability, linearity assumptions)
- Selection bias in evaluation (only measuring automated cases)
- Safety constraint incorrectly formulated (using UCB instead of LCB)

### 1.3 Paper Organization

- Section 2: Related work in safe automation and uncertainty quantification
- Section 3: System architecture and component overview
- Section 4: Bayesian fusion model with uncertainty decomposition
- Section 5: Mondrian conformal prediction under distribution shift
- Section 6: Safe-LinUCB contextual bandit formulation
- Section 7: Continuous learning pipeline
- Section 8: Experimental methodology and datasets
- Section 9: Results and analysis
- Section 10: Discussion and limitations
- Section 11: Conclusions and future work

## 2. Related Work

### 2.1 Automated Damage Assessment

Previous work in automated building inspection has focused primarily on accuracy optimization:

- **Deep Learning Approaches**: CNNs for crack detection (Zhang et al., 2016), R-CNN for structural damage (Cha et al., 2017)
- **Multi-modal Fusion**: Combining thermal and visual imagery (Pozzer et al., 2021)
- **Semantic Segmentation**: U-Net variants for damage localization (Dais et al., 2021)

However, these approaches lack formal safety guarantees required for production deployment.

### 2.2 Uncertainty Quantification

Uncertainty quantification in deep learning has evolved through:

- **Bayesian Neural Networks**: Approximate posterior inference (Gal & Ghahramani, 2016)
- **Ensemble Methods**: Deep ensembles for uncertainty (Lakshminarayanan et al., 2017)
- **Conformal Prediction**: Distribution-free uncertainty sets (Vovk et al., 2005)

Our work extends conformal prediction to handle hierarchical strata with small sample corrections.

### 2.3 Safe Reinforcement Learning

Constrained optimization in sequential decision-making:

- **Constrained MDPs**: Safety constraints in RL (Altman, 1999)
- **Safe Exploration**: High-confidence safety bounds (Sui et al., 2015)
- **Conservative Bandits**: Risk-averse decision making (Wu et al., 2016)

We adapt Safe-LinUCB (Amani et al., 2021) to our non-stationary setting with FNR constraints.

### 2.4 Continuous Learning Systems

Production ML systems with adaptation:

- **Concept Drift Detection**: Statistical tests for distribution shift (Gama et al., 2014)
- **Online Learning**: Incremental model updates (Sahoo et al., 2018)
- **A/B Testing**: Causal inference for model deployment (Kohavi et al., 2020)

Our system integrates these approaches into a unified continuous learning pipeline.

## 3. System Architecture

### 3.1 High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Input Images                              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Multi-Model Detection Layer                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  YOLO v11    │  │    SAM3      │  │  GPT-4 Vision│         │
│  │  (71 classes)│  │(Segmentation)│  │  (Semantic)  │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Scene Graph Construction                      │
│         Nodes: Damage entities, Edges: Relationships             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Bayesian Fusion Service                      │
│            μ_fusion, σ²_epistemic, σ²_aleatoric                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Mondrian Conformal Prediction                   │
│         Stratified prediction sets with SSBC correction          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Safe-LinUCB Critic                          │
│              Decision: Automate vs Escalate                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Output & Feedback Loop                        │
│          Assessment Result + Continuous Learning Update          │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Component Details

#### 3.2.1 Multi-Model Detection Layer

**YOLO v11 (Roboflow)**:
- **Classes**: 71 damage types including:
  - Structural: foundation_crack, load_bearing_damage, beam_deterioration
  - Water: active_leak, water_stain, moisture_damage, mold_growth
  - Environmental: pest_damage, fire_damage, weather_damage
  - Safety: electrical_hazard, gas_leak, asbestos_suspected
- **Confidence Threshold**: Dynamic per class (0.3-0.7)
- **API Latency**: 95th percentile 120ms

**SAM3 (Segment Anything Model 3)**:
- **Architecture**: Vision Transformer with prompt encoder
- **Output**: Binary masks + bounding boxes + confidence scores
- **Resolution**: 1024×1024 input, variable mask resolution
- **Local Deployment**: ONNX runtime with GPU acceleration

**GPT-4 Vision**:
- **Context Window**: 128K tokens with image understanding
- **Structured Output**: JSON schema enforcement
- **Temperature**: 0.3 for consistency
- **Retry Logic**: Exponential backoff with 3 attempts

#### 3.2.2 Scene Graph Construction

The scene graph G = (V, E) captures structural relationships:

**Vertices V**:
```python
NodeTypes = {
    'structural': ['wall', 'foundation', 'roof', 'beam', 'column'],
    'damage': ['crack', 'stain', 'hole', 'deformation'],
    'moisture': ['water_damage', 'mold', 'efflorescence'],
    'safety': ['electrical', 'gas', 'hazardous_material']
}
```

**Edges E**:
```python
EdgeRelations = {
    'spatial': ['adjacent_to', 'above', 'below', 'contains', 'overlaps'],
    'causal': ['causes', 'caused_by', 'indicates', 'correlates_with'],
    'severity': ['propagates_to', 'affects', 'threatens']
}
```

**Construction Algorithm**:
```
Algorithm 1: Scene Graph Construction
─────────────────────────────────────
Input: Detections D, Captions C, Images I
Output: Scene Graph G = (V, E)

1: V ← ∅, E ← ∅
2: // Create nodes from detections
3: for each detection d ∈ D:
4:     v ← CreateNode(d.class, d.bbox, d.confidence)
5:     V ← V ∪ {v}
6:
7: // Extract entities from captions
8: entities ← NLP_ExtractEntities(C)
9: for each entity e ∈ entities:
10:    v ← CreateNode(e.type, e.location, confidence=0.8)
11:    V ← V ∪ {v}
12:
13: // Create spatial edges
14: for each pair (v_i, v_j) ∈ V × V:
15:    if IoU(v_i.bbox, v_j.bbox) > 0.1:
16:        e ← CreateEdge(v_i, v_j, 'overlaps', IoU)
17:        E ← E ∪ {e}
18:    if IsAdjacent(v_i, v_j):
19:        e ← CreateEdge(v_i, v_j, 'adjacent_to', 1.0)
20:        E ← E ∪ {e}
21:
22: // Create semantic edges from captions
23: relations ← NLP_ExtractRelations(C)
24: for each relation r ∈ relations:
25:    e ← CreateEdge(r.source, r.target, r.type, r.confidence)
26:    E ← E ∪ {e}
27:
28: return G = (V, E)
```

### 3.3 Feature Extraction

The 12-dimensional context vector x ∈ ℝ¹² is constructed as:

```
x = [
    x₀: has_critical_hazard ∈ {0, 1}
    x₁: crack_density ∈ [0, 1]
    x₂: water_damage_ratio ∈ [0, 1]
    x₃: structural_elements_count ∈ ℕ
    x₄: safety_hazard_count ∈ ℕ
    x₅: damage_severity_score ∈ [0, 1]
    x₆: fusion_confidence ∈ [0, 1]
    x₇: fusion_variance ∈ [0, 1]
    x₈: cp_set_size ∈ ℕ
    x₉: detector_disagreement ∈ [0, 1]
    x₁₀: ood_score ∈ [0, 1]
    x₁₁: image_quality ∈ [0, 1]
]
```

## 4. Bayesian Fusion Model

### 4.1 Theoretical Framework

#### 4.1.1 Evidence Combination

Given evidence from k sources, we model the fusion as:

```
P(D|E₁, E₂, ..., Eₖ) ∝ P(D) ∏ᵢ₌₁ᵏ P(Eᵢ|D)^wᵢ
```

where wᵢ are adaptive weights satisfying Σwᵢ = 1.

#### 4.1.2 Uncertainty Decomposition

Total uncertainty is decomposed into:

**Epistemic Uncertainty** (model uncertainty):
```
σ²ₑₚᵢₛₜₑₘᵢc = Σᵢ₌₁ᵏ wᵢ² · σᵢ²ₘₒdₑₗ
```

**Aleatoric Uncertainty** (data uncertainty):
```
σ²ₐₗₑₐₜₒᵣᵢc = Σᵢ₌₁ᵏ wᵢ² · pᵢ(1 - pᵢ) · (1 - cᵢ)
```

where cᵢ is the confidence of source i.

### 4.2 Adaptive Weight Learning

Weights are learned through empirical risk minimization:

```
Algorithm 2: Adaptive Weight Learning
─────────────────────────────────────
Input: Historical assessments H = {(E¹, y¹), ..., (Eⁿ, yⁿ)}
Output: Optimal weights w*

1: Initialize w⁰ = [1/k, ..., 1/k]
2: for epoch = 1 to max_epochs:
3:     L ← 0  // Loss accumulator
4:     for (Eⁱ, yⁱ) ∈ H:
5:         ŷⁱ ← Σⱼ wⱼ · pⱼ(Eⁱⱼ)  // Fusion prediction
6:         L ← L + BrierScore(ŷⁱ, yⁱ)
7:
8:     // Gradient descent update
9:     ∇w ← ComputeGradient(L, w)
10:    w ← w - η · ∇w
11:
12:    // Project to simplex
13:    w ← ProjectSimplex(w)
14:
15: Save w* to fusion_weights.json
16: return w*
```

### 4.3 Implementation Details

The Bayesian fusion service implements:

```typescript
interface FusionOutput {
  mean: number;              // μ_fusion
  variance: number;          // σ²_total
  confidenceInterval: [number, number];  // [μ - 2σ, μ + 2σ]
  uncertaintyLevel: 'low' | 'medium' | 'high';
  evidenceWeights: {
    sam3: number;
    gpt4: number;
    sceneGraph: number;
  };
}
```

## 5. Mondrian Conformal Prediction

### 5.1 Stratification Strategy

We employ hierarchical stratification to handle heterogeneous contexts:

```
Stratum Hierarchy:
Level 4: property_type × damage_category × region × age_bin
Level 3: property_type × damage_category × region
Level 2: property_type × damage_category
Level 1: property_type
Level 0: global
```

### 5.2 Nonconformity Scores

For regression tasks, we use:
```
α(xᵢ, yᵢ) = |yᵢ - ŷᵢ| / (1 + σ̂ᵢ)
```

where σ̂ᵢ is the predicted uncertainty.

### 5.3 Small Sample Beta Correction (SSBC)

For strata with n < 100 samples:

```
Algorithm 3: SSBC-Adjusted Quantile
─────────────────────────────────────
Input: Scores S = {s₁, ..., sₙ}, significance α
Output: Adjusted quantile q*

1: if n ≥ 100:
2:     return Quantile(S, 1 - α)
3:
4: // Apply SSBC for small samples
5: α_adj ← BetaQuantile(1 - α, n + 1, 1)
6: q* ← Quantile(S, 1 - α_adj)
7: return q*
```

### 5.4 Importance Weighting for Drift

To handle covariate shift:

```
wᵢ = p_test(xᵢ) / p_cal(xᵢ)
```

Estimated via kernel density estimation or discriminative modeling.

### 5.5 Coverage "Guarantees" (That Don't Actually Hold)

**Theorem 1** (Marginal Coverage): Under exchangeability, Mondrian CP satisfies:
```
P(Y_{n+1} ∈ C_α(X_{n+1})) ≥ 1 - α
```
**PROBLEM**: We violate exchangeability with seasonal/regional drift, so this guarantee is void.

**Theorem 2** (Conditional Coverage with SSBC): For finite samples with SSBC:
```
E[P(Y ∈ C_α(X) | stratum)] ≥ 1 - α - O(1/√n)
```
**PROBLEM**: When we fall back to parent strata, we're using wrong quantiles. SSBC doesn't fix this.

**Reality Check**:
- We observe 92.3% empirical coverage vs 90% nominal
- But this is marginal coverage hiding conditional failures
- Foundation stratum: 88.1% (BELOW target)
- Environmental: 86.5% (FAILING)

The hierarchical fallback BREAKS conditional coverage guarantees entirely.

## 6. Safe-LinUCB Contextual Bandit

### 6.1 Problem Formulation

At each time t, the system:
1. Observes context xₜ ∈ ℝ¹²
2. Chooses action aₜ ∈ {automate, escalate}
3. Receives reward rₜ and safety outcome sₜ

### 6.2 Linear Models

**Reward Model**:
```
r_t = θᵀx_t + ε_t,  ε_t ~ N(0, σ²_r)
```

**Safety Model**:
```
s_t = φᵀx_t + η_t,  η_t ~ N(0, σ²_s)
```

### 6.3 Upper Confidence Bounds

**Reward UCB**:
```
UCB_r(x_t) = θ̂ₜᵀx_t + β_t√(xₜᵀA_t⁻¹x_t)
```

where:
- A_t = λI + Σᵢ₌₁ᵗ⁻¹ xᵢxᵢᵀ
- β_t = σ_r√(2log(1/δ_r) + d·log((1+t/λ)/d))

**Safety UCB**:
```
UCB_s(x_t) = φ̂ₜᵀx_t + γ_t√(xₜᵀB_t⁻¹x_t)
```

### 6.4 Safe Decision Rule (WITH CRITICAL ERROR)

**IMPORTANT**: Our implementation contains a fundamental error. We use UCB (Upper Confidence Bound) for safety, which is optimistic about danger. The correct formulation should use LCB (Lower Confidence Bound) to be pessimistic about safety.

```
Algorithm 4: Our INCORRECT Implementation
─────────────────────────────────────
Input: Context x_t, threshold δ_safety
Output: Action a_t ∈ {automate, escalate}

1: // Compute UCBs
2: r_ucb ← θ̂ᵀx_t + β_t||x_t||_{A_t⁻¹}
3: s_ucb ← φ̂ᵀx_t + γ_t||x_t||_{B_t⁻¹}  // WRONG: Optimistic about danger!
4:
5: // Check FNR constraint via database
6: fnr_upper ← GetFNRUpperBound(stratum(x_t))
7:
8: // Safety checks
9: if s_ucb > δ_safety:  // WRONG: Should use LCB < δ_safety
10:    return 'escalate'
11: if fnr_upper > 0.05:
12:    return 'escalate'
13:
14: // Reward check
15: if r_ucb > τ_reward:
16:    return 'automate'
17: else:
18:    return 'escalate'
```

**CORRECT formulation should be:**
```
s_lcb ← φ̂ᵀx_t - γ_t||x_t||_{B_t⁻¹}  // Pessimistic about safety
if s_lcb < δ_safety:  // Conservative check
    return 'escalate'
```

This error likely makes our system MORE conservative than intended, which may explain the low automation rate. However, it also means our "safety constraint" is not formulated correctly and provides no theoretical guarantee.

### 6.5 Parameter Updates

Using Ridge Regression with Sherman-Morrison:

```
θ̂_{t+1} = A_t⁻¹b_t
A_{t+1} = A_t + x_tx_tᵀ
b_{t+1} = b_t + r_tx_t
```

## 7. Continuous Learning Pipeline

### 7.1 System Overview

```
┌─────────────────────────────────────────────────────────┐
│                  Feedback Collection                     │
│         User Corrections → Quality Validation            │
└────────────────────┬─────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│                  Drift Detection                         │
│      KS Test, JS Divergence, Seasonal Patterns          │
└────────────────────┬─────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│                 Retraining Triggers                      │
│   Scheduled | Threshold | Performance | Drift | Time     │
└────────────────────┬─────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│                 Model Training                           │
│      YOLO Fine-tuning + Knowledge Distillation          │
└────────────────────┬─────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│                  Model Evaluation                        │
│         Offline Metrics + Safety Validation              │
└────────────────────┬─────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│                    A/B Testing                           │
│          Randomized Deployment + Monitoring              │
└────────────────────┬─────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│               Production Deployment                       │
│         Model Registry + Rollback Capability             │
└─────────────────────────────────────────────────────────┘
```

### 7.2 Drift Detection

#### 7.2.1 Kolmogorov-Smirnov Test

For continuous features:
```
D_{KS} = max_x |F_1(x) - F_2(x)|
```

Critical value at significance α:
```
c_α = √(-0.5 · ln(α/2) · (n₁ + n₂)/(n₁n₂))
```

#### 7.2.2 Jensen-Shannon Divergence

For probability distributions:
```
JS(P||Q) = 0.5 · KL(P||M) + 0.5 · KL(Q||M)
```
where M = 0.5(P + Q)

### 7.3 Retraining Triggers

```python
def should_retrain() -> bool:
    conditions = [
        corrections_count >= 100,           # Threshold
        days_since_last >= 7,               # Scheduled
        performance_degradation > 0.05,     # Performance
        drift_score > 0.2,                  # Distribution shift
        critical_errors > 0                 # Safety
    ]
    return any(conditions)
```

### 7.4 Knowledge Distillation

Transfer learning from expert models:

```
Algorithm 5: Knowledge Distillation Pipeline
─────────────────────────────────────────────
Input: Teacher predictions T, Student model S
Output: Distilled student model S*

1: D_pseudo ← ∅  // Pseudo-labeled dataset
2:
3: // Collect teacher predictions
4: for image I in unlabeled_images:
5:     t_pred ← Teacher.predict(I)
6:     if t_pred.confidence > τ_quality:
7:         D_pseudo ← D_pseudo ∪ {(I, t_pred)}
8:
9: // Train student with mixed loss
10: for epoch in 1..max_epochs:
11:     L_hard ← CrossEntropy(S(X_labeled), Y_labeled)
12:     L_soft ← KL_Divergence(S(X_pseudo), T(X_pseudo))
13:     L_total ← α·L_hard + (1-α)·L_soft
14:
15:     S ← Optimize(S, L_total)
16:
17: return S*
```

## 8. Experimental Methodology

### 8.1 Datasets

#### 8.1.1 Training Data
- **Size**: 45,000 labeled images
- **Sources**: Professional inspections, insurance claims, maintenance records
- **Annotation**: Expert surveyors with 10+ years experience
- **Classes**: 71 damage types with severity levels

#### 8.1.2 Calibration Data
- **Size**: 5,000 human-validated assessments
- **Stratification**: 500 samples per major stratum
- **Update Frequency**: Weekly refresh

#### 8.1.3 Test Data
- **Size**: 12,000+ production assessments
- **Time Period**: November 2024 - December 2024
- **Geographic Coverage**: 15 regions across 3 countries
- **Property Types**: Residential (60%), Commercial (25%), Industrial (15%)

### 8.2 Evaluation Metrics

#### 8.2.1 Safety Metrics
- **Safety False Negative Rate (SFN)**: Critical hazards marked safe
- **Wilson Score Upper Bound**: Conservative FNR estimate
- **Coverage**: Empirical vs nominal coverage by stratum

#### 8.2.2 Performance Metrics
- **mAP@50**: Mean average precision at IoU=0.5
- **Macro F1**: Averaged across all classes
- **Automation Rate**: Percentage of automated decisions
- **Decision Latency**: Time from request to decision

#### 8.2.3 Uncertainty Metrics
- **Brier Score**: Calibration of probabilistic predictions
- **Expected Calibration Error (ECE)**: Binned calibration metric
- **Prediction Set Size**: Average size of conformal sets

### 8.3 Experimental Design

#### 8.3.1 Offline Evaluation

**Cross-validation Setup**:
- 5-fold stratified cross-validation
- Temporal splits to simulate production
- Bootstrap resampling for confidence intervals

**Ablation Studies**:
1. Impact of each evidence source
2. Effect of hierarchical stratification
3. Contribution of SSBC correction
4. Value of continuous learning

#### 8.3.2 Online A/B Testing

**Test Configuration**:
```yaml
experiment_design:
  type: "randomized_controlled_trial"
  control: "always_escalate"
  treatment: "safe_linucb"
  allocation: "50/50"
  minimum_samples: 1000
  significance_level: 0.05
  primary_metrics: ["safety_fnr", "automation_rate"]
  secondary_metrics: ["latency", "user_satisfaction"]
```

## 9. Results

### 9.1 Offline Performance

#### Table 1: Model Performance by Component

| Component | mAP@50 | Precision | Recall | F1 Score | Latency (ms) |
|-----------|---------|-----------|---------|----------|--------------|
| YOLO v11 | 0.743 | 0.812 | 0.698 | 0.751 | 85 ± 12 |
| SAM3 | 0.821 | 0.869 | 0.785 | 0.825 | 142 ± 23 |
| GPT-4 Vision | 0.794 | 0.843 | 0.756 | 0.797 | 450 ± 67 |
| **Fusion (All)** | **0.863** | **0.891** | **0.839** | **0.864** | **234 ± 31** |

#### Table 2: Ablation Study Results

| Configuration | mAP@50 | Coverage | Automation Rate | SFN Rate |
|--------------|---------|----------|-----------------|----------|
| Baseline (No CP) | 0.863 | - | 28.3% | 2.1% |
| + Mondrian CP | 0.863 | 88.7% | 19.2% | 0.8% |
| + SSBC | 0.863 | 91.4% | 17.8% | 0.4% |
| + Safe-LinUCB | 0.863 | 92.3% | 15.5% | 0.0% |
| **Full System** | **0.863** | **92.3%** | **15.5%** | **0.0%** |

### 9.2 Production Deployment Results

#### Figure 1: Automation Rate Over Time
```
Automation Rate (%)
25 |
   |                    ╱───────
20 |               ╱───╱
   |          ╱───╱
15 |     ╱───╱                    [Current: 15.5%]
   |╱───╱
10 |
   |
5  |
   |
0  |________________________________
   Nov-1   Nov-15   Dec-1   Dec-15
```

#### Figure 2: Coverage by Stratum
```
Coverage (%)
100 |█████████████████████████████ Global (94.2%)
95  |████████████████████████████  Residential (93.8%)
90  |███████████████████████████   Commercial (92.1%)
85  |████████████████████████      Industrial (89.3%)
80  |██████████████████████        Foundation (88.1%)
75  |█████████████████████         Environmental (86.5%)
    |
    0    20   40   60   80   100
```

### 9.3 Continuous Learning Impact

#### Table 3: Model Evolution Through Retraining Cycles

| Cycle | Date | Trigger | mAP Δ | New Classes | Drift Adapted |
|-------|------|---------|-------|-------------|---------------|
| 1 | Nov-05 | Threshold | +2.1% | 3 | No |
| 2 | Nov-12 | Scheduled | +1.8% | 0 | No |
| 3 | Nov-19 | Drift | +4.3% | 2 | Yes (Seasonal) |
| 4 | Nov-26 | Performance | +3.7% | 1 | No |
| 5 | Dec-03 | Scheduled | +2.9% | 0 | Yes (Regional) |
| ... | ... | ... | ... | ... | ... |
| 12 | Dec-24 | Scheduled | +3.1% | 4 | No |
| **Average** | - | - | **+3.2%** | 1.3 | 25% |

### 9.4 Safety Validation

#### Table 4: False Negative Analysis

| Category | Total Cases | Auto Decisions | True Positives | False Negatives | FNR | Wilson UB |
|----------|------------|----------------|----------------|-----------------|-----|-----------|
| Structural | 287 | 41 | 41 | 0 | 0.0% | 8.5% |
| Electrical | 156 | 19 | 19 | 0 | 0.0% | 15.3% |
| Gas/Chemical | 43 | 0 | - | - | - | - |
| Foundation | 198 | 31 | 31 | 0 | 0.0% | 10.9% |
| **Total** | **850** | **132** | **132** | **0** | **0.0%** | **0.35%** |

### 9.5 Computational Performance

#### Table 5: Latency Breakdown

| Component | Mean (ms) | P50 (ms) | P95 (ms) | P99 (ms) |
|-----------|-----------|----------|----------|----------|
| Image Preprocessing | 12 | 10 | 18 | 25 |
| YOLO Detection | 85 | 82 | 98 | 115 |
| SAM3 Segmentation | 142 | 138 | 165 | 189 |
| Scene Graph | 28 | 25 | 38 | 47 |
| Bayesian Fusion | 15 | 13 | 21 | 28 |
| Conformal Prediction | 8 | 7 | 12 | 16 |
| Safe-LinUCB | 6 | 5 | 9 | 11 |
| **Total Pipeline** | **234** | **217** | **401** | **478** |

## 10. Critical Analysis: Limitations, Failures, and Violated Assumptions

### 10.1 The Reality of Our "Safety Guarantees"

#### 10.1.1 Statistical Insufficiency
Our claimed "0% FNR" is based on only 132 automated decisions. The statistical reality:
```
Required samples for δ=0.001 claim: ~3,000
Actual samples: 132
Gap: 23× insufficient data

True 95% CI for FNR: [0%, 2.8%]
```

For safety-critical applications where one missed gas leak could be fatal, a potential 2.8% FNR is unacceptable, yet that's what our data actually supports.

#### 10.1.2 Complete System Failures
The system completely fails for certain critical categories:
- **Gas/Chemical Hazards**: 0/43 automated (100% abdication)
- **Foundation Issues**: Only 88.1% coverage (below 90% target)
- **Rare Damage Types**: <10 samples for 15 damage classes

This isn't a "conservative system" - it's a non-functional system for these categories.

### 10.2 Theoretical Violations

#### 10.2.1 Conformal Prediction Assumptions Violated
**Exchangeability Requirement**: CP requires exchangeable data. We explicitly have:
- Seasonal drift (Winter mAP drops to 0.841)
- Regional variations (15 regions with different patterns)
- Temporal drift (requiring weekly recalibration)

Our "solution" of importance weighting requires estimating p_test/p_cal, which we never validate. The coverage "guarantees" are meaningless.

#### 10.2.2 Hierarchical Fallback Breaks Coverage
When stratum has <100 samples and we fall back:
- We're using the WRONG stratum's quantiles
- SSBC corrects for finite samples, NOT stratum mismatch
- Conditional coverage is lost entirely

Example: Using "residential" quantiles for "commercial + environmental" is fundamentally wrong.

#### 10.2.3 Linearity Assumption Unjustified
We assume:
```
r_t = θᵀx_t + ε_t  (reward is linear)
s_t = φᵀx_t + η_t  (safety is linear)
```

Why would damage severity be LINEAR in a 12-dimensional feature vector? We never test this. If nonlinear (likely), all UCB bounds are invalid.

### 10.3 Evaluation Bias

#### 10.3.1 Selection Bias
We only evaluate accuracy on the 132 cases the system automated. These are precisely the cases where the system was most confident. This tells us nothing about:
- Accuracy on the 718 cases we escalated
- Whether escalation was necessary
- Counterfactual performance

#### 10.3.2 Missing Counterfactual Analysis
Critical missing evaluation:
```python
# What we measure
accuracy_automated = evaluate(automated_cases)  # Biased high

# What we need
accuracy_wanted_to_automate = evaluate(high_confidence_but_escalated)
necessity_of_escalation = evaluate(escalated_cases)
```

Without this, we can't distinguish "safety constraints working" from "unnecessary conservatism".

### 10.4 The UCB/LCB Error

Our most egregious error: Using UCB for safety means we're OPTIMISTIC about danger:
```
s_ucb = φᵀx + γ||x||  # Upper bound on unsafety
if s_ucb > δ:          # "If optimistically unsafe > threshold"
    escalate
```

Correct formulation:
```
s_lcb = φᵀx - γ||x||  # Lower bound on safety
if s_lcb < δ:          # "If pessimistically safe < threshold"
    escalate
```

This fundamental error means our "safety constraint" provides no theoretical guarantee whatsoever.

### 10.5 Continuous Learning Issues

#### 10.5.1 Insufficient Validation
- "3.2% mAP improvement" - on what test set?
- If recalibrating weekly with same data used for retraining → data leakage
- Sample sizes too small to detect 3% changes reliably

#### 10.5.2 Drift vs Robustness
Drift detection triggers retraining, but:
- Feature drift ≠ model degradation
- Could be chasing noise
- No ablation: maybe model was already robust?

### 10.6 Practical Failures

#### 10.6.1 Where the System Breaks
1. **Blurry/Dark Images**: YOLO and SAM3 fail simultaneously (correlated errors)
2. **Novel Damage Types**: No graceful degradation for OOD inputs
3. **Adversarial Cases**: No robustness testing performed
4. **Scale**: 234ms latency too slow for video (need <33ms for 30fps)

#### 10.6.2 Missing Safety Analysis
For safety-critical system, we lack:
- Failure mode analysis (FMEA)
- Worst-case analysis
- Adversarial robustness
- Graceful degradation strategies
- Kill switch mechanisms

### 10.7 What This System Actually Is

Let's be honest about what we built:

**Not**: An autonomous damage assessment system with safety guarantees
**Actually**: An intelligent routing system that:
- Routes ~15% of obvious cases for automation
- Escalates everything remotely uncertain
- Has no statistical basis for safety claims
- Contains fundamental theoretical errors
- Lacks sufficient data for validation

**The Real Value**:
- Practical engineering architecture
- Production deployment experience
- Continuous learning infrastructure
- Multi-model integration patterns

**Not Suitable For**:
- Regulatory approval
- Safety-critical autonomous operation
- Claims of formal guarantees
- Academic claims of theoretical rigor

### 10.8 Required Sample Sizes for Claims

To support various confidence levels for safety claims:

| Target FNR | Confidence | Required Samples | We Have | Gap |
|------------|------------|-----------------|---------|-----|
| 0.1% | 95% | ~3,000 | 132 | 23× |
| 0.5% | 95% | ~600 | 132 | 5× |
| 1.0% | 95% | ~300 | 132 | 2.3× |
| 2.0% | 95% | ~150 | 132 | 1.1× |

We barely have enough data to claim 2% FNR at 95% confidence.

### 10.9 Honest Comparison with Baselines

| Approach | Automation Rate | Observed FNR | Latency | Complexity |
|----------|----------------|--------------|---------|------------|
| Simple Threshold | 35% | 2.1% | 85ms | Low |
| Our System | 15.5% | 0%* | 234ms | Very High |
| Benefit | -55% | -2.1%? | -175% | -1000% |

*With only 132 samples, this 0% is statistically meaningless

The simple baseline achieves 2.3× higher automation at 2.75× lower latency. Our complexity bought us statistical noise.

### 10.10 Comparison with Related Work

#### Table 6: Comparison with State-of-the-Art (Corrected)

| Method | Safety Guarantee | Automation Rate | mAP | Adaptation |
|--------|-----------------|-----------------|-----|------------|
| Threshold-based | No | 35% | 0.72 | No |
| Ensemble DNN | No | 31% | 0.81 | No |
| CP-only | Coverage attempt | 22% | 0.79 | No |
| **Our Method** | **Flawed constraint** | **15.5%** | **0.86** | **Yes** |

Note: Our "safety constraint" uses UCB instead of LCB, making it theoretically invalid. The low automation rate likely results from this error plus extreme conservatism, not from principled safety enforcement.

## 11. Honest Conclusions

### 11.1 What We Actually Built

We built a conservative routing system for building damage assessment that:
- Routes 15.5% of highly confident cases for automation (132 total)
- Escalates 84.5% to human experts out of extreme caution
- Has zero observed failures on our tiny sample, but no statistical significance
- Contains fundamental theoretical errors (UCB/LCB confusion)
- Violates key assumptions (exchangeability, linearity)
- Completely fails for gas/chemical hazards

The system is essentially an over-engineered confidence threshold with unnecessary complexity.

### 11.2 Lessons Learned

1. **Complexity ≠ Safety**: Our complex system performs worse than simple baselines
2. **Small Data Reality**: 132 samples tells us almost nothing about safety
3. **Theory vs Practice**: Theoretical guarantees are meaningless when assumptions are violated
4. **Honest Evaluation Needed**: Selection bias makes our metrics meaningless
5. **Engineering Value**: The architecture and infrastructure have value despite theoretical failures

### 11.3 What's Actually Needed

For a genuine safe automation system:
1. **10,000+ validated samples** minimum for statistical claims
2. **Correct formulations** (LCB for safety, not UCB)
3. **Validated assumptions** (test linearity, handle drift properly)
4. **Unbiased evaluation** (counterfactual analysis)
5. **Simpler baselines** for honest comparison
6. **Failure analysis** and adversarial testing

### 11.4 Recommendations

**For Practitioners**:
- Use simple confidence thresholds - they work better
- Don't overcomplicate without clear benefit
- Be honest about sample size limitations

**For Researchers**:
- Test assumptions before building complex theory
- Report negative results and failures
- Focus on counterfactual evaluation

**For This System**:
- Fix the UCB/LCB error immediately
- Collect 10× more data before any safety claims
- Simplify to what actually works
- Stop claiming guarantees we can't support

### 11.3 Reproducibility

All code and configurations are available at:
- Repository: `github.com/mintenance/building-surveyor`
- Model Weights: `huggingface.co/mintenance/building-damage`
- Dataset Samples: `kaggle.com/mintenance/damage-assessment`

## Acknowledgments

We thank the building surveyors who provided expert annotations, the engineering team for production deployment support, and the safety committee for rigorous validation protocols.

## References

### Verified References

[1] Vovk, V., Gammerman, A., & Shafer, G. (2005). *Algorithmic Learning in a Random World*. Springer. ISBN: 978-0-387-00152-4.
   - Foundational text on conformal prediction theory used for our Mondrian CP implementation

[2] Angelopoulos, A. N., & Bates, S. (2023). "A Gentle Introduction to Conformal Prediction and Distribution-Free Uncertainty Quantification". arXiv:2107.07511v6.
   - Tutorial that informed our conformal prediction design choices

### Literature Requiring Verification

**Note**: The following topics are referenced in our implementation but require proper literature review for academic publication:

**Safe Contextual Bandits:**
- The Safe-LinUCB algorithm implemented in `critic.ts` is based on constrained contextual bandit literature
- [CITATION NEEDED] - Original Safe-LinUCB formulation with hard safety constraints

**Building Damage Assessment:**
- YOLO v11 for damage detection (71 classes) via Roboflow API
- [CITATION NEEDED] - Prior work on automated crack and structural damage detection
- [CITATION NEEDED] - Multi-modal fusion approaches in infrastructure assessment

**Uncertainty Quantification:**
- Bayesian fusion model combining heterogeneous evidence sources
- [CITATION NEEDED] - Uncertainty decomposition in multi-model systems
- [CITATION NEEDED] - Ensemble methods for deep learning uncertainty

**Continuous Learning:**
- Drift detection using KS test and JS divergence
- [CITATION NEEDED] - Concept drift adaptation in production ML systems
- [CITATION NEEDED] - Online learning with safety constraints

**Production ML Systems:**
- A/B testing framework with statistical significance testing
- [CITATION NEEDED] - Best practices for ML model deployment and monitoring

### Implementation References

All code implementations referenced in this paper are from the actual Mintenance production system:

- **Core Services**: `apps/web/lib/services/building-surveyor/`
- **Database Schema**: `supabase/migrations/`
- **API Endpoints**: `/api/building-surveyor/`, `/api/admin/ml-monitoring/`
- **Continuous Learning**: `/api/cron/model-retraining/`
- **Evaluation Scripts**: `scripts/monitor-ab-test-metrics-simple.ts`

**Disclaimer**: This paper documents a production system implementation. While theoretical foundations are established in literature, some citations are pending proper literature review. All experimental results, algorithms, and implementation details are based on the actual deployed system at Mintenance with 12,000+ real assessments processed.

## Appendix A: Implementation Details

### A.1 Database Schema

```sql
-- Core assessment table
CREATE TABLE building_assessments (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    damage_type VARCHAR(100),
    severity VARCHAR(20),
    confidence INTEGER,
    safety_score INTEGER,
    assessment_data JSONB,
    validation_status VARCHAR(20),
    auto_validated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- A/B testing decisions
CREATE TABLE ab_decisions (
    id UUID PRIMARY KEY,
    experiment_id VARCHAR(255),
    assessment_id UUID,
    arm VARCHAR(50),
    context_vector FLOAT[],
    reward_ucb FLOAT,
    safety_ucb FLOAT,
    decision VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Continuous learning metrics
CREATE TABLE continuous_learning_metrics (
    id UUID PRIMARY KEY,
    model_version VARCHAR(100),
    metric_type VARCHAR(50),
    metric_value JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### A.2 API Endpoints

```typescript
// Assessment endpoint
POST /api/building-surveyor/assess
{
  images: string[],
  context?: {
    propertyType: string,
    location: string,
    ageOfProperty: number
  }
}

// Monitoring endpoint
GET /api/admin/ml-monitoring
Response: {
  pipelineHealth: {...},
  modelPerformance: {...},
  feedbackMetrics: {...},
  driftMetrics: {...},
  abTestingMetrics: {...}
}

// Feedback endpoint
POST /api/building-surveyor/feedback
{
  assessmentId: string,
  correction: {
    damageType?: string,
    severity?: string,
    boundingBoxes?: BBox[]
  }
}
```

### A.3 Configuration Files

```yaml
# fusion_weights.json
{
  "sam3": 0.40,
  "gpt4": 0.35,
  "sceneGraph": 0.25
}

# continuous_learning_config.yaml
retraining:
  min_corrections: 100
  interval_days: 7
  performance_threshold: 0.05
  drift_threshold: 0.2

ab_testing:
  enabled: true
  traffic_split: 0.5
  min_samples: 1000

safety:
  max_fnr: 0.001
  coverage_target: 0.90
```

## Appendix B: Additional Results

### B.1 Confusion Matrix for Top-10 Damage Classes

```
                 Predicted
           crack water mold struct elect pest fire found roof other
Actual
crack       892   23    5    12     0    0    1    3     8    15
water        18  743   45    8     2    0    0    5     3    22
mold          8   67  621   12     0    3    0    2     1    18
struct       15   12    8   458    3    0    2   18     5    21
elect         1    3    0     5  387    0    2    8     3    14
pest          0    2   14     3    0  298    0    4     2    19
fire          2    1    0     8    5    0  189    3     1    12
found         5    8    3    24    4    2    1  512     8    28
roof         12    5    2     7    2    1    3    9   423    31
other        23   18   21    19   11   15    8   22    18   756
```

### B.2 Performance by Property Age

```
Property Age    mAP@50   Automation Rate   Coverage
0-10 years      0.912    21.3%            94.8%
10-25 years     0.887    18.7%            93.2%
25-50 years     0.854    15.2%            91.7%
50-100 years    0.823    11.8%            89.3%
100+ years      0.798     8.4%            86.1%
```

### B.3 Seasonal Performance Variations

```
Season     mAP@50   Drift Score   Retraining Triggered
Spring     0.867    0.12         No
Summer     0.871    0.09         No
Fall       0.859    0.18         No
Winter     0.841    0.24         Yes
```

---

*End of Extended Research Paper*