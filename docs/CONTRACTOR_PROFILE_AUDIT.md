# Contractor Profile Page - API & Bug Audit

**Date:** December 16, 2025  
**Page:** `/contractors/[id]/page.tsx`  
**API Route:** `/api/contractors/[id]/route.ts`

---

## 🔴 CRITICAL: Missing APIs

### 1. Reviews API - NOT IMPLEMENTED
**Issue:** Reviews are using mock data instead of fetching from database.

**Current State:**
- Page uses `mockReviews` hardcoded array (lines 136-168)
- API route hardcodes `reviewCount: 0` (line 88 in route.ts)
- No API call to fetch reviews from `reviews` table

**Expected Behavior:**
- Fetch reviews from `reviews` table filtered by `contractor_id`
- Calculate actual `reviewCount` from database
- Display real review data with ratings, comments, dates

**Impact:** Users see fake reviews or "0 reviews" even when reviews exist.

---

### 2. Performance Metrics API - NOT IMPLEMENTED
**Issue:** All performance metrics are hardcoded to zero or placeholder values.

**Current State:**
- `onTimeCompletion: 0` (line 309)
- `repeatCustomers: 0` (line 310)
- `avgProjectValue: 0` (line 311)
- `acceptanceRate: 0` (line 293)
- `responseTime: '< 24 hours'` (hardcoded, line 292)

**Expected Behavior:**
- Calculate on-time completion from completed jobs with scheduled dates
- Calculate repeat customers from jobs with same homeowner_id
- Calculate average project value from completed jobs' total_amount
- Calculate acceptance rate from bids (accepted / total)
- Calculate actual response time from first bid/message timestamps

**Impact:** Performance section shows all zeros, making contractor profiles look inactive.

---

### 3. Portfolio API - NOT IMPLEMENTED
**Issue:** Portfolio uses mock data instead of fetching from database.

**Current State:**
- Page uses `mockPortfolio` hardcoded array (lines 171-202)
- No API call to fetch portfolio items

**Expected Behavior:**
- Fetch portfolio items from `contractor_portfolio` or similar table
- Display real project images, descriptions, completion dates

**Impact:** Portfolio section shows fake projects that don't exist.

---

### 4. Certifications API - NOT IMPLEMENTED
**Issue:** Certifications use mock data instead of fetching from database.

**Current State:**
- Page uses `mockCertifications` hardcoded array (lines 205-229)
- No API call to fetch certifications

**Expected Behavior:**
- Fetch certifications from `contractor_certifications` or similar table
- Display real certifications with issuer, dates, verification status

**Impact:** Certifications section shows fake credentials.

---

### 5. Favorite/Save Contractor API - NOT IMPLEMENTED
**Issue:** Favorite button only updates local state, doesn't persist to database.

**Current State:**
- `handleToggleFavorite` only calls `setIsFavorite(!isFavorite)` (line 446-448)
- No API call to save/unsave contractor
- State resets on page refresh

**Expected Behavior:**
- Call API endpoint to save contractor to favorites
- Persist favorite state in database
- Load favorite state on page mount

**Impact:** Users can't actually save contractors for later viewing.

---

### 6. Profile Completion Calculation - NOT IMPLEMENTED
**Issue:** The "Profile Completion 89%" shown in image is not calculated anywhere.

**Current State:**
- No profile completion calculation in code
- No API endpoint for profile completion
- Percentage likely hardcoded or missing entirely

**Expected Behavior:**
- Calculate completion based on required fields:
  - Bio filled
  - Company name
  - Skills added
  - Portfolio items uploaded
  - Certifications added
  - Profile image uploaded
  - Service areas set
- Return percentage from API or calculate client-side

**Impact:** Users see incorrect or missing profile completion percentage.

---

## 🟡 MEDIUM: Missing Tab Functionality

### 7. Missing Tabs Implementation
**Issue:** Image shows tabs "Company Info", "Services", "Portfolio", "Reviews", "Certifications" but code only has "overview", "portfolio", "reviews", "about".

**Current State:**
- `activeTab` only supports: `'overview' | 'portfolio' | 'reviews' | 'about'` (line 126)
- Missing: "Company Info", "Services", "Certifications" tabs

**Expected Behavior:**
- Add tabs for all sections shown in UI
- Each tab should fetch and display relevant data
- Tab switching should work smoothly

**Impact:** Users can't access all profile sections shown in the design.

---

## 🟡 MEDIUM: Data Issues

### 8. Review Count Always Zero
**Issue:** API hardcodes `reviewCount: 0` instead of counting actual reviews.

**Location:** `apps/web/app/api/contractors/[id]/route.ts` line 88

**Fix Required:**
```typescript
// Count reviews from reviews table
const { count: reviewCount } = await serverSupabase
  .from('reviews')
  .select('*', { count: 'exact', head: true })
  .eq('contractor_id', id);

reviewCount: reviewCount || 0,
```

---

### 9. About Me Placeholder Text Still Showing
**Issue:** Code filters "blalal" text (lines 297-301) but image shows it's still displaying.

**Possible Causes:**
- Filter logic might not be catching all variations
- Data might be coming from a different source
- Filter might not be applied correctly

**Fix Required:** Verify filter is working and improve placeholder detection.

---

## 🟢 LOW: Hardcoded Values

### 10. Response Time Hardcoded
**Issue:** `responseTime: '< 24 hours'` is hardcoded (line 292).

**Fix Required:** Calculate from actual first bid/message timestamps.

---

### 11. Service Area Empty
**Issue:** `serviceArea: []` is always empty (line 295).

**Fix Required:** Fetch service areas from `contractor_service_areas` table.

---

## Summary of Missing APIs

1. ✅ `/api/contractors/[id]/reviews` - Fetch contractor reviews **FIXED**
2. ✅ `/api/contractors/[id]/metrics` - Fetch performance metrics **FIXED**
3. ❌ `/api/contractors/[id]/portfolio` - Fetch portfolio items (table may not exist)
4. ❌ `/api/contractors/[id]/certifications` - Fetch certifications (table may not exist)
5. ❌ `/api/contractors/[id]/favorite` - Save/unsave contractor (POST/DELETE) (table may not exist)
6. ❌ `/api/contractors/[id]/completion` - Calculate profile completion percentage
7. ❌ `/api/contractors/[id]/service-areas` - Fetch service areas

---

## Recommended Implementation Order

1. **Priority 1:** Fix review count in main API route
2. **Priority 2:** Create reviews API endpoint
3. **Priority 3:** Create performance metrics API endpoint
4. **Priority 4:** Create portfolio API endpoint
5. **Priority 5:** Create certifications API endpoint
6. **Priority 6:** Create favorite API endpoint
7. **Priority 7:** Add profile completion calculation
8. **Priority 8:** Add missing tabs and their data fetching
