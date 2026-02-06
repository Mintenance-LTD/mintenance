# Mint AI Enhancements: Material Database Integration & Training Feedback System

**Date**: 2026-02-02
**Status**: ✅ Complete and Deployed
**Components**: Try Mint AI Demo, Materials Database, Training Feedback Collection

---

## Table of Contents

1. [Overview](#overview)
2. [Enhancement 1: Material Database Integration](#enhancement-1-material-database-integration)
3. [Enhancement 2: Training Feedback System](#enhancement-2-training-feedback-system)
4. [Testing Instructions](#testing-instructions)
5. [Database Schema](#database-schema)
6. [API Endpoints](#api-endpoints)
7. [Troubleshooting](#troubleshooting)

---

## Overview

This document describes two major enhancements to the Mint AI damage assessment system:

1. **Material Database Integration**: Enriches AI-detected materials with real UK supplier pricing
2. **Training Feedback System**: Captures user feedback on demo assessments for model training

### Key Benefits

- **Real Pricing**: Shows actual supplier prices instead of AI estimates
- **Training Data**: Collects ground truth labels from user feedback
- **Model Improvement**: Enables continuous learning from real user corrections
- **User Confidence**: "✓ DB" badges show verified pricing from actual suppliers

---

## Enhancement 1: Material Database Integration

### What It Does

When GPT-4 Vision detects materials needed for repair (e.g., "damp proof membrane"), the system:
1. Queries the materials database for similar items
2. Matches using fuzzy search (0.6 similarity threshold)
3. Enriches AI detection with real pricing from UK suppliers
4. Displays "✓ DB" badge for database-matched materials

### Architecture

```
AI Detection → Material Enrichment → Database Lookup → UI Display
    GPT-4         (fuzzy match)         Supabase         (badges)
```

### Implementation Files

#### Backend

**[apps/web/lib/services/building-surveyor/material-enrichment.ts](../apps/web/lib/services/building-surveyor/material-enrichment.ts)** (NEW)
- `enrichMaterialsWithDatabase()`: Core enrichment logic
- Fuzzy matching with MaterialsService
- Parallel lookups with Promise.all
- Graceful fallback to AI estimates

**[apps/web/lib/services/building-surveyor/orchestration/AssessmentOrchestrator.ts](../apps/web/lib/services/building-surveyor/orchestration/AssessmentOrchestrator.ts)** (MODIFIED)
- Lines 716-763: Material enrichment integration
- Calls enrichment before returning assessment
- Error handling with fallback

**[apps/web/lib/services/MaterialsService.ts](../apps/web/lib/services/MaterialsService.ts)** (MODIFIED)
- Fixed imports to use @mintenance/shared
- `findSimilarMaterials()`: Fuzzy search implementation
- `calculateCost()`: Cost calculation with quantities

#### Frontend

**[apps/web/app/try-mint-ai/components/AssessmentResults.tsx](../apps/web/app/try-mint-ai/components/AssessmentResults.tsx)** (MODIFIED)
- Lines 194-275: Materials section rendering
- "✓ DB" badges for database matches
- Supplier name, SKU, unit pricing display
- Cost comparison: AI estimate vs. database pricing

#### Shared Types

**[packages/shared/src/index.ts](../packages/shared/src/index.ts)** (MODIFIED)
- Lines 7-25: Export material types from shared package
- Enables type safety across apps/web and packages

**[apps/web/lib/services/building-surveyor/types.ts](../apps/web/lib/services/building-surveyor/types.ts)** (MODIFIED)
- Lines 79-92: Enhanced Material interface
- Optional database fields: material_id, unit_price, total_cost, source, sku, supplier_name, unit

### Database Seeding

**[apps/web/scripts/seed-damp-materials.ts](../apps/web/scripts/seed-damp-materials.ts)** (NEW)
- 12 specialty damp/mold prevention materials
- Real UK pricing from Screwfix, B&Q, Wickes, Travis Perkins
- Includes: DPMs, DPCs, anti-mold paints, sealants, tanking slurry

**Run seeding**:
```bash
cd apps/web
npx tsx scripts/seed-damp-materials.ts
```

### Material Matching Logic

```typescript
// 1. AI detects: "damp proof membrane"
const aiMaterial = {
  name: "damp proof membrane",
  quantity: "1 roll",
  estimatedCost: 50.00
};

// 2. Database query with fuzzy matching
const matches = await materialsService.findSimilarMaterials("damp proof membrane", { limit: 1 });
// Returns: "Damp Proof Membrane (DPM) 4m x 25m Roll" (similarity: 0.85)

// 3. Enrich with database data
const enriched = {
  ...aiMaterial,
  material_id: "uuid-here",
  unit_price: 45.00,
  unit: "each",
  total_cost: 45.00,
  source: "database",
  supplier_name: "Screwfix",
  sku: "DPM-4X25-300"
};
```

### Example Output

**Before Enrichment** (AI Only):
```
Materials Needed:
- Damp proof membrane - Est. cost: £50.00
```

**After Enrichment** (Database Match):
```
Materials Needed:
- Damp Proof Membrane (DPM) 4m x 25m Roll [✓ DB]
  £45.00/each
  Total: £45.00
  Screwfix
```

---

## Enhancement 2: Training Feedback System

### What It Does

Enables "Yes, accurate" and "No, needs correction" buttons on Try Mint AI to:
1. Capture positive feedback confirming AI accuracy
2. Collect detailed corrections when AI is wrong
3. Store training data for model improvement
4. Enable knowledge distillation from GPT-4 to smaller models

### Architecture

```
Demo Assessment → Training Data Capture → User Feedback → Training Labels
  (shadow_mode)     (GPT-4 outputs)         (corrections)    (ground truth)
```

### Implementation Flow

#### Phase 1: Enable Training Data Capture for Demos

**Problem**: Demo assessments didn't create database records, so training data capture was skipped.

**Solution**: Create `building_assessments` record with `shadow_mode = true` and `user_id = null`.

**Modified Files**:

**[apps/web/app/api/building-surveyor/demo/route.ts](../apps/web/app/api/building-surveyor/demo/route.ts)**
- Lines 82-104: Create placeholder assessment record
- Line 131: Pass assessmentId through context
- Lines 135-149: Update record with results
- Line 176: Return assessmentId in API response

**Key Changes**:
```typescript
// Before: No database record, no training data
const assessment = await BuildingSurveyorService.assessDamage(imageUrls, context);

// After: Create record, enable training capture
const { data: placeholderRow } = await serverSupabase
  .from('building_assessments')
  .insert({
    user_id: null,        // Allowed when shadow_mode = true
    shadow_mode: true,    // Demo assessments
    cache_key: cacheKey,
    // ... other fields
  })
  .select('id')
  .single();

const assessment = await BuildingSurveyorService.assessDamage(
  imageUrls,
  { ...context, assessmentId: placeholderRow.id }  // Pass for training capture
);
```

**Training Data Capture** (Automatic in AssessmentOrchestrator):
```typescript
// apps/web/lib/services/building-surveyor/orchestration/AssessmentOrchestrator.ts
// Lines 561-566, 846-854

this.captureTrainingDataAsync(
  context?.assessmentId,  // Now available for demos!
  validatedImageUrls,
  assessment,
  sam3Result,
  context
);

// Inside captureTrainingDataAsync:
if (!assessmentId) {
  logger.warn('Skipping training data capture - no assessment ID');
  return;  // No longer happens for demos!
}

await KnowledgeDistillationService.recordGPT4Output(assessmentId, {
  damage_type: assessment.damageType,
  severity: assessment.severity,
  confidence: assessment.confidence,
  // ... stores in gpt4_training_labels table
});
```

#### Phase 2: Capture User Feedback

**Database Schema**:

**[supabase/migrations/20260202000001_add_demo_feedback_table.sql](../supabase/migrations/20260202000001_add_demo_feedback_table.sql)** (NEW)
```sql
CREATE TABLE demo_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES building_assessments(id) ON DELETE CASCADE,

  -- Feedback type
  is_accurate BOOLEAN NOT NULL,

  -- Correction details (if is_accurate = false)
  corrected_damage_type VARCHAR(100),
  corrected_severity VARCHAR(20),
  corrected_cost_min DECIMAL(10, 2),
  corrected_cost_max DECIMAL(10, 2),
  correction_notes TEXT,

  -- Additional feedback
  feedback_text TEXT,
  user_email VARCHAR(255),

  -- Metadata
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- RLS: Anonymous inserts allowed, admin-only viewing
CREATE POLICY "Allow anonymous demo feedback submission"
  ON demo_feedback FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all feedback"
  ON demo_feedback FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
```

**API Endpoint**:

**[apps/web/app/api/building-surveyor/demo-feedback/route.ts](../apps/web/app/api/building-surveyor/demo-feedback/route.ts)** (NEW)
```typescript
// POST /api/building-surveyor/demo-feedback
export async function POST(request: NextRequest) {
  // 1. Rate limit: 10 requests/min per IP
  // 2. Validate feedback data (Zod schema)
  // 3. Verify assessment exists and is demo (shadow_mode = true)
  // 4. Insert feedback into demo_feedback table
  // 5. Return success message
}
```

**Request Schema**:
```typescript
{
  assessmentId: string (UUID),
  isAccurate: boolean,
  // Optional (required if isAccurate = false):
  correctedDamageType?: string,
  correctedSeverity?: 'early' | 'midway' | 'full',
  correctedCostMin?: number,
  correctedCostMax?: number,
  correctionNotes?: string,
  feedbackText?: string,
  userEmail?: string (optional for follow-up)
}
```

**Frontend Integration**:

**[apps/web/app/try-mint-ai/components/TryMintAIClient.tsx](../apps/web/app/try-mint-ai/components/TryMintAIClient.tsx)** (MODIFIED)

**Line 34**: Added assessmentId to AssessmentResult
```typescript
export interface AssessmentResult {
  // ... existing fields
  assessmentId?: string; // NEW: For training feedback
}
```

**Line 131**: Parse assessmentId from API response
```typescript
const assessment: AssessmentResult = {
  // ... existing fields
  assessmentId: result.assessmentId || null,
};
```

**Lines 152-191**: Wire "Yes, accurate" button
```typescript
const handleAccuracyFeedback = async (isAccurate: boolean) => {
  if (!assessmentResult?.assessmentId) {
    alert('Unable to submit feedback at this time');
    return;
  }

  if (!isAccurate) {
    // Open correction form for detailed feedback
    setCorrectionState({ ...correctionState, isOpen: true });
  } else {
    // Submit positive feedback
    const response = await fetch('/api/building-surveyor/demo-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assessmentId: assessmentResult.assessmentId,
        isAccurate: true,
      }),
    });

    const result = await response.json();
    alert(result.message); // "Thank you for confirming the accuracy!"
  }
};
```

**Lines 193-234**: Wire "No, needs correction" button
```typescript
const handleCorrectionSubmit = async (corrections) => {
  const response = await fetch('/api/building-surveyor/demo-feedback', {
    method: 'POST',
    body: JSON.stringify({
      assessmentId: assessmentResult.assessmentId,
      isAccurate: false,
      correctedDamageType: corrections.damageType,
      correctedSeverity: corrections.severity?.toLowerCase(),
      correctedCostMin: corrections.costEstimate * 0.8,
      correctedCostMax: corrections.costEstimate * 1.2,
      correctionNotes: corrections.notes,
    }),
  });

  alert('Thank you for helping improve Mint AI!');
};
```

---

## Testing Instructions

### Test Material Database Integration

1. **Start dev server**:
   ```bash
   cd apps/web
   npm run dev
   ```

2. **Navigate to**: [http://localhost:3000/try-mint-ai](http://localhost:3000/try-mint-ai)

3. **Upload image** showing damp/mold damage

4. **Verify materials section** shows:
   - "✓ DB" badges on matched materials
   - Real pricing (e.g., "£45.00/each")
   - Supplier name (e.g., "Screwfix")
   - Total cost calculation

5. **Check terminal logs**:
   ```
   Material enrichment complete
   - Total materials: 3
   - Database matches: 2 (66.7%)
   - AI only: 1
   ```

### Test Training Feedback System

1. **Upload image and get assessment**

2. **Click "Yes, accurate" button**:
   - Should see alert: "Thank you for confirming the accuracy!"
   - Check browser DevTools → Network: POST to `/api/building-surveyor/demo-feedback`
   - Response: `{ success: true, message: "..." }`

3. **Click "No, needs correction" button**:
   - Correction form should open
   - Fill in corrections (damage type, severity, notes)
   - Submit corrections
   - Should see: "Thank you for helping improve Mint AI!"

4. **Verify in database**:
   ```sql
   -- Check demo assessments were created
   SELECT id, shadow_mode, user_id, damage_type, created_at
   FROM building_assessments
   WHERE shadow_mode = true
   ORDER BY created_at DESC
   LIMIT 5;

   -- Check feedback was captured
   SELECT
     df.id,
     df.assessment_id,
     df.is_accurate,
     df.corrected_damage_type,
     df.correction_notes,
     df.created_at,
     ba.damage_type as ai_damage_type
   FROM demo_feedback df
   JOIN building_assessments ba ON ba.id = df.assessment_id
   ORDER BY df.created_at DESC
   LIMIT 10;

   -- Check training data was captured (Phase 1)
   SELECT
     assessment_id,
     damage_type,
     severity,
     confidence,
     created_at
   FROM gpt4_training_labels
   WHERE assessment_id IN (
     SELECT id FROM building_assessments WHERE shadow_mode = true
   )
   ORDER BY created_at DESC
   LIMIT 5;
   ```

5. **Expected results**:
   - `building_assessments`: New rows with `shadow_mode = true`, `user_id = null`
   - `demo_feedback`: Feedback rows with `is_accurate = true/false`
   - `gpt4_training_labels`: Training data rows (if KnowledgeDistillationService is enabled)

---

## Database Schema

### Existing Tables (Modified)

#### building_assessments
```sql
-- Already has shadow_mode field (from 20251202000005_add_shadow_mode_fields.sql)
shadow_mode BOOLEAN NOT NULL DEFAULT FALSE,
user_id UUID (nullable when shadow_mode = true, per 20251202000008_allow_null_user_id_for_shadow_mode.sql)
```

### New Tables

#### demo_feedback
```sql
CREATE TABLE demo_feedback (
  id UUID PRIMARY KEY,
  assessment_id UUID NOT NULL REFERENCES building_assessments(id),
  is_accurate BOOLEAN NOT NULL,
  corrected_damage_type VARCHAR(100),
  corrected_severity VARCHAR(20) CHECK (corrected_severity IN ('early', 'midway', 'full')),
  corrected_cost_min DECIMAL(10, 2),
  corrected_cost_max DECIMAL(10, 2),
  correction_notes TEXT,
  feedback_text TEXT,
  user_email VARCHAR(255),
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_demo_feedback_assessment_id ON demo_feedback(assessment_id);
CREATE INDEX idx_demo_feedback_is_accurate ON demo_feedback(is_accurate);
CREATE INDEX idx_demo_feedback_created_at ON demo_feedback(created_at DESC);
CREATE INDEX idx_demo_feedback_needs_review ON demo_feedback(is_accurate, created_at DESC) WHERE is_accurate = false;
```

---

## API Endpoints

### POST /api/building-surveyor/demo

**Purpose**: Assess damage from demo images (public endpoint)

**Changes**:
- Now creates `building_assessments` record with `shadow_mode = true`
- Returns `assessmentId` in response
- Enables training data capture

**Request**:
```json
{
  "imageUrls": ["base64..."],
  "context": {
    "propertyType": "residential",
    "ageOfProperty": 50,
    "location": "UK"
  }
}
```

**Response**:
```json
{
  "damageAssessment": { "damageType": "...", "severity": "...", "confidence": 85 },
  "costEstimate": { "min": 500, "max": 1200 },
  "urgency": { "urgency": "urgent", "..." },
  "safetyHazards": { "..." },
  "materials": [
    {
      "name": "Damp Proof Membrane (DPM) 4m x 25m Roll",
      "quantity": "1 roll",
      "estimatedCost": 50,
      "material_id": "uuid",
      "unit_price": 45.00,
      "total_cost": 45.00,
      "source": "database",
      "supplier_name": "Screwfix",
      "sku": "DPM-4X25-300",
      "unit": "each"
    }
  ],
  "assessmentId": "uuid-here"  // NEW
}
```

### POST /api/building-surveyor/demo-feedback (NEW)

**Purpose**: Submit user feedback on demo assessment

**Authentication**: None (public, rate-limited)

**Rate Limit**: 10 requests per minute per IP

**Request**:
```json
{
  "assessmentId": "uuid",
  "isAccurate": true
}

// OR for corrections:
{
  "assessmentId": "uuid",
  "isAccurate": false,
  "correctedDamageType": "Rising damp",
  "correctedSeverity": "midway",
  "correctedCostMin": 800,
  "correctedCostMax": 1500,
  "correctionNotes": "AI missed the extent of damage on the adjacent wall",
  "feedbackText": "Severity was underestimated",
  "userEmail": "user@example.com"  // Optional
}
```

**Response**:
```json
{
  "success": true,
  "feedbackId": "uuid",
  "message": "Thank you for confirming the accuracy!"
}
```

**Errors**:
```json
// 429 Too Many Requests
{
  "error": "Too many requests. Please wait a moment and try again."
}

// 400 Bad Request
{
  "error": "Assessment not found"
}
{
  "error": "Feedback only allowed for demo assessments"
}
```

---

## Troubleshooting

### Material Enrichment Not Working

**Symptom**: No "✓ DB" badges, all materials show AI estimates

**Debugging**:
1. Check terminal logs for enrichment messages:
   ```
   BEFORE material enrichment in AssessmentOrchestrator
   AFTER material enrichment in AssessmentOrchestrator
   Material enrichment complete - databaseMatches: X
   ```

2. Verify materials exist in database:
   ```sql
   SELECT name, category, unit_price, supplier_name
   FROM materials
   WHERE category IN ('sealants', 'paint')
   AND (name ILIKE '%damp%' OR name ILIKE '%mold%')
   LIMIT 10;
   ```

3. Check MaterialsService logs:
   ```
   Material enriched from database: aiName=X, dbName=Y, similarity=0.85
   ```

**Solutions**:
- Run seed script if materials are missing: `npx tsx scripts/seed-damp-materials.ts`
- Check similarity threshold (currently 0.6) in material-enrichment.ts:142
- Verify MaterialsService.findSimilarMaterials() is working

### Feedback Not Saving

**Symptom**: Button clicked but no feedback in database

**Debugging**:
1. Check browser console for errors
2. Check Network tab: POST to `/api/building-surveyor/demo-feedback` should return 200
3. Verify assessmentId is present:
   ```javascript
   console.log('assessmentResult:', assessmentResult);
   // Should have assessmentId field
   ```

4. Check API logs:
   ```
   Demo feedback: Request received
   Demo feedback saved successfully
   ```

**Solutions**:
- Ensure migration was applied: `demo_feedback` table exists
- Check RLS policies allow anonymous inserts
- Verify assessmentId is being returned from `/api/building-surveyor/demo` endpoint

### Training Data Not Captured

**Symptom**: Feedback works but `gpt4_training_labels` table is empty

**Debugging**:
1. Check if assessment record was created:
   ```sql
   SELECT id, shadow_mode, user_id
   FROM building_assessments
   ORDER BY created_at DESC
   LIMIT 1;
   ```

2. Look for training capture logs:
   ```
   Skipping training data capture - no assessment ID  // Should NOT appear
   GPT-4 output recorded for assessment: uuid  // Should appear
   ```

**Solutions**:
- Verify assessmentId is being passed through context in demo/route.ts:131
- Check KnowledgeDistillationService.recordGPT4Output() is enabled
- Ensure `gpt4_training_labels` table exists in database

---

## Future Enhancements

### Material Database
- [ ] Add more specialty materials (electrical, plumbing, roofing)
- [ ] Implement price update automation from supplier APIs
- [ ] Add regional pricing variations
- [ ] Support quantity-based bulk discounts

### Training Feedback
- [ ] Implement `get_demo_training_labels()` function for export
- [ ] Create admin dashboard for reviewing feedback
- [ ] Add email notifications for high-value corrections
- [ ] Implement training pipeline to retrain models with feedback
- [ ] Add A/B testing to measure improvement from training

---

## Summary

Both enhancements are now live and working:

✅ **Material Database Integration**: Real UK supplier pricing displayed with "✓ DB" badges
✅ **Training Feedback System**: User feedback captured for model training
✅ **Training Data Capture**: GPT-4 outputs automatically saved for demo assessments
✅ **Database Schema**: `demo_feedback` table created with proper RLS policies
✅ **API Endpoints**: `/demo-feedback` endpoint live and rate-limited
✅ **Frontend Integration**: Feedback buttons fully wired and functional

The system is ready for production use and will continuously improve through user feedback! 🚀
