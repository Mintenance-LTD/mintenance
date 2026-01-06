# CRITICAL: Missing Valid Service Role Key

## Problem

Your `.env.local` file has an invalid `SUPABASE_SERVICE_ROLE_KEY`:

```
SUPABASE_SERVICE_ROLE_KEY=sb_secret_AMoaugS1OiiCYsvyXtRJNw_uVUJwLan
```

This is NOT a valid Supabase service role key. A valid key should:
- Start with `eyJ` (it's a JWT token)
- Be much longer (200+ characters)
- Look like: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOi...`

## How to Get the Correct Service Role Key

### Step 1: Go to Supabase Dashboard
1. Open https://supabase.com/dashboard
2. Select your project: `ukrjudtlvapiajkjbcrd`

### Step 2: Navigate to Settings → API
1. Click "Settings" in the left sidebar
2. Click "API"
3. Scroll down to "Project API keys"

### Step 3: Copy the Service Role Key
You'll see two keys:
- **anon public** (you already have this - it's public)
- **service_role secret** ← **YOU NEED THIS ONE**

**IMPORTANT:**
- Click the "Reveal" button next to `service_role`
- Copy the ENTIRE key (it's very long)
- It should start with `eyJ`

### Step 4: Update .env.local

Replace the line in `apps/web/.env.local`:

```bash
# OLD (WRONG):
SUPABASE_SERVICE_ROLE_KEY=sb_secret_AMoaugS1OiiCYsvyXtRJNw_uVUJwLan

# NEW (CORRECT - replace with your actual key):
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrcmp1ZHRsdmFwaWFqa2piY3JkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjExNjI2NywiZXhwIjoyMDcxNjkyMjY3fQ.[YOUR_SIGNATURE_HERE]
```

### Step 5: Restart Dev Server

After updating `.env.local`:

```bash
# Stop the dev server (Ctrl+C)
# Restart it
npm run dev
```

## Why This Matters

The service role key is required for:
- ✅ Calling Supabase Edge Functions (setup-contractor-payout)
- ✅ Bypassing Row Level Security (RLS) for admin operations
- ✅ Server-side database operations
- ✅ Creating Stripe Connect accounts for contractors

Without a valid service role key, the payout setup will ALWAYS fail with:
```
{"code":401,"message":"Invalid JWT"}
```

## Security Note

⚠️ **NEVER commit the service role key to git!**
- It gives full database access
- Only use it server-side (API routes, Edge Functions)
- Never expose it to the client
- `.env.local` is already in `.gitignore` - keep it there!

## Quick Test

After updating the key, test it works:

```bash
# Should return contractor info (not "Invalid JWT")
curl -X POST "https://ukrjudtlvapiajkjbcrd.supabase.co/functions/v1/setup-contractor-payout" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_NEW_SERVICE_ROLE_KEY" \
  -H "apikey: YOUR_NEW_SERVICE_ROLE_KEY" \
  -d '{"contractorId":"236c6e76-4c29-4569-acb6-54d65b67f83e"}'
```

If you see `{"error":"Contractor not found..."}` or any database error - GOOD! The auth is working.
If you see `{"code":401,"message":"Invalid JWT"}` - the key is still wrong.
