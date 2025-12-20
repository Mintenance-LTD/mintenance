# Theoretical Foundations: Nested Learning for Building Surveyor Agent

## Abstract

This document outlines the theoretical foundations for the Building Surveyor Agent's implementation of **Nested Learning** principles, as described in "Nested Learning: The Illusion of Deep Learning Architectures" (paper reference). The system combines multi-frequency MLP chains (Continuum Memory), self-modifying projections (Titans), and learned feature extraction to create an adaptive, self-improving assessment system.

## 1. Nested Learning Framework

### 1.1 Core Principle

Nested Learning posits that deep learning architectures can be decomposed into nested optimization problems, where each level operates at different temporal frequencies. This enables:

- **Multi-timescale learning**: Fast adaptation to immediate context, slow adaptation to long-term patterns
- **Memory compression**: Context flows are compressed into parameters at different rates
- **Self-modification**: The model learns to modify its own update algorithm

### 1.2 Mathematical Foundation

#### Equation 30: Multi-Frequency MLP Chains

```
y_t = MLP(f_k)(MLP(f_{k-1})(...MLP(f_1)(x_t)))
```

Where:
- `x_t` is the input at time `t`
- `MLP(f_ℓ)` is the MLP at level `ℓ` with frequency `f_ℓ`
- Higher levels (larger `ℓ`) update less frequently

**Implementation**: `ContinuumMemorySystem.process()`

#### Equation 31: Parameter Updates

```
θ_{i+1} = θ_i - Ση_t f(θ_i; x_t)  when i ≡ 0 (mod C^(ℓ))
```

Where:
- `θ_i` are the parameters at step `i`
- `η_t` is the learning rate
- `C^(ℓ)` is the chunk size for level `ℓ`
- Updates occur only when `i` is a multiple of `C^(ℓ)`

**Implementation**: `ContinuumMemorySystem.updateMemoryLevel()`

## 2. Self-Modifying Titans

### 2.1 Dynamic Projections

Titans implement self-referential learning through dynamic key/value/query projections:

#### Equation 12: Key, Value, Query Computation

```
k_t = X_t W_k
v_t = X_t W_v
q_t = X_t W_q
```

Where:
- `X_t` is the input context
- `W_k`, `W_v`, `W_q` are learned projection matrices
- These projections adapt based on surprise signals

**Implementation**: `SelfModifyingTitans.forward()`

#### Equation 13: Memory Update

```
M_t = M_{t-1} + v_t k_t^T
```

The memory matrix accumulates context through outer products of values and keys.

**Implementation**: `SelfModifyingTitans.updateMemory()`

#### Equation 14: Output Computation

```
Y_t = M_t q_t
```

Output is computed as the memory matrix applied to the query vector.

**Implementation**: `SelfModifyingTitans.computeMemoryOutput()`

### 2.2 Self-Modification

The key innovation is that projections `W_k`, `W_v`, `W_q` are updated based on surprise signals:

```
W_{i+1} = W_i - η ∇_W L(W_i; x_t, u_t)
```

Where:
- `L` is the loss function
- `u_t` is the surprise signal (validation feedback)
- The model learns its own update algorithm

**Implementation**: `SelfModifyingTitans.learnFromSurprise()`

## 3. Learned Feature Extraction

### 3.1 Associative Memory Optimization

Feature extraction is framed as associative memory optimization:

#### Equation 5-6: Feature Learning Objective

```
min_M (M(x_t), u_t)² + λ||M - M_t||²
```

Where:
- `M` is the feature extractor (MLP)
- `x_t` is raw input (images, detections, context)
- `u_t` is target features (from validation feedback)
- `λ` is L2 regularization coefficient

**Implementation**: `LearnedFeatureExtractor.learnFromSurprise()`

### 3.2 Surprise Signal

The surprise signal `u_t` is computed as the difference between:
- **Original features**: Extracted from original assessment
- **Validated features**: Extracted from human-validated assessment

This creates a learning signal that guides the feature extractor toward better representations.

**Implementation**: `BuildingSurveyorService.learnFromValidation()`

## 4. Integration Architecture

### 4.1 Pipeline Flow

```
Input Images
    ↓
[Roboflow Detection] ──┐
[Google Vision] ──────┼──→ [Learned Feature Extractor] → Features (40-dim)
[Context] ────────────┘
    ↓
[Continuum Memory] → Processed Features
    ↓
[Titans (if enabled)] → Self-Modified Features
    ↓
[Memory Query] → Adjustments (5-dim)
    ↓
[GPT-4 Vision] → Assessment
    ↓
[Apply Adjustments] → Final Assessment
```

### 4.2 Learning Flow

```
Human Validation
    ↓
[Calculate Surprise Signals]
    ↓
[Feature Extractor Learning] ← Validated Features
    ↓
[Memory System Learning] ← Accuracy Metrics
    ↓
[Titans Learning (if enabled)] ← Surprise Signals
    ↓
[State Persistence]
```

## 5. Theoretical Guarantees

### 5.1 Convergence

Under certain conditions (Lipschitz continuity, bounded gradients), the nested learning system converges to a local minimum:

- **Continuum Memory**: Converges when error accumulation stabilizes
- **Titans**: Converges when projection changes diminish
- **Feature Extractor**: Converges when surprise signals approach zero

### 5.2 Memory Compression

The multi-frequency structure enables efficient memory compression:

- **High-frequency level**: Stores immediate context (small chunk size)
- **Mid-frequency level**: Stores recent patterns (medium chunk size)
- **Low-frequency level**: Stores long-term knowledge (large chunk size)

This creates a hierarchical memory structure that balances recency and stability.

### 5.3 Self-Modification Stability

Titans self-modification is stable when:

1. Learning rate is sufficiently small: `η < 1/λ_max(W)`
2. Surprise signals are bounded: `||u_t|| < U_max`
3. Regularization is applied: `λ > 0`

## 6. Comparison to Baselines

### 6.1 vs. Static Feature Extraction

**Advantage**: Learned features adapt to validation feedback, improving over time.

**Theoretical Basis**: Associative memory optimization (Equation 5-6) enables the model to learn optimal feature representations.

### 6.2 vs. Fixed Memory Systems

**Advantage**: Multi-frequency structure enables both fast adaptation and stable long-term learning.

**Theoretical Basis**: Nested optimization (Equation 30-31) decomposes the learning problem into multiple timescales.

### 6.3 vs. Non-Self-Modifying Systems

**Advantage**: Titans enable the model to learn its own update algorithm, potentially discovering more efficient learning strategies.

**Theoretical Basis**: Self-referential learning (Equation 12-14) allows the model to optimize its own optimization process.

## 7. Limitations and Future Work

### 7.1 Current Limitations

1. **Simplified Gradients**: Backpropagation is simplified; full analytical gradients could improve learning
2. **Fixed Architecture**: MLP architecture is fixed; could be made learnable
3. **Single Agent**: Currently implemented for building surveyor; could be generalized

### 7.2 Future Theoretical Directions

1. **Regret Bounds**: Analyze regret bounds for the nested learning system
2. **Convergence Rates**: Derive explicit convergence rates for different frequency levels
3. **Generalization**: Prove generalization bounds for learned features
4. **Multi-Agent**: Extend to multi-agent settings with shared memory

## 8. References

1. "Nested Learning: The Illusion of Deep Learning Architectures" (paper reference)
2. Continuum Memory System: `apps/web/lib/services/ml-engine/memory/ContinuumMemorySystem.ts`
3. Self-Modifying Titans: `apps/web/lib/services/ml-engine/memory/SelfModifyingTitans.ts`
4. Learned Feature Extractor: `apps/web/lib/services/building-surveyor/LearnedFeatureExtractor.ts`

## 9. Implementation Notes

### 9.1 Key Design Decisions

1. **40-Dimensional Features**: Fixed dimension for compatibility with existing memory system
2. **3-Level Memory**: High (every step), Mid (daily), Low (weekly) frequencies
3. **Titans at Highest Frequency**: Self-modification applied at the most responsive level
4. **L2 Regularization**: Prevents overfitting in feature extractor

### 9.2 Hyperparameters

- **Feature Extractor Learning Rate**: 0.001
- **Titans Learning Rate**: 0.01
- **Memory Learning Rates**: 0.01 (high), 0.005 (mid), 0.001 (low)
- **L2 Regularization**: 0.0001

These were chosen based on empirical testing and theoretical considerations (stability requirements).

