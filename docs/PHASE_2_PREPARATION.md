# Phase 2 Preparation Guide

**Last Updated:** February 2025  
**Status:** Phase 1 Complete → Preparing for Phase 2  
**Timeline:** Months 6-12

---

## Overview

Phase 2 focuses on fine-tuning open-source Vision Language Models (VLMs) to reduce GPT-4 dependency to 50% and achieve 90%+ accuracy. This document outlines the preparation steps and requirements.

---

## Prerequisites Checklist

### Data Collection (Phase 1) ✅

- [x] Building Surveyor Service deployed
- [x] Data collection pipeline operational
- [x] Admin validation interface active
- [x] Auto-validation system implemented
- [x] Training data export functionality ready
- [x] GPT-4 accuracy tracking implemented
- [x] Synthetic data generation service available

### Data Requirements

**Target:** 10,000+ validated assessments by Month 6

**Current Status:** Track via `/admin/building-assessments` dashboard

**Data Quality Metrics:**
- 85%+ GPT-4 accuracy validated
- Balanced distribution across damage types
- Edge cases represented (structural_failure, asbestos, etc.)

---

## Phase 2 Implementation Plan

### 2.1 Training Infrastructure Setup

**Timeline:** Month 6-7

**Requirements:**
- Cloud GPU instances (AWS SageMaker or Google Cloud AI Platform)
- GPU: NVIDIA A100 or V100 (minimum)
- Storage: S3 or GCS for training datasets
- Model versioning: MLflow or custom system

**Tasks:**
1. Set up AWS SageMaker or GCP AI Platform account
2. Configure GPU instances (A100 recommended)
3. Set up S3/GCS buckets for training data
4. Install MLflow for experiment tracking
5. Configure data preprocessing pipeline

**Files to Create:**
- `apps/web/lib/services/ml-training/VLMTrainingService.ts`
- `apps/web/lib/services/ml-training/DataPreprocessor.ts`
- `scripts/setup-training-infrastructure.sh`

### 2.2 Training Data Preparation

**Timeline:** Month 7

**Format:** JSONL (JSON Lines) for fine-tuning

**Data Structure:**
```json
{
  "messages": [
    {
      "role": "system",
      "content": "You are a professional UK building surveyor..."
    },
    {
      "role": "user",
      "content": [
        {"type": "text", "text": "Analyze damage"},
        {"type": "image_url", "image_url": "https://..."}
      ]
    },
    {
      "role": "assistant",
      "content": "{\"damageType\": \"water_damage\", ...}"
    }
  ]
}
```

**Tasks:**
1. Export validated assessments using `/api/admin/training-data/export`
2. Split into train/validation/test sets (80/10/10)
3. Apply data augmentation (rotation, brightness, contrast)
4. Validate JSONL format compatibility

**Files to Create:**
- `apps/web/lib/services/ml-training/TrainingDataPreparer.ts`
- `scripts/prepare-training-data.sh`

### 2.3 Model Selection & Fine-Tuning

**Timeline:** Month 7-9

**Model Options:**
1. **LLaVA-7B** (Recommended)
   - Good balance of performance and cost
   - Well-documented fine-tuning process
   - Active community support

2. **BLIP-2**
   - Strong vision-language understanding
   - More complex fine-tuning

**Fine-Tuning Configuration:**
```yaml
base_model: LLaVA-7B
learning_rate: 2e-5
batch_size: 4-8 (depending on GPU)
epochs: 3-5
optimizer: AdamW
lora_adapters: true  # For efficiency
```

**Tasks:**
1. Download LLaVA-7B base model
2. Set up fine-tuning script
3. Run initial training run
4. Hyperparameter tuning
5. Model evaluation on test set

**Files to Create:**
- `scripts/train-vlm.sh`
- `apps/web/lib/services/ml-training/training-config.yaml`
- `apps/web/lib/services/ml-training/ModelEvaluator.ts`

### 2.4 Model Deployment

**Timeline:** Month 9-10

**Infrastructure:**
- Inference endpoint (AWS SageMaker or GCP)
- Model versioning system
- A/B testing framework
- Performance monitoring

**Tasks:**
1. Deploy fine-tuned model to inference endpoint
2. Set up model versioning
3. Implement A/B testing system
4. Create performance monitoring dashboard
5. Set up automatic fallback to GPT-4

**Files to Create:**
- `apps/web/lib/services/ml-training/ModelDeploymentService.ts`
- `apps/web/lib/services/ml-training/ABTestService.ts`
- `apps/web/app/admin/model-performance/page.tsx`

### 2.5 A/B Testing & Gradual Rollout

**Timeline:** Month 10-12

**Rollout Strategy:**
- Week 1: 10% traffic to fine-tuned model
- Week 2-3: 25% traffic
- Week 4-5: 50% traffic
- Week 6+: 100% if metrics are good

**Metrics to Track:**
- Accuracy (vs human validation)
- Latency (target: <2s)
- Cost per assessment
- User satisfaction
- Error rate

**Tasks:**
1. Implement traffic routing logic
2. Set up metrics collection
3. Monitor performance daily
4. Adjust rollout based on metrics
5. Document lessons learned

**Files to Modify:**
- `apps/web/lib/services/building-surveyor/BuildingSurveyorService.ts`
- Add model selection logic
- Add fallback mechanism

---

## Success Criteria

### Technical Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Accuracy | 90%+ | Compare with human validation |
| Latency | <2s | P95 response time |
| Cost/Image | $0.005-0.01 | vs GPT-4's $0.03-0.05 |
| GPT-4 Dependency | 50% | Traffic split |
| Error Rate | <5% | Failed assessments |

### Business Metrics

| Metric | Target |
|--------|--------|
| Training Data Collected | 10,000+ validated |
| Model Training Time | <50 GPU hours |
| Cost Reduction | 50% vs GPT-4 |
| User Satisfaction | Maintained or improved |

---

## Risk Mitigation

### Technical Risks

**Risk:** Fine-tuned model underperforms
- **Mitigation:** Keep GPT-4 as fallback (A/B testing)
- **Fallback:** Gradual rollout, not all-or-nothing

**Risk:** Training infrastructure costs too high
- **Mitigation:** Use spot instances, optimize training
- **Fallback:** Partner with ML companies

**Risk:** Data quality insufficient
- **Mitigation:** Continue Phase 1 data collection
- **Fallback:** Use synthetic data generation

### Business Risks

**Risk:** Model accuracy below target
- **Mitigation:** Extended training, more data
- **Fallback:** Delay Phase 2, continue Phase 1

**Risk:** User experience degrades
- **Mitigation:** A/B testing, gradual rollout
- **Fallback:** Rollback to GPT-4

---

## Next Steps

### Immediate (Month 6)

1. **Review Phase 1 Data Collection**
   - Check validation statistics
   - Ensure 10,000+ validated assessments
   - Review GPT-4 accuracy metrics

2. **Set Up Training Infrastructure**
   - Choose cloud provider (AWS/GCP)
   - Provision GPU instances
   - Set up storage buckets

3. **Export Training Data**
   - Use `/api/admin/training-data/export`
   - Validate JSONL format
   - Split into train/val/test sets

### Short-term (Month 7-9)

1. **Fine-Tune LLaVA Model**
   - Download base model
   - Run initial training
   - Hyperparameter tuning

2. **Evaluate Model Performance**
   - Test on validation set
   - Compare with GPT-4
   - Document results

### Medium-term (Month 10-12)

1. **Deploy Fine-Tuned Model**
   - Set up inference endpoint
   - Implement A/B testing
   - Monitor performance

2. **Gradual Rollout**
   - Start with 10% traffic
   - Increase based on metrics
   - Target 50% GPT-4 dependency

---

## Resources

### Documentation
- [LLaVA Fine-Tuning Guide](https://github.com/haotian-liu/LLaVA)
- [AWS SageMaker Fine-Tuning](https://docs.aws.amazon.com/sagemaker/)
- [MLflow Documentation](https://mlflow.org/docs/latest/index.html)

### Training Data Export
- Endpoint: `/api/admin/training-data/export?format=jsonl&limit=10000`
- Format: JSONL (compatible with LLaVA fine-tuning)
- Authentication: Admin required

### Monitoring
- Admin Dashboard: `/admin/building-assessments`
- Model Performance: `/admin/model-performance` (to be created)
- Accuracy Tracking: `/api/admin/training-data/accuracy-stats`

---

## Questions & Support

For questions about Phase 2 preparation:
1. Review this document
2. Check Phase 1 implementation status
3. Consult ML team or external consultants
4. Review training infrastructure setup guides

**Status:** Ready to begin Phase 2 when 10,000+ validated assessments are collected.

