# Footer Links Security Audit

**Date:** December 16, 2025  
**Scope:** All footer links and their associated API endpoints

---

## Security Issues Found

### 🔴 CRITICAL: Token Blacklist Not Checked in Middleware

**Issue:** The middleware verifies JWT tokens but does NOT check if the token has been blacklisted after logout.

**Location:** `apps/web/middleware.ts` lines 103-125

**Impact:** 
- User logs out → token is blacklisted
- User navigates to any protected route via footer link
- Middleware verifies JWT signature (valid) but doesn't check blacklist
- User can still access protected routes after logout
- **SECURITY VULNERABILITY: Session persists after logout**

**Current Code:**
```typescript
// Line 107: Only verifies JWT signature, doesn't check blacklist
jwtPayload = await verifyJWT(token, jwtSecret);
```

**Fix Required:** Add blacklist check before allowing access:
```typescript
// Check if token is blacklisted
const isBlacklisted = await tokenBlacklist.isTokenBlacklisted(token);
if (isBlacklisted) {
  return redirectToLogin(request);
}
```

---

### 🟡 MEDIUM: Newsletter API Missing CSRF Protection

**Issue:** Newsletter subscription API doesn't require CSRF token validation.

**Location:** `apps/web/app/api/newsletter/subscribe/route.ts` line 15

**Impact:**
- CSRF attacks can subscribe users without their consent
- No protection against cross-site request forgery

**Current Code:**
```typescript
export async function POST(request: NextRequest) {
  // No CSRF check!
  const body = await request.json();
```

**Fix Required:** Add CSRF protection:
```typescript
await requireCSRF(request);
```

---

### 🟡 MEDIUM: Protected Routes Accessible After Logout

**Routes Affected:**
- `/jobs/create` - Requires authentication but middleware doesn't check blacklist
- `/contractor/discover` - Requires authentication but middleware doesn't check blacklist
- `/contractor/resources` - Requires authentication but middleware doesn't check blacklist
- `/contractor/subscription` - Requires authentication but middleware doesn't check blacklist
- `/contractor/verification` - Requires authentication but middleware doesn't check blacklist

**Impact:** Users can access these routes after logout if they have a valid (but blacklisted) token in cookies.

---

### 🟢 LOW: Public Routes (No Security Issues)

**Safe Routes:**
- `/about`, `/blog`, `/careers`, `/contact`, `/press` - Public pages, no API calls
- `/safety`, `/cookies`, `/faq` - Public pages, no API calls
- `/terms`, `/privacy` - Public pages, no API calls
- `/contractors` - Public listing page
- `/how-it-works`, `/pricing`, `/ai-search` - Public pages
- `/register?role=contractor` - Public registration page

**Status:** ✅ No security issues found

---

### 🟢 LOW: Social Media Links

**Links:**
- Facebook, Twitter, Instagram, LinkedIn

**Status:** ✅ External links with `target="_blank"` and `rel="noopener noreferrer"` - Secure

---

## API Endpoints Called by Footer Links

### 1. Newsletter Subscription
- **Endpoint:** `/api/newsletter/subscribe`
- **Method:** POST
- **Security Issues:**
  - ❌ Missing CSRF protection
  - ✅ Rate limiting present
  - ✅ Input validation present

### 2. Jobs Creation (via `/jobs/create`)
- **Endpoint:** `/api/jobs` (POST)
- **Method:** POST
- **Security Issues:**
  - ✅ CSRF protection present
  - ✅ Authentication required
  - ✅ Input validation present
  - ❌ Token blacklist not checked (middleware issue)

### 3. Contractor Discover (via `/contractor/discover`)
- **Endpoint:** Server-side data fetching
- **Security Issues:**
  - ✅ Authentication required (page level)
  - ❌ Token blacklist not checked (middleware issue)

---

## Recommended Fixes

### Priority 1: CRITICAL - Add Token Blacklist Check to Middleware

```typescript
// In apps/web/middleware.ts, after JWT verification:

// Check if token is blacklisted
const isBlacklisted = await tokenBlacklist.isTokenBlacklisted(token);
if (isBlacklisted) {
  logger.warn('Blacklisted token attempt', {
    service: 'middleware',
    pathname,
  });
  return redirectToLogin(request);
}
```

### Priority 2: MEDIUM - Add CSRF to Newsletter API

```typescript
// In apps/web/app/api/newsletter/subscribe/route.ts:

export async function POST(request: NextRequest) {
  try {
    // Add CSRF protection
    await requireCSRF(request);
    
    // ... rest of code
  }
}
```

---

## Additional Issues Found

### 🟡 MEDIUM: Incorrect Footer Link

**Issue:** Footer link "Browse Jobs" points to `/discover` but should point to `/contractor/discover`

**Location:** `apps/web/app/components/landing/Footer2025.tsx` line 20

**Impact:**
- Contractors clicking "Browse Jobs" go to wrong page
- `/discover` may be a homeowner page or non-existent
- User confusion and broken navigation

**Fix:** Updated link to `/contractor/discover`

---

## Testing Checklist

- [ ] Logout user
- [ ] Try to access `/jobs/create` - Should redirect to login
- [ ] Try to access `/contractor/discover` - Should redirect to login
- [ ] Try to access `/contractor/subscription` - Should redirect to login
- [ ] Verify blacklisted tokens are rejected
- [ ] Test newsletter subscription CSRF protection
- [ ] Verify all public routes work without authentication
- [ ] Verify social media links open in new tabs securely
- [ ] Verify "Browse Jobs" link goes to correct contractor page
