# Authentication Architecture Explanation

## Current State: Two Different Systems

Your application currently uses **two different authentication systems**:

### 1. Web App (Next.js) - Custom Auth System
- **Location**: `apps/web/lib/database.ts` and `apps/web/lib/auth-manager.ts`
- **How it works**:
  - Stores users in `public.users` table
  - Uses bcrypt to hash passwords manually
  - Creates custom JWT tokens
  - **Does NOT use Supabase Auth**
  - Users **will not appear** in Supabase Authentication dashboard

### 2. Mobile App (React Native) - Supabase Auth System
- **Location**: `apps/mobile/src/services/AuthService.ts`
- **How it works**:
  - Uses `supabase.auth.signUp()` 
  - Stores users in `auth.users` table (Supabase Auth)
  - Automatic password hashing and email verification
  - Users **DO appear** in Supabase Authentication dashboard
  - Database trigger (`handle_new_user`) syncs to `public.users` automatically

## Why This Happens

Looking at the code:

**Web App** (`apps/web/lib/database.ts:64-114`):
```typescript
static async createUser(userData: CreateUserData): Promise<...> {
  // Hash password with bcrypt manually
  const passwordHash = await bcrypt.hash(userData.password, saltRounds);
  
  // Insert directly into public.users table
  const { data, error } = await supabase
    .from('users')
    .insert({
      email: userData.email.toLowerCase().trim(),
      password_hash: passwordHash,  // Manual password storage
      first_name: userData.first_name.trim(),
      // ... more fields
    })
    // NO supabase.auth.signUp() call!
}
```

**Mobile App** (`apps/mobile/src/services/AuthService.ts:34-45`):
```typescript
const { data, error } = await supabase.auth.signUp({
  email: userData.email,
  password: userData.password,  // Supabase handles hashing
  options: {
    data: {
      first_name: userData.firstName,
      // ...
    },
  },
});
```

## The Problem

**Web app users exist in `public.users` but NOT in `auth.users` (Supabase Auth)**, which is why they don't show up in the Supabase dashboard.

## Solutions

### Option 1: Keep Both Systems (Current)
- **Pros**: Web app has custom control, works independently
- **Cons**: Users split between two systems, can't see web users in Supabase dashboard
- **Action**: None needed, but understand users won't appear in Supabase dashboard

### Option 2: Migrate Web App to Supabase Auth (Recommended)
Update the web app to use `supabase.auth.signUp()` like the mobile app:

1. **Benefits**:
   - All users visible in Supabase dashboard
   - Unified authentication system
   - Automatic email verification
   - Built-in security features
   - Database trigger auto-syncs to `public.users`

2. **Required Changes**:
   - Update `apps/web/lib/auth-manager.ts` to call `supabase.auth.signUp()`
   - Update login to use `supabase.auth.signInWithPassword()`
   - Keep JWT system or switch to Supabase sessions
   - Ensure database trigger is set up

3. **Code Example**:
```typescript
// In auth-manager.ts
const { data, error } = await supabase.auth.signUp({
  email: userData.email,
  password: userData.password,
  options: {
    data: {
      first_name: userData.first_name,
      last_name: userData.last_name,
      role: userData.role,
    },
  },
});

// Trigger automatically creates profile in public.users
```

### Option 3: Use Supabase Client-Side Auth Library
Use `@supabase/ssr` package (already installed) for proper Next.js integration:

```typescript
import { createClient } from '@/lib/supabase-client'

const supabase = createClient()
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: { first_name, last_name, role }
  }
})
```

## Immediate Fix: Delete Orphaned User

To fix the current registration issue, delete the duplicate user:

```sql
-- Run in Supabase SQL Editor
DELETE FROM public.users WHERE email = 'gloire@mintenance.co.uk';
```

Or use the debug endpoint (development only):
```bash
curl -X DELETE http://localhost:3000/api/debug/delete-user \
  -H "Content-Type: application/json" \
  -d '{"email":"gloire@mintenance.co.uk"}'
```

## Recommendation

**Migrate to Supabase Auth for the web app** to:
- See all users in the Supabase dashboard
- Unify authentication across web and mobile
- Leverage built-in security features
- Simplify password reset and email verification

The mobile app already does this correctly!

