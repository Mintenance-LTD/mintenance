# ⚠️ URGENT: Fix Service Role Key - Step by Step

## The Problem
Your `.env.local` has an invalid service role key. Every API call fails with:
```
{"code":401,"message":"Invalid JWT"}
```

## Quick Fix (5 minutes)

### Step 1: Open Supabase Dashboard
Go to: https://supabase.com/dashboard/project/ukrjudtlvapiajkjbcrd/settings/api

### Step 2: Find "Project API keys" Section
Scroll down until you see a section called **"Project API keys"**

You'll see something like this:
```
┌─────────────────────────────────────────────────┐
│ Project API keys                                 │
├─────────────────────────────────────────────────┤
│                                                  │
│ anon public                                      │
│ eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...         │
│ [Copy] [Reveal]                                  │
│                                                  │
│ service_role secret                              │
│ ••••••••••••••••••••••••••••••••••••••          │
│ [Copy] [Reveal]  ← CLICK THIS                   │
│                                                  │
└─────────────────────────────────────────────────┘
```

### Step 3: Reveal and Copy the service_role Key
1. Click **"Reveal"** next to `service_role secret`
2. The key will appear - it's VERY long (200+ characters)
3. Click **"Copy"** to copy the entire key

**What it should look like:**
- Starts with: `eyJ`
- Very long: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrcmp1ZHRsdmFwaWFqa2piY3JkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjExNjI2NywiZXhwIjoyMDcxNjkyMjY3fQ.XXXXXXXXXXXXX`
- NOT like: `sb_secret_AMoaugS1OiiCYsvyXtRJNw_uVUJwLan` ❌

### Step 4: Update .env.local
1. Open: `apps/web/.env.local`
2. Find the line: `SUPABASE_SERVICE_ROLE_KEY=sb_secret_AMoaugS1OiiCYsvyXtRJNw_uVUJwLan`
3. Replace it with the key you just copied:
   ```bash
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrcmp1ZHRsdmFwaWFqa2piY3JkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjExNjI2NywiZXhwIjoyMDcxNjkyMjY3fQ.PASTE_YOUR_KEY_HERE
   ```
4. **Save the file**

### Step 5: Restart Dev Server
```bash
# In your terminal, press Ctrl+C to stop the server
# Then restart:
npm run dev
```

### Step 6: Test It Works
1. Go to http://localhost:3000/contractor/payouts
2. Click "Set Up Payout Account"
3. You should be redirected to Stripe (not see an error!)

## Expected Result

**Before Fix:**
```
❌ {"code":401,"message":"Invalid JWT"}
```

**After Fix:**
```
✅ Redirects to Stripe Connect onboarding
   OR
✅ Shows a different error (which means auth is working!)
```

## If It Still Doesn't Work

Check that the key:
1. ✅ Starts with `eyJ`
2. ✅ Is very long (200+ characters)
3. ✅ Was copied from the `service_role secret` row (NOT the `anon public` row)
4. ✅ Has no extra spaces or newlines
5. ✅ You saved the `.env.local` file
6. ✅ You restarted the dev server

## Need Help?

If you're still stuck, send me:
1. The first 20 characters of your service role key (e.g., `eyJhbGciOiJIUzI1NiIsIn...`)
2. Screenshot of the Supabase API keys page (you can blur the actual keys)
