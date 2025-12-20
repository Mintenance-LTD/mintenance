# Maintenance App AI Implementation Plan
## Leveraging Building Surveyor AI for Practical Maintenance

### Executive Summary

This plan adapts the sophisticated Building Surveyor AI system for your maintenance app's practical needs. We'll simplify the academic complexity while retaining the valuable components that make sense for homeowner-to-contractor workflows.

**Key Insight**: Your existing Building Surveyor system is over-engineered for maintenance app needs. We'll extract the useful parts and simplify dramatically.

---

## Current System Analysis

### What You Have (Building Surveyor AI)

```
CURRENT ARCHITECTURE (Academic/Safety-Critical):
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  Images → YOLO + SAM3 + GPT-4 → Bayesian Fusion →              │
│  Conformal Prediction → Safe-LinUCB → Automate/Escalate        │
│                                                                  │
│  Complexity: HIGH | Latency: 30-60s | Cost: $$$$ | FNR: <1%   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Components:**
- ✅ **YOLO v11**: 71 damage classes via Roboflow
- ✅ **SAM3**: Pixel-perfect segmentation (needs deployment)
- ✅ **GPT-4 Vision**: Semantic understanding
- ✅ **Bayesian Fusion**: Combines evidence mathematically
- ✅ **Conformal Prediction**: Statistical guarantees
- ✅ **Safe-LinUCB**: Automated decision with safety bounds
- ✅ **Continuous Learning**: Auto-retraining pipeline
- ✅ **Database Schema**: Complete tracking infrastructure

### What You Actually Need (Maintenance App)

```
SIMPLIFIED ARCHITECTURE (Practical/Helpful):
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  Images → YOLO → Confidence Check → Knowledge Base →           │
│  Homeowner Summary + Contractor Prep                            │
│                                                                  │
│  Complexity: LOW | Latency: 2-3s | Cost: $ | Accuracy: 85%+   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: MVP (Months 1-3)

### Month 1: Simplify & Deploy Core Detection

#### Week 1-2: Simplify YOLO Categories

**Current**: 71 damage classes (too many!)
**Target**: 15 high-frequency issues

```typescript
// apps/web/lib/services/maintenance/MaintenanceDetectionService.ts

export const MAINTENANCE_CATEGORIES = {
  // Plumbing (5)
  'pipe_leak': { contractor: 'plumber', urgency: 'high', timeEstimate: '1-2h' },
  'faucet_drip': { contractor: 'plumber', urgency: 'medium', timeEstimate: '30min' },
  'toilet_issue': { contractor: 'plumber', urgency: 'medium', timeEstimate: '1h' },
  'water_heater': { contractor: 'plumber', urgency: 'high', timeEstimate: '2-4h' },
  'drain_blocked': { contractor: 'plumber', urgency: 'low', timeEstimate: '1h' },

  // Electrical (3)
  'outlet_damage': { contractor: 'electrician', urgency: 'high', timeEstimate: '1h' },
  'light_fixture': { contractor: 'electrician', urgency: 'low', timeEstimate: '30min' },
  'circuit_breaker': { contractor: 'electrician', urgency: 'high', timeEstimate: '1-2h' },

  // Structure (4)
  'wall_crack': { contractor: 'general', urgency: 'low', timeEstimate: '2-4h' },
  'ceiling_stain': { contractor: 'roofer', urgency: 'medium', timeEstimate: '2-3h' },
  'window_broken': { contractor: 'glazier', urgency: 'medium', timeEstimate: '1h' },
  'door_issue': { contractor: 'carpenter', urgency: 'low', timeEstimate: '1-2h' },

  // HVAC (3)
  'ac_not_cooling': { contractor: 'hvac', urgency: 'medium', timeEstimate: '1-2h' },
  'heating_issue': { contractor: 'hvac', urgency: 'high', timeEstimate: '2-3h' },
  'vent_blocked': { contractor: 'hvac', urgency: 'low', timeEstimate: '30min' },
};
```

#### Week 2-3: Adapt Existing Services

**Reuse These Components:**

1. **RoboflowDetectionService** - Already works!
   ```typescript
   // Keep using but filter to our 15 categories
   const detections = await RoboflowDetectionService.detect(images);
   const relevantDetections = detections.filter(d =>
     MAINTENANCE_CATEGORIES[d.class]
   );
   ```

2. **Database Tables** - Repurpose existing schema
   ```sql
   -- Use existing building_assessments table
   -- Add maintenance-specific columns
   ALTER TABLE building_assessments
   ADD COLUMN contractor_type VARCHAR(50),
   ADD COLUMN estimated_duration VARCHAR(20),
   ADD COLUMN materials_needed JSONB,
   ADD COLUMN homeowner_tips TEXT[];
   ```

3. **Image Quality Service** - Still useful
   ```typescript
   const quality = await ImageQualityService.getAverageQualityMetrics(images);
   if (quality.clarity < 0.5) {
     return { needsBetterPhoto: true, guidance: "Please take photo in better light" };
   }
   ```

**Remove These Components (for now):**
- ❌ SAM3 (overkill for basic detection)
- ❌ Bayesian Fusion (single model is fine)
- ❌ Conformal Prediction (statistical guarantees not needed)
- ❌ Safe-LinUCB Critic (no autonomous decisions)
- ❌ Scene Graph (complexity without benefit)

#### Week 4: Create Simple Confidence System

```typescript
// apps/web/lib/services/maintenance/MaintenanceAssessmentService.ts

export class MaintenanceAssessmentService {
  static async assess(images: string[]): Promise<MaintenanceAssessment> {
    // 1. Run YOLO detection
    const detections = await this.getFilteredDetections(images);

    // 2. Simple confidence logic
    if (detections.length === 0) {
      return {
        status: 'need_more_info',
        message: 'Could not identify the issue. Can you describe what\'s wrong?',
        requestDescription: true
      };
    }

    const topDetection = detections[0];
    const confidence = topDetection.confidence;

    // 3. Route by confidence
    if (confidence >= 0.85) {
      return this.createHighConfidenceResponse(topDetection);
    } else if (confidence >= 0.60) {
      return this.createMediumConfidenceResponse(topDetection);
    } else {
      return this.createLowConfidenceResponse(topDetection);
    }
  }

  private static createHighConfidenceResponse(detection: Detection) {
    const category = MAINTENANCE_CATEGORIES[detection.class];
    return {
      status: 'identified',
      issue: detection.class,
      confidence: 'high',
      contractor_type: category.contractor,
      urgency: category.urgency,
      time_estimate: category.timeEstimate,
      materials: this.getMaterialsForIssue(detection.class),
      homeowner_tips: this.getTipsForIssue(detection.class),
      message: `Detected: ${this.humanReadableName(detection.class)}`
    };
  }

  private static createMediumConfidenceResponse(detection: Detection) {
    return {
      ...this.createHighConfidenceResponse(detection),
      confidence: 'medium',
      message: `Likely: ${this.humanReadableName(detection.class)}`,
      alternative_issues: this.getSimilarIssues(detection.class),
      request_confirmation: true
    };
  }

  private static createLowConfidenceResponse(detection: Detection) {
    return {
      status: 'need_better_photo',
      possible_issue: detection.class,
      confidence: 'low',
      message: 'I need a clearer photo to identify the issue',
      photo_guidance: this.getPhotoGuidance(detection.class),
      request_new_photo: true
    };
  }
}
```

### Month 2: Knowledge Base & User Experience

#### Week 5-6: Build Knowledge Base

```typescript
// apps/web/lib/data/maintenance-knowledge-base.ts

export const MAINTENANCE_KNOWLEDGE_BASE = {
  'pipe_leak': {
    common_causes: [
      'Worn pipe joints',
      'Corrosion',
      'High water pressure',
      'Freezing damage'
    ],
    materials_typically_needed: [
      'Replacement fitting/joint',
      'PTFE tape',
      'Pipe sealant',
      'Possibly new pipe section'
    ],
    tools_required: [
      'Adjustable wrench',
      'Pipe cutter (if replacement needed)',
      'Bucket and towels'
    ],
    immediate_actions: [
      'Turn off water supply',
      'Place bucket under leak',
      'Move valuables away from water'
    ],
    cost_range: { min: 75, max: 200, currency: 'USD' },
    time_range: { min: 0.5, max: 2, unit: 'hours' },
    diy_difficulty: 'medium',
    safety_notes: [
      'Ensure water is fully shut off',
      'Check for electrical hazards near water'
    ]
  },
  // ... add all 15 categories
};
```

#### Week 7-8: Implement GPT-4 Fallback

```typescript
// apps/web/lib/services/maintenance/GPTFallbackService.ts

export class GPTFallbackService {
  static async analyzeWithGPT(
    images: string[],
    userDescription?: string
  ): Promise<MaintenanceAssessment> {
    // Only use for edge cases
    if (!this.shouldUseGPT(images, userDescription)) {
      return null;
    }

    const prompt = `
      Analyze this maintenance issue image.
      User description: ${userDescription || 'None provided'}

      Identify:
      1. Type of issue (plumbing/electrical/structural/HVAC)
      2. Specific problem
      3. Urgency (high/medium/low)
      4. Contractor type needed
      5. Estimated repair time
      6. Key safety concerns

      Return as JSON.
    `;

    const gptAnalysis = await this.callGPT4Vision(images[0], prompt);
    return this.parseGPTResponse(gptAnalysis);
  }

  private static shouldUseGPT(images: string[], description?: string): boolean {
    // Use GPT only when:
    // 1. User explicitly describes complex issue
    // 2. YOLO confidence is very low (<40%)
    // 3. Multiple conflicting detections
    // 4. User requests second opinion
    return description?.length > 100 || this.hasComplexDescription(description);
  }
}
```

### Month 3: Contractor Features & Deployment

#### Week 9-10: Contractor Dashboard

```typescript
// apps/web/app/contractor/job-prep/components/JobPrepClient.tsx

export function JobPrepClient({ jobId }: { jobId: string }) {
  const { data: job } = useJobWithAIAnalysis(jobId);

  if (!job?.ai_analysis) {
    return <NoAnalysisAvailable />;
  }

  const analysis = job.ai_analysis;

  return (
    <div className="space-y-6">
      {/* AI Analysis Summary */}
      <Card>
        <CardHeader>
          <CardTitle>AI Job Analysis</CardTitle>
          <Badge>{analysis.confidence} Confidence</Badge>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium">Detected Issue</h4>
              <p>{analysis.issue_description}</p>
            </div>
            <div>
              <h4 className="font-medium">Estimated Time</h4>
              <p>{analysis.time_estimate}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Materials Checklist */}
      <Card>
        <CardHeader>
          <CardTitle>Recommended Materials</CardTitle>
        </CardHeader>
        <CardContent>
          <ChecklistComponent
            items={analysis.materials_needed}
            category="materials"
          />
        </CardContent>
      </Card>

      {/* Tools Checklist */}
      <Card>
        <CardHeader>
          <CardTitle>Tools Required</CardTitle>
        </CardHeader>
        <CardContent>
          <ChecklistComponent
            items={analysis.tools_required}
            category="tools"
          />
        </CardContent>
      </Card>

      {/* Safety Reminders */}
      {analysis.safety_notes && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Safety Considerations</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4">
              {analysis.safety_notes.map(note => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Feedback */}
      <Card>
        <CardHeader>
          <CardTitle>Was this analysis helpful?</CardTitle>
        </CardHeader>
        <CardContent>
          <FeedbackButtons
            jobId={jobId}
            onFeedback={(feedback) => {
              // Store for continuous learning
              recordAIFeedback(jobId, feedback);
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
```

#### Week 11-12: Data Collection & Learning Pipeline

```typescript
// apps/web/lib/services/maintenance/MaintenanceLearningService.ts

export class MaintenanceLearningService {
  static async collectFeedback(
    jobId: string,
    feedback: {
      wasAccurate: boolean;
      actualIssue?: string;
      actualTime?: number;
      actualMaterials?: string[];
      contractorNotes?: string;
    }
  ) {
    // Store feedback
    await supabase.from('maintenance_ai_feedback').insert({
      job_id: jobId,
      was_accurate: feedback.wasAccurate,
      actual_issue: feedback.actualIssue,
      actual_time_hours: feedback.actualTime,
      actual_materials: feedback.actualMaterials,
      contractor_notes: feedback.contractorNotes,
      created_at: new Date().toISOString()
    });

    // Check if we have enough data for retraining
    const feedbackCount = await this.getFeedbackCount();
    if (feedbackCount >= 100 && feedbackCount % 100 === 0) {
      // Trigger retraining job
      await this.triggerRetraining();
    }
  }

  static async triggerRetraining() {
    // Reuse existing YOLO retraining infrastructure
    const corrections = await this.convertFeedbackToCorrections();

    await supabase.from('yolo_retraining_jobs').insert({
      model_type: 'maintenance_v1',
      training_data: corrections,
      status: 'pending',
      created_at: new Date().toISOString()
    });

    // Notification
    console.log(`Retraining triggered with ${corrections.length} corrections`);
  }
}
```

---

## Phase 2: Enhancement (Months 4-6)

### Month 4: Active Learning & Smart Routing

```typescript
// apps/web/lib/services/maintenance/ActiveLearningService.ts

export class ActiveLearningService {
  // Identify cases where AI needs to learn
  static async prioritizeLearningCases(): Promise<string[]> {
    // Get cases with:
    // 1. Low confidence (60-85%)
    // 2. New issue types not in training
    // 3. Contractor disagreement with AI
    // 4. Multiple possible issues

    const sql = `
      SELECT job_id, confidence, detected_issues
      FROM maintenance_assessments
      WHERE confidence BETWEEN 0.6 AND 0.85
        OR contractor_disagreed = true
        OR array_length(detected_issues, 1) > 1
      ORDER BY learning_priority DESC
      LIMIT 20
    `;

    const { data } = await supabase.rpc('get_learning_priorities', { sql });
    return data.map(d => d.job_id);
  }

  // Request expert labeling
  static async requestExpertLabeling(jobIds: string[]) {
    // Send to verified contractors for labeling
    const experts = await this.getExpertContractors();

    for (const jobId of jobIds) {
      await this.createLabelingTask({
        job_id: jobId,
        expert_id: this.selectExpert(experts),
        reward: 5.00, // Pay for labeling
        deadline: '48 hours'
      });
    }
  }
}
```

### Month 5: Simple Uncertainty Quantification

```typescript
// apps/web/lib/services/maintenance/UncertaintyService.ts

export class SimpleUncertaintyService {
  // Not Bayesian fusion - just ensemble disagreement
  static async getUncertainty(images: string[]): Promise<number> {
    // Run image through 3 model variants
    const [model1, model2, model3] = await Promise.all([
      this.runModel(images, 'yolo_v1'),
      this.runModel(images, 'yolo_v2_augmented'),
      this.runModel(images, 'yolo_v3_different_seed')
    ]);

    // Calculate disagreement
    const agreement = this.calculateAgreement([model1, model2, model3]);
    const uncertainty = 1 - agreement;

    return uncertainty;
  }

  private static calculateAgreement(predictions: Detection[][]): number {
    // Simple: do they all predict the same top class?
    const topClasses = predictions.map(p => p[0]?.class);
    const allSame = topClasses.every(c => c === topClasses[0]);

    if (allSame) {
      // Check confidence variance
      const confidences = predictions.map(p => p[0]?.confidence || 0);
      const avgConfidence = confidences.reduce((a, b) => a + b) / confidences.length;
      const variance = this.calculateVariance(confidences);

      // Low variance = high agreement
      return avgConfidence * (1 - variance);
    }

    return 0.5; // Disagreement on class
  }
}
```

### Month 6: A/B Testing & Gradual Rollout

```typescript
// apps/web/lib/services/maintenance/ABTestingService.ts

export class MaintenanceABTestingService {
  static async routeUser(userId: string): Promise<'control' | 'treatment'> {
    // Check existing assignment
    const existing = await this.getAssignment(userId);
    if (existing) return existing;

    // New assignment
    const inTreatment = Math.random() < 0.10; // Start with 10%

    await supabase.from('maintenance_ab_assignments').insert({
      user_id: userId,
      group: inTreatment ? 'treatment' : 'control',
      assigned_at: new Date().toISOString()
    });

    return inTreatment ? 'treatment' : 'control';
  }

  static async measureSuccess() {
    const sql = `
      WITH metrics AS (
        SELECT
          group,
          AVG(CASE WHEN contractor_found_helpful THEN 1 ELSE 0 END) as helpfulness,
          AVG(time_saved_minutes) as avg_time_saved,
          COUNT(*) as sample_size
        FROM maintenance_ab_results
        WHERE created_at > NOW() - INTERVAL '7 days'
        GROUP BY group
      )
      SELECT * FROM metrics
    `;

    const { data } = await supabase.rpc('calculate_ab_metrics', { sql });

    // Simple t-test for significance
    if (this.isSignificant(data) && data.treatment.helpfulness > data.control.helpfulness) {
      console.log('Treatment winning! Consider increasing rollout.');
    }
  }
}
```

---

## Phase 3: Scale & Industrial (Months 7-12)

### Month 7-9: Expand Categories

Gradually add more detection categories based on demand:

```typescript
// Phase 3 additions (30 more categories)
const EXPANDED_CATEGORIES = {
  ...MAINTENANCE_CATEGORIES,

  // Roofing
  'missing_shingles': { contractor: 'roofer', urgency: 'medium' },
  'gutter_damage': { contractor: 'roofer', urgency: 'low' },
  'chimney_crack': { contractor: 'mason', urgency: 'medium' },

  // Flooring
  'hardwood_damage': { contractor: 'flooring', urgency: 'low' },
  'carpet_stain': { contractor: 'carpet_cleaner', urgency: 'low' },
  'tile_crack': { contractor: 'tiler', urgency: 'low' },

  // Appliances
  'dishwasher_leak': { contractor: 'appliance_repair', urgency: 'medium' },
  'oven_not_heating': { contractor: 'appliance_repair', urgency: 'medium' },
  'refrigerator_issue': { contractor: 'appliance_repair', urgency: 'high' },

  // Exterior
  'fence_damage': { contractor: 'fencing', urgency: 'low' },
  'deck_rot': { contractor: 'carpenter', urgency: 'medium' },
  'concrete_crack': { contractor: 'concrete', urgency: 'low' },

  // ... etc
};
```

### Month 10-12: Industrial Pilot

For rail/industrial monitoring, NOW you need the complex system:

```typescript
// apps/web/lib/services/industrial/IndustrialMonitoringService.ts

export class IndustrialMonitoringService {
  // NOW we need the full Building Surveyor architecture
  static async monitorInfrastructure(
    cameraFeed: VideoStream,
    location: IndustrialLocation
  ): Promise<MonitoringResult> {

    // Extract frames
    const frames = await this.extractFrames(cameraFeed, {
      interval: 1000, // Every second
      quality: 'high'
    });

    // Run full Building Surveyor pipeline
    for (const frame of frames) {
      const assessment = await BuildingSurveyorService.assessDamage([frame], {
        mode: 'industrial',
        requireHighConfidence: true,
        enableSAM3: true, // Need precise segmentation
        enableConformalPrediction: true, // Need guarantees
        enableSafeLinUCB: true, // Autonomous alerts
      });

      // Track changes over time
      await this.trackTemporalChanges(location, assessment);

      // Alert if critical
      if (assessment.safety_critical) {
        await this.sendAlert({
          location,
          issue: assessment.primary_damage,
          confidence: assessment.confidence,
          action: 'IMMEDIATE_INSPECTION_REQUIRED'
        });
      }
    }
  }

  // Temporal analysis for degradation tracking
  static async trackTemporalChanges(
    location: IndustrialLocation,
    assessment: Assessment
  ) {
    const history = await this.getLocationHistory(location, 30); // 30 days

    // Detect trends
    const trend = this.analyzeTrend(history, assessment);

    if (trend.type === 'degrading' && trend.rate > 0.1) {
      // Predictive maintenance alert
      const daysUntilFailure = this.predictTimeToFailure(trend);

      await this.scheduleMaintenanceWindow({
        location,
        urgency: daysUntilFailure < 14 ? 'high' : 'medium',
        estimated_failure: daysUntilFailure
      });
    }
  }
}
```

---

## Implementation Timeline

### Month 1: Core Detection
- [ ] Week 1: Setup simplified YOLO with 15 categories
- [ ] Week 2: Adapt existing services
- [ ] Week 3: Remove unnecessary complexity
- [ ] Week 4: Implement confidence-based routing

### Month 2: Knowledge & UX
- [ ] Week 5: Build knowledge base
- [ ] Week 6: Complete knowledge for all categories
- [ ] Week 7: Add GPT-4 fallback for edge cases
- [ ] Week 8: Polish user experience

### Month 3: Contractor & Learning
- [ ] Week 9: Contractor prep dashboard
- [ ] Week 10: Materials/tools checklists
- [ ] Week 11: Feedback collection system
- [ ] Week 12: Deploy MVP

### Months 4-6: Enhancement
- [ ] Month 4: Active learning pipeline
- [ ] Month 5: Simple uncertainty (3-model ensemble)
- [ ] Month 6: A/B testing framework

### Months 7-12: Scale
- [ ] Month 7-9: Expand to 45 categories
- [ ] Month 10-12: Industrial pilot with full system

---

## Budget Estimation

### Phase 1 (Months 1-3): $25,000
- YOLO training/fine-tuning: $5,000
- GPT-4 API costs: $2,000/month
- Engineering (1 developer): $15,000
- Infrastructure: $1,000/month

### Phase 2 (Months 4-6): $35,000
- Additional model training: $5,000
- Increased API usage: $3,000/month
- Engineering (1.5 developers): $22,500
- User testing/feedback rewards: $1,500

### Phase 3 (Months 7-12): $80,000
- Industrial-grade models: $15,000
- GPU infrastructure: $3,000/month
- Engineering (2 developers): $60,000
- Pilot program costs: $10,000

**Total Year 1**: $140,000

---

## Success Metrics

### Phase 1 Goals (Month 3)
- Detection accuracy: 85%+
- User satisfaction: 80%+
- Contractor finds helpful: 75%+
- False positives: <15%
- Response time: <3 seconds

### Phase 2 Goals (Month 6)
- Detection accuracy: 90%+
- Active learning improving weekly
- Cost per detection: <$0.10
- 30% reduction in "need more info"

### Phase 3 Goals (Month 12)
- 45 categories covered
- Industrial pilot operational
- 95% contractor satisfaction
- 10,000+ assessments completed

---

## Risk Mitigation

### Technical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Low YOLO accuracy | High | Start with fewer, distinct categories |
| GPT-4 too expensive | Medium | Gradual migration to local models |
| SAM3 deployment complex | Low | Not needed for Phase 1 |
| User adoption slow | High | Free pilot program for first 100 contractors |

### Data Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Insufficient training data | High | Partner with contractors for historical data |
| Poor image quality | Medium | Clear photo guidelines + quality check |
| Category imbalance | Medium | Synthetic augmentation for rare issues |

---

## Database Migrations

```sql
-- Migration 1: Add maintenance-specific tables
CREATE TABLE maintenance_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id),
  images TEXT[],

  -- Detection results
  detected_issue VARCHAR(100),
  confidence FLOAT,
  alternative_issues JSONB,

  -- Metadata
  contractor_type VARCHAR(50),
  urgency VARCHAR(20),
  time_estimate VARCHAR(50),
  materials_needed JSONB,
  tools_required JSONB,
  safety_notes TEXT[],
  homeowner_tips TEXT[],

  -- Feedback
  contractor_found_helpful BOOLEAN,
  actual_issue VARCHAR(100),
  actual_time_hours FLOAT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration 2: Feedback tracking
CREATE TABLE maintenance_ai_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID REFERENCES maintenance_assessments(id),

  was_accurate BOOLEAN,
  accuracy_score INTEGER CHECK (accuracy_score BETWEEN 1 AND 5),
  helpfulness_score INTEGER CHECK (helpfulness_score BETWEEN 1 AND 5),

  contractor_corrections JSONB,
  contractor_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration 3: A/B testing
CREATE TABLE maintenance_ab_assignments (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  group VARCHAR(20) CHECK (group IN ('control', 'treatment')),
  assigned_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE maintenance_ab_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  job_id UUID REFERENCES jobs(id),
  group VARCHAR(20),

  contractor_found_helpful BOOLEAN,
  time_saved_minutes INTEGER,
  would_recommend BOOLEAN,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## API Endpoints

```typescript
// apps/web/app/api/maintenance/assess/route.ts

export async function POST(request: Request) {
  const { images, description } = await request.json();

  // Rate limiting
  const rateLimitOk = await checkRateLimit(request);
  if (!rateLimitOk) {
    return new Response('Rate limit exceeded', { status: 429 });
  }

  // Run assessment
  const assessment = await MaintenanceAssessmentService.assess(images, {
    userDescription: description,
    useGPTFallback: true,
    collectFeedback: true
  });

  // Store for learning
  await storeAssessment(assessment);

  return NextResponse.json(assessment);
}
```

```typescript
// apps/web/app/api/maintenance/feedback/route.ts

export async function POST(request: Request) {
  const { assessmentId, feedback } = await request.json();

  await MaintenanceLearningService.collectFeedback(assessmentId, feedback);

  // Check if retraining needed
  await MaintenanceLearningService.checkRetrainingThreshold();

  return NextResponse.json({ success: true });
}
```

---

## Key Decisions & Rationale

### Why Simplify?

| Building Surveyor | Maintenance App | Reason |
|-------------------|-----------------|---------|
| 71 categories | 15 categories | Focus on common issues |
| 0% FNR requirement | 85% accuracy OK | Contractor verifies |
| Complex fusion | Single model | Simpler = faster |
| Statistical guarantees | Best effort | Not safety-critical |
| Autonomous decisions | Human confirms | Lower stakes |

### Why Keep Some Components?

- **YOLO**: Fast, accurate, proven
- **Database schema**: Already built, why rebuild?
- **Learning pipeline**: Improves over time
- **GPT-4 fallback**: Handles edge cases

### Why Phase Approach?

1. **Phase 1**: Prove value quickly (MVP in 3 months)
2. **Phase 2**: Improve based on real feedback
3. **Phase 3**: Scale to complex use cases (industrial)

---

## Next Steps

### Immediate Actions (This Week)

1. **Decision Point**: Approve simplified architecture
2. **Data Collection**: Start collecting maintenance photos
3. **Category Selection**: Finalize 15 initial categories
4. **Contractor Partners**: Recruit 5-10 for pilot

### Week 1-2 Sprint

1. Fork BuildingSurveyorService → MaintenanceAssessmentService
2. Strip out unnecessary complexity
3. Create knowledge base structure
4. Set up feedback tables

### First Milestone (End of Month 1)

- Working prototype with 15 categories
- 85%+ accuracy on test set
- <3 second response time
- Contractor dashboard mockup

---

## Summary

Your Building Surveyor AI is like a Formula 1 race car - impressive but impractical for daily commuting. This plan adapts it into a reliable Toyota Camry for your maintenance app:

- **Months 1-3**: Simplified MVP that works
- **Months 4-6**: Learn and improve from real usage
- **Months 7-12**: Scale up, add industrial

The existing system provides a solid foundation. We're not throwing it away - we're strategically simplifying for your actual use case while keeping the door open for future sophistication when you need it for industrial/rail applications.

**Bottom line**: You can have a working AI-powered maintenance app in 3 months by simplifying what you've already built.