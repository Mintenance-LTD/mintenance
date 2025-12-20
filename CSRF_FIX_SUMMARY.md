# CSRF Token Fix Summary

## Problem Identified
You were experiencing "CSRF token not found in response" errors when trying to post jobs. The error was occurring in:
- `lib/csrf-client.ts:28` when calling `getCsrfToken()`
- Triggered from `app/jobs/[id]/edit/page.tsx:331` during job submission

## Root Cause
There was a **field name mismatch** between the API response and client expectations:
- **API returned**: `{ token: "..." }` (in `/api/csrf/route.ts`)
- **Client expected**: `{ csrfToken: "..." }` (in `csrf-client.ts`)

## Solution Implemented
Fixed the field name mismatch in `csrf-client.ts` (lines 27-35):
```diff
- if (!data.csrfToken) {
+ if (!data.token) {
   throw new Error('CSRF token not found in response');
}

- cachedToken = data.csrfToken;
+ cachedToken = data.token;
  tokenExpiry = Date.now() + 55 * 60 * 1000;

- return data.csrfToken;
+ return data.token;
```

## How CSRF Protection Works in Your App

### 1. **Automatic Token Generation**
- When you first visit the site, the middleware (`middleware.ts`) automatically generates a CSRF token
- Token is stored in a cookie: `csrf-token` (development) or `__Host-csrf-token` (production)

### 2. **Double-Submit Cookie Pattern**
For state-changing requests (POST/PUT/DELETE/PATCH), the system requires:
- The CSRF token in a cookie (set automatically)
- The same token in the `x-csrf-token` header (you add this)

### 3. **Validation Layers**
CSRF validation happens at two levels:
- **Middleware**: Validates all API requests automatically
- **API Routes**: Additional validation using `requireCSRF()` function

### 4. **Client-Side Usage**
Two ways to get CSRF tokens in your components:
- **React Hook**: `useCSRF()` - Used in job creation page
- **Utility Function**: `getCsrfToken()` from `csrf-client.ts` - Used in job edit page

## Testing Confirmation
✅ The `/api/csrf` endpoint now correctly returns `{ token: "..." }`
✅ The cookie is properly set as `csrf-token` in development
✅ Job posting should now work without CSRF errors

## Files Modified
1. `apps/web/lib/csrf-client.ts` - Fixed field name from `csrfToken` to `token`

## Next Steps
You should now be able to:
- Post new jobs without CSRF errors
- Edit existing jobs without CSRF errors
- Make any API calls that require CSRF protection

The fix is backward compatible and doesn't break any existing functionality since:
- The `useCSRF()` hook was already reading `data.token` correctly
- Only the `csrf-client.ts` utility (used in job edit) needed fixing