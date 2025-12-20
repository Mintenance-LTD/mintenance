# Notifications System Review

**Date:** January 2025  
**Scope:** Contractor and Homeowner notification systems  
**Review Type:** Security, API, Bugs, and Functionality

---

## Executive Summary

The notifications system has **critical security vulnerabilities** and several functional issues that need immediate attention. The main concerns are:

1. **CRITICAL**: Missing authentication checks allowing users to access other users' notifications
2. **CRITICAL**: Missing DELETE endpoint causing "Clear All" functionality to fail
3. **HIGH**: Missing contractor notifications page (404 errors)
4. **MEDIUM**: Inconsistent API usage between components
5. **MEDIUM**: Missing CSRF protection on some endpoints

---

## Critical Security Issues

### 1. Unauthorized Access to Notifications (CRITICAL)

**Location:** `apps/web/app/api/notifications/route.ts` (GET endpoint)

**Issue:**
```typescript
const userId = searchParams.get('userId');
// No verification that userId matches authenticated user!
const { data: notifications, error } = await serverSupabase
  .from('notifications')
  .select('...')
  .eq('user_id', userId)  // Uses userId from query param without validation
```

**Risk:** Any authenticated user can fetch notifications for any other user by changing the `userId` query parameter.

**Fix Required:**
- Get authenticated user from cookies: `getCurrentUserFromCookies()`
- Verify `userId` matches authenticated user's ID
- Use authenticated user's ID directly instead of query parameter

**Severity:** 🔴 CRITICAL - Data breach risk

---

### 2. Unauthorized Mark All as Read (CRITICAL)

**Location:** `apps/web/app/api/notifications/mark-all-read/route.ts`

**Issue:**
```typescript
const { userId } = await request.json();
// No verification that userId matches authenticated user!
await serverSupabase
  .from('notifications')
  .update({ read: true })
  .eq('user_id', userId)  // Uses userId from body without validation
```

**Risk:** Any authenticated user can mark all notifications as read for any other user.

**Fix Required:**
- Get authenticated user from cookies
- Use authenticated user's ID instead of body parameter
- Remove `userId` from request body

**Severity:** 🔴 CRITICAL - Unauthorized data modification

---

### 3. Unauthorized Unread Count Access (CRITICAL)

**Location:** `apps/web/app/api/notifications/unread-count/route.ts`

**Issue:**
```typescript
const userId = searchParams.get('userId');
// No verification that userId matches authenticated user!
const { count, error } = await serverSupabase
  .from('notifications')
  .select('*', { count: 'exact', head: true })
  .eq('user_id', userId)  // Uses userId from query param without validation
```

**Risk:** Any authenticated user can get unread count for any other user.

**Fix Required:**
- Get authenticated user from cookies
- Use authenticated user's ID instead of query parameter

**Severity:** 🔴 CRITICAL - Privacy violation

---

### 4. Missing Authentication on GET /api/notifications (CRITICAL)

**Location:** `apps/web/app/api/notifications/route.ts` (GET endpoint)

**Issue:** The endpoint doesn't verify the user is authenticated before fetching notifications.

**Fix Required:**
- Add `getCurrentUserFromCookies()` check
- Return 401 if user is not authenticated

**Severity:** 🔴 CRITICAL - Unauthorized access

---

## Missing Functionality

### 5. Missing DELETE Endpoint (HIGH)

**Location:** `apps/web/app/notifications/page.tsx` (line 115)

**Issue:**
```typescript
const deletePromises = notifications.map((n) =>
  fetch(`/api/notifications/${n.id}`, {
    method: 'DELETE',
  })
);
```

The code attempts to DELETE notifications, but **no DELETE endpoint exists** at `/api/notifications/[id]/route.ts`.

**Impact:**
- "Clear All" button fails silently
- Individual delete buttons fail silently
- Users cannot delete notifications

**Fix Required:**
- Create `apps/web/app/api/notifications/[id]/route.ts`
- Implement DELETE handler with:
  - Authentication check
  - Authorization check (verify notification belongs to user)
  - CSRF protection
  - Delete notification from database

**Severity:** 🟠 HIGH - Broken functionality

---

### 6. Missing Contractor Notifications Page (HIGH)

**Location:** Multiple references:
- `apps/web/app/contractor/dashboard-enhanced/components/ContractorDashboardProfessional.tsx:564`
- `apps/web/app/contractor/social/components/NotificationsDropdown.tsx:333`

**Issue:** Links point to `/contractor/notifications` but this page doesn't exist.

**Impact:**
- 404 errors when contractors click "View All Notifications"
- Poor user experience
- Broken navigation

**Fix Required:**
- Create `apps/web/app/contractor/notifications/page.tsx`
- Use `ContractorPageWrapper` for layout
- Reuse notification components or create contractor-specific version
- Ensure proper authentication and authorization

**Severity:** 🟠 HIGH - Broken navigation

---

## API Inconsistencies

### 7. Inconsistent API Usage (MEDIUM)

**Location:** 
- `apps/web/app/notifications/page.tsx` uses `/api/notifications` (no userId param)
- `apps/web/components/notifications/NotificationDropdown.tsx` uses `/api/notifications?userId=${userId}`

**Issue:** Two different components use different API patterns for the same endpoint.

**Impact:**
- Confusion for developers
- Potential security issues if one pattern is fixed but not the other
- Inconsistent behavior

**Fix Required:**
- Standardize on authenticated user pattern (no userId param)
- Update all components to use consistent API
- Remove userId from query parameters

**Severity:** 🟡 MEDIUM - Code quality issue

---

### 8. Missing CSRF Protection on GET Endpoints (MEDIUM)

**Location:** 
- `apps/web/app/api/notifications/route.ts` (GET)
- `apps/web/app/api/notifications/unread-count/route.ts` (GET)

**Issue:** GET endpoints don't have CSRF protection (though this is less critical for GET requests).

**Note:** CSRF is typically not required for GET requests, but since these endpoints modify state (marking as read in some cases), it's worth reviewing.

**Severity:** 🟡 MEDIUM - Best practice

---

## Functional Issues

### 9. Inconsistent Notification Type Handling (MEDIUM)

**Location:** Multiple files

**Issue:** Different components handle notification types differently:
- `NotificationsClient.tsx` uses: `job_update`, `bid_received`, `message_received`, `payment_received`, `meeting_scheduled`, `social_interaction`
- `NotificationDropdown.tsx` uses: `message`, `bid`, `bid_received`, `bid_accepted`, `bid_rejected`, `job_update`, `job_viewed`, `job_nearby`, `payment`, `quote_viewed`, `quote_accepted`, `project_reminder`, `post_liked`, `comment_added`, `comment_replied`, `new_follower`, `contract_created`, `contract_signed`
- `NotificationsPage2025` uses: `job`, `bid`, `message`, `payment`, `system`

**Impact:**
- Inconsistent user experience
- Some notification types may not display correctly
- Difficult to maintain

**Fix Required:**
- Standardize notification types across all components
- Create a shared type definition
- Update all components to use consistent types

**Severity:** 🟡 MEDIUM - UX consistency

---

### 10. Missing Error Handling (LOW)

**Location:** Multiple components

**Issue:** Some API calls don't have proper error handling or user feedback.

**Example:**
```typescript
// apps/web/app/notifications/page.tsx:114
const deletePromises = notifications.map((n) =>
  fetch(`/api/notifications/${n.id}`, {
    method: 'DELETE',
  })
);
// No error handling if DELETE fails
```

**Fix Required:**
- Add try-catch blocks
- Show user-friendly error messages
- Handle partial failures gracefully

**Severity:** 🟢 LOW - User experience

---

## Recommendations

### Immediate Actions (Critical)

1. **Fix Security Vulnerabilities:**
   - Add authentication checks to all notification endpoints
   - Use authenticated user ID instead of query/body parameters
   - Verify ownership before any operation

2. **Create Missing DELETE Endpoint:**
   - Implement `/api/notifications/[id]/route.ts` with DELETE handler
   - Add proper authentication and authorization
   - Add CSRF protection

3. **Create Contractor Notifications Page:**
   - Create `/contractor/notifications/page.tsx`
   - Ensure proper layout and functionality

### Short-term Improvements (High Priority)

4. **Standardize API Usage:**
   - Remove `userId` parameters from all endpoints
   - Use authenticated user from cookies
   - Update all components to use consistent API

5. **Standardize Notification Types:**
   - Create shared type definitions
   - Update all components to use consistent types

### Long-term Improvements (Medium Priority)

6. **Add Comprehensive Error Handling:**
   - Implement proper error boundaries
   - Add user-friendly error messages
   - Handle edge cases gracefully

7. **Add Rate Limiting:**
   - Prevent abuse of notification endpoints
   - Implement rate limiting for mark-as-read operations

8. **Add Real-time Updates:**
   - Consider WebSocket or Server-Sent Events for real-time notifications
   - Improve user experience with live updates

---

## Testing Checklist

- [ ] Verify users can only access their own notifications
- [ ] Verify users cannot mark other users' notifications as read
- [ ] Verify DELETE endpoint works correctly
- [ ] Verify contractor notifications page exists and works
- [ ] Verify all notification types display correctly
- [ ] Verify error handling works properly
- [ ] Verify CSRF protection is in place
- [ ] Verify authentication is required for all endpoints

---

## Files Requiring Changes

### Security Fixes
1. `apps/web/app/api/notifications/route.ts` - Add authentication, remove userId param
2. `apps/web/app/api/notifications/mark-all-read/route.ts` - Add authentication, use authenticated user
3. `apps/web/app/api/notifications/unread-count/route.ts` - Add authentication, remove userId param
4. `apps/web/app/api/notifications/read-all/route.ts` - Add authentication, use authenticated user

### Missing Functionality
5. `apps/web/app/api/notifications/[id]/route.ts` - **CREATE NEW FILE** - DELETE endpoint
6. `apps/web/app/contractor/notifications/page.tsx` - **CREATE NEW FILE** - Contractor notifications page

### Code Quality
7. `apps/web/components/notifications/NotificationDropdown.tsx` - Update to use authenticated API
8. `apps/web/app/notifications/page.tsx` - Update error handling
9. `apps/web/app/notifications/components/NotificationsClient.tsx` - Standardize notification types

---

## Summary

**Critical Issues:** 4  
**High Priority Issues:** 2  
**Medium Priority Issues:** 3  
**Low Priority Issues:** 1  

**Total Issues Found:** 10

**Priority:** 🔴 **IMMEDIATE ACTION REQUIRED** - Security vulnerabilities must be fixed before production deployment.
