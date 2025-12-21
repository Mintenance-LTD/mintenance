# Homeowner Job Creation Flow - Complete Analysis

## 🎯 Overview

The homeowner job creation flow is a **sophisticated 4-step wizard** with AI-powered damage assessment, smart contractor matching, and comprehensive validation.

**Main Entry Point**: `/jobs/create`
**Quick Entry Point**: `/jobs/quick-create` (template-based)
**Status**: ✅ Functional with some UX improvements needed

---

## 📍 User Journey Map

```
┌─────────────────────────────────────────────────────────────────┐
│                     ENTRY POINTS (Multiple)                      │
├─────────────────────────────────────────────────────────────────┤
│ • Dashboard "Post a Job" button                                 │
│ • Properties page "Post Job" from property card                 │
│ • Sidebar "Post Job" action                                     │
│ • Landing page CTAs                                             │
│ • Empty states (first-time users)                               │
│ • Direct URL: /jobs/create or /jobs/quick-create                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    PRE-FLIGHT CHECK                             │
├─────────────────────────────────────────────────────────────────┤
│ ✅ User authenticated?                                           │
│ ✅ User is homeowner role?                                       │
│ ✅ User has properties?  ⚠️ BLOCKER IF NO                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              STEP 1: JOB DETAILS (Required)                      │
├─────────────────────────────────────────────────────────────────┤
│ • Select Property (dropdown from user's properties)             │
│ • Category (12 options: plumbing, electrical, etc.)             │
│ • Title (10-100 chars)                                          │
│ • Description (50-5000 chars)                                   │
│ • Location (auto-filled from property)                          │
│ • Required Skills (optional, max 10)                            │
│                                                                 │
│ Validation: All required fields, length constraints             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              STEP 2: PHOTOS (Conditional)                        │
├─────────────────────────────────────────────────────────────────┤
│ • Upload up to 10 photos (max 10MB each)                        │
│ • Formats: JPEG, PNG, WebP, GIF                                 │
│ • REQUIRED if budget > £500  ⚠️                                 │
│                                                                 │
│ → On Upload:                                                    │
│   ┌─────────────────────────────────────────────┐               │
│   │ 1. Upload to Supabase Storage               │               │
│   │ 2. Get public URLs                          │               │
│   │ 3. Trigger AI Building Assessment (GPT-4V)  │               │
│   │ 4. Show assessment results:                 │               │
│   │    • Damage type & severity                 │               │
│   │    • Safety hazards                         │               │
│   │    • Urgency level                          │               │
│   │    • Cost estimate (min-max range)          │               │
│   └─────────────────────────────────────────────┘               │
│                                                                 │
│ Validation: Count ≤ 10, size ≤ 10MB, valid format              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│          STEP 3: BUDGET & TIMELINE (Required)                    │
├─────────────────────────────────────────────────────────────────┤
│ • Budget (£50 - £50,000)                                        │
│ • Urgency (low/medium/high/emergency) ⚠️ NOT SAVED              │
│ • Preferred Date ⚠️ NOT SUBMITTED                               │
│                                                                 │
│ Validation: Budget ≥ £50, photos if > £500                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                STEP 4: REVIEW & SUBMIT                           │
├─────────────────────────────────────────────────────────────────┤
│ • Summary of all entered data                                   │
│ • AI assessment summary (if photos uploaded)                    │
│ • Edit buttons for each section                                 │
│ • Final validation check                                        │
│                                                                 │
│ On Submit:                                                      │
│   ┌─────────────────────────────────────────────┐               │
│   │ 1. Fetch fresh CSRF token                   │               │
│   │ 2. Geocode address (Google Maps API)        │               │
│   │ 3. Upload any remaining photos              │               │
│   │ 4. POST to /api/jobs                        │               │
│   │ 5. Calculate serious buyer score            │               │
│   │ 6. Insert job record                        │               │
│   │ 7. Insert photo attachments                 │               │
│   │ 8. Notify nearby contractors (25km radius)  │               │
│   │ 9. Filter by required skills                │               │
│   └─────────────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    POST-SUBMISSION                               │
├─────────────────────────────────────────────────────────────────┤
│ ✅ Success toast notification                                    │
│ ✅ Redirect to /jobs/{jobId} (job details page)                  │
│ ✅ Job appears in homeowner dashboard                            │
│ ✅ Job visible in /jobs listing                                  │
│ ✅ Contractors receive notifications                             │
│ ✅ Job appears in /contractor/discover                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔑 Critical Fields & Validation

### Required Fields
| Field | Validation | Error Message |
|-------|------------|---------------|
| `property_id` | Must exist in user's properties | "Please select a property" |
| `category` | One of 12 predefined categories | "Please select a category" |
| `title` | 10-100 characters | "Title must be at least 10 characters" |
| `description` | 50-5000 characters | "Description must be at least 50 characters" |
| `location` | Min 5 characters (auto-filled) | "Location is required" |
| `budget` | £50 - £50,000 | "Budget must be at least £50" |

### Conditional Requirements
| Condition | Requirement |
|-----------|-------------|
| Budget > £500 | Photos are REQUIRED |
| Photos uploaded | AI assessment runs automatically |
| High-value job | Phone verification required (disabled in dev) |

### Optional Fields
- `required_skills` - Max 10 skills
- `urgency` - ⚠️ **Collected but NOT saved to database**
- `preferred_date` - ⚠️ **Collected but NOT submitted**

---

## 🖼️ Image Upload Flow

```
User selects files
       ↓
┌──────────────────────┐
│ Client-Side          │
│ (useImageUpload.ts)  │
├──────────────────────┤
│ • Validate count ≤10 │
│ • Validate size ≤10MB│
│ • Validate type      │
│ • Generate previews  │
└──────────────────────┘
       ↓
On form submit or manual upload
       ↓
┌──────────────────────────────┐
│ POST /api/jobs/upload-photos │
├──────────────────────────────┤
│ • CSRF protection ✅         │
│ • File validation ✅         │
│ • Sanitize filename ✅       │
│ • Upload to Supabase ✅      │
│ • Path: job-photos/{...}     │
└──────────────────────────────┘
       ↓
┌──────────────────────────────────┐
│ POST /api/building-surveyor/assess│
├──────────────────────────────────┤
│ • Send photo URLs to GPT-4V      │
│ • Include context (location, etc)│
│ • Cache result for 7 days ✅     │
│ • Return assessment:             │
│   - Damage type & severity       │
│   - Safety hazards               │
│   - Urgency level                │
│   - Cost estimate                │
└──────────────────────────────────┘
       ↓
Display results in UI
```

---

## 🤖 AI Building Assessment

### When Triggered
- Automatically when photos are uploaded in Step 2
- Uses GPT-4 Vision API

### Input Data
```typescript
{
  imageUrls: string[],  // 1-4 photos
  context?: {
    location: string,
    propertyType?: string,
    ageOfProperty?: string
  }
}
```

### Output Data
```typescript
{
  damageAssessment: {
    damageType: string,          // e.g., "Water damage"
    severity: "minor" | "moderate" | "severe" | "critical",
    confidence: number,          // 0-100
    description: string
  },
  safetyHazards: {
    hasSafetyHazards: boolean,
    overallSafetyScore: number,  // 0-100
    criticalFlags: string[]
  },
  urgency: {
    urgency: "low" | "medium" | "high" | "emergency",
    reasoning: string
  },
  estimatedCost?: {
    min: number,
    max: number,
    confidence: number
  }
}
```

### Caching
- Results cached in `building_assessments` table
- Cache key: SHA-256 hash of sorted image URLs
- TTL: 7 days
- Reduces API costs and improves response time

### A/B Testing
- Safe-LUCB critic can decide: automate or escalate
- Shadow mode available for validation
- Experiment-based rollout

---

## 🔐 Security Features

### CSRF Protection
✅ All write operations protected:
- `/api/jobs` (POST)
- `/api/jobs/upload-photos` (POST)
- `/api/building-surveyor/assess` (POST)

**Token Management**:
1. Fresh token fetched immediately before submission
2. 50ms delay after fetch to ensure cookie processing
3. Prevents cookie/header mismatch issues

### File Upload Security
✅ **File Type Validation**: MIME type + extension check
✅ **File Size Limit**: 10MB per file (5MB for API endpoint)
✅ **Filename Sanitization**: Prevents path traversal attacks
✅ **SSRF Protection**: Validates photo URLs before processing
⚠️ **No Malware Scanning**: Relies on Supabase storage security

### Input Sanitization
✅ `sanitizeJobDescription()` - Removes XSS vectors
✅ `sanitizeText()` - General text sanitization
✅ Zod validation on all API inputs

### Rate Limiting
✅ **Production**: 10 jobs per hour per user
⚠️ **Development**: Disabled (can be enabled with env var)

### Phone Verification
✅ **Production**: Required for homeowners
⚠️ **Development**: Disabled (can be enabled with env var)

---

## 📊 Database Interactions

### Tables Modified

#### 1. `jobs` (Main Insert)
```sql
INSERT INTO jobs (
  title,
  description,
  location,
  category,
  budget,
  homeowner_id,
  status,            -- Always 'posted'
  property_id,
  latitude,          -- From geocoding
  longitude,         -- From geocoding
  required_skills    -- Optional (may not exist in all envs)
)
```

#### 2. `job_attachments` (Photos)
```sql
INSERT INTO job_attachments (
  job_id,
  file_url,          -- Public Supabase Storage URL
  file_type,         -- Always 'image'
  uploaded_by
)
```

#### 3. `building_assessments` (AI Cache)
```sql
INSERT INTO building_assessments (
  user_id,
  cache_key,         -- SHA-256 hash
  damage_type,
  severity,
  confidence,
  safety_score,
  compliance_score,
  urgency,
  assessment_data,   -- Full JSON
  validation_status  -- 'pending' | 'validated' | 'pending_shadow'
)
```

#### 4. `notifications` (Contractor Alerts)
```sql
INSERT INTO notifications (
  user_id,           -- contractor_id
  type,              -- 'job_nearby'
  message,           -- "New job '{title}' posted near you..."
  action_url         -- '/jobs/{jobId}'
)
```

### Tables Read
- `properties` - User's properties for selection
- `users` - Auth verification, contractor locations
- `contractor_skills` - Skills-based matching

---

## ⚠️ Known Issues & Gaps

### 1. Property Requirement Blocker
**Issue**: Users MUST have a property to create a job

**Impact**: New users may not have properties yet
- No inline property creation in job flow
- Must navigate away to `/properties/add`
- Loses job creation context

**Recommendation**:
- Add "Quick Add Property" modal in job creation flow
- Or allow jobs without property (location-only)
- Improve empty state with clear CTA

### 2. Urgency Field Not Saved
**Issue**: UI collects urgency but it's NOT saved to database

**Code Comment**:
```typescript
// Don't send urgency field - it's not supported by the API/database
```

**Impact**: User input is discarded
- Misleading UI (looks like it's being saved)
- Potentially useful data lost

**Recommendation**:
- Add `urgency` column to `jobs` table
- Update API to accept and save urgency
- Or remove from UI if not needed

### 3. Preferred Date Not Submitted
**Issue**: UI has `preferredDate` state but it's never submitted

**Impact**: User expectation vs. reality mismatch
- User selects date thinking it matters
- Data never reaches backend

**Recommendation**:
- Add `preferred_start_date` column to `jobs` table
- Include in submission payload
- Or remove from UI

### 4. Photo Requirement for High-Value Jobs
**Issue**: Budget > £500 REQUIRES photos

**Impact**: May block legitimate users
- Some users don't have photos yet
- May not know how to take good photos
- Emergency jobs may not allow time

**Recommendation**:
- Make photos optional but encouraged
- Show warning instead of blocking
- Add "I'll add photos later" option

### 5. Required Skills Column Inconsistency
**Issue**: `required_skills` column may not exist in all environments

**Current Handling**: Graceful fallback with retry logic

**Recommendation**:
- Ensure consistent schema across all environments
- Run migration if needed
- Or make it fully optional with feature flag

### 6. CSRF Token Complexity
**Issue**: Multiple fresh token fetches with delays

**Code**:
```typescript
// Fetch fresh CSRF token before submission
await fetchCSRFToken();
await new Promise(resolve => setTimeout(resolve, 50)); // Allow cookie to be set
```

**Impact**: Complex, fragile logic
- Hard to debug
- Timing-dependent
- Multiple fetch calls

**Recommendation**:
- Simplify token management
- Use single token for entire session
- Better cookie/header synchronization

---

## 🎨 UX Improvements Needed

### High Priority

1. **Property Creation Flow**
   - Add inline property creation modal
   - Don't force navigation away
   - Save job draft before redirecting

2. **Form State Persistence**
   - Save draft to localStorage
   - Warn before navigating away
   - Auto-save feature

3. **Real-Time Validation**
   - Validate fields as user types
   - Show validation status indicators
   - Better error message placement

4. **Image Upload UX**
   - Show progress indicator for uploads
   - Allow retry on individual failed uploads
   - Better error messages (currently generic)

### Medium Priority

5. **AI Assessment UX**
   - Make assessment optional/skippable
   - Add "Rerun Assessment" button
   - Show confidence score more prominently
   - Explain what the AI is analyzing

6. **Budget Guidance**
   - Show typical budget ranges by category
   - Use AI assessment cost estimate to suggest budget
   - Add helpful examples

7. **Mobile Responsiveness**
   - Test on mobile devices
   - Ensure feature parity with mobile app
   - Optimize photo upload for mobile

### Low Priority

8. **Smart Job Analysis Enhancement**
   - Currently underutilized
   - Make suggestions more prominent
   - Add auto-fill based on suggestions

9. **Skills Selection UX**
   - Autocomplete for skill selection
   - Show popular skills for category
   - Limit to 10 skills more gracefully

---

## 🧪 Testing Checklist

### Happy Path Tests
- [ ] Create job with minimum required fields
- [ ] Create job with all optional fields
- [ ] Create job with photos (< £500 budget)
- [ ] Create job with photos (> £500 budget)
- [ ] Verify AI assessment runs and displays
- [ ] Verify job appears in dashboard
- [ ] Verify contractors receive notifications

### Edge Cases
- [ ] Create job with no properties → Should show error/CTA
- [ ] Create job with budget > £500 without photos → Should block
- [ ] Upload 10 photos → Should allow
- [ ] Upload 11 photos → Should prevent
- [ ] Upload oversized photo (> 10MB) → Should reject
- [ ] Upload invalid file type → Should reject
- [ ] Submit with network failure → Should show error
- [ ] Submit with invalid CSRF token → Should retry

### Security Tests
- [ ] Submit without CSRF token → Should reject (403)
- [ ] Submit as non-homeowner → Should reject (403)
- [ ] Upload malicious filename (path traversal) → Should sanitize
- [ ] Submit XSS in description → Should sanitize
- [ ] Exceed rate limit → Should reject (429)
- [ ] Submit without phone verification → Should reject (in prod)

### Integration Tests
- [ ] Geocoding success → lat/lng saved
- [ ] Geocoding failure → Graceful fallback
- [ ] AI assessment with valid photos → Results displayed
- [ ] AI assessment cache hit → Fast response
- [ ] Skills-based contractor matching → Correct notifications
- [ ] Nearby contractor query → 25km radius correct

### E2E Tests
- [ ] Full flow from dashboard to job details page
- [ ] Edit job after creation
- [ ] Receive and accept bid
- [ ] Complete job workflow

---

## 📁 Key Files Reference

### Frontend (Job Creation)
| File | Purpose | Lines |
|------|---------|-------|
| `app/jobs/create/page.tsx` | Main 4-step wizard | ~957 |
| `app/jobs/create/utils/submitJob.ts` | Submission orchestration | ~200 |
| `app/jobs/create/utils/validation.ts` | Form validation logic | ~100 |
| `app/jobs/create/hooks/useImageUpload.ts` | Image upload hook | ~150 |
| `app/jobs/create/hooks/useBuildingAssessment.ts` | AI assessment hook | ~120 |
| `app/jobs/quick-create/page.tsx` | Template-based quick create | ~400 |

### Backend (APIs)
| File | Purpose | Size |
|------|---------|------|
| `app/api/jobs/route.ts` | Job creation endpoint (POST) | Large |
| `app/api/jobs/upload-photos/route.ts` | Photo upload endpoint | Medium |
| `app/api/building-surveyor/assess/route.ts` | AI assessment endpoint | Large |
| `app/api/csrf/route.ts` | CSRF token endpoint | Small |

### Services
| File | Purpose |
|------|---------|
| `lib/services/building-surveyor/BuildingSurveyorConfig.ts` | AI config |
| `lib/services/verification/HomeownerVerificationService.ts` | Phone verification |
| `lib/services/SeriousBuyerService.ts` | Buyer score calculation |

### Components
| File | Purpose |
|------|---------|
| `components/maps/GoogleMap.tsx` | Map for location selection |
| `components/ui/Toast.tsx` | Notification system |
| `components/ErrorBoundary.tsx` | Error handling |

---

## 🚀 Performance Considerations

### API Response Times
| Operation | Expected Time | Notes |
|-----------|---------------|-------|
| Job creation | < 500ms | Without AI assessment |
| Photo upload | < 2s per photo | Depends on file size |
| AI assessment | 2-5s | GPT-4 Vision call |
| Geocoding | < 500ms | Google Maps API |
| Contractor notifications | Background | Doesn't block response |

### Optimizations
✅ **AI Assessment Caching**: 7-day cache reduces repeat calls
✅ **Async Notifications**: Contractor notifications run in background
✅ **Image Previews**: Client-side before upload
⚠️ **No Lazy Loading**: All form fields load upfront
⚠️ **No Code Splitting**: Large page bundle

### Recommendations
- Implement lazy loading for heavy components
- Split form steps into separate chunks
- Optimize image previews (thumbnails)
- Add skeleton loading states

---

## 📈 Success Metrics

### Completion Rate
**Target**: > 80% of users who start creating a job complete it

**Funnel**:
1. Land on `/jobs/create`: 100%
2. Complete Step 1 (Details): 90%
3. Complete Step 2 (Photos): 70% (optional step)
4. Complete Step 3 (Budget): 85%
5. Submit (Step 4): 80%

**Drop-off Points**:
- No property available: HIGH drop-off
- Photo upload errors: MEDIUM drop-off
- Budget validation: LOW drop-off

### Time to Complete
**Target**: < 5 minutes average

**Breakdown**:
- Step 1 (Details): 2 min
- Step 2 (Photos): 1 min (if uploading)
- Step 3 (Budget): 30 sec
- Step 4 (Review): 30 sec
- AI Assessment: 3-5 sec (background)

### Quality Metrics
- Jobs with photos: > 60%
- Jobs with AI assessment: > 50%
- Jobs receiving bids: > 70% (within 24 hours)
- Average bids per job: 3-5

---

## 🎯 Recommended Next Steps

### Immediate (This Week)
1. **Review UX friction points** with product team
2. **Test CSRF token flow** thoroughly
3. **Verify urgency/preferred date** - fix or remove
4. **Test property requirement** - add inline creation

### Short Term (This Month)
5. **Add form state persistence** (localStorage)
6. **Improve validation UX** (real-time feedback)
7. **Enhance AI assessment display** (confidence, rerun)
8. **Mobile responsive testing**

### Long Term (Next Quarter)
9. **A/B test photo requirement** for high-value jobs
10. **Implement smart suggestions** from AI analysis
11. **Add draft jobs** feature
12. **Build job templates** library

---

## 📞 Support & Documentation

**Test the Flow**:
1. Navigate to `/jobs/create`
2. Follow the 4-step wizard
3. Check browser console for errors
4. Verify database records created

**Debug Issues**:
- Check Network tab for API calls
- Review CSRF token in cookies and headers
- Verify Supabase Storage uploads
- Check AI assessment cache

**Related Documentation**:
- Database schema: `supabase/migrations/`
- API routes: `apps/web/app/api/jobs/`
- Services: `apps/web/lib/services/`

---

**Analysis Date**: December 13, 2024
**Status**: ✅ Functional with UX improvements recommended
**Next Review**: After UX enhancements implemented
