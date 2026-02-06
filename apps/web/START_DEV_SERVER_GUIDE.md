# How to Start Dev Server for E2E Tests

## Issue: Port 3000 Already in Use

The dev server can't start because something is already running on port 3000, but it's not responding properly.

## Solution: Kill the Process and Start Fresh

### Step 1: Find the Process Using Port 3000

**On Windows:**
```bash
netstat -ano | findstr :3000
```

You'll see output like:
```
TCP    0.0.0.0:3000    0.0.0.0:0    LISTENING    12345
```

The last number (12345) is the PID (Process ID).

### Step 2: Kill the Process

**On Windows:**
```bash
taskkill /PID 12345 /F
```

Replace `12345` with the actual PID from Step 1.

**Alternative: Kill all Node processes (nuclear option)**
```bash
taskkill /F /IM node.exe
```

### Step 3: Start Dev Server

```bash
cd apps\web
npm run dev
```

Wait until you see:
```
✓ Ready in X seconds
○ Local:   http://localhost:3000
```

### Step 4: Verify Server is Working

Open browser and go to: `http://localhost:3000`

You should see the homepage (not an error).

### Step 5: Run E2E Tests

**Option A: UI Mode (Visual)**
```bash
# In a NEW terminal
cd apps\web
npm run test:e2e:ui
```

**Option B: Headless Mode (Fast)**
```bash
npm run test:e2e
```

---

## Quick Commands Reference

### Windows
```bash
# Find process on port 3000
netstat -ano | findstr :3000

# Kill specific process
taskkill /PID <PID> /F

# Kill all node processes
taskkill /F /IM node.exe

# Start dev server
cd apps\web
npm run dev

# Run tests (after server starts)
npm run test:e2e:ui
```

---

## Troubleshooting

### Server starts but shows errors
**Check .env.local file:**
- Supabase URL and keys configured?
- Database accessible?
- All required environment variables set?

### Tests still fail with ERR_ABORTED
**Check server is actually ready:**
1. Open `http://localhost:3000` in browser
2. Verify homepage loads without errors
3. Check browser console for errors
4. Check server terminal for errors

### Tests timeout at 30 seconds
**Increase timeout in playwright.config.ts:**
```typescript
timeout: 60 * 1000, // 60 seconds instead of 30
```

---

## Alternative: Use Different Port

If you can't kill the process on 3000, use a different port:

### Step 1: Start on Different Port
```bash
cd apps\web
PORT=3001 npm run dev
```

### Step 2: Update Playwright Config
Edit `playwright.config.ts`:
```typescript
baseURL: 'http://localhost:3001',
```

### Step 3: Run Tests
```bash
npm run test:e2e
```

---

## Expected Test Results (When Working)

You should see:
```
Running 44 tests using 8 workers

✓ [chromium] › auth-flow.spec.ts › user can create new account (2.3s)
✓ [chromium] › auth-flow.spec.ts › validates password strength (1.8s)
✓ [chromium] › payment-flow.spec.ts › checkout page displays (1.5s)
...

44 passed (1.2m)
```

---

## Manual Testing Alternative

If automated tests continue to have issues, test manually:

### 1. Auth Flow
- Go to http://localhost:3000/auth/signup
- Fill form and submit
- Go to http://localhost:3000/auth/login
- Fill form and submit

### 2. Job Posting (Requires Login)
- Login as homeowner
- Go to http://localhost:3000/jobs/create
- Fill form and submit

### 3. Contractor Flow (Requires Login)
- Login as contractor
- Go to http://localhost:3000/contractor/discover
- View jobs and bid form

---

## Need Help?

1. Check server logs for errors
2. Check browser console for errors
3. Verify environment variables are set
4. Try restarting your computer (clears all processes)
5. Check [RUN_TESTS_GUIDE.md](RUN_TESTS_GUIDE.md) for more troubleshooting
