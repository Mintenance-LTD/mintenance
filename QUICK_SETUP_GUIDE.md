# 🚀 Quick Setup Guide - Mintenance Web App

This guide will help you set up and run the Mintenance web application for testing.

---

## ⚡ Quick Start (5 Minutes)

### Step 1: Generate JWT Secret

Run this command to generate a secure JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output (64-character string).

### Step 2: Create Environment File

Create a file at `apps/web/.env.local` with the following content:

```env
# JWT Secret (paste the value from Step 1)
JWT_SECRET=<paste-your-generated-secret-here>

# Supabase Configuration
# Get these from: https://app.supabase.com/project/_/settings/api
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Stripe Configuration (Optional - for payment features)
STRIPE_SECRET_KEY=sk_test_your-test-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your-publishable-key
```

### Step 3: Install Dependencies (if not done)

```bash
npm install
```

### Step 4: Start the Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### Step 5: Run Tests

```bash
# Run all tests
npm run e2e

# Or run specific test suites
npx playwright test homepage.spec.js
npx playwright test auth.spec.js
npx playwright test features.spec.js
```

---

## 🔑 Getting Supabase Credentials

### If you have a Supabase project:

1. Go to https://app.supabase.com
2. Select your project
3. Navigate to **Settings** → **API**
4. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

### If you don't have a Supabase project:

1. Go to https://supabase.com
2. Click "Start your project"
3. Create a new project (free tier available)
4. Wait for database to be created (~2 minutes)
5. Follow the steps above to get your credentials

---

## 🗄️ Database Setup

### Option 1: Use Existing Database

If you have an existing Supabase project with the schema, you're all set!

### Option 2: Set Up New Database

1. In your Supabase project, go to **SQL Editor**
2. Run the migration files in this order:
   ```
   - supabase-setup.sql
   - database-rls-setup.sql
   - enhanced-jobs-migration.sql
   - (other migration files as needed)
   ```

### Option 3: Testing Without Real Database

For quick testing without database connectivity:
- Authentication will fail (expected)
- Static pages will work (homepage, about, terms, privacy)
- Protected pages will redirect to login

---

## 💳 Stripe Setup (Optional)

### For Full Payment Testing:

1. Go to https://stripe.com
2. Create account or sign in
3. Enable **Test Mode** (toggle in dashboard)
4. Navigate to **Developers** → **API Keys**
5. Copy:
   - **Publishable key** → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - **Secret key** → `STRIPE_SECRET_KEY`
6. Navigate to **Developers** → **Webhooks**
7. Add endpoint: `http://localhost:3000/api/webhooks/stripe`
8. Copy webhook secret → `STRIPE_WEBHOOK_SECRET`

### For Testing Without Stripe:

Payment features will show errors, but other features will work.

---

## 🧪 Test Execution

### Running Tests with Browser UI

```bash
npm run e2e:ui
```

This opens Playwright's UI where you can:
- See all available tests
- Run tests individually
- Watch tests execute in real-time
- Debug failed tests

### Running Specific Browsers

```bash
# Chromium only
npx playwright test --project=chromium

# Firefox only
npx playwright test --project=firefox

# Mobile Chrome
npx playwright test --project="Mobile Chrome"

# All browsers
npx playwright test
```

### Debugging Failed Tests

```bash
# Run with headed browser (see what's happening)
npx playwright test --headed

# Run with debug mode
npx playwright test --debug

# Run specific test
npx playwright test homepage.spec.js:5
```

---

## 🎯 What to Test

### 1. **Homepage** (`/`)
- [ ] Page loads successfully
- [ ] Navigation links work
- [ ] "Get Started" buttons work
- [ ] Responsive on mobile
- [ ] No console errors

### 2. **Registration** (`/register`)
- [ ] Form displays correctly
- [ ] Role selection (Homeowner/Contractor)
- [ ] Form validation works
- [ ] Password requirements shown
- [ ] Registration creates account

### 3. **Login** (`/login`)
- [ ] Form displays correctly
- [ ] Login with valid credentials
- [ ] Error handling for invalid credentials
- [ ] "Forgot Password" link works
- [ ] Redirects to dashboard after login

### 4. **Dashboard** (`/dashboard`)
- [ ] Displays user information
- [ ] Quick action links work
- [ ] Logout functionality
- [ ] Protected from unauthenticated access

### 5. **Search** (`/search`)
- [ ] Search bar functional
- [ ] Filters can be applied
- [ ] Results display correctly
- [ ] Toggle between Jobs and Contractors

### 6. **Other Pages**
- [ ] `/contractors` - Contractor listings
- [ ] `/jobs` - Job listings
- [ ] `/messages` - Messaging interface
- [ ] `/payments` - Payment dashboard
- [ ] `/discover` - Swipeable discovery
- [ ] `/analytics` - Analytics dashboard

---

## 🐛 Troubleshooting

### Problem: "Cannot GET /"

**Solution**: The dev server hasn't started properly.
```bash
# Kill existing node processes
taskkill /F /IM node.exe

# Restart dev server
cd apps/web
npm run dev
```

### Problem: "JWT_SECRET is required"

**Solution**: You haven't created `.env.local` file.
- Follow Step 2 above
- Make sure the file is in `apps/web/.env.local`

### Problem: Database connection errors

**Solution**: Check your Supabase credentials.
```bash
# Test connection
curl https://your-project.supabase.co/rest/v1/
```

### Problem: Tests timeout

**Solution**: Increase timeout in `playwright.config.js`:
```js
use: {
  timeout: 60000, // Increase to 60 seconds
}
```

### Problem: Port 3000 already in use

**Solution**: 
```bash
# Find process using port 3000
netstat -ano | findstr :3000

# Kill the process (replace PID)
taskkill /PID <process-id> /F

# Or use a different port
cd apps/web
npx next dev -p 3001
```

---

## 📊 Expected Test Results

With proper environment setup:

| Test Suite | Total Tests | Expected Pass |
|------------|-------------|---------------|
| Homepage | 5 | 5 (100%) |
| Authentication | 5 | 5 (100%) |
| Features | 32 | 30+ (90%+) |
| Security | 5 | 5 (100%) |
| Performance | 5 | 4+ (80%+) |
| **Total** | **384** | **350+ (90%+)** |

Note: Some tests may fail if database doesn't have test data or if external services aren't configured.

---

## 🎉 Success Checklist

- [ ] Environment variables configured
- [ ] Dev server starts without errors
- [ ] Homepage loads at http://localhost:3000
- [ ] Can navigate to login/register pages
- [ ] At least 90% of tests pass
- [ ] No critical console errors
- [ ] Mobile responsive design works

---

## 📞 Need Help?

1. Check existing documentation:
   - `README.md` - Main documentation
   - `API_DOCUMENTATION.md` - API reference
   - `DEPLOYMENT_GUIDE.md` - Deployment instructions

2. Review test output:
   - `test-results/` folder contains screenshots and videos of failed tests
   - `playwright-report/` contains HTML report

3. Check logs:
   - Browser console (F12)
   - Terminal output
   - Network tab for API errors

---

**Setup Time**: 5-10 minutes  
**First Test Run**: ~5 minutes (initial setup)  
**Subsequent Runs**: ~2-3 minutes

Good luck with testing! 🚀

