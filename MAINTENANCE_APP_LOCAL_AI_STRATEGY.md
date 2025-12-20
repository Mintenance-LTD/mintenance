# Local AI Strategy for Maintenance App
## Cost-Effective Architecture Using Your Own Models

### The Problem with Current Costs

```
CURRENT EXTERNAL SERVICE COSTS:
- Roboflow: $249-599/month (API calls add up fast!)
- GPT-4 Vision: $0.01-0.03 per image
- Google Vision: $1.50 per 1000 images

For 1000 assessments/day:
- Roboflow: $599/month + overages
- GPT-4: ~$900/month
- Total: ~$1,500+/month = $18,000/year!
```

### Your Better Solution: Local Models + SAM3

```
LOCAL INFRASTRUCTURE COSTS:
- Your own YOLO: $0 per inference (after training)
- SAM3: $0 per inference (you have it!)
- Training: ~$500 one-time
- GPU Server: $200-400/month

Total: ~$400/month = $4,800/year (73% cheaper!)
```

---

## Revised Architecture: Keep SAM3, Train Your Own YOLO

### Why SAM3 Is Actually Perfect for You

I was wrong to suggest removing SAM3. Here's why you should KEEP it:

1. **Free Segmentation**: You already have it built - why pay Roboflow?
2. **Training Data Generation**: SAM3 can auto-generate masks for training YOLO!
3. **Precision**: Pixel-perfect boundaries help contractors understand damage extent
4. **Knowledge Distillation**: SAM3 → teach your YOLO model

### The Smart Pipeline

```
YOUR COST-EFFECTIVE PIPELINE:

1. INITIAL (Month 1-2):
   Images → SAM3 + GPT-4 (limited) → Collect Labels → Train YOLO

2. TRANSITION (Month 3-4):
   Images → Your YOLO + SAM3 → Verify with GPT-4 (10% only)

3. MATURE (Month 5+):
   Images → Your YOLO + SAM3 → Knowledge Base → No external APIs!
```

---

## Phase 1: Bootstrap Your Training Data (Month 1)

### Step 1: Use SAM3 to Generate Training Data

```typescript
// apps/web/lib/services/maintenance/TrainingDataGenerator.ts

export class TrainingDataGenerator {
  /**
   * SAM3 can segment ANYTHING - we just need to tell it what to label
   */
  static async generateTrainingData(
    images: string[],
    hints: { point?: [x: y], box?: BoundingBox, text?: string }
  ) {
    // Use SAM3 to segment damage areas
    const sam3Masks = await SAM3Service.segment(images[0], {
      guidance: hints,
      mode: 'automatic', // Let SAM3 find everything
    });

    // Use GPT-4 to classify what SAM3 found (only during bootstrap)
    const classifications = await this.classifyWithGPT(images[0], sam3Masks);

    // Save as YOLO training data
    await this.saveAsYOLOFormat({
      image: images[0],
      annotations: this.convertToYOLO(sam3Masks, classifications)
    });

    return {
      masks: sam3Masks,
      labels: classifications,
      yolo_annotations: this.convertToYOLO(sam3Masks, classifications)
    };
  }

  /**
   * Convert SAM3 masks to YOLO bounding boxes
   */
  private static convertToYOLO(
    masks: SAM3Output[],
    classifications: Classification[]
  ): YOLOAnnotation[] {
    return masks.map((mask, i) => {
      const bbox = this.maskToBoundingBox(mask);
      return {
        class_id: this.getClassId(classifications[i].label),
        x_center: bbox.x + bbox.width / 2,
        y_center: bbox.y + bbox.height / 2,
        width: bbox.width,
        height: bbox.height,
        confidence: classifications[i].confidence
      };
    });
  }
}
```

### Step 2: Smart Data Collection Strategy

```typescript
// apps/web/lib/services/maintenance/SmartDataCollector.ts

export class SmartDataCollector {
  /**
   * Collect data efficiently - not randomly!
   */
  static async collectStrategically() {
    // 1. Partner with 10 contractors
    const partners = await this.getPartnerContractors();

    // 2. Get their recent job photos (with permission)
    for (const contractor of partners) {
      const jobs = await this.getRecentJobs(contractor.id);

      for (const job of jobs) {
        // Generate training data using SAM3
        const trainingData = await TrainingDataGenerator.generateTrainingData(
          job.images,
          { text: job.description } // Use job description as hint
        );

        // Verify with contractor
        await this.requestVerification(contractor.id, {
          job_id: job.id,
          proposed_labels: trainingData.labels,
          reward: 5.00 // Pay for verification
        });
      }
    }

    // 3. Synthetic augmentation for rare categories
    await this.generateSyntheticData({
      categories: ['gas_leak', 'electrical_fire'], // Critical but rare
      augmentations: ['rotation', 'brightness', 'noise', 'blur'],
      count_per_category: 100
    });
  }

  /**
   * Use GPT-4 ONLY for initial bootstrap (first 1000 images)
   */
  static async bootstrapWithGPT(limit = 1000) {
    const unlabeledImages = await this.getUnlabeledImages(limit);

    for (const img of unlabeledImages) {
      // Run SAM3 first (free!)
      const segments = await SAM3Service.segment(img);

      // Only use GPT-4 for classification, not detection
      const labels = await this.classifyWithGPT(img, segments, {
        prompt: "Classify these segments: leak, crack, electrical damage, etc."
      });

      await this.saveTrainingData(img, segments, labels);
    }
  }
}
```

---

## Phase 2: Train Your Own YOLO (Month 2)

### Your Existing Infrastructure Works!

You already have `LocalYOLOInferenceService.ts` - let's use it:

```typescript
// apps/web/lib/services/maintenance/MaintenanceYOLOTrainer.ts

export class MaintenanceYOLOTrainer {
  /**
   * Train YOUR OWN YOLO model with YOUR data
   */
  static async trainCustomYOLO() {
    // 1. Export training data from database
    const trainingData = await this.exportFromDatabase();

    // 2. Use your existing YOLO infrastructure
    const config = {
      model: 'yolov8m', // Medium model, good balance
      epochs: 100,
      batch_size: 16,
      imgsz: 640,
      categories: MAINTENANCE_CATEGORIES, // Your 15 categories
      data_yaml: this.generateDataYaml(trainingData)
    };

    // 3. Train using your existing pipeline
    const job = await supabase.from('yolo_retraining_jobs').insert({
      config,
      training_data_path: trainingData.path,
      status: 'pending'
    }).single();

    // 4. Your existing training service handles it
    await this.runTraining(job.id);

    return job;
  }

  /**
   * Use your existing LocalYOLOInferenceService
   */
  static async runInference(image: string) {
    // This is FREE after training!
    const detections = await LocalYOLOInferenceService.detectWithLocalModel(
      image,
      { model_version: 'maintenance_v1' }
    );

    return detections;
  }
}
```

### Training Pipeline You Already Have!

```typescript
// You already have this in YOLOTrainingService.ts!
// Just adapt it for maintenance categories

export class MaintenanceModelTraining {
  static async setupTrainingPipeline() {
    // Your existing tables support this
    const sql = `
      -- You already have yolo_models table
      INSERT INTO yolo_models (
        model_name,
        model_type,
        version,
        storage_path,
        categories
      ) VALUES (
        'maintenance-yolo-v1',
        'detection',
        '1.0.0',
        'models/maintenance/v1.onnx',
        $1::jsonb
      )
    `;

    // Your existing continuous learning pipeline
    await ContinuousLearningService.initialize({
      model_type: 'maintenance_yolo',
      min_samples_for_training: 500,
      auto_retrain_days: 14
    });
  }
}
```

---

## Phase 3: SAM3 + YOLO Power Combo (Month 3)

### Why SAM3 + Your YOLO Is Perfect

```typescript
// apps/web/lib/services/maintenance/HybridDetectionService.ts

export class HybridDetectionService {
  /**
   * SAM3 for precision + YOLO for classification = Perfect combo
   */
  static async detectWithBoth(images: string[]) {
    // 1. Your YOLO detects and classifies (FAST - 50ms)
    const yoloDetections = await LocalYOLOInferenceService.detect(images[0]);

    // 2. SAM3 refines boundaries (PRECISE - 200ms)
    const refinedSegments = await Promise.all(
      yoloDetections.map(detection =>
        SAM3Service.segment(images[0], {
          box: detection.bbox,  // Use YOLO box as hint
          refine: true
        })
      )
    );

    // 3. Combine both insights
    return yoloDetections.map((detection, i) => ({
      ...detection,
      precise_mask: refinedSegments[i],
      area_affected: this.calculateArea(refinedSegments[i]),
      severity: this.assessSeverity(refinedSegments[i], detection.class)
    }));
  }

  /**
   * This is powerful for contractors!
   */
  static assessSeverity(mask: Mask, damageType: string): Severity {
    const pixelCount = mask.pixels.filter(p => p === 1).length;
    const totalPixels = mask.width * mask.height;
    const percentageAffected = (pixelCount / totalPixels) * 100;

    // Different damage types have different severity thresholds
    const thresholds = {
      'pipe_leak': { minor: 5, moderate: 15, severe: 30 },
      'wall_crack': { minor: 2, moderate: 5, severe: 10 },
      'roof_damage': { minor: 10, moderate: 25, severe: 40 }
    };

    const threshold = thresholds[damageType] || thresholds['wall_crack'];

    if (percentageAffected < threshold.minor) return 'minor';
    if (percentageAffected < threshold.moderate) return 'moderate';
    if (percentageAffected < threshold.severe) return 'severe';
    return 'critical';
  }
}
```

---

## Cost Comparison: Local vs External

### Month 1-3 (Bootstrap Phase)

| Service | External (Roboflow) | Local (YOLO + SAM3) |
|---------|---------------------|---------------------|
| Detection | $599/month | $0 (after setup) |
| Segmentation | $300/month extra | $0 (SAM3 included) |
| Training | Not included | $500 one-time |
| GPU Server | N/A | $300/month |
| GPT-4 (bootstrap) | $300/month | $300/month (temporary) |
| **Total** | **$1,199/month** | **$600/month** |

### Month 4+ (Production)

| Service | External | Local |
|---------|----------|-------|
| Detection | $599/month | $0 |
| Segmentation | $300/month | $0 |
| GPT-4 | $300/month | $30/month (edge cases) |
| GPU Server | N/A | $300/month |
| **Total** | **$1,199/month** | **$330/month** |

**Annual Savings: $10,428/year (72% cheaper!)**

---

## Training Data Bootstrap Plan

### Week 1: Collect Initial 500 Images

```typescript
// scripts/bootstrap-training-data.ts

async function bootstrapTrainingData() {
  // 1. Get historical job images (with permission)
  const historicalJobs = await supabase
    .from('jobs')
    .select('id, images, description, damage_type')
    .not('images', 'is', null)
    .limit(500);

  // 2. Process with SAM3 + GPT-4 (one-time cost)
  for (const job of historicalJobs.data) {
    // SAM3 segments everything
    const segments = await SAM3Service.segment(job.images[0], {
      mode: 'everything' // Segment all regions
    });

    // GPT-4 classifies segments (only during bootstrap!)
    const labels = await classifySegments(segments, job.description);

    // Save as training data
    await saveTrainingData({
      image: job.images[0],
      segments,
      labels,
      source: 'historical',
      verified: false
    });
  }

  console.log('Bootstrap complete! Ready to train YOLO.');
}
```

### Week 2: Partner Collection

```typescript
async function collectFromPartners() {
  // Email to contractors:
  const emailTemplate = `
    Help us improve our AI and get 3 months free!

    We need photos of common maintenance issues:
    - Pipe leaks
    - Wall cracks
    - Electrical damage
    - HVAC issues

    For every 10 verified photos: $50 credit
    For 100+ photos: 3 months premium free
  `;

  // Simple upload interface
  const uploadPortal = '/contractor/ai-training-contribution';
}
```

### Week 3-4: Train Your YOLO

```bash
# Using YOLOv8 (free, open source)
pip install ultralytics

# Train with your data
yolo train \
  data=maintenance_dataset.yaml \
  model=yolov8m.pt \
  epochs=100 \
  imgsz=640 \
  batch=16 \
  device=0  # GPU
```

---

## Deployment Strategy

### Option 1: Self-Hosted GPU ($300/month)

```yaml
# docker-compose.yml
services:
  yolo-service:
    image: your-yolo-service
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]

  sam3-service:
    image: your-sam3-service
    depends_on:
      - yolo-service
    environment:
      - MODEL_PATH=/models/sam3
```

### Option 2: Serverless GPU ($200/month)

```typescript
// Using Replicate or Modal for on-demand GPU

import Replicate from 'replicate';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export async function runInference(image: string) {
  // Only pay when used
  const output = await replicate.run(
    "your-username/maintenance-yolo:latest",
    { input: { image } }
  );

  return output;
}
```

### Option 3: Edge Deployment (Mobile!)

```typescript
// For React Native - run on device!
import { YOLO } from '@tensorflow/tfjs-react-native';

export async function detectOnDevice(image: Tensor) {
  // Runs on phone - ZERO server costs!
  const model = await tf.loadGraphModel('maintenance-yolo-mobile.tflite');
  const predictions = await model.predict(image);

  return predictions;
}
```

---

## Why This Is Better

### 1. You Own Your Model
- No vendor lock-in
- Improve it continuously
- Sell it as a service later!

### 2. Cost Effective
- 72% cheaper than external services
- Costs decrease as you scale
- One-time training investment

### 3. Better for Your Use Case
- SAM3 gives precise damage boundaries
- YOLO trained on YOUR specific categories
- Faster inference (local = no network latency)

### 4. Knowledge Distillation Path

```
Month 1-2: GPT-4 teaches → SAM3 + YOLO learn
Month 3-4: SAM3 + YOLO handle 90% → GPT-4 for edge cases
Month 5+: Fully autonomous → GPT-4 only for new categories
```

---

## Implementation Checklist

### Month 1: Bootstrap
- [ ] Deploy SAM3 service (you have the code!)
- [ ] Collect 500-1000 initial images
- [ ] Use SAM3 + GPT-4 to generate labels
- [ ] Set up training data pipeline

### Month 2: Train
- [ ] Train YOLO on your 15 categories
- [ ] Set up LocalYOLOInferenceService
- [ ] Deploy to GPU server
- [ ] A/B test against Roboflow

### Month 3: Optimize
- [ ] Implement SAM3 + YOLO hybrid
- [ ] Add contractor feedback loop
- [ ] Reduce GPT-4 usage to <10%
- [ ] Monitor cost savings

---

## SQL Migrations for Local Model Tracking

```sql
-- Track your model performance vs external services
CREATE TABLE model_performance_comparison (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Model info
  model_type VARCHAR(50), -- 'local_yolo', 'roboflow', 'gpt4'
  model_version VARCHAR(20),

  -- Performance metrics
  accuracy FLOAT,
  precision FLOAT,
  recall FLOAT,
  f1_score FLOAT,

  -- Cost metrics
  cost_per_inference DECIMAL(10, 6),
  inference_time_ms INTEGER,

  -- Usage
  daily_inferences INTEGER,
  daily_cost DECIMAL(10, 2),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track training data quality
CREATE TABLE training_data_quality (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  image_id UUID REFERENCES training_images(id),

  -- Quality metrics
  has_sam3_mask BOOLEAN,
  has_yolo_bbox BOOLEAN,
  has_human_verification BOOLEAN,

  -- Labeling source
  initial_label_source VARCHAR(50), -- 'gpt4', 'contractor', 'synthetic'
  verified_by UUID REFERENCES users(id),

  -- Quality score
  confidence_score FLOAT,
  quality_score FLOAT, -- Composite of multiple factors

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## The Smart Path Forward

1. **Keep SAM3** - It's free precision that Roboflow charges for
2. **Train your own YOLO** - One-time cost, lifetime savings
3. **Use GPT-4 sparingly** - Only for bootstrap and edge cases
4. **Collect data strategically** - Partner with contractors

**Month 1 Cost**: $600 (mostly GPT-4 for bootstrap)
**Month 6 Cost**: $330 (just GPU server)
**Roboflow Cost**: $1,199/month forever!

You save $10,428/year AND own your model. Plus, SAM3's precise segmentation actually gives contractors better information than Roboflow's bounding boxes.

Want me to detail the specific training script or show how to adapt your existing `LocalYOLOInferenceService` for maintenance categories?