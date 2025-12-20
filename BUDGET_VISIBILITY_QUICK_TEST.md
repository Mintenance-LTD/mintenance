# 🚀 Quick Test Guide - Budget Visibility

## ⚡ 3-Minute Test

### Step 1: Test Job Creation (2 mins)
1. Open: http://localhost:3000/jobs/create
2. Fill in basic details (title, description, location)
3. Go to Step 3: Budget & Timeline
4. Enter budget: **£1,000**
5. **Verify:**
   - ✅ Auto-calculated range shows: "£900 - £1,100"
   - ✅ "Hide budget" is **checked by default**
   - ✅ "Require itemization" is **checked**
   - ✅ Toast notification shows "Expected savings: 15-25%"

### Step 2: Test Contractor View (1 min)
1. Open: http://localhost:3000/contractor/discover
2. Find your test job
3. **Verify:**
   - ✅ Shows "£900-£1,100" (NOT "£1,000")
   - ✅ Shows "Itemization required ✓" badge

### Step 3: Test Database (30 secs)
Run in Supabase SQL Editor:
```sql
SELECT title, budget, budget_min, budget_max, show_budget_to_contractors, require_itemized_bids
FROM jobs
ORDER BY created_at DESC
LIMIT 1;
```

**Expected:**
- `budget`: 1000
- `budget_min`: 900
- `budget_max`: 1100
- `show_budget_to_contractors`: false
- `require_itemized_bids`: true

---

## 🎯 Key Features to Test

### Feature 1: Auto-Range Calculation
- Enter any budget → Range auto-calculates to ±10%
- £500 → £450-£550
- £1,000 → £900-£1,100
- £2,500 → £2,250-£2,750

### Feature 2: Auto-Itemization Threshold
- Budget ≤ £500 → "Require itemization" **unchecked**
- Budget > £500 → "Require itemization" **auto-checked**

### Feature 3: Budget Visibility Toggle
- **Hidden** (default): Contractors see range only
- **Shown**: Contractors see exact amount
- Toast notification confirms savings potential

### Feature 4: Advanced Options
- Click "Advanced" → Manually edit min/max
- Custom ranges override auto-calculation
- Photo requirement warning if no images uploaded

---

## 🐛 Common Issues

### Issue: Range not updating
**Fix:** Ensure you're typing in the budget input field, not the range fields

### Issue: Itemization not auto-checking
**Fix:** Budget must be > £500. Try entering £600.

### Issue: Job card not showing range
**Fix:** Ensure `show_budget_to_contractors` is `false` in the database

---

## 📊 Database Quick Checks

### Check Migration Applied
```sql
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'jobs'
AND column_name IN ('budget_min', 'budget_max', 'show_budget_to_contractors', 'require_itemized_bids');
```
**Expected:** 4 rows

### Check Test Job
```sql
SELECT * FROM jobs WHERE title LIKE '%test%' ORDER BY created_at DESC LIMIT 1;
```

### Check Analytics View
```sql
SELECT * FROM budget_anchoring_analytics LIMIT 5;
```

---

## ✅ Success Criteria

All of these should be true:
- [ ] Budget range auto-calculates when entering budget
- [ ] "Hide budget" toggle is checked by default
- [ ] "Require itemization" auto-enables for budgets > £500
- [ ] Contractor job cards show ranges (not exact budgets)
- [ ] "Itemization required" badge appears on job cards
- [ ] Database fields are populated correctly
- [ ] No TypeScript errors in console
- [ ] No runtime errors in dev server

---

## 🎉 If All Tests Pass

You're ready to:
1. ✅ Mark Phase 1 & 2 as complete
2. ✅ Deploy to staging environment
3. ✅ Begin user acceptance testing
4. ✅ Plan Phase 3 implementation (bid submission enforcement)

---

**Dev Server:** http://localhost:3000
**Supabase:** https://app.supabase.com/project/ukrjudtlvapiajkjbcrd

**Status:** ✅ Ready for testing!
