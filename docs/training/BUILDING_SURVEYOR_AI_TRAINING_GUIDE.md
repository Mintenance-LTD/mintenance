# BUILDING SURVEYOR AI AGENT - TRAINING GUIDE

**Project:** Visual Language Model for Building Damage Assessment  
**Status:** Planning Phase  
**Integration:** Extends existing GPT-4 Vision infrastructure

---

## 🎯 PROJECT OVERVIEW

### Goal
Train a specialized visual language agent that acts as a building surveyor to:
1. **Detect damage stages:** Early, Midway, Full damage
2. **Educate homeowners:** Explain problems in simple terms
3. **Advise contractors:** Recommend repairs and materials needed
4. **Estimate costs:** Provide repair cost ranges

### Current Infrastructure
✅ GPT-4 Vision already integrated  
✅ Photo analysis system in place  
✅ Job analysis service active  
✅ Escrow release agent using AI

---

## ✅ IS IT POSSIBLE?

**YES!** This is absolutely possible. You have three main approaches:

### Option 1: Fine-Tune GPT-4 Vision (Recommended)
- **Best for:** Quick deployment, high quality
- **Cost:** $8-12 per 1M tokens training
- **Timeline:** 2-4 weeks
- **Quality:** Excellent (leverages GPT-4's capabilities)

### Option 2: Custom Fine-Tuned Model
- **Best for:** Lower costs, full control
- **Cost:** $2-5 per 1M tokens (Claude, Llama)
- **Timeline:** 4-8 weeks
- **Quality:** Very good (requires more data)

### Option 3: Hybrid Approach (Best Long-term)
- **Best for:** Cost optimization + quality
- **Cost:** Variable
- **Timeline:** 6-12 weeks
- **Quality:** Excellent (combines multiple models)

---

## 📊 WHAT YOU NEED

### 1. Training Data (Critical)

#### Minimum Requirements:
- **5,000-10,000 labeled images** of building damage
- **3 damage stages:** Early, Midway, Full damage
- **10+ damage types:** Water damage, cracks, rot, mold, etc.
- **Annotations:** Damage location, severity, repair recommendations

#### Ideal Dataset:
- **50,000+ images** for production-grade model
- **Before/after photos** showing progression
- **Multiple angles** of same damage
- **UK-specific examples** (your market)

#### Data Sources:

**Free/Public:**
- Building damage datasets (Kaggle, GitHub)
- Public building inspection reports
- Government building survey databases
- Insurance claim photos (anonymized)

**Paid:**
- Stock photo services (Shutterstock, Getty)
- Professional building surveyor databases
- Insurance company datasets (partnerships)

**Your Own Data:**
- User-submitted job photos (with permission)
- Contractor completion photos
- Historical job data from your platform

### 2. Infrastructure Requirements

#### Training Infrastructure:

**Option A: Cloud Training (Recommended)**
- **AWS SageMaker:** $0.10-0.50/hour
- **Google Cloud AI Platform:** $0.15-0.60/hour
- **Azure ML:** $0.10-0.50/hour
- **Training Time:** 10-50 hours depending on dataset size
- **Total Cost:** $100-500 for initial training

**Option B: On-Premise (Advanced)**
- **GPU Requirements:** NVIDIA A100 (40GB) or V100 (32GB)
- **Cost:** $10,000-50,000 hardware
- **Best for:** Large-scale, frequent retraining

**Option C: API-Based Fine-Tuning (Easiest)**
- **OpenAI Fine-Tuning API:** Use existing infrastructure
- **Cost:** $8-12 per 1M tokens
- **No infrastructure needed:** Fully managed

#### Inference Infrastructure:

**Current Setup (Sufficient):**
- ✅ OpenAI API (already configured)
- ✅ Supabase backend
- ✅ Next.js API routes

**Future Scaling:**
- Edge deployment (Cloudflare Workers)
- Model caching (Redis)
- Batch processing queue

### 3. Technical Requirements

#### Software Stack:

**Training:**
- Python 3.9+
- PyTorch or TensorFlow
- Hugging Face Transformers
- OpenAI Fine-Tuning SDK
- Data annotation tools (Label Studio, CVAT)

**Integration:**
- ✅ TypeScript/Node.js (already have)
- ✅ OpenAI SDK (already integrated)
- ✅ Image processing (Sharp, Sharp)
- ✅ Database (Supabase - already have)

#### Skills Needed:

**Essential:**
- Python programming
- ML model training basics
- Data annotation/cleaning
- API integration

**Nice to Have:**
- Computer vision expertise
- Building surveyor knowledge
- MLOps experience

### 4. Budget Estimate

| Item | Cost Range | Notes |
|------|------------|-------|
| **Data Collection** | £500 - £5,000 | Depends on sources |
| **Data Annotation** | £1,000 - £10,000 | If outsourcing |
| **Training (Cloud)** | £100 - £500 | One-time |
| **API Costs (Monthly)** | £50 - £500 | Based on usage |
| **Development Time** | £5,000 - £20,000 | If hiring developers |
| **Total Initial** | **£6,600 - £35,500** | One-time setup |
| **Monthly Operating** | **£50 - £500** | Ongoing |

---

## 🚀 IMPLEMENTATION PLAN

### Phase 1: Data Collection (Weeks 1-4)

**Week 1-2: Data Sources**
- [ ] Identify public datasets
- [ ] Set up data collection pipeline
- [ ] Create data storage (S3/Supabase Storage)
- [ ] Build image upload system

**Week 3-4: Data Annotation**
- [ ] Set up annotation tool (Label Studio)
- [ ] Create annotation guidelines
- [ ] Annotate 1,000-2,000 images (minimum viable)
- [ ] Quality check annotations

**Deliverable:** 5,000+ labeled images

### Phase 2: Model Training (Weeks 5-8)

**Week 5: Preparation**
- [ ] Format data for fine-tuning
- [ ] Split train/validation/test sets
- [ ] Create prompt templates
- [ ] Set up training environment

**Week 6-7: Training**
- [ ] Fine-tune GPT-4 Vision (or alternative)
- [ ] Hyperparameter tuning
- [ ] Model evaluation
- [ ] Iterate based on results

**Week 8: Validation**
- [ ] Test on held-out data
- [ ] Compare against baseline
- [ ] Document performance metrics
- [ ] Create evaluation report

**Deliverable:** Trained model with >85% accuracy

### Phase 3: Integration (Weeks 9-12)

**Week 9-10: API Development**
- [ ] Create new service: `BuildingSurveyorService.ts`
- [ ] Integrate fine-tuned model
- [ ] Build damage assessment endpoint
- [ ] Add repair recommendation logic

**Week 11: UI Integration**
- [ ] Create damage assessment component
- [ ] Build homeowner-friendly explanations
- [ ] Add contractor recommendations view
- [ ] Implement materials/tools list

**Week 12: Testing & Launch**
- [ ] End-to-end testing
- [ ] User acceptance testing
- [ ] Performance optimization
- [ ] Production deployment

**Deliverable:** Live building surveyor AI feature

---

## 📐 TECHNICAL ARCHITECTURE

### System Design

```
[User Uploads Photo]
    ↓
[Image Preprocessing]
    ↓
[Fine-Tuned GPT-4 Vision]
    ↓
[Damage Detection & Classification]
    ↓
[Severity Assessment (Early/Midway/Full)]
    ↓
[Repair Recommendations]
    ↓
[Materials & Tools List]
    ↓
[Cost Estimation]
    ↓
[Homeowner Explanation + Contractor Advice]
```

### New Service Structure

> **Note**: The BuildingSurveyorService has been refactored into modular components for better maintainability and testability. See [Code Quality Refactoring Summary](./docs/CODE_QUALITY_REFACTORING_SUMMARY.md) for details.

#### Refactored Architecture (Current Implementation)

```
building-surveyor/
├── config/
│   └── BuildingSurveyorConfig.ts      # Centralized configuration
├── utils/
│   └── FeatureExtractionUtils.ts      # Shared feature extraction
├── orchestration/
│   ├── AssessmentOrchestrator.ts      # Main orchestration & flow control
│   ├── FeatureExtractionService.ts    # Feature extraction facade
│   └── PromptBuilder.ts               # GPT-4 Vision prompt construction
└── index.ts                            # Public API (backward compatible)
```

**Component Responsibilities:**

1. **AssessmentOrchestrator** - Coordinates the complete assessment pipeline:
   - Manages detector services (Roboflow, Google Vision)
   - Coordinates memory system queries
   - Handles GPT-4 Vision API calls
   - Builds final assessments with specialized analyses

2. **FeatureExtractionService** - Unified feature extraction interface:
   - Manages learned vs handcrafted feature extraction
   - Automatic fallback mechanism
   - Initialization and state management

3. **PromptBuilder** - GPT-4 Vision prompt engineering:
   - Constructs system prompts with guidelines
   - Builds evidence summaries from detections
   - Creates user prompts with context

4. **BuildingSurveyorConfig** - Configuration management:
   - Type-safe configuration access
   - Centralized environment variable management
   - Validation on load

**Usage Example:**

```typescript
import { BuildingSurveyorService } from '@/lib/services/building-surveyor';

// Simple assessment
const assessment = await BuildingSurveyorService.assessDamage(
  imageUrls,
  {
    propertyType: 'residential',
    location: 'London',
    ageOfProperty: 50,
  }
);

// Or use components directly for advanced use cases
import { AssessmentOrchestrator } from '@/lib/services/building-surveyor/orchestration/AssessmentOrchestrator';
const assessment = await AssessmentOrchestrator.assessDamage(imageUrls, context);
```

#### Legacy Service Structure (Pre-Refactoring)

```typescript
// apps/web/lib/services/BuildingSurveyorService.ts
// Note: This structure has been refactored - see above for current implementation

export interface DamageAssessment {
  damageType: string;
  severity: 'early' | 'midway' | 'full';
  confidence: number;
  location: string;
  description: string;
  
  // Homeowner-friendly explanation
  homeownerExplanation: {
    whatIsIt: string;
    whyItHappened: string;
    whatToDo: string;
    urgency: 'low' | 'medium' | 'high';
  };
  
  // Contractor recommendations
  contractorAdvice: {
    repairNeeded: string[];
    materials: Array<{
      name: string;
      quantity: string;
      estimatedCost: number;
    }>;
    tools: string[];
    estimatedTime: string;
    estimatedCost: {
      min: number;
      max: number;
      recommended: number;
    };
    complexity: 'low' | 'medium' | 'high';
  };
  
  // Progression tracking
  progression: {
    currentStage: 'early' | 'midway' | 'full';
    estimatedTimeToWorsen: string;
    recommendedActionTimeline: string;
  };
}
```

---

## 🎓 TRAINING APPROACHES

### Approach 1: Prompt Engineering (Fastest - Start Here)

**What:** Enhance existing GPT-4 Vision with specialized prompts  
**Timeline:** 1-2 weeks  
**Cost:** £0 (just API costs)  
**Quality:** Good (80-85% accuracy)

**Implementation:**
```typescript
const systemPrompt = `You are a professional building surveyor with 20+ years of experience.
Analyze building damage photos and provide:

1. DAMAGE ASSESSMENT:
   - Damage type (water, structural, cosmetic, etc.)
   - Severity stage: EARLY (minor, just starting), MIDWAY (moderate, needs attention), FULL (severe, urgent)
   - Location and extent
   - Confidence level (0-100%)

2. HOMEOWNER EXPLANATION (simple, non-technical):
   - What is this problem?
   - Why did it happen?
   - What should I do?
   - How urgent is it?

3. CONTRACTOR ADVICE (technical):
   - Specific repairs needed
   - Materials required (with quantities)
   - Tools needed
   - Estimated time and cost
   - Complexity level

4. PROGRESSION ANALYSIS:
   - Current stage assessment
   - Estimated time until it worsens
   - Recommended action timeline

Respond in JSON format matching the DamageAssessment interface.`;
```

**Pros:**
- ✅ No training needed
- ✅ Can start immediately
- ✅ Easy to iterate
- ✅ Low cost

**Cons:**
- ⚠️ Less accurate than fine-tuned model
- ⚠️ May miss subtle damage patterns
- ⚠️ Relies on GPT-4's general knowledge

### Approach 2: Fine-Tuning GPT-4 Vision (Recommended)

**What:** Fine-tune GPT-4 Vision on your building damage dataset  
**Timeline:** 4-8 weeks  
**Cost:** £500-2,000 training + API costs  
**Quality:** Excellent (90-95% accuracy)

**Process:**

1. **Prepare Training Data:**
```json
{
  "messages": [
    {
      "role": "system",
      "content": "You are a professional building surveyor..."
    },
    {
      "role": "user",
      "content": [
        {"type": "text", "text": "Analyze this building damage photo"},
        {"type": "image_url", "image_url": {"url": "https://..."}}
      ]
    },
    {
      "role": "assistant",
      "content": "{\"damageType\": \"water_damage\", \"severity\": \"midway\", ...}"
    }
  ]
}
```

2. **Fine-Tune Model:**
```bash
# Using OpenAI Fine-Tuning API
openai api fine_tunes.create \
  -t training_data.jsonl \
  -m gpt-4-vision-preview \
  --n_epochs 3 \
  --learning_rate_multiplier 0.1
```

3. **Deploy Fine-Tuned Model:**
```typescript
// Use fine-tuned model ID instead of base model
const modelId = 'ft:gpt-4-vision-preview:your-org:custom-model:abc123';
```

**Pros:**
- ✅ High accuracy
- ✅ Understands your specific use case
- ✅ Consistent responses
- ✅ Can handle UK-specific building types

**Cons:**
- ⚠️ Requires training data
- ⚠️ Training costs
- ⚠️ Longer setup time

### Approach 3: Custom Model Training (Advanced)

**What:** Train custom vision-language model from scratch  
**Timeline:** 12+ weeks  
**Cost:** £5,000-20,000  
**Quality:** Excellent (95%+ accuracy, full control)

**Architecture Options:**

**Option A: CLIP + Fine-Tuning**
- Use OpenAI CLIP for image understanding
- Fine-tune on damage classification
- Add language model for explanations

**Option B: Custom Vision Transformer**
- Train ViT (Vision Transformer) on damage images
- Combine with language model
- Full end-to-end training

**Option C: Multi-Modal LLM**
- Use LLaVA or similar multi-modal model
- Fine-tune on building damage data
- Single unified model

**Pros:**
- ✅ Full control
- ✅ Can optimize for your specific needs
- ✅ Potentially lower inference costs
- ✅ Proprietary IP

**Cons:**
- ⚠️ Very expensive
- ⚠️ Requires ML expertise
- ⚠️ Long development time
- ⚠️ Ongoing maintenance

---

## 📋 DATA REQUIREMENTS DETAILED

### Image Categories Needed

#### Damage Types (Minimum 500 images each):
1. **Water Damage**
   - Early: Damp patches, minor staining
   - Midway: Peeling paint, warped surfaces
   - Full: Structural damage, mold growth

2. **Structural Cracks**
   - Early: Hairline cracks
   - Midway: Visible cracks, some movement
   - Full: Major cracks, structural instability

3. **Roof Damage**
   - Early: Missing tiles, minor leaks
   - Midway: Multiple missing tiles, water ingress
   - Full: Major structural damage, collapse risk

4. **Damp & Mold**
   - Early: Minor condensation
   - Midway: Visible mold patches
   - Full: Extensive mold, health risk

5. **Electrical Issues**
   - Early: Frayed wires, loose connections
   - Midway: Exposed wiring, overheating
   - Full: Fire risk, complete failure

6. **Plumbing Problems**
   - Early: Minor leaks, slow drainage
   - Midway: Persistent leaks, water damage
   - Full: Burst pipes, flooding

7. **Foundation Issues**
   - Early: Minor settling
   - Midway: Visible cracks, movement
   - Full: Major structural problems

8. **Window/Door Damage**
   - Early: Drafts, minor wear
   - Midway: Broken seals, difficulty opening
   - Full: Complete failure, security risk

9. **Wall Damage**
   - Early: Minor cracks, paint issues
   - Midway: Visible damage, structural concerns
   - Full: Major damage, collapse risk

10. **Flooring Issues**
    - Early: Minor wear, squeaks
    - Midway: Visible damage, uneven surfaces
    - Full: Structural problems, safety risk

### Data Annotation Format

```json
{
  "image_id": "damage_001",
  "image_url": "https://...",
  "damage_type": "water_damage",
  "severity": "midway",
  "location": "kitchen_ceiling",
  "annotations": {
    "bounding_boxes": [
      {
        "x": 100,
        "y": 150,
        "width": 200,
        "height": 100,
        "label": "water_stain"
      }
    ],
    "key_points": [
      {"x": 150, "y": 200, "label": "leak_source"}
    ]
  },
  "homeowner_explanation": {
    "what_is_it": "Water damage from a leak above",
    "why_it_happened": "Likely from plumbing or roof leak",
    "what_to_do": "Find and fix the source, then repair damage",
    "urgency": "medium"
  },
  "contractor_advice": {
    "repair_needed": [
      "Locate and repair leak source",
      "Remove damaged drywall",
      "Treat for mold if present",
      "Replace and repaint ceiling"
    ],
    "materials": [
      {"name": "Drywall", "quantity": "1 sheet", "cost": 25},
      {"name": "Joint compound", "quantity": "1 tub", "cost": 15},
      {"name": "Paint", "quantity": "1 gallon", "cost": 30}
    ],
    "tools": ["Utility knife", "Drywall saw", "Putty knife", "Paint brush"],
    "estimated_time": "4-6 hours",
    "estimated_cost": {"min": 200, "max": 500, "recommended": 350},
    "complexity": "medium"
  },
  "progression": {
    "current_stage": "midway",
    "estimated_time_to_worsen": "2-4 weeks if leak continues",
    "recommended_action_timeline": "Within 1 week"
  }
}
```

---

## 💻 IMPLEMENTATION CODE

### Step 1: Enhanced Prompt Engineering (Quick Start)

Create: `apps/web/lib/services/BuildingSurveyorService.ts`

```typescript
import { logger } from '@mintenance/shared';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface DamageAssessment {
  damageType: string;
  severity: 'early' | 'midway' | 'full';
  confidence: number;
  location: string;
  description: string;
  
  homeownerExplanation: {
    whatIsIt: string;
    whyItHappened: string;
    whatToDo: string;
    urgency: 'low' | 'medium' | 'high';
  };
  
  contractorAdvice: {
    repairNeeded: string[];
    materials: Array<{
      name: string;
      quantity: string;
      estimatedCost: number;
    }>;
    tools: string[];
    estimatedTime: string;
    estimatedCost: {
      min: number;
      max: number;
      recommended: number;
    };
    complexity: 'low' | 'medium' | 'high';
  };
  
  progression: {
    currentStage: 'early' | 'midway' | 'full';
    estimatedTimeToWorsen: string;
    recommendedActionTimeline: string;
  };
}

export class BuildingSurveyorService {
  /**
   * Analyze building damage from photos
   */
  static async assessDamage(
    imageUrls: string[],
    context?: {
      location?: string;
      propertyType?: string;
      ageOfProperty?: number;
    }
  ): Promise<DamageAssessment> {
    try {
      const systemPrompt = `You are a professional UK building surveyor with 20+ years of experience.
Your expertise includes:
- RICS building surveys
- Damage assessment and classification
- Repair cost estimation
- Health and safety evaluation

Analyze building damage photos and provide a comprehensive assessment in JSON format.

CRITICAL: Classify damage severity as:
- EARLY: Minor damage, just starting, easily repairable, no immediate risk
- MIDWAY: Moderate damage, needs attention soon, may cause further issues if left
- FULL: Severe damage, urgent repair needed, safety risk, structural concerns

Provide:
1. Accurate damage type and severity classification
2. Clear, simple explanations for homeowners (non-technical language)
3. Detailed technical advice for contractors (specific repairs, materials, tools)
4. Realistic cost estimates based on UK market rates
5. Progression analysis (how long until it worsens)

Be specific about:
- Exact materials needed (UK product names where possible)
- Quantities required
- Tool specifications
- Time estimates (hours/days)
- Cost ranges (GBP) based on UK contractor rates

Respond ONLY in valid JSON matching this structure:
{
  "damageType": "string",
  "severity": "early" | "midway" | "full",
  "confidence": number (0-100),
  "location": "string",
  "description": "string",
  "homeownerExplanation": {
    "whatIsIt": "string",
    "whyItHappened": "string",
    "whatToDo": "string",
    "urgency": "low" | "medium" | "high"
  },
  "contractorAdvice": {
    "repairNeeded": ["string"],
    "materials": [{"name": "string", "quantity": "string", "estimatedCost": number}],
    "tools": ["string"],
    "estimatedTime": "string",
    "estimatedCost": {"min": number, "max": number, "recommended": number},
    "complexity": "low" | "medium" | "high"
  },
  "progression": {
    "currentStage": "early" | "midway" | "full",
    "estimatedTimeToWorsen": "string",
    "recommendedActionTimeline": "string"
  }
}`;

      const userPrompt = `Analyze these building damage photos${context?.location ? ` from ${context.location}` : ''}${context?.propertyType ? ` in a ${context.propertyType}` : ''}${context?.ageOfProperty ? ` (property age: ${context.ageOfProperty} years)` : ''}.

Provide a comprehensive damage assessment including severity classification (EARLY/MIDWAY/FULL), homeowner explanation, contractor recommendations, and cost estimates.`;

      const messages: any[] = [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: userPrompt },
            ...imageUrls.slice(0, 4).map((url) => ({
              type: 'image_url',
              image_url: { url, detail: 'high' }, // High detail for damage assessment
            })),
          ],
        },
      ];

      const response = await openai.chat.completions.create({
        model: 'gpt-4-vision-preview',
        messages,
        max_tokens: 2000,
        temperature: 0.1, // Low temperature for consistent, factual responses
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from AI');
      }

      const assessment = JSON.parse(content) as DamageAssessment;
      
      logger.info('BuildingSurveyorService', 'Damage assessment completed', {
        damageType: assessment.damageType,
        severity: assessment.severity,
        confidence: assessment.confidence,
      });

      return assessment;
    } catch (error) {
      logger.error('BuildingSurveyorService', 'Damage assessment failed', error);
      throw error;
    }
  }

  /**
   * Batch assess multiple damage photos
   */
  static async assessMultiple(
    assessments: Array<{ imageUrls: string[]; context?: any }>
  ): Promise<DamageAssessment[]> {
    return Promise.all(
      assessments.map((assessment) =>
        this.assessDamage(assessment.imageUrls, assessment.context)
      )
    );
  }
}
```

### Step 2: API Endpoint

Create: `apps/web/app/api/building-surveyor/assess/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { BuildingSurveyorService } from '@/lib/services/BuildingSurveyorService';
import { getCurrentUserFromCookies } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { imageUrls, context } = body;

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return NextResponse.json(
        { error: 'Image URLs required' },
        { status: 400 }
      );
    }

    const assessment = await BuildingSurveyorService.assessDamage(
      imageUrls,
      context
    );

    return NextResponse.json(assessment);
  } catch (error) {
    console.error('Building surveyor API error:', error);
    return NextResponse.json(
      { error: 'Assessment failed' },
      { status: 500 }
    );
  }
}
```

### Step 3: React Component

Create: `apps/web/components/building-surveyor/DamageAssessmentCard.tsx`

```typescript
'use client';

import { useState } from 'react';
import { DamageAssessment } from '@/lib/services/BuildingSurveyorService';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card.unified';

interface DamageAssessmentCardProps {
  assessment: DamageAssessment;
  onViewDetails?: () => void;
}

export function DamageAssessmentCard({
  assessment,
  onViewDetails,
}: DamageAssessmentCardProps) {
  const severityColors = {
    early: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    midway: 'bg-orange-100 text-orange-800 border-orange-300',
    full: 'bg-red-100 text-red-800 border-red-300',
  };

  return (
    <Card variant="elevated" padding="md">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-[560] text-gray-900">
              {assessment.damageType}
            </h3>
            <p className="text-sm font-[460] text-gray-600">
              {assessment.location}
            </p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-[560] border ${severityColors[assessment.severity]}`}
          >
            {assessment.severity.toUpperCase()}
          </span>
        </div>

        {/* Homeowner Explanation */}
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <h4 className="text-sm font-[560] text-blue-900 mb-2">
            What This Means For You
          </h4>
          <p className="text-sm font-[460] text-blue-800 mb-2">
            <strong>What is it?</strong> {assessment.homeownerExplanation.whatIsIt}
          </p>
          <p className="text-sm font-[460] text-blue-800 mb-2">
            <strong>Why did it happen?</strong>{' '}
            {assessment.homeownerExplanation.whyItHappened}
          </p>
          <p className="text-sm font-[460] text-blue-800">
            <strong>What should you do?</strong>{' '}
            {assessment.homeownerExplanation.whatToDo}
          </p>
        </div>

        {/* Contractor Advice */}
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <h4 className="text-sm font-[560] text-green-900 mb-2">
            Contractor Recommendations
          </h4>
          <div className="space-y-2">
            <div>
              <p className="text-xs font-[560] text-green-800 mb-1">
                Repairs Needed:
              </p>
              <ul className="text-sm font-[460] text-green-700 list-disc list-inside">
                {assessment.contractorAdvice.repairNeeded.map((repair, i) => (
                  <li key={i}>{repair}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-[560] text-green-800 mb-1">
                Materials:
              </p>
              <ul className="text-sm font-[460] text-green-700">
                {assessment.contractorAdvice.materials.map((material, i) => (
                  <li key={i}>
                    {material.name} ({material.quantity}) - £{material.estimatedCost}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-[560] text-green-800 mb-1">Tools:</p>
              <p className="text-sm font-[460] text-green-700">
                {assessment.contractorAdvice.tools.join(', ')}
              </p>
            </div>
            <div className="pt-2 border-t border-green-200">
              <p className="text-sm font-[560] text-green-900">
                Estimated Cost: £{assessment.contractorAdvice.estimatedCost.min} - £{assessment.contractorAdvice.estimatedCost.max}
              </p>
              <p className="text-xs font-[460] text-green-700">
                Time: {assessment.contractorAdvice.estimatedTime} • Complexity:{' '}
                {assessment.contractorAdvice.complexity}
              </p>
            </div>
          </div>
        </div>

        {/* Progression */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <p className="text-xs font-[560] text-gray-700 mb-1">
            Progression Analysis
          </p>
          <p className="text-sm font-[460] text-gray-600">
            Current stage: <strong>{assessment.progression.currentStage}</strong>
          </p>
          <p className="text-sm font-[460] text-gray-600">
            May worsen in: {assessment.progression.estimatedTimeToWorsen}
          </p>
          <p className="text-sm font-[460] text-gray-600">
            Recommended action: {assessment.progression.recommendedActionTimeline}
          </p>
        </div>

        {onViewDetails && (
          <Button variant="secondary" onClick={onViewDetails} fullWidth>
            View Full Report
          </Button>
        )}
      </div>
    </Card>
  );
}
```

---

## 📈 TRAINING ROADMAP

### Quick Start (Week 1-2)
1. ✅ Implement prompt engineering approach (code above)
2. ✅ Test with real user photos
3. ✅ Collect feedback and iterate prompts
4. ✅ Deploy to production

**Result:** 80-85% accuracy, immediate value

### Short Term (Month 1-2)
1. ⏳ Collect 1,000-2,000 labeled images from your platform
2. ⏳ Set up data annotation pipeline
3. ⏳ Fine-tune GPT-4 Vision on your data
4. ⏳ A/B test fine-tuned vs. prompt-engineered model

**Result:** 90-92% accuracy, better UK-specific knowledge

### Medium Term (Month 3-6)
1. ⏳ Expand dataset to 10,000+ images
2. ⏳ Train custom model for specific damage types
3. ⏳ Implement active learning (improve on edge cases)
4. ⏳ Add multi-angle analysis

**Result:** 93-95% accuracy, production-grade system

### Long Term (Month 6+)
1. ⏳ Build proprietary model
2. ⏳ Reduce API dependency
3. ⏳ Edge deployment for faster inference
4. ⏳ Continuous learning from user feedback

**Result:** 95%+ accuracy, lower costs, proprietary IP

---

## 💰 COST BREAKDOWN

### Development Costs

| Phase | Approach | Cost | Timeline |
|-------|----------|------|----------|
| **Quick Start** | Prompt Engineering | £0-100 | 1-2 weeks |
| **Short Term** | Fine-Tuning | £500-2,000 | 1-2 months |
| **Medium Term** | Custom Training | £2,000-10,000 | 3-6 months |
| **Long Term** | Proprietary Model | £10,000-50,000 | 6-12 months |

### Operating Costs (Monthly)

| Usage Level | API Calls/Month | Cost/Month |
|-------------|-----------------|------------|
| **Low** | 100 assessments | £3-5 |
| **Medium** | 1,000 assessments | £30-50 |
| **High** | 10,000 assessments | £300-500 |
| **Enterprise** | 100,000 assessments | £3,000-5,000 |

**Note:** Costs decrease significantly with fine-tuned models (30-50% reduction)

---

## ✅ NEXT STEPS

### Immediate (This Week)
1. [ ] Review this guide
2. [ ] Decide on approach (start with prompt engineering)
3. [ ] Implement `BuildingSurveyorService.ts` (code provided)
4. [ ] Test with sample photos
5. [ ] Deploy to staging

### Short Term (This Month)
1. [ ] Collect initial dataset (500-1,000 images)
2. [ ] Set up annotation workflow
3. [ ] Begin fine-tuning preparation
4. [ ] Monitor accuracy and costs

### Medium Term (Next 3 Months)
1. [ ] Expand dataset to 5,000+ images
2. [ ] Fine-tune model
3. [ ] Deploy fine-tuned version
4. [ ] Measure improvement vs. baseline

---

## 🎯 SUCCESS METRICS

### Accuracy Targets
- **Prompt Engineering:** 80-85% accuracy
- **Fine-Tuned Model:** 90-95% accuracy
- **Custom Model:** 95%+ accuracy

### Business Metrics
- User satisfaction with explanations
- Contractor adoption rate
- Cost per assessment
- Time saved vs. manual surveys

---

## 📚 RESOURCES

### Datasets
- **Building Damage Datasets:** Kaggle, GitHub
- **RICS Survey Data:** RICS website
- **Insurance Claims:** Partner with insurance companies

### Tools
- **Annotation:** Label Studio, CVAT, Roboflow
- **Training:** OpenAI Fine-Tuning, Hugging Face, AWS SageMaker
- **Monitoring:** Weights & Biases, MLflow

### Documentation
- OpenAI Fine-Tuning: https://platform.openai.com/docs/guides/fine-tuning
- GPT-4 Vision: https://platform.openai.com/docs/guides/vision
- Building Survey Standards: RICS guidelines

---

**Ready to start?** Begin with the prompt engineering approach (code provided above) - you can have it working in days, then iterate toward fine-tuning for better accuracy!

