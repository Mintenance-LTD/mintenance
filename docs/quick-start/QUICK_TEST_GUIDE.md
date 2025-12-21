# Quick Test Guide - Contractor Verification System

## 🚀 Quick Start (30 seconds)

```bash
# 1. Start dev server
npm run dev

# 2. Open browser
http://localhost:3000/test-verification

# 3. Click buttons and test!
```

---

## 🧪 What to Test

### 1. DBS Check Modal ⏱️ 2 minutes
- [ ] Click "Test DBS Check Modal"
- [ ] See 3 options (£23, £26, £50)
- [ ] Enhanced shows "MOST POPULAR" badge
- [ ] Click "Enhanced" → Click "Continue"
- [ ] See confirmation screen
- [ ] Click "Initiate Check"
- [ ] See success screen

**Expected**: Modal opens, progresses through steps, closes on success

### 2. Personality Test Modal ⏱️ 3 minutes
- [ ] Click "Test Personality Modal"
- [ ] See intro screen with "10-15 Minutes" info
- [ ] Click "Start Assessment"
- [ ] Answer first question (click any 1-5 option)
- [ ] Click "Next" (should work now)
- [ ] Try clicking "Previous"
- [ ] Progress bar shows "2/50"
- [ ] Click through to question 50
- [ ] Click "Submit" on last question
- [ ] See processing screen
- [ ] See results with 5 trait scores

**Expected**: 50 questions, smooth navigation, results display

### 3. Profile Boost Widget ⏱️ 1 minute
- [ ] Widget loads on right sidebar
- [ ] Shows ranking score (0-100)
- [ ] Shows tier badge
- [ ] Progress bar animates
- [ ] Missing verifications show (if any)
- [ ] Click "Complete DBS Check" → Opens DBS modal
- [ ] Click "Take Personality Test" → Opens Personality modal

**Expected**: Widget displays data, buttons open modals

---

## ✅ Success Criteria

| Component | Working? | Notes |
|-----------|----------|-------|
| DBS Modal opens | ⬜ | Click button |
| DBS shows 3 options | ⬜ | Basic, Standard, Enhanced |
| Personality Modal opens | ⬜ | Click button |
| Personality shows 50 questions | ⬜ | Check progress X/50 |
| Widget displays score | ⬜ | Shows 0-100 number |
| Widget opens modals | ⬜ | Action buttons work |

---

## 🐛 Common Issues

### "401 Unauthorized" Error
**Cause**: Not logged in as contractor
**Fix**: Login as contractor user first

### "Cannot find module" Error
**Cause**: Missing dependencies
**Fix**: Run `npm install`

### "Database error" Message
**Cause**: Supabase not running
**Fix**: Run `npx supabase start`

### Modal doesn't open
**Cause**: JavaScript error in console
**Fix**: Check browser console, refresh page

---

## 📊 Expected Console Output

### When DBS Modal Opens
```
DBS Check Modal opened
```

### When DBS Check Submitted
```
POST /api/contractor/dbs-check
Status: 200 OK
Response: { success: true, checkId: "..." }
```

### When Personality Test Loads
```
GET /api/contractor/personality-assessment
Status: 200 OK
Response: { questions: [...50 items] }
```

### When Personality Test Submitted
```
POST /api/contractor/personality-assessment
Status: 200 OK
Response: { success: true, result: {...} }
```

---

## 🎯 Quick Checks

### TypeScript OK?
```bash
cd apps/web && npx tsc --noEmit | grep "components/contractor"
# Should show: No errors
```

### Files Exist?
```bash
ls apps/web/components/contractor/DBS*.tsx
ls apps/web/components/contractor/Person*.tsx
ls apps/web/components/contractor/Profile*.tsx
# Should show: 3 files found
```

### APIs Exist?
```bash
ls apps/web/app/api/contractor/dbs-check/route.ts
ls apps/web/app/api/contractor/personality-assessment/route.ts
ls apps/web/app/api/contractor/profile-boost/route.ts
# Should show: 3 files found
```

---

## 📱 Mobile Testing

```bash
# 1. Get your local IP
ipconfig  # Windows
ifconfig  # Mac/Linux

# 2. Open on phone
http://YOUR_IP:3000/test-verification

# 3. Test touch interactions
```

---

## 🔍 Debugging Tips

### Check Network Tab
1. Open DevTools (F12)
2. Go to Network tab
3. Click button to trigger API call
4. Look for `/api/contractor/*` requests
5. Check Status (should be 200 or 201)
6. Click request → Preview → See response data

### Check Console
1. Open DevTools (F12)
2. Go to Console tab
3. Look for errors (red text)
4. Look for warnings (yellow text)
5. Check our log messages

### Check React DevTools
1. Install React DevTools extension
2. Open Components tab
3. Find DBSCheckModal or PersonalityTestModal
4. Inspect state (step, answers, loading, etc.)

---

## 📸 Screenshots to Take

1. Test page overview
2. DBS Modal - Selection step
3. DBS Modal - Confirmation step
4. DBS Modal - Success step
5. Personality Modal - Intro screen
6. Personality Modal - Question screen (show progress)
7. Personality Modal - Results screen
8. Profile Boost Widget (with data)
9. Verification Badges (all layouts)
10. Profile Boost Meter (all tiers)

---

## ⏱️ Full Test Time Estimate

| Test | Time |
|------|------|
| DBS Check Modal | 2 min |
| Personality Test Modal | 3 min |
| Profile Boost Widget | 1 min |
| Verification Badges | 30 sec |
| Profile Boost Meter | 30 sec |
| **TOTAL** | **~7 minutes** |

---

## 🎉 When All Tests Pass

✅ All components rendered correctly
✅ All modals opened and closed
✅ All API calls successful
✅ No console errors
✅ No TypeScript errors

**YOU'RE READY TO INTEGRATE INTO THE APP!**

---

## 📞 Need Help?

1. Check browser console for errors
2. Check Network tab for failed API calls
3. Review VERIFICATION_SYSTEM_TESTING_GUIDE.md
4. Review TEST_RESULTS.md

---

**Happy Testing! 🚀**
