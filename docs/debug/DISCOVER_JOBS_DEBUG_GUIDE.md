# Discover Jobs Map - Debugging Guide

## Issue Summary
The Discover Jobs map is showing "No Jobs in This Area" despite jobs being created. This guide will help identify the root cause.

## Debugging Steps Added

### 1. Server-Side Logging (apps/web/app/contractor/discover/page.tsx)

**Lines 137-149**: Server-side logs showing:
- Contractor ID
- Contractor location (latitude, longitude, city, etc.)
- Query errors
- Number of jobs fetched
- First 3 jobs with their coordinates

**To View**: Check your **terminal/console where Next.js is running** for logs like:
```
[DISCOVER] Contractor ID: abc123...
[DISCOVER] Contractor Location: { latitude: 51.5074, longitude: -0.1278, ... }
[DISCOVER] Query Error: null
[DISCOVER] Jobs Fetched: 5
[DISCOVER] First 3 Jobs: [...]
```

### 2. Client-Side Logging (apps/web/app/contractor/discover/components/ContractorDiscoverClient.tsx)

**Lines 72-84**: Component props logging showing:
- Total jobs passed from server
- Contractor location
- First job details with coordinates

**Lines 269-280**: Jobs coordinate processing showing:
- Total jobs
- Jobs WITH coordinates vs WITHOUT coordinates
- Sample of first 2 jobs

**Lines 143-173**: Radius filtering logging showing:
- Input vs output job counts
- Whether contractor has location set
- Selected radius
- Contractor coordinates

**To View**: Check your **browser console (F12 → Console)** for logs like:
```
[CLIENT] ContractorDiscoverClient Props: { totalJobs: 5, ... }
[CLIENT] Jobs with coordinates: { total: 5, withCoords: 2, withoutCoords: 3, ... }
[CLIENT] Filtering (no contractor location): { input: 5, output: 2, ... }
```

## Possible Root Causes

### Cause 1: Contractor Has No Location Set
**Symptom**: Server logs show `contractorLocation: null` or `latitude: null`

**Check**:
1. Server logs: Look for `[DISCOVER] Contractor Location:`
2. If null or no coordinates, contractor needs to set location

**Fix**:
- The LocationPromptModal should appear automatically
- Or contractor can manually set location via profile settings
- Or use the "Set Location" button on the Discover page

### Cause 2: Jobs Have No Coordinates
**Symptom**: Client logs show `withoutCoords: X` where X > 0

**Check**:
1. Browser console: Look for `[CLIENT] Jobs with coordinates:`
2. If `withoutCoords` is high, jobs aren't being geocoded

**Why This Happens**:
- Google Maps API key missing or invalid
- Job location string is invalid or not geocodable
- Geocoding service failed

**Fix**:
```bash
# Check if GOOGLE_MAPS_API_KEY is set
echo $GOOGLE_MAPS_API_KEY

# Check the .env.local file
cat apps/web/.env.local | grep GOOGLE_MAPS_API_KEY
```

### Cause 3: Jobs Filtered Out by Radius
**Symptom**: Client logs show large `input` but small `output` in filtering

**Check**:
1. Browser console: Look for `[CLIENT] Filtering (with contractor location):`
2. If output is 0 but input is >0, jobs are beyond selected radius

**Fix**:
- Increase the radius slider on the page (default is 10km)
- Check if contractor location is accurate
- Check if job coordinates are accurate

### Cause 4: Jobs Have Wrong Status
**Symptom**: Server logs show `Jobs Fetched: 0` but you know jobs exist

**Check Database**:
```sql
-- Check job statuses
SELECT id, title, status, latitude, longitude
FROM jobs
WHERE status = 'posted'
  AND contractor_id IS NULL
ORDER BY created_at DESC
LIMIT 10;
```

**Fix**: Jobs must have:
- `status = 'posted'`
- `contractor_id IS NULL`
- Valid `latitude` and `longitude`

### Cause 5: Contractor Already Bid on Jobs
**Symptom**: Jobs exist but are filtered out

**Check**:
```sql
-- Check if contractor has existing bids
SELECT job_id
FROM bids
WHERE contractor_id = 'YOUR_CONTRACTOR_ID';
```

**Why**: The server filters out jobs the contractor already bid on

### Cause 6: RLS Policies Blocking Jobs
**Symptom**: Server error in logs or 0 jobs fetched despite database having jobs

**Check Database RLS**:
```sql
-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'jobs';

-- Check policies
SELECT * FROM pg_policies
WHERE tablename = 'jobs';
```

**Expected Policies**:
- Contractors should be able to view all `posted` jobs with `contractor_id IS NULL`
- Check migration: `20250107000002_complete_rls_and_admin_overrides.sql`

## Testing Checklist

### Step 1: Create a Test Job
1. Log in as homeowner
2. Go to "Create Job"
3. Fill in all details including a valid UK address/postcode
4. Upload at least one photo
5. Submit the job
6. **Check server logs for geocoding**: Should see `[jobs] Updated job with geocoding data`

### Step 2: Set Contractor Location
1. Log in as contractor
2. Go to /contractor/discover
3. Click "Set Location" or allow browser geolocation
4. Verify location is saved (refresh and check if LocationPromptModal doesn't reappear)

### Step 3: Check Server Logs
```bash
# In your terminal where npm run dev is running
# Look for:
[DISCOVER] Contractor ID: ...
[DISCOVER] Contractor Location: ...
[DISCOVER] Jobs Fetched: ...
```

### Step 4: Check Browser Console
```
# In browser console (F12)
# Look for:
[CLIENT] ContractorDiscoverClient Props: ...
[CLIENT] Jobs with coordinates: ...
[CLIENT] Filtering ...
```

### Step 5: Verify Database State
```sql
-- Check contractor has location
SELECT id, email, latitude, longitude, city, postcode
FROM users
WHERE role = 'contractor'
  AND id = 'YOUR_CONTRACTOR_ID';

-- Check jobs have coordinates
SELECT id, title, status, latitude, longitude, location, contractor_id
FROM jobs
WHERE status = 'posted'
  AND contractor_id IS NULL
ORDER BY created_at DESC
LIMIT 5;
```

## Expected Behavior

### When Working Correctly:

1. **Server Logs**:
```
[DISCOVER] Contractor ID: abc123...
[DISCOVER] Contractor Location: { latitude: 51.5074, longitude: -0.1278, city: 'London', ... }
[DISCOVER] Query Error: null
[DISCOVER] Jobs Fetched: 5
[DISCOVER] First 3 Jobs: [
  { id: 'job1', title: 'Fix Sink', status: 'posted', lat: 51.5074, lng: -0.1278, location: '123 Main St, London SW1A 1AA' }
]
```

2. **Browser Console**:
```
[CLIENT] ContractorDiscoverClient Props: { totalJobs: 5, contractorId: 'abc123', contractorLocation: { latitude: 51.5074, ... } }
[CLIENT] Jobs with coordinates: { total: 5, withCoords: 5, withoutCoords: 0, sample: [...] }
[CLIENT] Filtering (with contractor location): { input: 5, output: 3, radius: 10, contractorLocation: { lat: 51.5074, lng: -0.1278 } }
```

3. **Map Display**:
- Shows contractor's location marker (arrow icon)
- Shows 3 job markers (colored circles)
- Clicking markers shows job details
- "View Details" button navigates to job

## Quick Fixes

### If contractor has no location:
```typescript
// Call the location API endpoint
fetch('/api/contractor/profile/location', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    latitude: 51.5074,
    longitude: -0.1278,
    address: '123 Main St',
    city: 'London',
    postcode: 'SW1A 1AA'
  })
});
```

### If jobs have no coordinates:
```sql
-- Manually update a job with coordinates
UPDATE jobs
SET latitude = 51.5074, longitude = -0.1278
WHERE id = 'YOUR_JOB_ID';
```

### If GOOGLE_MAPS_API_KEY is missing:
```bash
# Add to apps/web/.env.local
GOOGLE_MAPS_API_KEY=your_api_key_here
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
```

## Next Steps

1. **Run the app** and navigate to `/contractor/discover`
2. **Open browser console** (F12)
3. **Check terminal logs** where Next.js is running
4. **Compare output** with this guide
5. **Identify which scenario** matches your logs
6. **Apply the corresponding fix**

## Contact Points

If none of these fixes work, provide:
1. Complete server logs (the [DISCOVER] lines)
2. Complete browser console logs (the [CLIENT] lines)
3. Database query results for jobs and contractor
4. Screenshot of the map showing "No Jobs in This Area"
