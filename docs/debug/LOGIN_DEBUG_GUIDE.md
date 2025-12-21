# Login Issues - Debug Guide

## Current Issues Identified

### 1. **Slowness Issues**

#### Potential Causes:

**A. Supabase Auth Latency**
- Location: `apps/web/lib/auth-manager.ts:63`
- The login uses `serverSupabase.auth.signInWithPassword()` which makes an external API call to Supabase
- This can be slow if:
  - Supabase project is in a distant region
  - Network latency
  - Supabase rate limiting

**B. Multiple Database Queries**
After Supabase auth, the code does:
1. Auth with Supabase (line 63)
2. Get user profile from `public.users` (line 116)
3. Create token pair (line 144)
4. Set cookies (line 150)

**C. Rate Limiting Overhead**
- Location: `apps/web/app/api/auth/login/route.ts:37`
- Every login check goes through rate limiting which connects to Redis
- If Redis is slow or unavailable, it fails closed (line 44-54)

### 2. **Login Failures with Correct Password**

#### Potential Causes:

**A. Email Not Confirmed**
```typescript
// Line 80-88 in auth-manager.ts
if (authError.message?.includes('email_not_confirmed')) {
  return {
    success: false,
    error: 'Please verify your email address...'
  };
}
```
**Solution:** Check if email is verified in Supabase dashboard

**B. Rate Limiting**
```typescript
// Line 34-74 in login/route.ts
const rateLimitResult = await checkLoginRateLimit(request);
if (!rateLimitResult.allowed) {
  return 429 error
}
```
**Solution:** Wait or clear rate limit

**C. CSRF Token Issues**
```typescript
// Line 19-32 in login/route.ts
await requireCSRF(request);
// Returns 403 if fails
```
**Solution:** Refresh page to get new CSRF token

**D. Redis/Rate Limiter Down**
```typescript
// Line 44-54 in login/route.ts
// Fails closed: deny request when rate limiting unavailable
return 503 error
```
**Solution:** Check Redis connection

---

## Quick Fixes

### Fix 1: Check Email Verification
1. Go to Supabase Dashboard → Authentication → Users
2. Find your user email
3. Check if "Email Confirmed" is ✅
4. If not, click the user → Confirm email

### Fix 2: Clear Rate Limit
If you see "Too many login attempts":
```bash
# Connect to Redis
redis-cli

# Clear rate limit for your IP
DEL "login:YOUR_IP_ADDRESS"

# Or clear all login rate limits (dev only)
KEYS "login:*" | xargs redis-cli DEL
```

### Fix 3: Check Supabase Connection
```bash
# Test Supabase connection
curl https://YOUR_PROJECT.supabase.co/rest/v1/

# Should return 200 OK
```

### Fix 4: Disable Rate Limiting (Development Only)
Edit `apps/web/app/api/auth/login/route.ts`:

```typescript
// TEMP: Comment out rate limiting
// const rateLimitResult = await checkLoginRateLimit(request);
// if (!rateLimitResult.allowed) {
//   return 429 error
// }
```

### Fix 5: Add Logging to Find Issue
Edit `apps/web/lib/auth-manager.ts` line 60:

```typescript
console.time('Supabase Auth');
const { data: authData, error: authError } = await serverSupabase.auth.signInWithPassword({
  email,
  password,
});
console.timeEnd('Supabase Auth');

if (authError) {
  console.error('❌ Auth Error:', authError.message);
  console.error('❌ Full Error:', authError);
}
```

---

## Performance Optimization

### Option 1: Add Timeout to Supabase Auth
```typescript
// In auth-manager.ts
const authPromise = serverSupabase.auth.signInWithPassword({ email, password });
const timeoutPromise = new Promise((_, reject) =>
  setTimeout(() => reject(new Error('Auth timeout')), 5000)
);

const { data: authData, error: authError } = await Promise.race([
  authPromise,
  timeoutPromise
]);
```

### Option 2: Cache User Profile
```typescript
// After successful login, cache user profile in Redis
// Key: user_profile:${userId}
// TTL: 5 minutes
```

### Option 3: Skip Profile Query for Repeat Logins
```typescript
// Use JWT token data instead of querying DB every time
const user = {
  id: authData.user.id,
  email: authData.user.email,
  role: authData.user.user_metadata?.role,
  // Skip the .from('users').select() query
};
```

---

## Diagnostic Steps

### Step 1: Check Browser Console
Open browser DevTools → Console, look for:
- CSRF token errors
- Network errors
- Timeout errors

### Step 2: Check Network Tab
Open DevTools → Network → Filter to XHR:
1. Click login
2. Find `/api/auth/login` request
3. Check:
   - **Status**: Should be 200
   - **Time**: Should be < 2 seconds
   - **Response**: Check error message

### Step 3: Check Server Logs
```bash
cd apps/web
npm run dev

# Look for:
# ✅ "Attempting login with Supabase Auth"
# ✅ "Supabase Auth login successful"
# ❌ "CSRF validation failed"
# ❌ "Rate limit check failed"
```

### Step 4: Test Supabase Directly
```typescript
// Create test file: apps/web/test-supabase-login.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function testLogin() {
  console.time('Direct Supabase Login');
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'your-email@example.com',
    password: 'your-password',
  });
  console.timeEnd('Direct Supabase Login');

  if (error) console.error('Error:', error);
  else console.log('Success:', data.user?.email);
}

testLogin();
```

Run: `npx tsx apps/web/test-supabase-login.ts`

---

## Common Error Messages & Solutions

### "CSRF validation failed"
**Cause:** Token expired or missing
**Solution:** Hard refresh page (Ctrl+Shift+R)

### "Rate limiting service unavailable"
**Cause:** Redis connection failed
**Solution:** Check Redis is running: `redis-cli ping`

### "Too many login attempts"
**Cause:** Hit rate limit
**Solution:** Wait 15 minutes or clear Redis cache

### "Please verify your email address"
**Cause:** Email not confirmed in Supabase
**Solution:** Confirm email in Supabase dashboard

### "Login failed. Please try again."
**Cause:** Generic Supabase error
**Solution:** Check Supabase logs in dashboard

---

## Environment Variables to Check

```bash
# Required for login to work:
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# For rate limiting:
REDIS_URL=redis://localhost:6379

# For tokens:
JWT_SECRET=your-secret-key
```

---

## Recommended Immediate Actions

1. **Check Supabase Dashboard**
   - Verify email is confirmed
   - Check API logs for errors
   - Look at Auth logs

2. **Test with Debug Logging**
   - Add `console.log` statements
   - Monitor timing of each step
   - Identify which step is slow

3. **Bypass Rate Limiting (Dev Only)**
   - Comment out rate limit check temporarily
   - See if login works without it

4. **Check Redis Connection**
   ```bash
   redis-cli ping
   # Should return PONG
   ```

5. **Hard Refresh Login Page**
   - Ctrl+Shift+R to clear cache
   - Get fresh CSRF token

---

## Contact Points for Help

- **Supabase Issues:** Check dashboard → Logs
- **Redis Issues:** Run `redis-cli info`
- **Network Issues:** Check browser DevTools → Network tab
- **Database Issues:** Check Supabase dashboard → Database

---

**Most Likely Cause:** Email not verified in Supabase OR rate limiting triggered

**Quick Test:** Try with a different email/new account to rule out rate limiting
