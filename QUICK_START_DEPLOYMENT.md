# Quick Start - Deploy Week 1 Fixes

**⏱️ Total Time**: 30-40 minutes
**📋 Full Checklist**: See [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)

---

## 🚀 4 Simple Steps to Deploy

### Step 1: Start Docker Desktop (1 min)
```
1. Press Windows Key
2. Type "Docker Desktop"
3. Click to launch
4. Wait for "Docker is running" in system tray
```

### Step 2: Run Migrations (5 min)
```bash
cd c:\Users\Djodjo.Nkouka.ERICCOLE\Downloads\mintenance-clean

# Start local Supabase
npx supabase start

# Apply migrations
npx supabase db push

# Verify success
npx supabase db diff --local
# Should say: "No schema changes detected"
```

### Step 3: Configure Google Maps API Key (10 min)

**Get API Key**:
1. Go to https://console.cloud.google.com/
2. Enable "Geocoding API"
3. Create API Key (Credentials → Create Credentials)
4. Restrict key to "Geocoding API" only

**Add to Environment**:
```bash
# Edit apps/web/.env.local
# Add this line:
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
```

### Step 4: Test & Deploy (15 min)

**Test Locally**:
```bash
# Run type check
cd apps/web
npm run type-check

# Run build
npm run build

# Start dev server and test manually
npm run dev
# Visit: http://localhost:3000/jobs/create
# Create test job with address "London, UK"
# Verify lat/lng in database are not NULL
```

**Deploy to Production**:
```bash
# Push migrations to production
npx supabase db push --linked

# Commit and push code
git add .
git commit -m "feat: Week 1 critical fixes implemented"
git push origin main

# Add Google Maps API key to Vercel:
# 1. Go to vercel.com/dashboard
# 2. Project → Settings → Environment Variables
# 3. Add: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
# 4. Redeploy
```

---

## ✅ What Was Fixed

1. **Messages Table** - Real-time messaging now works
2. **Escrow Table Rename** - Security policies now apply correctly
3. **Job Discovery** - Contractors can see available jobs
4. **Location API** - Fixed column name mismatch (user_type → role)
5. **Bid Submission** - Added CSRF token (fixes 403 errors)
6. **Accept Bid Button** - Now functional with click handler
7. **TypeScript Types** - Fixed urgency type error
8. **Geocoding** - Jobs automatically get lat/lng coordinates
9. **Confirm Completion API** - New endpoint for homeowners

---

## 🧪 Quick Test After Deployment

1. **Create Job** → Should have lat/lng in database
2. **Submit Bid** → Should succeed (no 403 error)
3. **Accept Bid** → Button should work
4. **View Discovery** → Contractors should see jobs

---

## 🆘 Troubleshooting

**Docker won't start?**
- Restart computer
- Check Docker Desktop is installed

**Migrations fail?**
- Ensure Docker is running: `docker ps`
- Check error message in terminal

**Geocoding doesn't work?**
- Verify API key is correct
- Check Geocoding API is enabled in Google Cloud
- Check browser console for errors

**Need detailed help?**
- See [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)
- See [WEEK_1_CRITICAL_FIXES_IMPLEMENTED.md](WEEK_1_CRITICAL_FIXES_IMPLEMENTED.md)

---

**Ready?** → Start with Step 1: Launch Docker Desktop!
