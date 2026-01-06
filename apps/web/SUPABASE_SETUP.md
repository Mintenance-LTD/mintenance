# Supabase Setup Guide

This guide will help you configure your Supabase environment variables for the Mintenance project.

## Quick Start

1. **Create `.env.local` file** in `apps/web/` directory
2. **Copy the template below** and fill in your values
3. **Get your Supabase keys** from the dashboard (see below)

## Current Supabase Project

- **Project Name**: MintEnance
- **Project ID**: `ukrjudtlvapiajkjbcrd`
- **Region**: eu-west-2
- **Status**: ACTIVE_HEALTHY
- **Project URL**: `https://ukrjudtlvapiajkjbcrd.supabase.co`

## Required Environment Variables

Add these to your `apps/web/.env.local` file:

```env
# ============================================
# Supabase Configuration (REQUIRED)
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://ukrjudtlvapiajkjbcrd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrcmp1ZHRsdmFwaWFqa2piY3JkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxMTYyNjcsImV4cCI6MjA3MTY5MjI2N30.R8r7pr1fPTPlK0RIB4s9KcJrjDsTfXazpG8-YC3qJXw
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

## How to Get Your Service Role Key

The service role key is sensitive and must be retrieved from the Supabase dashboard:

1. **Go to**: https://supabase.com/dashboard/project/ukrjudtlvapiajkjbcrd/settings/api
2. **Find** the "service_role" key in the "Project API keys" section
3. **Copy** the key (it starts with `eyJ...`)
4. **Paste** it as `SUPABASE_SERVICE_ROLE_KEY` in your `.env.local`

⚠️ **WARNING**: Never commit the service role key to version control. It has admin access to your database.

## Complete Environment Variables Template

For a complete setup, see the full environment variables list in `lib/env.ts` or use this template:

```env
# ============================================
# Node Environment
# ============================================
NODE_ENV=development

# ============================================
# Supabase Configuration (REQUIRED)
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://ukrjudtlvapiajkjbcrd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrcmp1ZHRsdmFwaWFqa2piY3JkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxMTYyNjcsImV4cCI6MjA3MTY5MjI2N30.R8r7pr1fPTPlK0RIB4s9KcJrjDsTfXazpG8-YC3qJXw
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# ============================================
# JWT Configuration (REQUIRED)
# ============================================
# Generate with: openssl rand -base64 64
JWT_SECRET=your-jwt-secret-minimum-64-characters-long-for-production-security

# ============================================
# Stripe Configuration (REQUIRED)
# ============================================
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# ============================================
# AI Service Configuration (REQUIRED for AI features)
# ============================================
OPENAI_API_KEY=sk-proj-...

# ============================================
# Other optional variables...
# See lib/env.ts for complete list
# ============================================
```

## Verification

After setting up your `.env.local` file, verify the configuration:

```bash
cd apps/web
npm run dev
```

If there are any missing or invalid environment variables, you'll see clear error messages indicating what needs to be fixed.

## Next Steps

1. ✅ Set up Supabase environment variables (this guide)
2. ⏭️ Set up Stripe keys (see `STRIPE_ENV_SETUP.txt` if it exists)
3. ⏭️ Set up other required services (OpenAI, Redis, etc.)
4. ⏭️ Run database migrations (if needed)

## Useful Links

- **Supabase Dashboard**: https://supabase.com/dashboard/project/ukrjudtlvapiajkjbcrd
- **API Settings**: https://supabase.com/dashboard/project/ukrjudtlvapiajkjbcrd/settings/api
- **Database Settings**: https://supabase.com/dashboard/project/ukrjudtlvapiajkjbcrd/settings/database

