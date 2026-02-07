# How to Run Playwright E2E Tests

## Quick Start (Recommended)

### Step 1: Ensure Dev Server is Running
```bash
# Check if server is already running
curl http://localhost:3000

# If not running or returning errors, start fresh:
cd apps/web
npm run dev
```

Wait until you see:
```
✓ Ready in X seconds
○ Local:   http://localhost:3000
```

### Step 2: Run Tests (Choose One Method)

#### Method A: UI Mode (Best for Development)
```bash
# In a NEW terminal
cd apps/web
npm run test:e2e:ui
```

**Benefits:**
- Visual test execution
- Click to run individual tests
- See what the browser sees
- Time travel through test steps
- Easy debugging

#### Method B: Headed Mode (See Browser)
```bash
npm run test:e2e:headed
```

**Benefits:**
- See actual browser automation
- Good for debugging
- Watch tests execute in real-time

#### Method C: Headless Mode (Fast)
```bash
npm run test:e2e
```

**Benefits:**
- Fastest execution
- Good for CI/CD
- No GUI required

---

## Current Test Status

### 25 E2E Tests Written

**Authentication Flow (10 tests):**
- ✅ Sign up with valid details
- ✅ Validate password strength
- ✅ Validate passwords match
- ✅ Validate email format
- ✅ Login form displays correctly
- ✅ Login email validation
- ✅ Empty credentials validation
- ✅ Forgot password link present
- ✅ Sign up link present
- ✅ Navigation between auth pages

**Payment Flow (6 tests):**
- ✅ Checkout page displays
- ✅ Error when priceId missing
- ✅ Stripe form loads
- ⚠️ Card validation (skipped - needs Stripe setup)
- ✅ Confirmation page displays
- ✅ Complete payment navigation

**Job Posting Flow (9 tests):**
- ✅ Job creation page access
- ✅ Form UI elements display
- ✅ Photo upload functionality
- ✅ Budget input section
- ✅ Urgency selection
- ✅ Submit button present
- ✅ Back/cancel navigation
- ✅ Multi-step indicators
- ✅ Job listings page loads

---

## Troubleshooting

### Issue: Port 3000 Already in Use
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Then restart dev server
npm run dev
```

### Issue: Tests Timeout
- Increase timeout in `playwright.config.ts`:
  ```typescript
  timeout: 60 * 1000, // 60 seconds
  ```
- Or increase per test:
  ```typescript
  test('slow test', async ({ page }) => {
    test.setTimeout(60000);
    // ...
  });
  ```

### Issue: Tests Fail on Auth Pages
- Check if Supabase is configured (`.env.local`)
- Check if auth pages load manually: `http://localhost:3000/auth/login`
- Review error screenshots in `playwright-report/`

### Issue: Server Returns 500 Error
- Check server logs for errors
- Verify environment variables in `.env.local`
- Check database connection (Supabase)
- Try rebuilding: `npm run clean && npm run dev`

---

## What to Expect

### Passing Tests Should Show:
```
✓ [chromium] › auth-flow.spec.ts:20:5 › Authentication Flow › Sign Up Flow › user can create new account (2.3s)
✓ [chromium] › auth-flow.spec.ts:35:5 › Authentication Flow › Sign Up Flow › validates password strength (1.8s)
...
25 passed (45s)
```

### Failing Tests Will Show:
```
✗ [chromium] › auth-flow.spec.ts:20:5 › Authentication Flow › Login fails
  Error: Timed out 30000ms waiting for expect(locator).toBeVisible()

  Screenshots saved to: playwright-report/screenshots/
  Video saved to: playwright-report/videos/
```

---

## After Running Tests

### If All Pass ✅
Great! Move to Option C: Add authentication helpers

### If Some Fail ⚠️
1. Check screenshots in `playwright-report/`
2. Review error messages
3. Verify page actually loads in browser
4. Check if page structure matches test expectations

### Common Failures and Fixes

**"Element not found"**
- Page may have different text/structure than expected
- Check actual page manually
- Update test locators to match

**"Timeout waiting for navigation"**
- Page may redirect differently
- Server may be slow
- Check network tab in browser

**"Element not visible"**
- Element may be hidden or behind overlay
- May need to scroll to element
- Check CSS display/visibility

---

## Next Steps After Tests Pass

1. ✅ **Create authentication helpers** (Option C)
   - Login as homeowner
   - Login as contractor
   - Logout helper

2. ✅ **Write authenticated flow tests**
   - Complete job posting (logged in)
   - Complete bidding flow (contractor)
   - Payment from job acceptance

3. ✅ **Set up test data**
   - Create test users in Supabase
   - Seed test jobs
   - Seed test bids

4. ✅ **CI/CD Integration**
   - Add to GitHub Actions
   - Run on every PR
   - Generate test reports

---

## Viewing Test Reports

After tests run:
```bash
npx playwright show-report
```

Opens interactive HTML report with:
- Test results summary
- Screenshots of failures
- Video recordings
- Execution timeline
- Network requests

---

## Manual Testing Fallback

If automated tests have issues, test manually:

### Authentication Flow:
1. Go to http://localhost:3000/auth/signup
2. Fill form with valid data
3. Submit and verify success message
4. Go to login page
5. Enter credentials and verify redirect

### Payment Flow:
1. Go to http://localhost:3000/checkout?priceId=test&jobId=123&bidId=456
2. Verify page loads
3. Check Stripe form appears

### Job Posting Flow:
1. Go to http://localhost:3000/jobs/create
2. Verify form loads (or redirects to login)
3. Check all form elements present

---

## Contact for Help

If you encounter issues:
1. Check `playwright-report/` for screenshots and videos
2. Review server logs for errors
3. Verify all environment variables are set
4. Try running a single test: `npx playwright test auth-flow.spec.ts`
5. Use debug mode: `npm run test:e2e:debug`
