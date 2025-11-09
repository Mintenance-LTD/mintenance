<!-- ca399d9a-cadf-4ae0-b6d5-fe2e82e18d53 0308cc38-7ef2-4df2-9614-2307ae3a9191 -->
# Building Surveyor AI - How It Works

## Complete System Overview

This document explains how the building surveyor AI agent functions from the user's perspective and technically behind the scenes.

---

## User Workflow (Step-by-Step)

### Scenario: Homeowner Discovers Water Damage

**Step 1: User Takes Photos**

- Homeowner notices water stain on ceiling
- Takes 2-3 photos with phone
- Photos show: water stain, damp area, possible source

**Step 2: User Goes to Job Posting Page**

- Navigates to `/jobs/create`
- Starts filling out job form
- Uploads photos they took

**Step 3: AI Assessment Trigger**

- User clicks "Analyze with AI Building Surveyor" button
- Photos are uploaded to Supabase Storage
- Loading indicator shows: "Analyzing damage..."

**Step 4: AI Analysis (2-5 seconds)**

- Behind the scenes: Photos sent to GPT-4 Vision
- AI analyzes images for:
  - Damage type (water damage detected)
  - Severity (classified as "midway")
  - Safety hazards (electrical risk near water)
  - Compliance issues (potential building reg violation)
  - Insurance risk (moderate risk score)
  - Urgency (urgent - needs attention within 1 week)

**Step 5: Results Display**

- Assessment results appear in expandable cards:
  - **Damage Assessment Card**: "Water damage - Midway severity"
  - **Safety Hazards Card**: "Electrical hazard detected near water source"
  - **Compliance Flags Card**: "May require Part P electrical compliance check"
  - **Insurance Risk Card**: "Moderate risk - may affect premiums"
  - **Urgency Badge**: "URGENT - Action needed within 1 week"
  - **Homeowner Explanation**: Simple explanation of the problem
  - **Contractor Advice**: Technical details, materials, tools, cost estimate

**Step 6: User Reviews Results**

- User reads homeowner-friendly explanation
- Sees urgency level and safety warnings
- Reviews contractor recommendations
- Checks cost estimate (£200-500)

**Step 7: Pre-Fill Job Form**

- User clicks "Use AI Assessment"
- Job form auto-fills:
  - Title: "Water damage repair - kitchen ceiling"
  - Description: Pre-filled with AI description
  - Category: "Plumbing" (suggested)
  - Urgency: "High" (from AI urgency)
  - Budget: £350 (AI recommended cost)

**Step 8: User Completes & Submits**

- User reviews and adjusts if needed
- Submits job posting
- Assessment saved to database
- Job posted with AI assessment attached

**Step 9: Contractors See Enhanced Job**

- Contractors viewing job see:
  - AI assessment summary
  - Damage severity and urgency
  - Safety warnings
  - Technical requirements
  - Cost estimate range

**Step 10: Data Collection (Background)**

- Assessment automatically saved for training
- Flagged for human validation
- Added to training dataset
- Used to improve future models

---

## Technical Flow (Behind the Scenes)

### Request Flow Diagram

```
[User Browser]
    ↓ (1) Upload photos
[Job Create Page]
    ↓ (2) Click "Analyze with AI"
[API: /api/building-surveyor/assess]
    ↓ (3) Validate request
[BuildingSurveyorService]
    ↓ (4) Check cache
[Redis Cache] → [If found: Return cached result]
    ↓ (5) If not cached
[GPT-4 Vision API]
    ↓ (6) Send photos + prompt
[OpenAI GPT-4 Vision]
    ↓ (7) Analyze images
[AI Response (JSON)]
    ↓ (8) Parse response
[BuildingSurveyorService]
    ↓ (9) Structure data
[Phase1BuildingAssessment Object]
    ↓ (10) Save to database
[Supabase Database]
    ↓ (11) Cache result
[Redis Cache]
    ↓ (12) Return to user
[Job Create Page]
    ↓ (13) Display results
[React Components]
```

---

## Detailed Technical Process

### Step 1: Photo Upload

**Location:** `apps/web/app/jobs/create/page.tsx`

**Process:**

```typescript
// User selects photos
const handleImageUpload = (files: File[]) => {
  // Validate files (size, type)
  // Create previews
  setImagePreviews(files.map(file => ({
    file,
    preview: URL.createObjectURL(file)
  })));
};

// Upload to Supabase Storage
const uploadImages = async () => {
  const formData = new FormData();
  imagePreviews.forEach(({ file }) => {
    formData.append('photos', file);
  });
  
  const response = await fetch('/api/jobs/upload-photos', {
    method: 'POST',
    body: formData
  });
  
  const { urls } = await response.json();
  return urls; // Returns: ["https://supabase.co/storage/..."]
};
```

**Result:** Array of image URLs stored in Supabase Storage

---

### Step 2: Trigger AI Assessment

**Location:** `apps/web/app/jobs/create/page.tsx`

**User Action:** Clicks "Analyze with AI Building Surveyor" button

**Process:**

```typescript
const handleAIAssessment = async () => {
  setIsAnalyzing(true);
  
  try {
    // Get uploaded image URLs
    const imageUrls = await uploadImages();
    
    // Call assessment API
    const response = await fetch('/api/building-surveyor/assess', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageUrls: imageUrls,
        context: {
          location: formData.location,
          propertyType: 'residential', // Could be from property data
          ageOfProperty: propertyAge // If available
        }
      })
    });
    
    const assessment = await response.json();
    setAssessment(assessment);
  } catch (error) {
    setError('Assessment failed. Please try again.');
  } finally {
    setIsAnalyzing(false);
  }
};
```

---

### Step 3: API Endpoint Processing

**Location:** `apps/web/app/api/building-surveyor/assess/route.ts`

**Process:**

```typescript

export async function POST(request: NextRequest) {

// 1. Authenticate user

const user = await getCurrentUserFromCookies();

if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

// 2. Parse request

const body = await request.json();

const { imageUrls, context } = body;

// 3. Validate inputs

if (!imageUrls || imageUrls.length === 0) {

return NextResponse.json({ error: 'Images required' }, { sta

### To-dos

- [ ] Create BuildingSurveyorService.ts with GPT-4 Vision integration implementing all Phase 1 features: damage detection (early/midway/full), safety hazards, compliance flags, insurance risk, urgency classification
- [ ] Create comprehensive GPT-4 prompt that generates Phase1BuildingAssessment JSON with all 5 core features plus homeowner explanation and contractor advice
- [ ] Create API endpoint at apps/web/app/api/building-surveyor/assess/route.ts with authentication, image validation, error handling, and caching
- [ ] Create database migration for building_assessments, assessment_images tables with proper indexes and foreign keys
- [ ] Create React components: DamageAssessmentCard, SafetyHazardsCard, ComplianceFlagsCard, InsuranceRiskCard, UrgencyBadge, HomeownerExplanation, ContractorAdvice
- [ ] Integrate AI assessment into job posting flow at apps/web/app/jobs/create/page.tsx with photo upload trigger and results display
- [ ] Create DataCollectionService.ts to automatically collect GPT-4 assessments for future training data with validation workflow
- [ ] Create admin interface at apps/web/app/admin/building-assessments/page.tsx for reviewing and validating GPT-4 assessments