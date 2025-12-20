# Deployment Checklist - Week 1 Critical Fixes

**Status**: Ready for deployment after completing checklist
**Last Updated**: December 8, 2025

---

## ✅ Completed Steps

### Code Implementation
- [x] All 8 critical blockers fixed
- [x] 3 database migration files created
- [x] 1 new API endpoint created (confirm-completion)
- [x] 5 frontend/backend files modified
- [x] Geocoding service implemented
- [x] CSRF tokens added to all critical endpoints
- [x] TypeScript type errors fixed

---

## 🔧 Step 1: Start Docker Desktop

**Status**: ⏸️ REQUIRED - Docker Desktop is not currently running

### Manual Action Required
1. Press `Windows Key` and search for "Docker Desktop"
2. Click to launch Docker Desktop
3. Wait for Docker to fully start (icon in system tray will stop animating)
4. You should see "Docker Desktop is running" in the system tray

### Verify Docker is Running
```bash
# Run this command after starting Docker Desktop
docker ps
# Should output container list (may be empty, that's OK)
```

**Why Required**: Supabase CLI uses Docker to run a local PostgreSQL database for testing migrations before deploying to production.

---

## 🗄️ Step 2: Run Database Migrations

**Status**: ⏸️ PENDING - Requires Docker Desktop to be running

### Commands to Execute

```bash
# Navigate to project directory
cd c:\Users\Djodjo.Nkouka.ERICCOLE\Downloads\mintenance-clean

# Start Supabase locally (if not already started)
npx supabase start

# Apply migrations to local database
npx supabase db push

# Verify no schema differences remain
npx supabase db diff --local
# Expected output: "No schema changes detected"
```

### What These Commands Do

**`npx supabase start`**:
- Starts local PostgreSQL, Kong, GoTrue, PostgREST, and Storage containers
- Creates a local Supabase instance for testing
- First run takes ~2-3 minutes to download Docker images

**`npx supabase db push`**:
- Applies all migration files in `supabase/migrations/` to local database
- Runs migrations in timestamp order:
  1. `20251208000001_create_messages_table.sql`
  2. `20251208000002_fix_escrow_table_naming.sql`
  3. `20251208000003_add_contractor_job_discovery_policy.sql`

**`npx supabase db diff --local`**:
- Compares local database schema with migration files
- Should return empty (no differences) if migrations applied successfully

### Expected Output

**Successful Migration**:
```
Applying migration 20251208000001_create_messages_table.sql...
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
ALTER TABLE
CREATE POLICY
CREATE POLICY
CREATE POLICY
CREATE POLICY
CREATE POLICY
ALTER PUBLICATION
CREATE FUNCTION
CREATE TRIGGER
COMMENT

Applying migration 20251208000002_fix_escrow_table_naming.sql...
ALTER TABLE
COMMENT

Applying migration 20251208000003_add_contractor_job_discovery_policy.sql...
CREATE POLICY
COMMENT

Migrations applied successfully!
```

### Troubleshooting

**Error**: `Docker not found`
- **Solution**: Install Docker Desktop from https://www.docker.com/products/docker-desktop/

**Error**: `Cannot connect to Docker daemon`
- **Solution**: Ensure Docker Desktop is running (see Step 1)

**Error**: `Migration already applied`
- **Solution**: Safe to ignore - migration was already run previously

**Error**: `Permission denied`
- **Solution**: Run terminal as Administrator

---

## 🔑 Step 3: Configure Environment Variables

**Status**: ⏸️ PENDING - User action required

### 3.1 Check Existing Environment File

```bash
# Check if .env.local exists
ls apps/web/.env.local
```

**If file exists**: Review and add missing variables
**If file doesn't exist**: Copy from example and fill in

```bash
# Copy example file
cp apps/web/.env.example apps/web/.env.local
```

### 3.2 Required Environment Variables

Add these to `apps/web/.env.local`:

#### Google Maps API Key (NEW - Required for geocoding)

```bash
# Google Maps API key for geocoding
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

**How to Get Google Maps API Key**:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing project
3. Enable "Geocoding API":
   - Navigate to "APIs & Services" → "Library"
   - Search for "Geocoding API"
   - Click "Enable"
4. Create credentials:
   - Navigate to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "API Key"
   - Copy the generated API key
5. **IMPORTANT**: Restrict the API key:
   - Click on the API key to edit
   - Under "API restrictions", select "Restrict key"
   - Choose "Geocoding API" from the dropdown
   - Click "Save"

**Cost**: Google provides $200 free credit per month. Geocoding costs $5 per 1,000 requests. Expected usage: ~100-500 requests/day.

#### Verify Other Critical Variables

Ensure these are already configured (from previous setup):

```bash
# Supabase (CRITICAL - app won't work without these)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key-here

# JWT Secret (CRITICAL - for authentication)
JWT_SECRET=your-jwt-secret-minimum-64-characters-here

# Stripe (Required for payments)
STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key-here
STRIPE_WEBHOOK_SECRET=whsec_your-stripe-webhook-secret-here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-publishable-key-here
```

### 3.3 Verify Environment Variables

```bash
# Check if all required variables are set
cd apps/web
node -e "
const fs = require('fs');
const envContent = fs.readFileSync('.env.local', 'utf8');
const required = [
  'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'JWT_SECRET',
  'STRIPE_SECRET_KEY',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'
];

const missing = required.filter(key => !envContent.includes(key + '='));
if (missing.length > 0) {
  console.log('❌ Missing required variables:', missing.join(', '));
  process.exit(1);
} else {
  console.log('✅ All required environment variables are configured');
}
"
```

---

## 🧪 Step 4: Execute Testing Checklist

**Status**: ⏸️ PENDING - Requires migrations and environment variables

### 4.1 Database Schema Tests

```bash
# Connect to local Supabase database
npx supabase db shell

# Then run these SQL queries:
```

**Test 1: Verify messages table exists**
```sql
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'messages'
ORDER BY ordinal_position;
```
**Expected**: Should return 9 columns (id, job_id, sender_id, receiver_id, message_text, message_type, attachment_url, read, created_at, updated_at)

**Test 2: Verify escrow_transactions table exists**
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'escrow_transactions';
```
**Expected**: Should return 1 row with table_name = 'escrow_transactions'

**Test 3: Verify escrow_payments table does NOT exist**
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'escrow_payments';
```
**Expected**: Should return 0 rows (table was renamed)

**Test 4: Verify job discovery RLS policy exists**
```sql
SELECT policyname, tablename
FROM pg_policies
WHERE tablename = 'jobs'
  AND policyname = 'Contractors can view posted jobs available for bidding';
```
**Expected**: Should return 1 row

**Test 5: Count total indexes on messages table**
```sql
SELECT indexname
FROM pg_indexes
WHERE tablename = 'messages';
```
**Expected**: Should return 5 indexes (idx_messages_job_id, idx_messages_sender_id, idx_messages_receiver_id, idx_messages_created_at, idx_messages_read)

### 4.2 Application Tests

**Start the development server:**
```bash
cd c:\Users\Djodjo.Nkouka.ERICCOLE\Downloads\mintenance-clean
npm run dev
```

Wait for "Ready in Xms" message, then proceed with tests.

#### Test A: Job Creation with Geocoding

1. Navigate to: http://localhost:3000/jobs/create
2. Fill in job details:
   - Title: "Test Geocoding Feature"
   - Description: "This is a test to verify geocoding works correctly. Lorem ipsum dolor sit amet, consectetur adipiscing elit."
   - Location: "London, UK" (or any valid address)
   - Category: Select any category
   - Budget: £500
3. Upload at least 1 photo (required for jobs > £500)
4. Click "Post Job"

**Expected Result**:
- Job should be created successfully
- Check browser console for geocoding logs
- **Manual DB Verification**:
  ```sql
  SELECT id, title, location, latitude, longitude
  FROM jobs
  WHERE title = 'Test Geocoding Feature'
  ORDER BY created_at DESC
  LIMIT 1;
  ```
  - latitude and longitude should NOT be NULL
  - latitude should be ~51.5 (London)
  - longitude should be ~-0.1 (London)

**If geocoding fails** (lat/lng are NULL):
- Check console for error messages
- Verify `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set
- Verify Geocoding API is enabled in Google Cloud Console
- Check Google Cloud Console for API usage/errors

#### Test B: TypeScript Urgency Fix

1. Navigate to: http://localhost:3000/jobs/create
2. Open browser DevTools Console (F12)
3. In the "Job Details" step, select "Emergency" urgency
4. Check console for TypeScript errors

**Expected Result**:
- NO TypeScript errors in console
- Emergency option should be selectable
- Form should continue to work normally

#### Test C: Bid Submission with CSRF

**Prerequisites**:
- Have a contractor account
- Have a posted job to bid on

1. Login as contractor
2. Navigate to: http://localhost:3000/contractor/discover
3. Find a job and click "View Details" → "Submit Bid"
4. Fill in bid form:
   - Bid Amount: £1000
   - Proposal: "This is a test bid to verify CSRF token works. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."
5. Click "Submit Bid"
6. Open DevTools Network tab and inspect the submit-bid request

**Expected Result**:
- Bid should submit successfully (200 OK response)
- Network tab should show `x-csrf-token` header in request
- Success toast notification should appear
- Should redirect to contractor dashboard

**If bid fails with 403 Forbidden**:
- Check browser console for errors
- Verify `getCsrfHeaders()` is being called
- Check Network tab for missing CSRF headers

#### Test D: Accept Bid Button

**Prerequisites**:
- Have a homeowner account
- Have a job with at least 1 pending bid

1. Login as homeowner
2. Navigate to: http://localhost:3000/dashboard
3. Click on a job with pending bids
4. Scroll to "Bids Received" section
5. Click "Accept Bid" on any bid
6. Confirm in the popup dialog
7. Check Network tab for the accept request

**Expected Result**:
- Confirmation dialog should appear
- After confirming, button should show "Accepting..."
- Network tab should show `x-csrf-token` header
- Request to `/api/jobs/[id]/bids/[bidId]/accept` should return 200 OK
- Page should reload showing updated job status
- Bid status should change to "accepted"
- Other bids should change to "rejected"

**If accept fails**:
- Check console for error messages
- Verify onClick handler is attached
- Check Network tab for 403/404/500 errors

#### Test E: Contractor Job Discovery

**Prerequisites**:
- Have a contractor account
- Have at least 1 posted job (status = 'posted', contractor_id = NULL)

1. Login as contractor
2. Navigate to: http://localhost:3000/contractor/discover
3. Check if jobs are visible

**Expected Result**:
- Should see list of available jobs
- Should NOT see "No jobs in this area" error (assuming jobs exist)
- Jobs should have "posted" status
- Jobs should NOT have contractor_id assigned

**Manual DB Verification**:
```sql
-- Check how many jobs should be visible to contractors
SELECT COUNT(*) as available_jobs
FROM jobs
WHERE status = 'posted'
  AND contractor_id IS NULL;
```

**If no jobs shown but DB has available jobs**:
- Check RLS policy was applied correctly
- Verify contractor is logged in
- Check browser console for errors
- Test RLS policy manually:
  ```sql
  -- This should return rows if policy works
  SET LOCAL role TO authenticated;
  SET LOCAL request.jwt.claims TO '{"role": "contractor"}';
  SELECT * FROM jobs WHERE status = 'posted' AND contractor_id IS NULL;
  ```

#### Test F: Job Completion Confirmation

**Prerequisites**:
- Have a homeowner account
- Have a job with status = 'completed'

1. Login as homeowner
2. Navigate to job details page
3. Click "Confirm Completion" button
4. Check Network tab

**Expected Result**:
- Request to `/api/jobs/[id]/confirm-completion` should return 200 OK
- `completion_confirmed_by_homeowner` should be set to true
- Escrow transaction status should change to 'release_pending'
- Contractor should receive notification

**Manual DB Verification**:
```sql
SELECT
  j.id,
  j.title,
  j.status,
  j.completion_confirmed_by_homeowner,
  e.status as escrow_status
FROM jobs j
LEFT JOIN escrow_transactions e ON e.job_id = j.id
WHERE j.id = 'your-job-id-here';
```

**Expected**:
- completion_confirmed_by_homeowner = true
- escrow_status = 'release_pending'

### 4.3 TypeScript Compilation Test

```bash
# Run TypeScript type checking
cd apps/web
npm run type-check
```

**Expected Result**:
```
> type-check
> tsc --noEmit

✓ No TypeScript errors found
```

**If errors found**:
- Review error messages
- Most common: Import errors, missing type definitions
- Fix before deploying to production

### 4.4 Build Test

```bash
# Test production build
cd apps/web
npm run build
```

**Expected Result**:
```
> build
> next build

✓ Creating an optimized production build
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages (X/X)
✓ Collecting build traces
✓ Finalizing page optimization

Route (app)                              Size     First Load JS
...

○  (Static)  prerendered as static content
●  (SSG)     prerendered as static HTML
λ  (Dynamic) server-rendered on demand
```

**If build fails**:
- Check error messages carefully
- Common issues: Missing environment variables, import errors, type errors
- Fix before proceeding

---

## 🚀 Step 5: Deploy to Staging/Production

**Status**: ⏸️ PENDING - Requires all above tests to pass

### 5.1 Deploy Migrations to Production Supabase

**CRITICAL**: Only run this after ALL local tests pass

```bash
# Link to your production Supabase project (if not already linked)
npx supabase link --project-ref your-project-ref

# Push migrations to production
npx supabase db push --linked

# Verify migrations applied
npx supabase db diff --linked
# Should output: "No schema changes detected"
```

### 5.2 Deploy Code to Vercel

**Option A: Automatic Deploy (Recommended)**
```bash
# Commit all changes
git add .
git commit -m "feat: Week 1 critical fixes - database migrations, API endpoints, geocoding

- Create messages table migration
- Fix escrow table naming (escrow_payments → escrow_transactions)
- Add RLS policy for contractor job discovery
- Fix user_type → role column name mismatch
- Add CSRF token to bid submission
- Add onClick handler to Accept Bid button
- Fix TypeScript urgency type (add 'emergency')
- Implement geocoding in job submission
- Create confirm job completion API endpoint

✅ Week 1 Critical Fixes Complete
🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"

# Push to main branch (triggers Vercel deploy)
git push origin main
```

**Option B: Manual Deploy via Vercel CLI**
```bash
# Deploy to preview
npx vercel

# Deploy to production
npx vercel --prod
```

### 5.3 Configure Environment Variables on Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Navigate to "Settings" → "Environment Variables"
4. Add the following new variable:

```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = your_google_maps_api_key_here
```

5. Ensure these existing variables are still set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `JWT_SECRET`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

6. Click "Redeploy" to apply environment variables

### 5.4 Post-Deployment Verification

**Test 1: Verify Migrations Applied**
- Connect to production Supabase SQL Editor
- Run: `SELECT table_name FROM information_schema.tables WHERE table_name IN ('messages', 'escrow_transactions');`
- Expected: Both tables should exist

**Test 2: Verify Geocoding Works**
- Create a test job on production
- Check database for latitude/longitude values
- Should NOT be NULL

**Test 3: Verify Bid Submission Works**
- Submit a test bid on production
- Should succeed with 200 OK (no 403 errors)

**Test 4: Verify Accept Bid Works**
- Accept a test bid on production
- Should update job status to 'in_progress'
- Should send notifications

**Test 5: Monitor Error Logs**
- Check Vercel deployment logs for errors
- Check Supabase logs for database errors
- Check Stripe dashboard for payment errors

---

## 📊 Success Metrics

Track these metrics after deployment:

### Technical Metrics
- [ ] Zero TypeScript compilation errors
- [ ] Zero database migration errors
- [ ] All API endpoints return 200 OK for valid requests
- [ ] Zero 403 Forbidden errors on bid submission
- [ ] Zero "No jobs in this area" errors with valid geocoded jobs

### Business Metrics
- [ ] Bid submission success rate > 95%
- [ ] Job creation success rate > 98%
- [ ] Geocoding success rate > 90%
- [ ] Message delivery success rate > 99%

### Performance Metrics
- [ ] Job creation time < 3s (including geocoding)
- [ ] Bid submission time < 1s
- [ ] Accept bid time < 2s
- [ ] Database query p95 < 100ms

---

## 🔄 Rollback Plan

If critical issues arise after deployment:

### Rollback Database Migrations

```bash
# Connect to production database
npx supabase db shell --linked

# Run rollback SQL
```

```sql
-- Rollback messages table
DROP TABLE IF EXISTS public.messages CASCADE;

-- Rollback escrow table rename
ALTER TABLE IF EXISTS public.escrow_transactions RENAME TO escrow_payments;

-- Rollback job discovery policy
DROP POLICY IF EXISTS "Contractors can view posted jobs available for bidding" ON public.jobs;
```

### Rollback Code

```bash
# Revert to previous deployment
git revert HEAD
git push origin main

# OR via Vercel Dashboard:
# 1. Go to Deployments tab
# 2. Find previous working deployment
# 3. Click "..." → "Promote to Production"
```

---

## 📝 Manual Actions Summary

### Required Before Deployment

1. **Start Docker Desktop** (1 minute)
   - Launch Docker Desktop application
   - Wait for "Docker is running" status

2. **Run Migrations** (2-5 minutes)
   - `npx supabase start`
   - `npx supabase db push`
   - `npx supabase db diff --local`

3. **Configure Google Maps API** (5-10 minutes)
   - Create/enable Geocoding API in Google Cloud Console
   - Generate API key
   - Restrict API key to Geocoding API only
   - Add to `.env.local`

4. **Run Tests** (10-15 minutes)
   - Database schema tests (SQL queries)
   - Application tests (manual UI testing)
   - TypeScript compilation test
   - Build test

5. **Deploy to Production** (5-10 minutes)
   - Push migrations to production Supabase
   - Commit and push code to GitHub
   - Configure environment variables on Vercel
   - Verify deployment

### Total Estimated Time
**30-40 minutes** (assuming no issues)

---

## ✅ Final Checklist

Mark each item as you complete it:

### Pre-Deployment
- [ ] Docker Desktop is running
- [ ] Local migrations applied successfully
- [ ] Google Maps API key configured
- [ ] All database schema tests pass
- [ ] All application tests pass
- [ ] TypeScript compilation succeeds
- [ ] Production build succeeds

### Deployment
- [ ] Production migrations applied
- [ ] Code pushed to main branch
- [ ] Vercel deployment succeeded
- [ ] Environment variables configured on Vercel

### Post-Deployment
- [ ] Production database schema verified
- [ ] Geocoding works on production
- [ ] Bid submission works on production
- [ ] Accept bid works on production
- [ ] No errors in Vercel logs
- [ ] No errors in Supabase logs

### Monitoring (First 24 Hours)
- [ ] Monitor error rates
- [ ] Monitor API success rates
- [ ] Monitor geocoding usage/costs
- [ ] Check user feedback
- [ ] Verify all critical paths work

---

## 🆘 Support & Troubleshooting

If you encounter issues:

1. **Check Logs**:
   - Vercel Deployment Logs: https://vercel.com/dashboard → Deployments → View Function Logs
   - Supabase Logs: Supabase Dashboard → Logs → Database
   - Browser Console: F12 → Console tab

2. **Common Issues**:
   - **Docker won't start**: Restart computer, ensure Hyper-V is enabled
   - **Migrations fail**: Check for conflicting migrations, verify Docker is running
   - **Geocoding fails**: Verify API key, check API is enabled, verify billing is set up
   - **403 Errors**: Check CSRF implementation, verify cookies are enabled

3. **Contact**:
   - Review implementation docs: `WEEK_1_CRITICAL_FIXES_IMPLEMENTED.md`
   - Review audit report: `COMPREHENSIVE_PLATFORM_AUDIT_REPORT.md`

---

**Generated**: December 8, 2025
**Author**: Claude (AI Assistant)
**Status**: Ready for deployment
