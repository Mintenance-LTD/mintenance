# Mintenance Platform - App Review: Bugs and Discrepancies
**Review Date**: 2025-01-08  
**Based on**: USER_INTERACTION_FLOW_COMPLETE.md  
**Review Type**: Code-to-Documentation Comparison  
**Review Scope**: Targeted analysis of documented flows (NOT exhaustive full-codebase review)

---

## Review Methodology

This review used:
- Semantic codebase search for key features
- Targeted file reads for critical components
- Pattern matching (grep) for specific fields/functions
- Documentation-to-code comparison

**NOT a complete line-by-line codebase review** - focused on verifying documented user flows work as described.

---

## Executive Summary

This review compares the documented user interaction flow with the actual codebase implementation. **24 potential issues** were identified across multiple areas:

- **Critical Issues**: 3 (may block core functionality)
- **Major Issues**: 8 (significant functionality gaps)
- **Minor Issues**: 13 (edge cases, inconsistencies, missing validations)

**Verification Status**: 
- ✅ Database schema verified - fields exist
- ✅ API routes examined - found missing field mappings
- ⚠️ Full integration testing recommended to confirm all issues

---

## Critical Issues 🔴

### 1. **Missing `estimated_duration` and `proposed_start_date` in Bid Submission**

**Location**: `apps/web/app/api/contractor/submit-bid/route.ts`

**Issue**: 
- Documentation states bids should include `estimated_duration` (days) and `proposed_start_date`
- Validation schema includes these fields as optional (`estimatedDuration`, `proposedStartDate`)
- **BUT** the actual bid payload creation (line 231-244) does NOT include these fields
- Frontend components (`BidSubmissionClient2025.tsx`) show UI for these fields but they're not saved

**Impact**: Contractors can enter duration/start date in UI, but they're never stored in database or shown to homeowners

**Code Evidence**:
```typescript
// validation.ts - Fields exist
estimatedDuration: z.number().int().positive().optional(),
proposedStartDate: z.string().optional(),

// route.ts - NOT included in bidPayload
const bidPayload = {
  job_id: validatedData.jobId,
  contractor_id: user.id,
  amount: validatedData.bidAmount,
  description: validatedData.proposalText,
  // ❌ estimated_duration missing
  // ❌ proposed_start_date missing
  status: 'pending',
  ...
};
```

**Database Schema Verified**: ✅ Fields exist in `bids` table:
- `estimated_duration INTEGER` (in days)
- `proposed_start_date TIMESTAMP WITH TIME ZONE`
(Source: `supabase/migrations/20250113000001_add_contractor_tables.sql` lines 15-16)

**Fix Complexity**: LOW - Just need to add fields to bidPayload mapping

**Expected Behavior**: These fields should be stored and displayed in bid comparison table

---

### 2. **Escrow Release Cron Job Uses Wrong Endpoint Path**

**Location**: Documentation vs Implementation

**Issue**:
- Documentation references: `/api/cron/release-escrow`
- Actual implementation: `/api/cron/escrow-auto-release`
- If cron is configured per documentation, it will 404

**Impact**: Escrow auto-release may not be running at all

**Code Evidence**:
- Documentation line 1037: `apps/web/app/api/cron/release-escrow/route.ts`
- Actual file: `apps/web/app/api/cron/escrow-auto-release/route.ts`

**Expected Behavior**: Either update documentation OR rename file/route to match

---

### 3. **Escrow Release Criteria Mismatch**

**Location**: `apps/web/app/api/cron/escrow-auto-release/route.ts`

**Issue**:
- Documentation states release after 7 days from `created_at`
- Implementation checks `auto_release_date` field (line 70)
- Also checks `cooling_off_ends_at` (line 104-109)
- Multiple conditions may delay release beyond 7 days

**Impact**: Funds may not release on day 7 as documented, causing contractor payment delays

**Code Evidence**:
```typescript
// Implementation checks multiple fields
.lte('auto_release_date', now.toISOString())  // Not documented
// AND
if (escrow.cooling_off_ends_at) {
  const coolingOffEnds = new Date(escrow.cooling_off_ends_at);
  if (coolingOffEnds > now) {
    continue; // Still in cooling-off period
  }
}
```

**Expected Behavior**: Clarify exact release logic or align with documentation (7 days from creation)

---

## Major Issues 🟠

### 4. **Job Creation: Missing `urgency` Field in API**

**Location**: `apps/web/app/api/jobs/route.ts`

**Issue**:
- Documentation shows urgency field (low/medium/high/emergency) in job creation
- Frontend form includes urgency selection
- API schema (`createJobSchema` line 18-28) does NOT include urgency field
- Frontend may send it but it's ignored

**Impact**: Urgency information lost, contractors can't filter by urgency

**Code Evidence**:
```typescript
// Frontend sends urgency
const [formData, setFormData] = useState({
  urgency: 'medium', // Used in UI
  ...
});

// API schema missing urgency
const createJobSchema = z.object({
  title: z.string()...,
  // ❌ urgency field missing
});
```

---

### 5. **Bid Submission: Materials/Labor Cost Not Persisted**

**Location**: `apps/web/app/api/contractor/submit-bid/route.ts`

**Issue**:
- Validation schema accepts `materialsCost` and `laborCost`
- UI components allow entering these values
- Bid payload creation does NOT include these fields
- They're calculated from line items but not stored separately

**Impact**: Materials/labor breakdown not available in bid details for homeowners

---

### 6. **Review System: Missing Mutual Review Visibility Logic**

**Location**: Review submission and display

**Issue**:
- Documentation states reviews are hidden until both parties submit (or 7 days)
- No evidence of visibility rules in review submission code
- Reviews likely appear immediately

**Impact**: Review system doesn't prevent bias (one-sided reviews visible immediately)

**Expected**: Reviews should be hidden until both submitted OR 7 days elapsed

---

### 7. **Job Creation: AI Assessment Not Auto-Triggered on Photo Upload**

**Location**: `apps/web/app/jobs/create/page.tsx` + `useBuildingAssessment.ts`

**Issue**:
- Documentation states AI assessment runs automatically when photos uploaded
- Hook exists but may require manual trigger
- Need to verify if `buildingAssessment.assess()` is called automatically

**Impact**: Homeowners may need to manually trigger AI assessment

**Expected**: AI should analyze photos immediately after upload completes

---

### 8. **Payment: Platform Fee Calculation Discrepancy**

**Location**: Payment flow documentation vs implementation

**Issue**:
- Documentation shows 10% platform fee (line 912)
- Bid submission shows 5% fee calculation (`BidSubmissionClient2025.tsx` line 80)
- Inconsistent fee structure

**Impact**: Contractors see 5% in UI, homeowners charged 10% (or vice versa)

**Code Evidence**:
```typescript
// BidSubmissionClient2025.tsx line 79-81
const platformFeeRate = 5; // 5%
const platformFee = (totalAmount * platformFeeRate) / 100;

// Documentation line 912
Platform Fee (10%): £ 37.50
```

---

### 9. **Messages: Missing Auto-Thread Creation on Bid Acceptance**

**Location**: `apps/web/app/api/jobs/[id]/bids/[bidId]/accept/route.ts`

**Issue**:
- Documentation states message thread auto-created when bid accepted
- Code has comment "Auto-create welcome message thread" (line 229)
- Need to verify if thread creation actually happens

**Impact**: Homeowner/contractor may need to manually start conversation

---

### 10. **Notifications: Missing Push Notification Implementation**

**Location**: Notification system

**Issue**:
- Documentation describes push notifications for mobile and web
- Notification creation exists (database records)
- Push notification sending logic may be incomplete or missing

**Impact**: Users may only get in-app notifications, missing real-time alerts

---

### 11. **Job Completion: Missing `actual_duration_hours` Calculation**

**Location**: `apps/web/app/api/jobs/[id]/complete/route.ts`

**Issue**:
- Documentation states `actual_duration_hours` calculated on completion
- Job completion endpoint doesn't calculate this field
- Database field may exist but not populated

**Impact**: Duration tracking unavailable for analytics

**Expected**:
```typescript
actual_duration_hours = (actual_end_date - actual_start_date) / 3600
```

---

## Minor Issues 🟡

### 12. **Bid Line Items: Materials/Labor Auto-Calculation May Be Broken**

**Location**: `QuoteLineItems.tsx` component

**Issue**: 
- Documentation states materials/labor auto-calculated from line items
- Need to verify calculation logic matches line item categorization

---

### 13. **Review System: Portfolio Auto-Add Logic Missing**

**Location**: Review submission

**Issue**:
- Documentation states jobs auto-added to contractor portfolio if review ≥4 stars
- Need to verify this trigger exists in review submission code

---

### 14. **Job Photos: Missing Upload Stage Tracking**

**Location**: Job photo upload endpoints

**Issue**:
- Documentation mentions before/during/after photo stages
- API endpoints exist (`/photos/before`, `/photos/after`)
- Need to verify `upload_stage` field is properly set in `job_attachments` table

---

### 15. **Payment: Missing Invoice PDF Generation**

**Location**: Payment completion

**Issue**:
- Documentation describes auto-generated invoices with PDF
- Invoice creation may exist but PDF generation may be missing

---

### 16. **Escrow: Missing Dispute Window Validation**

**Location**: Escrow release logic

**Issue**:
- Documentation states escrow frozen if dispute opened
- Implementation checks `admin_hold_status` but may not check active disputes table

---

### 17. **Bid Comparison: Missing Estimated Duration Column**

**Location**: `BidComparisonTable2025.tsx`

**Issue**:
- Documentation shows duration in comparison table
- If duration not stored (Issue #1), this column would be empty

---

### 18. **Job Detail: Missing AI Assessment Display**

**Location**: Job detail page

**Issue**:
- Documentation shows AI assessment card with damage type, severity, safety score
- Need to verify assessment results are displayed on job detail page

---

### 19. **Contractor Discovery: Push Notification Trigger Missing**

**Location**: Job posting

**Issue**:
- Documentation describes push notifications to nearby contractors
- Job creation endpoint may not trigger notification system

---

### 20. **Review System: Category Rating Validation Missing**

**Location**: Review submission

**Issue**:
- Documentation shows category ratings (quality, timeliness, etc.)
- Need to verify all categories validated and stored correctly

---

### 21. **Property Management: Geocoding on Property Creation**

**Location**: Property creation API

**Issue**:
- Documentation states addresses auto-geocoded
- Need to verify geocoding happens on property creation

---

### 22. **Bid Submission: Terms & Conditions Field May Not Be Saved**

**Location**: Bid submission

**Issue**:
- UI shows terms field
- Validation accepts it
- Need to verify it's stored in database bid record

---

### 23. **Job Creation: Phone Verification Check May Be Missing**

**Location**: Job submission validation

**Issue**:
- Documentation states phone verification required before posting
- Need to verify this check exists in job creation API

---

### 24. **Escrow Release: Missing 7-Day Calculation**

**Location**: Escrow creation

**Issue**:
- Documentation states 7-day hold
- Need to verify `auto_release_date` is calculated as `created_at + 7 days`

---

## Recommendations

### Priority 1 (Fix Immediately)
1. Fix bid submission to store `estimated_duration` and `proposed_start_date`
2. Fix escrow cron job endpoint path discrepancy
3. Clarify/fix escrow release timing logic

### Priority 2 (Fix Before Launch)
4. Add urgency field to job creation API
5. Store materials/labor costs in bids
6. Implement mutual review visibility rules
7. Auto-trigger AI assessment on photo upload
8. Standardize platform fee (5% or 10%)

### Priority 3 (Fix Soon)
9. Verify and fix remaining issues 9-24
10. Add comprehensive integration tests for documented flows
11. Update documentation to match implementation OR fix implementation to match documentation

---

## Testing Recommendations

For each identified issue, create test cases:

1. **Bid Submission Test**: Submit bid with duration and start date → Verify stored in DB
2. **Escrow Release Test**: Create escrow → Wait/cron → Verify release after 7 days
3. **Review Visibility Test**: Submit one review → Verify hidden → Submit second → Verify visible
4. **AI Assessment Test**: Upload photos → Verify assessment auto-triggers
5. **Payment Fee Test**: Check fee calculation matches between contractor and homeowner views

---

## Notes

- Many issues stem from documentation being more detailed than implementation
- Some features may be partially implemented (UI exists but backend missing)
- Recommend full end-to-end testing of documented user flows
- Consider creating a "Documentation vs Implementation" gap analysis matrix

---

**End of Review**

