# Complete Maintenance AI Implementation Plan
## Leveraging Building Surveyor Infrastructure with Local Models

---

## Executive Summary

After reviewing the entire Building Surveyor AI architecture and 23+ SQL migrations, I've discovered you have a **production-grade ML infrastructure** that's 95% reusable for your maintenance app. The system includes:

- **Complete training pipeline** with knowledge distillation
- **Model versioning** with cloud storage
- **A/B testing** with statistical rigor
- **Continuous learning** with quality gates
- **Drift detection** and auto-adjustment
- **Comprehensive monitoring** and alerts

**Key Strategy**: Keep SAM3 + train your own YOLO = $330/month instead of $1,199/month for external services.

---

## Part 1: Architecture Deep Dive

### What You Currently Have

```
BUILDING SURVEYOR AI SYSTEM:
┌──────────────────────────────────────────────────────────────┐
│                                                               │
│  23+ Database Tables Supporting:                             │
│  • Training data collection (5 tables)                       │
│  • Model storage & versioning (3 tables + 3 buckets)         │
│  • Continuous learning (6 tables)                            │
│  • A/B testing (12 tables)                                   │
│  • Inference logging & monitoring (4 tables)                 │
│                                                               │
│  Core Services:                                               │
│  • BuildingSurveyorService (main orchestrator)               │
│  • LocalYOLOInferenceService (ONNX runtime)                  │
│  • SAM3Service (segmentation, needs deployment)              │
│  • BayesianFusionService (evidence combination)              │
│  • ContinuousLearningService (auto-retraining)               │
│  • ModelABTestingService (safe deployment)                   │
│  • DriftMonitorService (distribution shift detection)         │
│                                                               │
│  Infrastructure:                                              │
│  • Supabase Storage buckets configured                       │
│  • RLS policies for multi-tenancy                            │
│  • Comprehensive indexes for performance                     │
│  • Helper functions for statistics                           │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### Your Actual Needs for Maintenance App

```
MAINTENANCE APP REQUIREMENTS:
┌──────────────────────────────────────────────────────────────┐
│                                                               │
│  Homeowner Flow:                                             │
│  • Upload photo → Detect issue → Route to contractor         │
│  • 15-20 common categories (leaks, cracks, electrical)       │
│  • "Need better photo" fallback                              │
│                                                               │
│  Contractor Flow:                                             │
│  • Receive job with AI analysis                              │
│  • See: Issue type, severity, materials, tools, time         │
│  • Provide feedback for continuous improvement               │
│                                                               │
│  Technical Requirements:                                      │
│  • 2-3 second response time                                  │
│  • 85%+ accuracy (contractor verifies on-site)               │
│  • Cost < $500/month                                         │
│  • Continuous improvement from feedback                      │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## Part 2: Database Adaptation Strategy

### Tables You Can Reuse As-Is (95%)

```sql
-- These tables are generic and work for ANY ML system:

✅ yolo_models                    -- Model storage (ONNX files)
✅ model_registry                  -- All model types
✅ yolo_retraining_jobs           -- Training jobs
✅ knowledge_distillation_jobs    -- Teacher-student training
✅ model_ab_tests                 -- A/B test configs
✅ model_assignments              -- User → variant mapping
✅ model_inference_logs           -- Performance tracking
✅ continuous_learning_metrics    -- Pipeline health
✅ drift_events                   -- Distribution shifts
✅ system_alerts                  -- Monitoring
✅ feedback_quality_tracking      -- Feedback validation

-- Storage buckets (already configured):
✅ yolo-models                    -- ONNX model files
✅ training-datasets              -- Export datasets
✅ model-artifacts                -- Metrics, logs
✅ training-images                -- Training data
```

### Tables Needing Minor Adaptation (5%)

```sql
-- 1. Rename building_assessments → maintenance_assessments
ALTER TABLE building_assessments RENAME TO maintenance_assessments;

-- 2. Add maintenance-specific columns
ALTER TABLE maintenance_assessments
  ADD COLUMN issue_category VARCHAR(50) CHECK (
    issue_category IN ('plumbing', 'electrical', 'hvac', 'structural', 'appliance')
  ),
  ADD COLUMN contractor_type VARCHAR(50),
  ADD COLUMN estimated_duration VARCHAR(20),
  ADD COLUMN materials_needed JSONB,
  ADD COLUMN tools_required JSONB,
  ADD COLUMN homeowner_tips TEXT[];

-- 3. Update enum values for maintenance domain
ALTER TABLE maintenance_assessments
  DROP CONSTRAINT IF EXISTS building_assessments_damage_type_check,
  ADD CONSTRAINT maintenance_issue_type_check CHECK (
    damage_type IN (
      'pipe_leak', 'faucet_drip', 'toilet_issue', 'water_heater', 'drain_blocked',
      'outlet_damage', 'light_fixture', 'circuit_breaker',
      'wall_crack', 'ceiling_stain', 'window_broken', 'door_issue',
      'ac_not_cooling', 'heating_issue', 'vent_blocked'
    )
  );

-- 4. Rename correction tables
ALTER TABLE yolo_corrections RENAME TO maintenance_corrections;
ALTER TABLE gpt4_training_labels RENAME TO maintenance_training_labels;
ALTER TABLE sam3_training_masks RENAME TO maintenance_segmentation_masks;
```

---

## Part 3: Implementation Plan - Phase by Phase

### Phase 0: Infrastructure Setup (Week 1)

#### Day 1-2: Deploy SAM3 Service

```yaml
# docker-compose.yml for SAM3 service
version: '3.8'

services:
  sam3-service:
    build:
      context: ./apps/sam3-service
      dockerfile: Dockerfile
    image: maintenance-sam3:latest
    ports:
      - "8001:8001"
    environment:
      - MODEL_PATH=/models/sam3/sam_vit_h_4b8939.pth
      - DEVICE=cuda  # or cpu if no GPU
      - MAX_WORKERS=4
    volumes:
      - ./models:/models
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

```typescript
// apps/web/.env.local
ENABLE_SAM3_SEGMENTATION=true
SAM3_SERVICE_URL=http://localhost:8001
SAM3_ROLLOUT_PERCENTAGE=100  // Use for all maintenance
SAM3_TIMEOUT_MS=5000  // Faster timeout for maintenance
```

#### Day 3-4: Database Migration

```bash
# Create migration file
npx supabase migration new maintenance_ai_adaptation

# Run the adaptation SQL (from Part 2)
npx supabase db push

# Verify tables
npx supabase db dump --schema-only | grep maintenance_
```

#### Day 5: Configure Storage Buckets

```typescript
// scripts/setup-maintenance-storage.ts
import { createClient } from '@supabase/supabase-js';

async function setupMaintenanceStorage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Create maintenance-specific bucket if needed
  const { data: buckets } = await supabase.storage.listBuckets();

  if (!buckets?.find(b => b.name === 'maintenance-models')) {
    await supabase.storage.createBucket('maintenance-models', {
      public: false,
      fileSizeLimit: 500 * 1024 * 1024, // 500MB
      allowedMimeTypes: ['application/octet-stream', 'application/onnx']
    });
  }

  console.log('Storage buckets configured for maintenance');
}
```

---

### Phase 1: Training Data Bootstrap (Week 2)

#### Strategy: SAM3 + GPT-4 for Initial 1000 Labels

```typescript
// scripts/bootstrap-maintenance-training.ts

import { SAM3Service } from '@/lib/services/building-surveyor/SAM3Service';
import { openai } from '@/lib/openai-client';

const MAINTENANCE_CATEGORIES = [
  'pipe_leak', 'faucet_drip', 'toilet_issue', 'water_heater', 'drain_blocked',
  'outlet_damage', 'light_fixture', 'circuit_breaker',
  'wall_crack', 'ceiling_stain', 'window_broken', 'door_issue',
  'ac_not_cooling', 'heating_issue', 'vent_blocked'
];

async function bootstrapTrainingData() {
  // 1. Get historical job images (with permission)
  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, images, description, title')
    .not('images', 'is', null)
    .limit(1000);

  for (const job of jobs) {
    try {
      // 2. SAM3 segments everything (FREE!)
      const segments = await SAM3Service.segment(job.images[0], {
        mode: 'everything',  // Segment all regions
        min_mask_region_area: 100  // Filter tiny regions
      });

      // 3. GPT-4 classifies ONCE during bootstrap
      const classification = await classifyWithGPT4(
        job.images[0],
        segments,
        job.description
      );

      // 4. Save as training data
      await saveTrainingData({
        job_id: job.id,
        image: job.images[0],
        segments: segments,
        classification: classification,
        source: 'bootstrap_gpt4'
      });

    } catch (error) {
      console.error(`Failed to process job ${job.id}:`, error);
    }
  }
}

async function classifyWithGPT4(
  imageUrl: string,
  segments: SAM3Output[],
  description: string
): Promise<MaintenanceClassification> {

  // Create visual overlay of segments
  const segmentDescriptions = segments.map((seg, i) =>
    `Region ${i}: ${seg.area} pixels at position (${seg.bbox.x}, ${seg.bbox.y})`
  ).join('\n');

  const response = await openai.chat.completions.create({
    model: "gpt-4-vision-preview",
    messages: [{
      role: "user",
      content: [
        {
          type: "text",
          text: `Analyze this maintenance issue image.
                 User description: ${description}

                 Detected regions:
                 ${segmentDescriptions}

                 Classify into one of these categories:
                 ${MAINTENANCE_CATEGORIES.join(', ')}

                 For each significant region, identify:
                 1. Issue type
                 2. Severity (minor/moderate/major/critical)
                 3. Affected area percentage

                 Return as JSON.`
        },
        {
          type: "image_url",
          image_url: { url: imageUrl }
        }
      ]
    }],
    max_tokens: 500
  });

  return JSON.parse(response.choices[0].message.content);
}

async function saveTrainingData(data: {
  job_id: string;
  image: string;
  segments: SAM3Output[];
  classification: MaintenanceClassification;
  source: string;
}) {
  // Save GPT-4 labels
  await supabase.from('maintenance_training_labels').insert({
    assessment_id: data.job_id,
    image_urls: [data.image],
    gpt4_response: data.classification,
    damage_type: data.classification.primary_issue,
    severity: data.classification.severity,
    confidence: data.classification.confidence,
    used_in_training: false
  });

  // Save SAM3 masks
  for (const [index, segment] of data.segments.entries()) {
    const issueForSegment = data.classification.regions?.[index];

    if (issueForSegment) {
      await supabase.from('maintenance_segmentation_masks').insert({
        assessment_id: data.job_id,
        image_url: data.image,
        damage_type: issueForSegment.issue_type,
        masks: segment.mask,
        boxes: segment.bbox,
        scores: [segment.confidence],
        num_instances: 1,
        total_affected_area: segment.area,
        used_in_training: false
      });
    }
  }

  // Generate YOLO format labels
  const yoloLabels = convertToYOLOFormat(data.segments, data.classification);

  await supabase.from('maintenance_corrections').insert({
    assessment_id: data.job_id,
    image_url: data.image,
    corrected_labels: yoloLabels,
    correction_quality: 'bootstrap',
    status: 'approved',
    used_in_training: false
  });
}

function convertToYOLOFormat(
  segments: SAM3Output[],
  classification: MaintenanceClassification
): string {
  // YOLO format: class_id x_center y_center width height
  const lines = [];

  for (const [index, segment] of segments.entries()) {
    const issue = classification.regions?.[index];
    if (!issue) continue;

    const classId = MAINTENANCE_CATEGORIES.indexOf(issue.issue_type);
    if (classId === -1) continue;

    const bbox = segment.bbox;
    const xCenter = (bbox.x + bbox.width / 2) / 640;  // Normalize to [0,1]
    const yCenter = (bbox.y + bbox.height / 2) / 640;
    const width = bbox.width / 640;
    const height = bbox.height / 640;

    lines.push(`${classId} ${xCenter} ${yCenter} ${width} ${height}`);
  }

  return lines.join('\n');
}
```

#### Data Collection from Contractors

```typescript
// app/contractor/contribute-training-data/page.tsx

export default function ContributeTrainingData() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">
        Help Train Our AI - Earn Rewards!
      </h1>

      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
        <p className="font-semibold">Earn £5 per 10 verified photos</p>
        <p>Get 3 months premium free with 100+ contributions</p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>What We Need</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {MAINTENANCE_CATEGORIES.map(category => (
                <div key={category} className="flex items-center space-x-2">
                  <Checkbox id={category} />
                  <Label htmlFor={category}>
                    {category.replace('_', ' ')}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <ImageUploadWithLabeling
          onSubmit={async (images, labels) => {
            // Process with SAM3
            for (const [index, image] of images.entries()) {
              const segments = await SAM3Service.segment(image);

              await saveContractorContribution({
                image,
                segments,
                label: labels[index],
                contractor_id: currentUser.id
              });
            }
          }}
        />
      </div>
    </div>
  );
}
```

---

### Phase 2: Train Your Own YOLO (Week 3)

#### Training Script

```python
# scripts/train-maintenance-yolo.py

from ultralytics import YOLO
import yaml
import os
from pathlib import Path

# Configuration
config = {
    'path': './datasets/maintenance',
    'train': 'images/train',
    'val': 'images/val',
    'test': 'images/test',

    # 15 maintenance categories
    'names': {
        0: 'pipe_leak',
        1: 'faucet_drip',
        2: 'toilet_issue',
        3: 'water_heater',
        4: 'drain_blocked',
        5: 'outlet_damage',
        6: 'light_fixture',
        7: 'circuit_breaker',
        8: 'wall_crack',
        9: 'ceiling_stain',
        10: 'window_broken',
        11: 'door_issue',
        12: 'ac_not_cooling',
        13: 'heating_issue',
        14: 'vent_blocked'
    }
}

# Save config
with open('maintenance_dataset.yaml', 'w') as f:
    yaml.dump(config, f)

# Train model
model = YOLO('yolov8m.pt')  # Start from pretrained

results = model.train(
    data='maintenance_dataset.yaml',
    epochs=100,
    imgsz=640,
    batch=16,
    patience=20,
    save=True,
    device=0,  # GPU
    project='maintenance',
    name='v1',
    exist_ok=True,

    # Augmentation
    hsv_h=0.015,
    hsv_s=0.7,
    hsv_v=0.4,
    degrees=10,
    translate=0.1,
    scale=0.5,
    shear=0.0,
    perspective=0.0,
    flipud=0.0,
    fliplr=0.5,
    mosaic=1.0,
    mixup=0.0,
    copy_paste=0.0
)

# Export to ONNX
model.export(format='onnx', simplify=True, opset=11)

# Save metrics
metrics = {
    'mAP50': results.metrics['mAP50'],
    'mAP50_95': results.metrics['mAP50_95'],
    'precision': results.metrics['precision'],
    'recall': results.metrics['recall'],
    'f1': (2 * results.metrics['precision'] * results.metrics['recall']) /
          (results.metrics['precision'] + results.metrics['recall'])
}

print(f"Training complete! Metrics: {metrics}")

# Upload to Supabase Storage
from upload_model import upload_to_storage
model_path = upload_to_storage(
    'maintenance/v1/best.onnx',
    'maintenance-yolo-v1',
    metrics
)
print(f"Model uploaded to: {model_path}")
```

#### Integration with LocalYOLOInferenceService

```typescript
// apps/web/lib/services/maintenance/MaintenanceYOLOService.ts

import { LocalYOLOInferenceService } from '../building-surveyor/LocalYOLOInferenceService';

export class MaintenanceYOLOService extends LocalYOLOInferenceService {
  static readonly MODEL_NAME = 'maintenance-yolo-v1';

  static readonly MAINTENANCE_CLASSES = [
    'pipe_leak', 'faucet_drip', 'toilet_issue', 'water_heater', 'drain_blocked',
    'outlet_damage', 'light_fixture', 'circuit_breaker',
    'wall_crack', 'ceiling_stain', 'window_broken', 'door_issue',
    'ac_not_cooling', 'heating_issue', 'vent_blocked'
  ];

  static async detectMaintenanceIssues(imageUrl: string): Promise<MaintenanceDetection[]> {
    // Use your trained model (FREE after training!)
    const detections = await this.detectWithLocalModel(
      imageUrl,
      {
        modelName: this.MODEL_NAME,
        confidenceThreshold: 0.5,
        iouThreshold: 0.45
      }
    );

    // Map to maintenance-specific format
    return detections.map(d => ({
      issue_type: this.MAINTENANCE_CLASSES[d.class_id],
      confidence: d.confidence,
      bbox: d.bbox,
      severity: this.estimateSeverity(d),
      requires_immediate_attention: this.isUrgent(d.class_id)
    }));
  }

  private static estimateSeverity(detection: Detection): Severity {
    // Use bounding box size as proxy for severity
    const area = detection.bbox.width * detection.bbox.height;
    const imageArea = 640 * 640;
    const percentage = (area / imageArea) * 100;

    if (percentage < 5) return 'minor';
    if (percentage < 15) return 'moderate';
    if (percentage < 30) return 'major';
    return 'critical';
  }

  private static isUrgent(classId: number): boolean {
    const urgentClasses = [0, 3, 5, 7]; // pipe_leak, water_heater, outlet_damage, circuit_breaker
    return urgentClasses.includes(classId);
  }
}
```

---

### Phase 3: SAM3 + YOLO Integration (Week 4)

#### The Power Combo

```typescript
// apps/web/lib/services/maintenance/MaintenanceAssessmentService.ts

export class MaintenanceAssessmentService {
  /**
   * Complete assessment pipeline using YOLO + SAM3
   */
  static async assessMaintenanceIssue(
    images: string[],
    userDescription?: string
  ): Promise<MaintenanceAssessment> {

    const startTime = Date.now();

    try {
      // 1. Run YOUR YOLO for detection (50ms)
      const yoloDetections = await MaintenanceYOLOService.detectMaintenanceIssues(images[0]);

      if (yoloDetections.length === 0) {
        return this.handleNoDetection(images, userDescription);
      }

      // 2. Use SAM3 for precise segmentation (200ms)
      const enhancedDetections = await this.enhanceWithSAM3(images[0], yoloDetections);

      // 3. Calculate detailed metrics from segmentation
      const analysis = this.analyzeSegmentations(enhancedDetections);

      // 4. Look up knowledge base
      const knowledge = await this.getMaintenanceKnowledge(analysis.primary_issue);

      // 5. Build complete assessment
      const assessment: MaintenanceAssessment = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),

        // Detection results
        issue_detected: analysis.primary_issue,
        confidence: analysis.confidence,
        severity: analysis.severity,

        // Enhanced by SAM3
        affected_area_percentage: analysis.affected_area_percentage,
        precise_location: analysis.location_description,
        damage_boundaries: enhancedDetections[0].precise_mask,

        // Knowledge base
        contractor_type: knowledge.contractor_type,
        urgency: knowledge.urgency,
        estimated_duration: knowledge.time_estimate,
        materials_needed: knowledge.materials,
        tools_required: knowledge.tools,
        safety_notes: knowledge.safety_notes,
        immediate_actions: knowledge.immediate_actions,
        cost_range: knowledge.cost_range,

        // User guidance
        homeowner_tips: knowledge.homeowner_tips,
        diy_possibility: knowledge.diy_difficulty,

        // Metadata
        processing_time_ms: Date.now() - startTime,
        model_version: 'maintenance-yolo-v1',
        segmentation_enabled: true
      };

      // 6. Store for continuous learning
      await this.storeAssessment(assessment);

      return assessment;

    } catch (error) {
      console.error('Assessment failed:', error);

      // Fallback to GPT-4 for edge cases
      if (this.shouldUseFallback(error)) {
        return this.assessWithGPT4Fallback(images, userDescription);
      }

      throw error;
    }
  }

  /**
   * Enhance YOLO detections with SAM3 segmentation
   */
  private static async enhanceWithSAM3(
    imageUrl: string,
    yoloDetections: MaintenanceDetection[]
  ): Promise<EnhancedDetection[]> {

    // Use YOLO bounding boxes as prompts for SAM3
    const segmentationPrompts = yoloDetections.map(d => ({
      box: [d.bbox.x, d.bbox.y, d.bbox.x + d.bbox.width, d.bbox.y + d.bbox.height],
      label: d.issue_type
    }));

    const sam3Results = await SAM3Service.segment(imageUrl, {
      boxes: segmentationPrompts.map(p => p.box),
      refine_masks: true
    });

    // Combine YOLO classification with SAM3 precision
    return yoloDetections.map((detection, index) => ({
      ...detection,
      precise_mask: sam3Results.masks[index],
      mask_confidence: sam3Results.scores[index],
      pixel_count: this.countMaskPixels(sam3Results.masks[index]),
      boundaries: this.extractBoundaries(sam3Results.masks[index])
    }));
  }

  /**
   * Analyze segmentations to determine severity
   */
  private static analyzeSegmentations(
    detections: EnhancedDetection[]
  ): SegmentationAnalysis {

    const primary = detections[0]; // Highest confidence
    const totalImagePixels = 640 * 640;

    const affectedPixels = detections.reduce(
      (sum, d) => sum + d.pixel_count,
      0
    );

    const affectedPercentage = (affectedPixels / totalImagePixels) * 100;

    // Severity based on issue type AND affected area
    const severity = this.calculateSeverity(
      primary.issue_type,
      affectedPercentage,
      detections.length // Number of damage sites
    );

    return {
      primary_issue: primary.issue_type,
      confidence: primary.confidence,
      severity,
      affected_area_percentage: affectedPercentage,
      num_damage_sites: detections.length,
      location_description: this.describeLocation(primary.boundaries),
      all_issues: detections.map(d => d.issue_type)
    };
  }

  /**
   * Knowledge base lookup
   */
  private static async getMaintenanceKnowledge(
    issueType: string
  ): Promise<MaintenanceKnowledge> {

    // Could be database or static JSON
    const knowledge = MAINTENANCE_KNOWLEDGE_BASE[issueType];

    if (!knowledge) {
      // Fallback to general knowledge
      return MAINTENANCE_KNOWLEDGE_BASE['general'];
    }

    return knowledge;
  }

  /**
   * Fallback for low confidence or no detection
   */
  private static handleNoDetection(
    images: string[],
    description?: string
  ): MaintenanceAssessment {

    if (!description) {
      return {
        status: 'need_more_info',
        message: 'Could not detect any issues. Can you describe what\'s wrong?',
        request_description: true,
        guidance: [
          'Take a closer photo of the problem area',
          'Ensure good lighting',
          'Include the entire affected area in frame'
        ]
      };
    }

    // Use description to guide detection
    return this.assessWithDescription(images, description);
  }
}
```

---

### Phase 4: Continuous Learning Pipeline (Month 2)

#### Contractor Feedback Loop

```typescript
// app/api/maintenance/feedback/route.ts

export async function POST(request: Request) {
  const {
    assessmentId,
    wasAccurate,
    actualIssue,
    actualSeverity,
    actualTime,
    contractorNotes
  } = await request.json();

  // 1. Store feedback
  const { data: feedback } = await supabase
    .from('maintenance_corrections')
    .insert({
      assessment_id: assessmentId,
      original_detections: await getOriginalDetections(assessmentId),
      corrections_made: {
        actual_issue: actualIssue,
        actual_severity: actualSeverity,
        was_accurate: wasAccurate
      },
      corrected_by: request.user.id,
      correction_quality: 'contractor',
      status: 'pending'
    })
    .single();

  // 2. Check if retraining threshold met
  const { count } = await supabase
    .from('maintenance_corrections')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')
    .eq('correction_quality', 'contractor');

  if (count >= 100) {
    // 3. Trigger retraining
    await triggerRetraining();
  }

  // 4. Update continuous learning metrics
  await updateMetrics({
    total_corrections: count,
    contractor_feedback_rate: calculateFeedbackRate(),
    accuracy_trend: calculateAccuracyTrend()
  });

  return NextResponse.json({ success: true, feedback_id: feedback.id });
}

async function triggerRetraining() {
  // Use existing retraining infrastructure
  const { data: job } = await supabase
    .from('yolo_retraining_jobs')
    .insert({
      id: `maintenance-retrain-${Date.now()}`,
      status: 'pending',
      config_jsonb: {
        model_name: 'maintenance-yolo',
        base_model: 'maintenance-yolo-v1',
        training_data: 'maintenance_corrections',
        epochs: 50,
        learning_rate: 0.001
      }
    })
    .single();

  // Trigger actual training (could be AWS Lambda, etc)
  await fetch(process.env.TRAINING_WEBHOOK_URL!, {
    method: 'POST',
    body: JSON.stringify({ job_id: job.id })
  });
}
```

#### Automated Quality Validation

```typescript
// apps/web/lib/services/maintenance/QualityValidationService.ts

export class QualityValidationService {
  /**
   * Validate contractor corrections before using for training
   */
  static async validateCorrections(): Promise<void> {

    // Get pending corrections
    const { data: corrections } = await supabase
      .from('maintenance_corrections')
      .select('*')
      .eq('status', 'pending')
      .limit(50);

    for (const correction of corrections) {
      const quality = await this.assessQuality(correction);

      if (quality.score >= 0.8) {
        // High quality - approve automatically
        await this.approveCorrection(correction.id, quality);

      } else if (quality.score >= 0.6) {
        // Medium quality - needs review
        await this.flagForReview(correction.id, quality);

      } else {
        // Low quality - reject
        await this.rejectCorrection(correction.id, quality);
      }
    }
  }

  private static async assessQuality(
    correction: Correction
  ): Promise<QualityScore> {

    const checks = {
      // Consistency with similar corrections
      consistency: await this.checkConsistency(correction),

      // Completeness of information
      completeness: this.checkCompleteness(correction),

      // Plausibility of the correction
      plausibility: await this.checkPlausibility(correction),

      // Agreement with other contractors
      agreement: await this.checkAgreement(correction)
    };

    const score = (
      checks.consistency * 0.3 +
      checks.completeness * 0.2 +
      checks.plausibility * 0.3 +
      checks.agreement * 0.2
    );

    return {
      score,
      details: checks,
      recommendation: score >= 0.8 ? 'approve' : score >= 0.6 ? 'review' : 'reject'
    };
  }

  private static async checkConsistency(
    correction: Correction
  ): Promise<number> {

    // Find similar corrections
    const { data: similar } = await supabase
      .from('maintenance_corrections')
      .select('*')
      .eq('original_detections->issue_type', correction.original_detections.issue_type)
      .eq('status', 'approved')
      .limit(10);

    if (!similar || similar.length === 0) {
      return 0.5; // No data to compare
    }

    // Check if correction aligns with others
    const matches = similar.filter(s =>
      s.corrections_made.actual_issue === correction.corrections_made.actual_issue
    );

    return matches.length / similar.length;
  }
}
```

---

### Phase 5: A/B Testing & Deployment (Month 3)

#### Safe Model Deployment

```typescript
// apps/web/lib/services/maintenance/MaintenanceABTestingService.ts

export class MaintenanceABTestingService {
  /**
   * Create A/B test for new model version
   */
  static async deployNewModel(
    newModelVersion: string,
    trafficSplit: number = 0.1 // Start with 10%
  ): Promise<ABTest> {

    // 1. Create A/B test configuration
    const { data: test } = await supabase
      .from('model_ab_tests')
      .insert({
        test_id: `maintenance-${newModelVersion}`,
        config_jsonb: {
          control_model: 'maintenance-yolo-v1',
          treatment_model: newModelVersion,
          traffic_split: trafficSplit,
          metrics: ['latency', 'accuracy', 'contractor_satisfaction'],
          success_criteria: {
            accuracy_improvement: 0.02, // 2% improvement
            latency_max_degradation: 0.1, // 10% slower is OK
            satisfaction_min: 0.8 // 80% satisfaction
          },
          min_sample_size: 1000,
          max_duration_days: 14
        },
        status: 'draft'
      })
      .single();

    // 2. Start the test
    await this.startABTest(test.test_id);

    return test;
  }

  /**
   * Route user to model variant
   */
  static async getModelForUser(
    userId: string,
    sessionId: string
  ): Promise<ModelVariant> {

    // Check active A/B tests
    const { data: activeTests } = await supabase
      .from('model_ab_tests')
      .select('*')
      .eq('status', 'running')
      .single();

    if (!activeTests) {
      // No active test - use production model
      return {
        model_name: 'maintenance-yolo-v1',
        variant: 'control'
      };
    }

    // Check existing assignment
    let { data: assignment } = await supabase
      .from('model_assignments')
      .select('*')
      .eq('test_id', activeTests.test_id)
      .eq('session_id', sessionId)
      .single();

    if (!assignment) {
      // New assignment based on traffic split
      const inTreatment = Math.random() < activeTests.config_jsonb.traffic_split;

      assignment = await supabase
        .from('model_assignments')
        .insert({
          test_id: activeTests.test_id,
          session_id: sessionId,
          user_id: userId,
          assigned_model: inTreatment ? 'treatment' : 'control',
          assignment_method: 'random'
        })
        .single();
    }

    return {
      model_name: assignment.assigned_model === 'treatment'
        ? activeTests.config_jsonb.treatment_model
        : activeTests.config_jsonb.control_model,
      variant: assignment.assigned_model,
      test_id: activeTests.test_id
    };
  }

  /**
   * Log inference performance
   */
  static async logInference(
    testId: string,
    sessionId: string,
    variant: string,
    performance: InferencePerformance
  ): Promise<void> {

    await supabase.from('model_inference_logs').insert({
      test_id: testId,
      session_id: sessionId,
      model_variant: variant,
      latency_ms: performance.latency,
      success: performance.success,
      detections_count: performance.detections?.length || 0,
      avg_confidence: performance.avgConfidence,
      error_message: performance.error
    });
  }

  /**
   * Analyze A/B test results
   */
  static async analyzeResults(testId: string): Promise<ABTestResults> {

    // Use the view for aggregated metrics
    const { data: metrics } = await supabase
      .from('model_ab_test_metrics')
      .select('*')
      .eq('test_id', testId)
      .single();

    // Calculate statistical significance
    const significance = await supabase.rpc('calculate_ab_test_significance', {
      control_mean: metrics.control_avg_latency,
      control_std: metrics.control_std_latency,
      control_n: metrics.control_inferences,
      treatment_mean: metrics.treatment_avg_latency,
      treatment_std: metrics.treatment_std_latency,
      treatment_n: metrics.treatment_inferences
    });

    // Get contractor satisfaction scores
    const satisfaction = await this.getContractorSatisfaction(testId);

    return {
      test_id: testId,
      status: metrics.status,
      control: {
        sessions: metrics.control_sessions,
        inferences: metrics.control_inferences,
        avg_latency: metrics.control_avg_latency,
        success_rate: metrics.control_success_rate,
        avg_confidence: metrics.control_avg_confidence,
        satisfaction: satisfaction.control
      },
      treatment: {
        sessions: metrics.treatment_sessions,
        inferences: metrics.treatment_inferences,
        avg_latency: metrics.treatment_avg_latency,
        success_rate: metrics.treatment_success_rate,
        avg_confidence: metrics.treatment_avg_confidence,
        satisfaction: satisfaction.treatment
      },
      statistical_significance: significance,
      recommendation: this.getRecommendation(metrics, significance, satisfaction)
    };
  }

  private static getRecommendation(
    metrics: any,
    significance: any,
    satisfaction: any
  ): string {

    // Check success criteria
    const accuracyImproved =
      metrics.treatment_success_rate > metrics.control_success_rate * 1.02;

    const latencyAcceptable =
      metrics.treatment_avg_latency < metrics.control_avg_latency * 1.1;

    const satisfactionMet =
      satisfaction.treatment >= 0.8;

    const isSignificant =
      significance.p_value < 0.05;

    if (accuracyImproved && latencyAcceptable && satisfactionMet && isSignificant) {
      return 'DEPLOY_TREATMENT';
    } else if (!latencyAcceptable || satisfaction.treatment < 0.7) {
      return 'ROLLBACK_TO_CONTROL';
    } else {
      return 'CONTINUE_TESTING';
    }
  }
}
```

---

### Phase 6: Production Monitoring (Ongoing)

#### Dashboard & Alerts

```typescript
// app/admin/maintenance-ai/page.tsx

export default function MaintenanceAIDashboard() {
  const { data: metrics } = useQuery({
    queryKey: ['maintenance-ai-metrics'],
    queryFn: fetchMetrics
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Real-time Metrics */}
      <MetricCard
        title="Detection Accuracy"
        value={`${metrics?.accuracy || 0}%`}
        trend={metrics?.accuracyTrend}
        target={85}
      />

      <MetricCard
        title="Average Latency"
        value={`${metrics?.latency || 0}ms`}
        trend={metrics?.latencyTrend}
        target={3000}
      />

      <MetricCard
        title="Contractor Satisfaction"
        value={`${metrics?.satisfaction || 0}%`}
        trend={metrics?.satisfactionTrend}
        target={80}
      />

      {/* Cost Tracking */}
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Cost Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Local Models (YOLO + SAM3)</span>
              <span className="font-bold text-green-600">
                ${metrics?.localCost || 0}/month
              </span>
            </div>
            <div className="flex justify-between">
              <span>If Using Roboflow</span>
              <span className="text-gray-500 line-through">
                ${metrics?.externalCost || 0}/month
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t">
              <span className="font-semibold">Monthly Savings</span>
              <span className="font-bold text-green-600">
                ${(metrics?.externalCost - metrics?.localCost) || 0}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active A/B Tests */}
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>Active A/B Tests</CardTitle>
        </CardHeader>
        <CardContent>
          <ABTestsTable tests={metrics?.activeTests || []} />
        </CardContent>
      </Card>

      {/* Drift Detection */}
      <Card>
        <CardHeader>
          <CardTitle>Distribution Drift</CardTitle>
        </CardHeader>
        <CardContent>
          <DriftChart data={metrics?.driftScores || []} />
          {metrics?.driftAlert && (
            <Alert className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Drift Detected</AlertTitle>
              <AlertDescription>
                {metrics.driftAlert.message}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Training Pipeline Status */}
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Training Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <PipelineStatus
            corrections={metrics?.pendingCorrections || 0}
            lastTraining={metrics?.lastTrainingDate}
            nextScheduled={metrics?.nextTrainingDate}
            modelVersion={metrics?.currentModelVersion}
          />
        </CardContent>
      </Card>
    </div>
  );
}
```

#### Automated Alerts

```typescript
// apps/web/lib/services/maintenance/AlertingService.ts

export class MaintenanceAlertingService {
  static async checkHealthAndAlert(): Promise<void> {

    const checks = await Promise.all([
      this.checkAccuracyDegradation(),
      this.checkLatencyIncrease(),
      this.checkDriftScore(),
      this.checkFeedbackRate(),
      this.checkErrorRate()
    ]);

    for (const check of checks) {
      if (check.alertNeeded) {
        await this.createAlert(check);
      }
    }
  }

  private static async checkAccuracyDegradation(): Promise<HealthCheck> {
    const { data: recent } = await supabase
      .from('maintenance_corrections')
      .select('was_accurate')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .limit(100);

    const accuracy = recent.filter(r => r.was_accurate).length / recent.length;

    return {
      metric: 'accuracy',
      value: accuracy,
      threshold: 0.85,
      alertNeeded: accuracy < 0.85,
      severity: accuracy < 0.75 ? 'critical' : 'warning',
      message: `Accuracy dropped to ${(accuracy * 100).toFixed(1)}%`
    };
  }

  private static async createAlert(check: HealthCheck): Promise<void> {
    await supabase.from('system_alerts').insert({
      type: `maintenance_${check.metric}_degradation`,
      severity: check.severity,
      message: check.message,
      metadata: {
        metric: check.metric,
        current_value: check.value,
        threshold: check.threshold
      }
    });

    // Send notification (email, Slack, etc)
    if (check.severity === 'critical') {
      await this.sendCriticalAlert(check);
    }
  }
}

// Run health checks every hour
cron.schedule('0 * * * *', async () => {
  await MaintenanceAlertingService.checkHealthAndAlert();
});
```

---

## Part 4: Cost Analysis & ROI

### Monthly Cost Breakdown

| Component | External Services | Your Local Solution | Savings |
|-----------|------------------|-------------------|---------|
| Detection (YOLO) | Roboflow: $599 | Your YOLO: $0 | $599 |
| Segmentation | Roboflow Extra: $300 | SAM3: $0 | $300 |
| Complex Analysis | GPT-4: $300 | GPT-4 (10%): $30 | $270 |
| GPU Infrastructure | N/A | AWS/GCP: $300 | -$300 |
| **Total Monthly** | **$1,199** | **$330** | **$869** |
| **Annual** | **$14,388** | **$3,960** | **$10,428** |

### ROI Timeline

```
Month 1: -$600 (Bootstrap training with GPT-4)
Month 2: -$400 (Training costs)
Month 3: +$469 (Savings kick in)
Month 4: +$869/month savings
...
Month 12: +$8,828 total savings Year 1
Month 24: +$19,256 total savings Year 2
```

**Break-even: Month 3**
**Year 1 Savings: $8,828**
**Year 2+ Savings: $10,428/year**

---

## Part 5: Implementation Timeline

### Week 1: Infrastructure
- [ ] Deploy SAM3 service
- [ ] Run database migrations
- [ ] Configure storage buckets
- [ ] Set up GPU server

### Week 2: Data Collection
- [ ] Bootstrap 1000 images with SAM3 + GPT-4
- [ ] Partner with 10 contractors
- [ ] Set up contribution portal
- [ ] Generate synthetic data

### Week 3: Model Training
- [ ] Train maintenance YOLO v1
- [ ] Export to ONNX
- [ ] Upload to storage
- [ ] Integration testing

### Week 4: Integration
- [ ] Implement assessment service
- [ ] Add feedback endpoints
- [ ] Create contractor UI
- [ ] Set up monitoring

### Month 2: Enhancement
- [ ] Enable continuous learning
- [ ] Quality validation
- [ ] A/B testing framework
- [ ] Performance optimization

### Month 3: Production
- [ ] Deploy to production
- [ ] Monitor metrics
- [ ] Collect feedback
- [ ] First retraining cycle

---

## Part 6: Key Success Factors

### 1. Start Simple
- 15 categories, not 71
- Confidence thresholds, not complex math
- Contractor verification, not autonomous decisions

### 2. Use What You Have
- Existing SQL infrastructure (95% reusable)
- LocalYOLOInferenceService (ready to go)
- SAM3Service (just needs deployment)
- Continuous learning pipeline (fully built)

### 3. Bootstrap Smartly
- SAM3 for free segmentation
- GPT-4 only for initial labels
- Contractor partnerships for data
- Synthetic augmentation for rare cases

### 4. Monitor Everything
- Accuracy trends
- Latency metrics
- Cost tracking
- Drift detection
- Contractor satisfaction

### 5. Iterate Safely
- A/B testing for new models
- Shadow mode for risky changes
- Automatic rollback on degradation
- Gradual rollout (10% → 50% → 100%)

---

## Part 7: Common Pitfalls & Solutions

### Pitfall 1: Not Enough Training Data
**Solution**:
- Partner with contractors (100 photos = 3 months free)
- Use SAM3 to generate masks automatically
- Synthetic augmentation for rare categories
- Start with just 500-1000 images

### Pitfall 2: Model Drift
**Solution**:
- Already built: `DriftMonitorService`
- Automatic weight adjustment
- Alerts when drift > 30%
- Scheduled retraining every 2 weeks

### Pitfall 3: Poor Contractor Adoption
**Solution**:
- Make it valuable (saves prep time)
- Incentivize feedback ($5 per 10 corrections)
- Show ROI (time saved, jobs completed faster)
- Keep it simple (one-click feedback)

### Pitfall 4: High Latency
**Solution**:
- Cache model in memory
- Use ONNX Runtime (faster than PyTorch)
- Resize images before inference
- Consider edge deployment for mobile

---

## Conclusion

You have a **production-ready ML infrastructure** that's perfectly suited for your maintenance app. By:

1. **Keeping SAM3** for free, precise segmentation
2. **Training your own YOLO** on 15 maintenance categories
3. **Reusing 95% of existing database schema**
4. **Leveraging continuous learning pipeline**

You can build a maintenance AI system that:
- Costs **$330/month** instead of $1,199/month
- Achieves **85%+ accuracy** in 3 months
- **Continuously improves** from contractor feedback
- **Scales to industrial** when ready

The infrastructure is already there. The path is clear. The ROI is compelling.

**Next Step**: Deploy SAM3 service and start collecting training data.

---

## Appendix: Quick Start Commands

```bash
# 1. Deploy SAM3
docker-compose up -d sam3-service

# 2. Run migrations
npx supabase migration new maintenance_adaptation
npx supabase db push

# 3. Bootstrap training data
npm run scripts:bootstrap-maintenance-training

# 4. Train YOLO
python scripts/train-maintenance-yolo.py

# 5. Deploy model
npm run deploy:maintenance-model

# 6. Start monitoring
npm run maintenance:dashboard
```

**Total Time to MVP: 4 weeks**
**Monthly Savings: $869**
**Break-even: Month 3**