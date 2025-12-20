# Building Surveyor AI Skill

## Skill Overview
Expert knowledge for working with the Building Surveyor AI system in Mintenance. Covers property damage detection, ML model integration, continuous learning pipelines, and the hybrid inference system combining YOLO, SAM3, and Google Cloud Vision.

## System Architecture

### Core Components

```
Building Surveyor AI System
├── Image Analysis Pipeline
│   ├── Google Cloud Vision API (external damage detection)
│   ├── Local YOLO Inference (internal damage classification)
│   ├── SAM3 Segmentation (precise damage boundaries)
│   └── Hybrid Inference Service (A/B testing framework)
│
├── Model Management
│   ├── Model Evaluation Service (accuracy tracking)
│   ├── Drift Monitoring (model performance degradation)
│   ├── Knowledge Distillation (student model training)
│   ├── A/B Testing Framework (shadow mode deployment)
│   └── Continuous Learning Pipeline (retraining automation)
│
├── Data Management
│   ├── Training Data Storage (Supabase Storage buckets)
│   ├── SAM3 Training Data Service (auto-labeling)
│   ├── YOLO Training Data Enhanced (dataset preparation)
│   └── Data Annotation Interface (admin panel)
│
└── Assessment Generation
    ├── Building Surveyor Service (main orchestrator)
    ├── Internal Damage Classifier (categorization)
    ├── Cost Estimation (repair pricing)
    └── Report Generation (PDF exports)
```

## Key Services

### 1. Building Surveyor Service (Main Orchestrator)

**Location:** `apps/web/lib/services/building-surveyor/BuildingSurveyorService.ts`

```typescript
import { BuildingSurveyorService } from '@/lib/services/building-surveyor/BuildingSurveyorService';

// Get singleton instance
const surveyor = BuildingSurveyorService.getInstance();

// Analyze property damage
const assessment = await surveyor.analyzePropertyDamage(
  jobId,
  imageUrls,
  propertyType,
  options
);

// Response structure
interface PropertyAssessment {
  jobId: string;
  overallCondition: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  totalEstimatedCost: number;
  detections: DamageDetection[];
  aiConfidence: number;
  recommendations: string[];
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  metadata: {
    processingTime: number;
    imagesAnalyzed: number;
    modelsUsed: string[];
  };
}
```

### 2. Hybrid Inference Service (Multi-Model Orchestration)

**Location:** `apps/web/lib/services/building-surveyor/HybridInferenceService.ts`

```typescript
import { HybridInferenceService } from '@/lib/services/building-surveyor/HybridInferenceService';

const hybridService = HybridInferenceService.getInstance();

// Run inference with automatic model selection
const result = await hybridService.infer(imageBuffer, {
  useLocalYOLO: true,
  useGoogleVision: true,
  useSAM3: false, // Segmentation optional
  fusionStrategy: 'weighted_average', // or 'voting', 'confidence_based'
  confidenceThreshold: 0.7,
});

// Result structure
interface HybridInferenceResult {
  detections: Detection[];
  metadata: {
    localYOLOUsed: boolean;
    googleVisionUsed: boolean;
    sam3Used: boolean;
    processingTime: number;
    modelVersions: Record<string, string>;
  };
  fusedConfidence: number;
  fusionWeights: {
    localYOLO: number;
    googleVision: number;
    sam3: number;
  };
}
```

### 3. Local YOLO Inference Service

**Location:** `apps/web/lib/services/building-surveyor/LocalYOLOInferenceService.ts`

```typescript
import { LocalYOLOInferenceService } from '@/lib/services/building-surveyor/LocalYOLOInferenceService';

const yolo = LocalYOLOInferenceService.getInstance();

// Initialize model (loads from Supabase Storage)
await yolo.initializeModel('best_model_v3.onnx');

// Run inference
const detections = await yolo.detectDamage(imageBuffer, {
  confidenceThreshold: 0.5,
  iouThreshold: 0.4,
  maxDetections: 100,
});

// Detection structure
interface YOLODetection {
  className: string;
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  metadata: {
    modelVersion: string;
    inferenceTime: number;
  };
}
```

### 4. SAM3 Service (Segmentation Anything Model 3)

**Location:** `apps/web/lib/services/building-surveyor/SAM3Service.ts`

```typescript
import { SAM3Service } from '@/lib/services/building-surveyor/SAM3Service';

const sam3 = SAM3Service.getInstance();

// Segment damage areas
const segments = await sam3.segmentImage(imageBuffer, {
  points: [{ x: 100, y: 150 }], // Optional prompt points
  boxes: yoloDetections.map(d => d.boundingBox), // Use YOLO boxes as prompts
  returnMasks: true,
  returnPolygons: true,
});

// Segment structure
interface SAM3Segment {
  mask: number[][]; // Binary mask
  polygon: Array<{ x: number; y: number }>; // Polygon coordinates
  area: number; // Pixels
  confidence: number;
  boundingBox: BoundingBox;
}
```

### 5. Internal Damage Classifier

**Location:** `apps/web/lib/services/building-surveyor/InternalDamageClassifier.ts`

```typescript
import { InternalDamageClassifier } from '@/lib/services/building-surveyor/InternalDamageClassifier';

const classifier = InternalDamageClassifier.getInstance();

// Classify internal damage (walls, ceilings, floors, etc.)
const classification = await classifier.classifyDamage(
  imageBuffer,
  'interior', // 'interior' | 'exterior'
  {
    useMLModel: true,
    fallbackToRules: true,
  }
);

// Classification categories
type DamageCategory =
  | 'water_damage'
  | 'mold'
  | 'cracks'
  | 'paint_peeling'
  | 'structural_damage'
  | 'fire_damage'
  | 'electrical_issues'
  | 'plumbing_issues';

interface DamageClassification {
  category: DamageCategory;
  severity: 'minor' | 'moderate' | 'severe' | 'critical';
  confidence: number;
  estimatedCost: {
    min: number;
    max: number;
    currency: string;
  };
  urgency: 'low' | 'medium' | 'high' | 'immediate';
  recommendations: string[];
}
```

## Model Management & Training

### 6. Model Evaluation Service

**Location:** `apps/web/lib/services/building-surveyor/ModelEvaluationService.ts`

```typescript
import { ModelEvaluationService } from '@/lib/services/building-surveyor/ModelEvaluationService';

const evaluator = ModelEvaluationService.getInstance();

// Evaluate model performance
const metrics = await evaluator.evaluateModel(modelId, testDataset);

// Metrics structure
interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  mAP: number; // Mean Average Precision
  confusionMatrix: number[][];
  classMetrics: Record<string, {
    precision: number;
    recall: number;
    f1: number;
  }>;
  inferenceSpeed: {
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  };
}

// Compare two models
const comparison = await evaluator.compareModels(modelA, modelB, testDataset);
```

### 7. Drift Monitoring Service

**Location:** `apps/web/lib/services/building-surveyor/DriftMonitorService.ts`

```typescript
import { DriftMonitorService } from '@/lib/services/building-surveyor/DriftMonitorService';

const monitor = DriftMonitorService.getInstance();

// Monitor for concept drift
const driftStatus = await monitor.checkDrift(modelId, {
  window: '7d', // Last 7 days
  threshold: 0.05, // 5% accuracy drop triggers alert
});

// Drift detection
interface DriftStatus {
  isDrifting: boolean;
  severity: 'none' | 'low' | 'medium' | 'high';
  metrics: {
    currentAccuracy: number;
    baselineAccuracy: number;
    delta: number;
    trend: 'improving' | 'stable' | 'degrading';
  };
  recommendations: string[];
  suggestedActions: Array<
    | 'retrain'
    | 'collect_more_data'
    | 'adjust_threshold'
    | 'investigate'
  >;
}

// Set up automatic monitoring
await monitor.setupAutomaticMonitoring(modelId, {
  checkInterval: '1d',
  alertThreshold: 0.05,
  notifyAdmins: true,
});
```

### 8. Continuous Learning Service

**Location:** `apps/web/lib/services/building-surveyor/ContinuousLearningService.ts`

```typescript
import { ContinuousLearningService } from '@/lib/services/building-surveyor/ContinuousLearningService';

const learning = ContinuousLearningService.getInstance();

// Trigger retraining
const retrainingJob = await learning.initiateRetraining({
  modelType: 'yolo',
  triggerReason: 'scheduled', // or 'drift_detected', 'new_data_available'
  datasetVersion: 'v4',
  hyperparameters: {
    epochs: 100,
    batchSize: 16,
    learningRate: 0.001,
  },
});

// Monitor retraining progress
const progress = await learning.getRetrainingProgress(retrainingJob.id);

interface RetrainingProgress {
  status: 'queued' | 'preprocessing' | 'training' | 'evaluating' | 'completed' | 'failed';
  currentEpoch: number;
  totalEpochs: number;
  metrics: {
    trainingLoss: number;
    validationLoss: number;
    accuracy: number;
  };
  estimatedTimeRemaining: number; // seconds
  logs: string[];
}
```

### 9. A/B Testing Framework

**Location:** `apps/web/lib/services/building-surveyor/ModelABTestingService.ts`

```typescript
import { ModelABTestingService } from '@/lib/services/building-surveyor/ModelABTestingService';

const abTesting = ModelABTestingService.getInstance();

// Create A/B test
const test = await abTesting.createTest({
  name: 'YOLO v3 vs v4 Comparison',
  modelA: 'yolo_v3_best.onnx',
  modelB: 'yolo_v4_best.onnx',
  trafficSplit: 0.5, // 50/50 split
  shadowMode: true, // Run both, but only use modelA results
  duration: '7d',
  successMetrics: ['accuracy', 'inference_speed'],
});

// Get test results
const results = await abTesting.getTestResults(test.id);

interface ABTestResults {
  winner: 'A' | 'B' | 'tie';
  modelA: {
    requests: number;
    accuracy: number;
    avgInferenceTime: number;
    errorRate: number;
  };
  modelB: {
    requests: number;
    accuracy: number;
    avgInferenceTime: number;
    errorRate: number;
  };
  statisticalSignificance: number; // p-value
  recommendation: 'deploy_B' | 'keep_A' | 'continue_testing';
}
```

## Training Data Management

### 10. SAM3 Training Data Service

**Location:** `apps/web/lib/services/building-surveyor/SAM3TrainingDataService.ts`

```typescript
import { SAM3TrainingDataService } from '@/lib/services/building-surveyor/SAM3TrainingDataService';

const trainingData = SAM3TrainingDataService.getInstance();

// Auto-label images using SAM3
const labeledData = await trainingData.autoLabelImages(imageUrls, {
  confidenceThreshold: 0.8,
  useYOLOPrompts: true, // Use YOLO detections as prompts
  humanReview: true, // Flag for human verification
});

// Store training data
await trainingData.storeTrainingData({
  images: labeledData,
  annotations: {
    format: 'coco', // or 'yolo', 'pascal_voc'
    categories: damageCategories,
  },
  metadata: {
    source: 'sam3_auto_label',
    version: '1.0',
    quality: 'high',
  },
});

// Export for training
const dataset = await trainingData.exportDataset('yolo_v5_format', {
  split: { train: 0.8, val: 0.1, test: 0.1 },
  augmentation: true,
});
```

## Configuration

### Building Surveyor Config

**Location:** `apps/web/lib/services/building-surveyor/config/BuildingSurveyorConfig.ts`

```typescript
export const BuildingSurveyorConfig = {
  // Model paths (Supabase Storage)
  models: {
    yolo: {
      default: 'yolo-models/best_model_v3.onnx',
      fallback: 'yolo-models/best_model_v2.onnx',
    },
    sam3: {
      endpoint: process.env.SAM3_SERVICE_URL || 'http://localhost:8000',
    },
  },

  // Inference settings
  inference: {
    confidenceThreshold: 0.5,
    iouThreshold: 0.4,
    maxDetections: 100,
    enableHybrid: true,
    fusionStrategy: 'weighted_average',
  },

  // Fusion weights
  fusionWeights: {
    localYOLO: 0.5,
    googleVision: 0.3,
    sam3: 0.2,
  },

  // A/B testing
  abTesting: {
    enabled: true,
    defaultTrafficSplit: 0.1, // 10% to new model
    shadowMode: true,
  },

  // Continuous learning
  retraining: {
    autoTrigger: true,
    minNewSamples: 1000,
    minAccuracyDrop: 0.05,
    schedule: '0 2 * * 0', // Sunday 2 AM
  },

  // Storage buckets
  storage: {
    trainingImages: 'training-images',
    yoloModels: 'yolo-models',
    jobAttachments: 'job-attachments',
  },

  // Damage categories
  damageCategories: [
    'roof_damage',
    'wall_cracks',
    'water_damage',
    'foundation_issues',
    'window_damage',
    'door_damage',
    'mold',
    'fire_damage',
    'structural_damage',
    'exterior_damage',
  ],
};
```

## Database Schema

### Key Tables

```sql
-- Model registry
CREATE TABLE public.yolo_models (
  id UUID PRIMARY KEY,
  version TEXT UNIQUE NOT NULL,
  storage_path TEXT NOT NULL,
  accuracy DECIMAL(5,4),
  status TEXT, -- 'training', 'testing', 'production', 'archived'
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Training data
CREATE TABLE public.training_images (
  id UUID PRIMARY KEY,
  job_id UUID REFERENCES public.jobs(id),
  image_url TEXT NOT NULL,
  annotations JSONB,
  source TEXT, -- 'manual', 'sam3_auto', 'google_vision'
  quality_score DECIMAL(3,2),
  human_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Model predictions (for continuous learning)
CREATE TABLE public.model_predictions (
  id UUID PRIMARY KEY,
  model_id UUID REFERENCES public.yolo_models(id),
  image_id UUID REFERENCES public.training_images(id),
  prediction JSONB,
  confidence DECIMAL(5,4),
  ground_truth JSONB,
  is_correct BOOLEAN,
  feedback_provided BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- A/B tests
CREATE TABLE public.model_ab_tests (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  model_a_id UUID REFERENCES public.yolo_models(id),
  model_b_id UUID REFERENCES public.yolo_models(id),
  traffic_split DECIMAL(3,2),
  shadow_mode BOOLEAN,
  status TEXT, -- 'running', 'completed', 'cancelled'
  results JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Drift monitoring
CREATE TABLE public.model_drift_logs (
  id UUID PRIMARY KEY,
  model_id UUID REFERENCES public.yolo_models(id),
  accuracy DECIMAL(5,4),
  baseline_accuracy DECIMAL(5,4),
  is_drifting BOOLEAN,
  severity TEXT,
  metrics JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## API Endpoints

### Building Surveyor API Routes

```typescript
// POST /api/building-surveyor/analyze
// Analyze property damage from images
{
  jobId: string;
  imageUrls: string[];
  propertyType: 'residential' | 'commercial';
  options?: {
    useHybridInference?: boolean;
    generateReport?: boolean;
  }
}

// GET /api/building-surveyor/assessment/:jobId
// Retrieve existing assessment

// POST /api/building-surveyor/feedback
// Provide feedback on predictions (for continuous learning)
{
  predictionId: string;
  isCorrect: boolean;
  correctedLabels?: string[];
  comments?: string;
}

// POST /api/admin/building-surveyor/retrain
// Trigger model retraining (admin only)
{
  modelType: 'yolo';
  datasetVersion: string;
  hyperparameters?: object;
}

// GET /api/admin/building-surveyor/metrics
// Get model performance metrics (admin only)
```

## Testing

### Unit Tests

```typescript
// __tests__/services/building-surveyor/HybridInferenceService.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { HybridInferenceService } from '@/lib/services/building-surveyor/HybridInferenceService';

describe('HybridInferenceService', () => {
  let service: HybridInferenceService;

  beforeEach(() => {
    service = HybridInferenceService.getInstance();
  });

  it('should combine YOLO and Google Vision results', async () => {
    const imageBuffer = Buffer.from('...');
    const result = await service.infer(imageBuffer, {
      useLocalYOLO: true,
      useGoogleVision: true,
    });

    expect(result.detections).toBeDefined();
    expect(result.metadata.localYOLOUsed).toBe(true);
    expect(result.metadata.googleVisionUsed).toBe(true);
  });

  it('should apply fusion weights correctly', async () => {
    // Test fusion strategy implementation
  });
});
```

## Best Practices

### ✅ Always Use Singleton Pattern

```typescript
const service = BuildingSurveyorService.getInstance();
// NOT: new BuildingSurveyorService()
```

### ✅ Log All Predictions for Continuous Learning

```typescript
await serverSupabase.from('model_predictions').insert({
  model_id: currentModelId,
  image_id: imageId,
  prediction: detections,
  confidence: avgConfidence,
});
```

### ✅ Handle Model Loading Failures

```typescript
try {
  await yolo.initializeModel('best_model_v3.onnx');
} catch (error) {
  logger.error('Failed to load model, using fallback', error);
  await yolo.initializeModel('best_model_v2.onnx');
}
```

### ✅ Use Shadow Mode for New Models

```typescript
// Run new model alongside production model
const test = await abTesting.createTest({
  modelA: 'production_model.onnx',
  modelB: 'new_model.onnx',
  shadowMode: true, // Only use modelA results, log modelB
});
```

### ✅ Monitor Model Performance

```typescript
// Set up automatic drift detection
await monitor.setupAutomaticMonitoring(modelId, {
  checkInterval: '1d',
  alertThreshold: 0.05,
});
```

## Common Pitfalls

### ❌ Not Handling Missing Models

```typescript
// WRONG - Will crash if model doesn't exist
const detections = await yolo.detectDamage(image);

// CORRECT - Handle gracefully
try {
  const detections = await yolo.detectDamage(image);
} catch (error) {
  logger.error('YOLO inference failed, falling back to Google Vision', error);
  const detections = await googleVision.analyzeDamage(image);
}
```

### ❌ Ignoring Confidence Thresholds

```typescript
// WRONG - Return all detections regardless of confidence
return allDetections;

// CORRECT - Filter by confidence
return allDetections.filter(d => d.confidence >= 0.5);
```

### ❌ Not Storing Training Data

```typescript
// WRONG - Discard predictions
const result = await service.analyzePropertyDamage(jobId, images);

// CORRECT - Store for retraining
const result = await service.analyzePropertyDamage(jobId, images);
await trainingData.storeTrainingData(images, result.detections);
```

## When to Use This Skill

Load this skill for:
- Building property damage detection features
- Integrating YOLO, SAM3, or Google Vision
- Implementing continuous learning pipelines
- Setting up A/B testing for models
- Managing training data
- Monitoring model performance
- Debugging inference issues
- Understanding the AI/ML architecture
