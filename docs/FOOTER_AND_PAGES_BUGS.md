# Footer and Pages Bug Report

**Date:** December 16, 2025  
**Scope:** Footer component and new pages (careers, press, safety, cookies)

---

## Bugs Found

### 1. Missing Navigation/Layout on New Pages
**Severity:** Medium  
**Pages Affected:** `/careers`, `/press`, `/safety`, `/cookies`

**Issue:**
- New pages don't have navigation header or footer
- Inconsistent with other public pages (about, faq, contact) which have `LandingNavigation` and `Footer2025`
- Users can't navigate back to home or other sections

**Expected:**
- All public pages should have consistent navigation and footer
- Should match the pattern used in `/about` and `/faq` pages

---

### 2. Safety Page Uses `<a>` Instead of `<Link>`
**Severity:** Low  
**File:** `apps/web/app/safety/page.tsx` line 109

**Issue:**
- Uses `<a href="/contact?subject=Safety+Concern">` instead of Next.js `<Link>`
- Causes full page reload instead of client-side navigation
- Breaks Next.js prefetching and optimization

**Fix:**
- Replace with `<Link href="/contact?subject=Safety+Concern">`

---

### 3. Contact Page Doesn't Handle Query Parameters
**Severity:** Medium  
**File:** `apps/web/app/contact/page.tsx`

**Issue:**
- Contact page doesn't read `subject` query parameter from URL
- Links from careers, press, safety pages pass `?subject=...` but it's ignored
- User has to manually type the subject again

**Expected:**
- Should use `useSearchParams()` to read `subject` parameter
- Pre-fill the subject field when navigating from other pages

---

### 4. Press Page Has Future Dates
**Severity:** Low  
**File:** `apps/web/app/press/page.tsx` lines 53, 60

**Issue:**
- Shows "December 2025" and "November 2025" news items
- Company was just founded in 2025, so these dates are in the future
- Confusing for users

**Fix:**
- Update dates to be realistic or remove specific dates
- Use relative dates like "Recently" or "This year"

---

### 5. Footer Inconsistency
**Severity:** Low  
**Files:** `apps/web/app/page.tsx` (landing page), `apps/web/app/components/landing/Footer2025.tsx`

**Issue:**
- Main landing page (`/`) uses inline footer (lines 715-810)
- Other pages use `Footer2025` component
- Two different footer implementations
- Landing page footer doesn't have newsletter subscription

**Expected:**
- Landing page should use `Footer2025` component for consistency
- Or both should have the same features

---

### 6. Missing Error Handling
**Severity:** Medium  
**Pages:** All new pages

**Issue:**
- No error boundaries
- No loading states
- No error messages if API calls fail
- Newsletter subscription doesn't show loading state properly

**Expected:**
- Add error boundaries
- Show loading states
- Handle API errors gracefully

---

### 7. Newsletter API Table May Not Exist
**Severity:** Medium  
**File:** `apps/web/app/api/newsletter/subscribe/route.ts`

**Issue:**
- API tries to use `newsletter_subscriptions` table
- Table may not exist in database
- Falls back to logging only (silent failure)
- Users think they subscribed but data isn't stored

**Expected:**
- Check if table exists or create migration
- Or use alternative storage (e.g., email service API)

---

### 8. Missing Accessibility Features
**Severity:** Low  
**Pages:** All new pages

**Issue:**
- No skip links
- No proper heading hierarchy verification
- Missing ARIA labels on some interactive elements
- Footer social links have aria-label but could be improved

---

### 9. Responsive Design Issues
**Severity:** Low  
**Pages:** All new pages

**Issue:**
- Footer grid may break on very small screens
- Newsletter form might overflow on mobile
- Trust badges might wrap awkwardly

---

### 10. Missing Metadata/SEO
**Severity:** Low  
**Pages:** All new pages

**Issue:**
- Pages have basic metadata but could be enhanced
- Missing Open Graph tags
- Missing structured data

---

## Priority Fixes

1. **HIGH:** Add navigation/layout to new pages
2. **HIGH:** Fix contact page to handle query parameters
3. **MEDIUM:** Replace `<a>` with `<Link>` in safety page
4. **MEDIUM:** Fix newsletter API to handle missing table properly
5. **LOW:** Update press page dates
6. **LOW:** Standardize footer usage
