# Testing Guide - Job System Fixes

## 🧪 Quick Testing Checklist

### Prerequisites
```bash
# Ensure environment variables are set
GOOGLE_MAPS_API_KEY=your_key
NEXT_PUBLIC_SUPABASE_URL=your_url
SUPABASE_SERVICE_ROLE_KEY=your_key
```

### Test 1: Database Schema ✅
```bash
# Check if migration was applied
cd c:/Users/Djodjo.Nkouka.ERICCOLE/Downloads/mintenance-clean
npx supabase db diff --local

# Should show no pending migrations for job_system_complete
```

### Test 2: Storage Buckets ✅
```bash
# Verify buckets exist and are accessible
npx tsx scripts/check-storage-buckets.ts

# Expected output:
# ✅ job-attachments bucket: Exists
# ✅ Job-storage bucket: Exists
```

### Test 3: Existing Jobs Geocoded ✅
```bash
# Check geocoding status
npx tsx scripts/check-real-jobs.ts

# Look for:
# 📍 Jobs missing geolocation: 0
# All jobs should have Lat/Lng values
```

### Test 4: Job Creation Flow
1. **Start dev server**
   ```bash
   cd apps/web
   npm run dev
   ```

2. **Login as homeowner**
   - Go to http://localhost:3000/login
   - Use test account: `test.homeowner@mintenance.com`

3. **Create new job**
   - Navigate to `/jobs/create`
   - Fill in all fields:
     - Title: "Test Kitchen Repair"
     - Category: Kitchen Renovation
     - Description: Detailed description (min 50 chars)
     - Location: "123 Baker Street, London NW1 6XE"
     - Budget: £10,000 - £15,000
     - Upload 1-3 test images (JPEG/PNG, max 5MB each)

4. **Verify job creation**
   - Check job appears in dashboard
   - Open browser DevTools Network tab
   - Look for:
     - POST to `/api/jobs/upload-photos` (returns URLs)
     - POST to `/api/jobs` (creates job)
   - Verify response includes `job.id`

5. **Check database**
   ```bash
   npx tsx scripts/check-real-jobs.ts
   ```
   - New job should appear
   - Should have lat/lng
   - Should have image count > 0

### Test 5: Job Edit Page
1. **Navigate to job details**
   - Click on any job from dashboard
   - Click "Edit Job" button
   - URL: `/jobs/[id]/edit`

2. **Verify data loads**
   - ✅ Title shows real job title (not "Kitchen Renovation" placeholder)
   - ✅ Budget shows actual values
   - ✅ Location shows real address
   - ✅ Images display (if job has images)
   - ✅ All form fields populated with real data

3. **Make changes**
   - Update job title
   - Change budget
   - Add new requirement
   - Click "Save Changes"

4. **Verify update**
   - Check success toast notification
   - Refresh page - changes should persist
   - Run: `npx tsx scripts/check-real-jobs.ts`
   - Look for updated data

### Test 6: Image Upload
1. **Create or edit a job**
2. **Click "Upload Images"**
3. **Select 2-3 images**
   - Test with: JPG, PNG, WebP
   - Test max size (5MB limit)
4. **Watch for:**
   - Upload progress indicator
   - Success message
   - Images appear in preview
5. **Submit job/changes**
6. **Verify in database:**
   ```bash
   npx tsx scripts/check-real-jobs.ts
   ```
   - Job should show "Images: X attachments"

### Test 7: Geolocation & Contractor Matching
1. **Create job with valid UK address**
   - Example: "45 Oxford Street, Westminster, London W1D 2DZ"

2. **Check logs (in terminal running dev server)**
   - Look for: "Updated job with geocoding data"
   - Should show lat/lng values

3. **Query database directly:**
   ```sql
   SELECT id, title, latitude, longitude
   FROM jobs
   WHERE id = 'your-job-id';
   ```

4. **Verify contractor notifications**
   ```sql
   SELECT * FROM notifications
   WHERE type = 'job_nearby'
   ORDER BY created_at DESC
   LIMIT 5;
   ```
   - Should see notifications if contractors exist with locations

### Test 8: Dashboard Page
1. **Navigate to `/dashboard`**
2. **Page should load without errors**
   - ✅ No "Cannot read properties of undefined" error
   - ✅ Shows welcome message with user name
   - ✅ Displays metrics (active jobs, completed, etc.)
   - ✅ Shows active jobs list
   - ✅ Recent activity timeline visible

3. **Check browser console**
   - Should be no red errors
   - May have warnings (acceptable)

### Test 9: Contractor Discovery (If contractors exist)
1. **Login as contractor**
   - Use test account: `test.contractor@mintenance.com`

2. **Navigate to jobs**
   - Go to `/contractor/jobs-near-you`

3. **Verify job listing**
   - Jobs should appear based on distance
   - Skills matching applied
   - Can save job
   - Can view job details

### Test 10: End-to-End Flow
1. **Homeowner creates job with images**
   - Title: "Bathroom Renovation"
   - Location: Valid London address
   - Upload 3 images
   - Budget: £8,000 - £12,000

2. **Verify immediate effects:**
   ```bash
   npx tsx scripts/check-real-jobs.ts
   ```
   - Job appears with all data
   - Has lat/lng
   - Has 3 attachments

3. **Edit the job**
   - Change title to "Complete Bathroom Remodel"
   - Update budget to £10,000 - £15,000
   - Add requirement "Gas Safe certified"
   - Save

4. **Verify edit persisted:**
   ```bash
   npx tsx scripts/check-real-jobs.ts
   ```
   - Shows updated title and budget

5. **Check audit log (in database):**
   ```sql
   SELECT * FROM job_audit_log
   WHERE job_id = 'your-job-id'
   ORDER BY changed_at DESC;
   ```
   - Should show INSERT and UPDATE entries

---

## 🐛 Troubleshooting

### Issue: Images not uploading
**Check:**
1. Browser DevTools → Network tab
2. Look for POST to `/api/jobs/upload-photos`
3. Check response status

**Common causes:**
- File too large (>5MB)
- Invalid file type (must be JPG, PNG, WebP, GIF)
- Missing SUPABASE_SERVICE_ROLE_KEY
- Storage bucket doesn't exist

**Fix:**
```bash
npx tsx scripts/check-storage-buckets.ts
```

### Issue: Geocoding not working
**Check:**
1. Server logs for "geocoding" errors
2. Verify GOOGLE_MAPS_API_KEY is set

**Test API key:**
```bash
curl "https://maps.googleapis.com/maps/api/geocode/json?address=London&key=YOUR_KEY"
```

**Fix:**
- Add key to `apps/web/.env.local`
- Restart dev server

### Issue: Dashboard error persists
**Clear Next.js cache:**
```bash
cd apps/web
rm -rf .next
npm run dev
```

### Issue: Job edit shows empty data
**Check:**
1. Browser console for errors
2. Network tab for `/api/jobs/[id]` response

**Verify API response includes:**
- `job.title`
- `job.description`
- `job.budget.min` and `job.budget.max`
- `job.location.address`

---

## ✅ Success Criteria

All tests pass if:
- ✅ No database errors
- ✅ Images upload and display
- ✅ Jobs get geocoded automatically
- ✅ Edit page shows real data
- ✅ Dashboard loads without errors
- ✅ Contractors see nearby jobs
- ✅ Audit log records all changes

---

## 📊 Performance Benchmarks

### Expected Response Times
- Job creation: <2s (including geocoding)
- Image upload: <1s per image
- Job list fetch: <500ms
- Job edit load: <800ms
- Dashboard load: <1.5s

### Database Queries
- Job with attachments: ~2 queries
- Nearby contractors: ~3 queries
- Dashboard data: ~8 queries (parallel)

---

## 🎯 Next Steps After Testing

1. **If all tests pass:**
   - System is ready for production
   - Can onboard real users
   - Monitor error rates and performance

2. **If tests fail:**
   - Check specific test section above
   - Review error logs
   - Run diagnostic scripts
   - Consult troubleshooting guide

3. **For production deployment:**
   - Set production environment variables
   - Run `npm run build` to test production build
   - Deploy to Vercel/hosting platform
   - Monitor with error tracking (Sentry, etc.)

---

## 📞 Need Help?

Run diagnostics:
```bash
# Full system check
npm run type-check              # TypeScript errors
npx tsx scripts/check-real-jobs.ts  # Database health
npx tsx scripts/check-storage-buckets.ts  # Storage health
```

Check logs:
```bash
# Server logs (in terminal running dev server)
# Browser DevTools → Console tab
# Browser DevTools → Network tab
```