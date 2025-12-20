# Contractor Verification System - Testing Guide

## ✅ TypeScript Compilation Status

All components and API endpoints successfully pass TypeScript type checking:

```bash
✅ components/contractor/DBSCheckModal.tsx - No errors
✅ components/contractor/PersonalityTestModal.tsx - No errors
✅ components/contractor/ProfileBoostWidget.tsx - No errors
✅ components/contractor/VerificationBadges.tsx - No errors (existing)
✅ components/contractor/ProfileBoostMeter.tsx - No errors (existing)
✅ app/api/contractor/dbs-check/route.ts - No errors
✅ app/api/contractor/personality-assessment/route.ts - No errors
✅ app/api/contractor/profile-boost/route.ts - No errors
✅ app/test-verification/page.tsx - No errors
```

---

## 🧪 Test Page Location

**URL**: `/test-verification`

A dedicated test page has been created at:
- **File**: `apps/web/app/test-verification/page.tsx`
- **Route**: `http://localhost:3000/test-verification`

This page allows you to:
1. Test DBS Check Modal (all 3 levels)
2. Test Personality Test Modal (50-question interface)
3. View Profile Boost Widget (live API integration)
4. View Verification Badges in different layouts
5. View Profile Boost Meter in all 4 tiers

---

## 📋 Testing Checklist

### 1. Component Rendering Tests

#### DBS Check Modal
- [ ] Modal opens when clicking "Test DBS Check Modal"
- [ ] Displays all 3 DBS options (Basic, Standard, Enhanced)
- [ ] Enhanced option shows "MOST POPULAR" badge
- [ ] Prices display correctly (£23, £26, £50)
- [ ] Boost percentages display correctly (+10%, +15%, +25%)
- [ ] Feature lists render for each option
- [ ] Selection state changes when clicking options
- [ ] Confirmation step shows selected level
- [ ] Provider selection works (advanced option)
- [ ] Back button works from confirmation
- [ ] Close button works (X icon)
- [ ] Cannot close during processing step
- [ ] Success screen displays after API response
- [ ] onSuccess callback triggers

#### Personality Test Modal
- [ ] Modal opens when clicking "Test Personality Modal"
- [ ] Intro screen displays correctly
- [ ] "Start Assessment" button works
- [ ] Questions load from API
- [ ] Progress bar updates (X/50)
- [ ] All 5 scale options display (Strongly Disagree → Strongly Agree)
- [ ] Selection highlights chosen option
- [ ] "Next" button disabled until answer selected
- [ ] "Previous" button works (except on first question)
- [ ] Question index updates correctly
- [ ] Last question shows "Submit" instead of "Next"
- [ ] Processing screen displays during submission
- [ ] Results screen shows all 5 Big Five traits
- [ ] Progress bars animate for trait scores
- [ ] Job recommendations display
- [ ] Profile boost percentage shows
- [ ] onSuccess callback triggers after 5 seconds

#### Profile Boost Widget
- [ ] Widget displays on page load
- [ ] Fetches data from `/api/contractor/profile-boost`
- [ ] Shows current ranking score (0-100)
- [ ] Displays tier badge (Standard/Verified/Premium/Elite)
- [ ] Progress bar animates to correct percentage
- [ ] Active boosts list shows all earned boosts
- [ ] Missing verifications section displays top 3 recommendations
- [ ] Priority badges show (High/Medium/Low Impact)
- [ ] Potential boost amounts display (+X%)
- [ ] Action buttons work:
  - [ ] "Complete DBS Check" opens DBS modal
  - [ ] "Take Personality Test" opens Personality modal
  - [ ] Other buttons redirect to correct pages
- [ ] Potential score calculation shows (current → max)
- [ ] Widget refreshes after modal success
- [ ] Fully maxed celebration displays when score ≥95

#### Verification Badges
- [ ] Horizontal layout renders correctly
- [ ] Grid layout renders correctly
- [ ] Vertical layout renders correctly
- [ ] Badge icons display (Shield, Brain, CheckCircle, etc.)
- [ ] Verified badges show checkmarks
- [ ] Unverified badges show lock icons
- [ ] DBS level displays (Basic/Standard/Enhanced)
- [ ] Personality score displays (0-100)
- [ ] Color coding is correct per verification type

#### Profile Boost Meter
- [ ] Standard tier (0-39) displays correctly
- [ ] Verified tier (40-59) displays correctly
- [ ] Premium tier (60-79) displays correctly
- [ ] Elite tier (80-100) displays correctly
- [ ] Progress bar animates smoothly
- [ ] Total boost percentage displays
- [ ] "Points to next tier" calculation is accurate
- [ ] Tier badge shows correct icon and color

---

## 🔌 API Integration Tests

### Prerequisites
Before testing API integration, ensure:
1. Supabase local instance is running (`npx supabase start`)
2. Migrations have been applied (`npx supabase db diff --local`)
3. User is authenticated as a contractor
4. Database has required tables:
   - `contractor_dbs_checks`
   - `contractor_personality_assessments`
   - `contractor_profile_boosts`
   - `personality_assessment_questions`

### API Endpoint Tests

#### 1. DBS Check API (`/api/contractor/dbs-check`)

**Test POST - Initiate DBS Check**:
```bash
curl -X POST http://localhost:3000/api/contractor/dbs-check \
  -H "Content-Type: application/json" \
  -d '{
    "dbsType": "enhanced",
    "provider": "dbs_online"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "checkId": "uuid-here",
  "status": "initiated",
  "message": "DBS check initiated successfully. You will receive an email from the provider."
}
```

**Test GET - Check DBS Status**:
```bash
curl http://localhost:3000/api/contractor/dbs-check
```

**Expected Response**:
```json
{
  "hasActiveCheck": true,
  "currentCheck": {
    "id": "uuid",
    "dbs_type": "enhanced",
    "status": "pending",
    "initiated_at": "2024-01-01T00:00:00Z"
  }
}
```

#### 2. Personality Assessment API (`/api/contractor/personality-assessment`)

**Test GET - Fetch Questions**:
```bash
curl http://localhost:3000/api/contractor/personality-assessment
```

**Expected Response** (if not completed):
```json
{
  "questions": [
    {
      "id": "uuid",
      "text": "I am always prepared",
      "trait": "conscientiousness",
      "category": "reliability",
      "reverse_scored": false
    }
    // ... 49 more questions
  ]
}
```

**Expected Response** (if already completed):
```json
{
  "alreadyCompleted": true,
  "result": {
    "openness": 75,
    "conscientiousness": 85,
    "extraversion": 60,
    "agreeableness": 90,
    "neuroticism": 35,
    "jobRecommendations": ["Plumbing", "Electrical"],
    "profileBoost": 15
  }
}
```

**Test POST - Submit Assessment**:
```bash
curl -X POST http://localhost:3000/api/contractor/personality-assessment \
  -H "Content-Type: application/json" \
  -d '{
    "answers": [
      {"questionId": "uuid-1", "answer": 5},
      {"questionId": "uuid-2", "answer": 4}
      // ... 48 more answers (total 50)
    ],
    "timeTakenMinutes": 12
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "result": {
    "openness": 72,
    "conscientiousness": 88,
    "extraversion": 55,
    "agreeableness": 85,
    "neuroticism": 30,
    "jobRecommendations": ["Carpentry", "General Maintenance"],
    "profileBoost": 15
  }
}
```

#### 3. Profile Boost API (`/api/contractor/profile-boost`)

**Test GET - Fetch Boost Data**:
```bash
curl http://localhost:3000/api/contractor/profile-boost
```

**Expected Response**:
```json
{
  "boost": {
    "baseTrustScore": 0.5,
    "boosts": {
      "dbs_check": 25,
      "personality_assessment": 15,
      "admin_verified": 10,
      "phone_verified": 3,
      "email_verified": 2,
      "portfolio_completeness": 5,
      "certifications": 0,
      "insurance_verified": 0
    },
    "totalBoostPercentage": 60,
    "rankingScore": 85,
    "tier": "elite"
  },
  "missingVerifications": [
    {
      "type": "certifications",
      "label": "Professional Certifications",
      "description": "Upload trade certifications",
      "potentialBoost": 10,
      "priority": "medium",
      "actionLabel": "Upload Certifications"
    }
  ]
}
```

---

## 🎯 Manual Testing Scenarios

### Scenario 1: New Contractor Completes DBS Check

1. Navigate to `/test-verification`
2. Click "Test DBS Check Modal"
3. Select "Enhanced DBS Check" (£50, +25%)
4. Click "Continue"
5. Confirm selection
6. Wait for processing
7. Verify success message displays
8. Verify toast notification appears
9. Check database:
   ```sql
   SELECT * FROM contractor_dbs_checks WHERE contractor_id = 'your-user-id';
   ```
10. Expected: New row with `status = 'pending'`, `dbs_type = 'enhanced'`

### Scenario 2: Contractor Completes Personality Test

1. Navigate to `/test-verification`
2. Click "Test Personality Modal"
3. Click "Start Assessment"
4. Answer all 50 questions (use different values)
5. Verify progress bar updates (1/50 → 50/50)
6. Click "Submit" on last question
7. Wait for processing
8. Verify results display with 5 trait scores
9. Verify job recommendations appear
10. Verify profile boost shows (+3% to +15%)
11. Check database:
    ```sql
    SELECT * FROM contractor_personality_assessments WHERE contractor_id = 'your-user-id';
    ```
12. Expected: New row with all 5 scores and boost percentage

### Scenario 3: Profile Boost Widget Updates After Verification

1. Note current ranking score in widget
2. Complete DBS check (if not done)
3. Observe widget refresh automatically
4. Verify ranking score increased by boost amount
5. Verify "DBS Check" appears in Active Boosts
6. Verify "DBS Check" removed from Missing Verifications
7. Verify tier badge updates if score crosses threshold (40, 60, 80)

### Scenario 4: Attempt Duplicate Verification

1. Complete personality test once
2. Try to open personality modal again
3. Expected: Modal skips to results screen immediately
4. Shows previously calculated scores
5. Does not allow retaking assessment

---

## 🐛 Known Issues & Edge Cases

### Fixed Issues ✅
- ✅ ProfileBoostWidget props mismatch (fixed: now passes correct props to ProfileBoostMeter)
- ✅ DBSCheckModal missing `recommended` property on basic/standard options (fixed: added `recommended: false`)
- ✅ Test page using invalid layout prop "inline" (fixed: changed to "horizontal")

### Edge Cases to Test

1. **Unauthenticated User**:
   - Expected: API endpoints return 401 Unauthorized
   - Widget shows error state

2. **Non-Contractor User** (Homeowner logged in):
   - Expected: API endpoints return 403 Forbidden
   - Components show "Contractor only" message

3. **Network Failure**:
   - Expected: Toast error notification
   - Modal returns to previous step
   - Widget shows error state

4. **Incomplete Personality Test** (< 50 answers):
   - Expected: API returns 400 Bad Request
   - Error message: "Exactly 50 answers required"

5. **Invalid Answer Values** (not 1-5):
   - Expected: Zod validation error
   - Error message: "Answer must be between 1 and 5"

6. **DBS Check Already Active**:
   - Expected: API returns error
   - Message: "You already have an active DBS check"

7. **Database Connection Failure**:
   - Expected: 500 Internal Server Error
   - User-friendly error message displayed

---

## 📊 Performance Benchmarks

### Component Load Times (Expected)
- DBS Check Modal: < 100ms initial render
- Personality Test Modal: < 300ms (includes API fetch of 50 questions)
- Profile Boost Widget: < 500ms (includes API fetch of boost data)
- Verification Badges: < 50ms
- Profile Boost Meter: < 50ms

### API Response Times (Expected)
- POST `/api/contractor/dbs-check`: < 200ms
- GET `/api/contractor/personality-assessment`: < 300ms (50 questions)
- POST `/api/contractor/personality-assessment`: < 500ms (calculations)
- GET `/api/contractor/profile-boost`: < 400ms (multiple joins)

### Animation Performance
- Progress bar animations: 60fps
- Modal transitions: Smooth (Framer Motion)
- No layout shifts during data loading

---

## 🚀 Running Tests

### Start Development Server
```bash
npm run dev
```

### Navigate to Test Page
```
http://localhost:3000/test-verification
```

### Open Browser Console
Check for:
- No console errors
- API request/response logs
- Component mount/unmount logs

### Check Database State
```bash
npx supabase db diff --local
psql -h localhost -p 54322 -d postgres -U postgres
```

Then run:
```sql
-- Check DBS checks
SELECT * FROM contractor_dbs_checks;

-- Check personality assessments
SELECT * FROM contractor_personality_assessments;

-- Check profile boosts
SELECT * FROM contractor_profile_boosts;

-- Check questions seed data
SELECT COUNT(*) FROM personality_assessment_questions; -- Should be 50
```

---

## 📝 Test Report Template

```markdown
## Test Report - [Date]

### Environment
- Browser: [Chrome/Firefox/Safari]
- OS: [Windows/Mac/Linux]
- Node Version: [18.x]
- Database: [Supabase local]

### Components Tested
- [ ] DBS Check Modal
- [ ] Personality Test Modal
- [ ] Profile Boost Widget
- [ ] Verification Badges
- [ ] Profile Boost Meter

### API Endpoints Tested
- [ ] POST /api/contractor/dbs-check
- [ ] GET /api/contractor/dbs-check
- [ ] GET /api/contractor/personality-assessment
- [ ] POST /api/contractor/personality-assessment
- [ ] GET /api/contractor/profile-boost

### Issues Found
1. [Issue description]
   - Severity: [High/Medium/Low]
   - Steps to reproduce: [...]
   - Expected: [...]
   - Actual: [...]

### Screenshots
[Attach screenshots of modals, widgets, etc.]

### Performance
- Average API response time: [X ms]
- Component load time: [X ms]
- Animation FPS: [X fps]

### Conclusion
[Overall assessment of system readiness]
```

---

## ✅ Sign-Off Checklist

Before deploying to production:

### Code Quality
- [x] All TypeScript errors resolved
- [x] All components use proper TypeScript types
- [x] Error handling implemented in all API routes
- [x] Loading states implemented in all modals
- [x] Success/error feedback via toast notifications

### Database
- [ ] Migrations applied to production
- [ ] Seed data loaded (50 personality questions)
- [ ] RLS policies tested and working
- [ ] Indexes created for performance

### Security
- [ ] CSRF protection enabled on all POST routes
- [ ] Role-based access control verified
- [ ] User can only access own verification data
- [ ] Sensitive data encrypted in database

### UX/UI
- [ ] All modals tested on mobile
- [ ] Animations smooth on slower devices
- [ ] Error messages user-friendly
- [ ] Loading states prevent duplicate submissions

### Documentation
- [x] API endpoints documented
- [x] Component props documented
- [x] Integration examples provided
- [x] Testing guide created

---

## 🎓 Next Steps

After successful testing:

1. **Integrate into Contractor Onboarding**:
   - Add verification steps after initial signup
   - Show progress indicator (Step 1/3: DBS, Step 2/3: Personality, etc.)

2. **Add to Contractor Dashboard**:
   - Place ProfileBoostWidget in sidebar
   - Show persistent notification for incomplete verifications

3. **Update Search Algorithm**:
   - Sort contractors by `ranking_score`
   - Filter by tier (Elite, Premium, Verified)
   - Boost search results for verified contractors

4. **Setup Email Notifications**:
   - DBS expiry reminder (30 days before)
   - Verification incomplete reminder (weekly)
   - Achievement unlocked (new tier reached)

5. **Mobile App Integration**:
   - Port components to React Native
   - Add push notifications for verification status
   - Sync boost data across web and mobile

---

## 📞 Support

For issues or questions:
- Check console for error messages
- Review API response in Network tab
- Check database state with SQL queries
- Review component props in React DevTools

**Test page URL**: `/test-verification`
**API base**: `/api/contractor/*`
