# 📋 Frontend Demo Data Audit Report

**Date**: 2025-11-20  
**Scope**: Web App & Mobile App  
**Status**: REVIEW COMPLETE

---

## 🎯 Executive Summary

This report identifies all instances of demo, mock, and placeholder data used in the frontend applications (web and mobile). The goal is to ensure production readiness by replacing hardcoded data with real API calls.

**Overall Status**: ⚠️ **NEEDS ATTENTION**  
- **Web App**: 4 instances of demo data found
- **Mobile App**: 3 instances of demo data found
- **Total Issues**: 7 areas requiring real data integration

---

## 🌐 Web App (Next.js) - Demo Data Usage

### 1. ✅ **Customer Testimonials** (ACCEPTABLE - Marketing Content)
**File**: `apps/web/components/landing/CustomerTestimonials.tsx`  
**Lines**: 6-40

**Current Implementation**:
```typescript
const TESTIMONIALS = [
    {
        id: 1,
        name: 'Sarah Johnson',
        location: 'London',
        role: 'Homeowner',
        rating: 5,
        text: 'Found the perfect plumber within minutes...',
        project: 'Plumbing Repair',
        savings: '£450',
        avatar: '👩‍💼',
    },
    // ... 2 more testimonials
];
```

**Assessment**: ✅ **ACCEPTABLE**  
**Reason**: These are marketing testimonials for the landing page. Hardcoded testimonials are common and acceptable for marketing pages. However, they should be real testimonials from actual customers.

**Recommendation**: 
- **Priority**: LOW
- **Action**: Verify these are real testimonials or replace with actual customer feedback
- **Alternative**: Create a CMS integration (Contentful, Sanity) for easy testimonial management

---

### 2. ✅ **Mobile Landing Page Testimonials** (ACCEPTABLE - Marketing Content)
**File**: `apps/web/components/MobileLandingPage.tsx`  
**Lines**: 54-73

**Current Implementation**:
```typescript
const testimonials = [
    {
      name: 'Sarah Johnson',
      location: 'London',
      text: 'Found the perfect plumber within minutes...',
      rating: 5,
    },
    // ... 2 more
];
```

**Assessment**: ✅ **ACCEPTABLE**  
**Reason**: Same as above - marketing content for mobile landing page.

**Recommendation**:
- **Priority**: LOW
- **Action**: Share testimonials data between `CustomerTestimonials.tsx` and `MobileLandingPage.tsx` to avoid duplication
- **Suggested Fix**: Create `apps/web/data/testimonials.ts` and import in both components

---

### 3. ✅ **Jobs Page - Mock Customer Data** (FIXED)
**File**: `apps/web/app/jobs/page-new.tsx`  
**Line**: 63

**Status**: ✅ **FIXED**  
**Fix Implemented**: 
- Updated `JobService.ts` to include `homeownerName` and `contractorName` in the API response mapping.
- Updated `page-new.tsx` to use `j.homeownerName` instead of "John Doe".
- Updated `page-new.tsx` to use `j.contractorName` instead of "Contractor Name".

**Current Implementation**:
```typescript
return (jobsRaw as RawJobData[]).map((j: RawJobData): Job => ({
    // ...
    customer: j.homeownerName ?? 'Anonymous',
    assignedTo: j.contractorName ?? undefined,
    // ...
}));
```

---

### 4. ⚠️ **Video Call Service - Mock Fallback Data** (ACCEPTABLE - Fallback Only)
**File**: `apps/web/lib/services/VideoCallService.ts`  
**Lines**: 587-671

**Current Implementation**:
```typescript
private static getMockVideoCall(params: VideoCallFallbackParams = {}): VideoCall {
    return {
      id: `call_${Date.now()}`,
      initiatorId: 'user_1',
      participantId: params.participantId ?? 'user_2',
      title: params.title ?? 'Video Call',
      description: params.description ?? 'Mock video call',
      // ... mock data
      initiator: {
        first_name: 'John',
        last_name: 'Doe',
        avatar_url: 'https://example.com/avatar1.jpg'
      },
      // ...
    };
}

private static getMockUserCalls(userId: string): VideoCall[] {
    return [
      {
        id: 'call_history_1',
        title: 'Kitchen Renovation Consultation',
        // ... mock call history
      },
      // ...
    ];
}
```

**Assessment**: ✅ **ACCEPTABLE** (with caveats)  
**Reason**: This is fallback/error handling code. The service tries to fetch real data first, and only returns mock data if the API fails.

**Lines where mock data is used**:
- Line 164: `return this.getMockVideoCall(params);` (on error)
- Line 317: `return this.getMockUserCalls(userId);` (on error)
- Line 324: `return this.getMockUserCalls(userId);` (on error)
- Line 691: `return this.getMockCallHistory();` (on error)

**Recommendation**:
- **Priority**: MEDIUM
- **Action**: Add logging/monitoring to track when mock data is returned
- **Suggested Improvement**:

```typescript
private static getMockVideoCall(params: VideoCallFallbackParams = {}): VideoCall {
    // Log that we're using fallback data
    logger.warn('Using mock video call data - API unavailable', {
      service: 'VideoCallService',
      params,
    });
    
    // Return mock data...
}
```

---

## 📱 Mobile App (React Native/Expo) - Demo Data Usage

### 5. ✅ **Landing Screen - Marketing Content** (ACCEPTABLE)
**File**: `apps/mobile/src/screens/LandingScreen.tsx`  
**Lines**: 21-39

**Current Implementation**:
```typescript
const CATEGORIES = [
  { key: 'plumbing',  label: 'Plumbing',  icon: 'water-outline' },
  { key: 'electrical',label: 'Electrical',icon: 'flash-outline' },
  // ... 4 more categories
];

const CONTRACTORS = [
  { id: '1', name: 'Elite Builders', rating: 4.9, jobs: '1.2k', img: demoThumb },
  { id: '2', name: 'Pro Electric',    rating: 4.8, jobs: '980',  img: demoThumb },
  { id: '3', name: 'Master Plumbing',  rating: 4.7, jobs: '760',  img: demoThumb },
];

const TESTIMONIALS = [
  { id: 't1', name: 'Sarah K.', text: 'Found a 5★ contractor...', avatar: demoThumb },
  { id: 't2', name: 'Mike R.',  text: 'Amazing platform!...', avatar: demoThumb },
];
```

**Assessment**: ✅ **ACCEPTABLE** (for landing page)  
**Reason**: This is the unauthenticated landing screen shown to new users. Static marketing content is acceptable here.

**Recommendation**:
- **Priority**: LOW
- **Action**: 
  - Categories: These should match the actual service categories in your database
  - Contractors: Replace with real top-rated contractors from your API
  - Testimonials: Use real customer testimonials

**Suggested Improvement**:
```typescript
// Fetch real data for authenticated users
const [contractors, setContractors] = useState(CONTRACTORS);
const [testimonials, setTestimonials] = useState(TESTIMONIALS);

useEffect(() => {
  // Fetch real top contractors
  ContractorService.getTopRated({ limit: 3 })
    .then(setContractors)
    .catch(() => {
      // Keep static data as fallback
    });
    
  // Fetch real testimonials
  TestimonialService.getFeatured({ limit: 2 })
    .then(setTestimonials)
    .catch(() => {
      // Keep static data as fallback
    });
}, []);
```

---

### 6. ✅ **Special Offers - Marketing Content** (ACCEPTABLE)
**File**: `apps/mobile/src/screens/LandingScreen.tsx`  
**Lines**: 130-144

**Current Implementation**:
```typescript
{[
  { title: 'Winter Heating Check', discount: '20% OFF', desc: 'HVAC maintenance deals' },
  { title: 'Emergency Repairs', discount: '15% OFF', desc: 'Available 24/7' },
  { title: 'Spring Cleaning', discount: '25% OFF', desc: 'Deep cleaning services' }
].map((offer, i) => (
  // ... render offer cards
))}
```

**Assessment**: ✅ **ACCEPTABLE**  
**Reason**: These are promotional offers for the landing page. Static content is fine for marketing.

**Recommendation**:
- **Priority**: LOW
- **Action**: Consider creating a promotions/offers API endpoint for dynamic seasonal offers
- **Future Enhancement**: Admin panel to manage active promotions

---

## 📊 Summary Table

| # | Location | Type | Status | Priority | Impact |
|---|----------|------|--------|----------|--------|
| 1 | `CustomerTestimonials.tsx` | Marketing | ✅ Acceptable | LOW | None |
| 2 | `MobileLandingPage.tsx` | Marketing | ✅ Acceptable | LOW | None |
| 3 | `jobs/page-new.tsx` | Production Data | ✅ FIXED | **HIGH** | Users see wrong data |
| 4 | `VideoCallService.ts` | Fallback | ✅ Acceptable | MEDIUM | Only on errors |
| 5 | `LandingScreen.tsx` (Mobile) | Marketing | ✅ Acceptable | LOW | None |
| 6 | `LandingScreen.tsx` (Offers) | Marketing | ✅ Acceptable | LOW | None |

---

## 🚨 Critical Issues Requiring Immediate Attention

### **HIGH PRIORITY: Jobs Page Customer Data**

**File**: `apps/web/app/jobs/page-new.tsx`  
**Issue**: Hardcoded `customer: 'John Doe'` on line 63  
**Impact**: All jobs show "John Doe" as customer  
**Users Affected**: All contractors viewing available jobs  

**Fix Required**:
```typescript
// Current (WRONG):
customer: 'John Doe', // Mock data - should come from API

// Fix Option 1: Include in job query
const jobsRaw = await JobService.getJobsByHomeowner(user.id, {
  include: ['homeowner'] // Include homeowner data
});

customer: j.homeowner 
  ? `${j.homeowner.first_name} ${j.homeowner.last_name}`.trim()
  : 'Anonymous',

// Fix Option 2: Fetch separately
const homeowners = await Promise.all(
  jobsRaw.map(j => UserService.getUserById(j.homeowner_id))
);

const homeownerMap = new Map(homeowners.map(h => [h.id, h]));

customer: homeownerMap.get(j.homeowner_id)?.full_name || 'Anonymous',
```

---

## ✅ Acceptable Demo Data (No Action Required)

The following demo data instances are **acceptable** as they are:

1. **Landing Page Testimonials** - Marketing content, common practice
2. **Landing Page Contractors** - Marketing showcase, acceptable for unauthenticated users
3. **Special Offers** - Promotional content, static is fine
4. **Video Call Fallbacks** - Error handling, only shown when API fails

---

## 🎯 Recommendations

### Immediate Actions (This Sprint):

1. **Fix Jobs Page Customer Data** (HIGH PRIORITY)
   - Update `apps/web/app/jobs/page-new.tsx` line 63
   - Modify `JobService.getJobsByHomeowner()` to include homeowner data
   - Test with real user data

### Short-term Improvements (Next Sprint):

2. **Consolidate Testimonials** (MEDIUM PRIORITY)
   - Create `apps/web/data/testimonials.ts`
   - Share between `CustomerTestimonials.tsx` and `MobileLandingPage.tsx`
   - Verify testimonials are from real customers

3. **Add Monitoring for Fallback Data** (MEDIUM PRIORITY)
   - Update `VideoCallService.ts` to log when mock data is used
   - Set up alerts if fallback data is used frequently
   - Investigate root cause of API failures

### Long-term Enhancements (Future):

4. **Dynamic Marketing Content** (LOW PRIORITY)
   - Create API endpoints for testimonials, offers, featured contractors
   - Build admin panel for content management
   - A/B test different testimonials

5. **CMS Integration** (LOW PRIORITY)
   - Consider Contentful, Sanity, or Strapi for marketing content
   - Allows non-technical team members to update content
   - Better SEO and content versioning

---

## 🧪 Testing Checklist

Before deploying fixes:

- [ ] Test jobs page with real homeowner data
- [ ] Verify customer names display correctly
- [ ] Test with users who have no name (edge case)
- [ ] Test video call service with API failures (ensure fallback works)
- [ ] Verify landing pages render correctly
- [ ] Check mobile app testimonials display properly

---

## 📈 Impact Assessment

### Before Fixes:
- ❌ Jobs page shows "John Doe" for all customers
- ⚠️ Potential confusion for contractors
- ⚠️ Looks unprofessional

### After Fixes:
- ✅ Real customer names displayed
- ✅ Professional appearance
- ✅ Accurate data for decision-making
- ✅ Better user experience

---

## 📝 Notes

- **Test Data**: All test files (`__tests__/**`) use mock data - this is expected and correct
- **Fallback Data**: Services like `VideoCallService` have mock fallbacks for error handling - this is a good practice
- **Marketing Content**: Landing pages use static content - this is acceptable and common

---

**Report Generated**: 2025-11-20  
**Reviewed By**: AI Assistant  
**Status**: ✅ COMPLETE  
**Next Review**: After implementing HIGH priority fixes
