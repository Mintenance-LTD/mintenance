# Manual Vercel Deployment Guide

## Important: Monorepo Configuration

This project uses a monorepo structure with multiple apps and shared packages. The web app is located in `apps/web/` and depends on shared packages in `packages/`.

**Recent Fixes Applied:**
- ✅ Updated vercel.json with correct monorepo build commands
- ✅ Removed hardcoded secrets from vercel.json (now use Vercel dashboard)
- ✅ Consolidated CSP headers (removed duplicates)
- ✅ Added health check endpoint at `/api/health`

## Step 1: Authenticate with Vercel

**Run this command in your terminal:**
```bash
vercel login
```

**What happens:**
- Vercel will show a URL like `https://vercel.com/oauth/device?user_code=XXXX-XXXX`
- Copy that URL and paste it in your browser
- Login to Vercel (create account if needed)
- Authorize the CLI access

**Expected output after successful login:**
```
Success! Vercel CLI is now logged in.
```

## Step 2: Deploy to Vercel

**IMPORTANT: Deploy from project root (not from apps/web)**

```bash
# Make sure you're in the project root
cd /path/to/mintenance

# Deploy the application
vercel
```

**What happens during deployment:**
- Vercel will detect it's a Next.js project
- The build command will install all dependencies and build packages first
- Then it will build the web app with all dependencies resolved
- It will ask you to confirm the project settings

**Expected questions during deployment:**
1. **Project name**: Press Enter to use "mintenance-web" (from vercel.json)
2. **Directory**: Root directory (Vercel will use buildCommand from vercel.json)
3. **Build settings**: Should auto-detect Next.js configuration

**Monorepo Build Process:**
The updated vercel.json runs:
1. `npm ci` - Installs all workspace dependencies
2. `npm run build:web` - Builds shared packages first, then web app

## Step 3: Add Environment Variables

**CRITICAL: Environment variables MUST be configured in Vercel dashboard**

The hardcoded secrets have been removed from vercel.json for security. You MUST add them in the Vercel project settings:

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Find your project (should be named "mintenance-web")
3. Go to **Settings** → **Environment Variables**
4. Add ALL required variables for ALL environments (Production, Preview, Development)

### Required Environment Variables:

**Supabase Configuration:**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://ukrjudtlvapiajkjbcrd.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
SUPABASE_ANON_KEY=<your-anon-key>
```

**JWT Configuration:**
```bash
JWT_SECRET=<your-secure-jwt-secret-min-32-chars>
```

**Stripe Configuration:**
```bash
STRIPE_SECRET_KEY=sk_test_<your-test-key-or-sk_live-for-production>
STRIPE_WEBHOOK_SECRET=whsec_<your-webhook-secret>
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_<your-test-key-or-pk_live-for-production>
```

**App Configuration:**
```bash
NEXT_PUBLIC_APP_URL=<will-be-set-automatically-by-vercel>
NODE_ENV=production
```

**Redis Configuration (Optional - for rate limiting):**
```bash
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token
```

**Note:** If Redis is not configured, the app will gracefully degrade to in-memory rate limiting at 10% capacity.

### Node.js Version:
Go to **Settings** → **General** → **Node.js Version** and set to **20.x**

## Step 4: Redeploy with Environment Variables

After adding environment variables:

```bash
vercel --prod
```

This will trigger a production deployment with all your environment variables.

## Step 5: Verify Deployment

1. **Check the deployment URL** - Vercel will show you the live URL
2. **Test the health endpoint**:
   ```bash
   curl https://your-app.vercel.app/api/health
   ```
   Expected response:
   ```json
   {
     "status": "healthy",
     "timestamp": "2025-10-28T14:30:00.000Z",
     "uptime": 123.456,
     "environment": "production",
     "nodeVersion": "v20.19.4"
   }
   ```
3. **Test key features**:
   - Homepage loads
   - Authentication works
   - API endpoints respond
   - Stripe webhooks configured

## Step 6: Set Up Custom Domain (Optional)

If you want a custom domain:

1. Go to **Settings** → **Domains**
2. Add your domain
3. Configure DNS records as instructed

## Troubleshooting Common Issues

### Issue 1: Build Fails with "Environment validation error"
**Error:** Build fails with message about missing environment variables
**Solution:**
1. Verify ALL required environment variables are set in Vercel dashboard
2. Make sure variables are set for the correct environment (Production/Preview/Development)
3. Redeploy: `vercel --prod`

**Environment variables are validated at build time in next.config.js**

### Issue 2: Build Fails with "Cannot find package"
**Error:** Build fails when trying to import shared packages
**Solution:**
```bash
# Test locally first - build from project root
cd /path/to/mintenance
npm ci
npm run build:web

# If local build works, check vercel.json buildCommand is correct
# Current: "cd ../.. && npm run build:web"
```

### Issue 3: Monorepo Build Order Issues
**Error:** Packages not found or TypeScript errors during build
**Solution:**
- The build script automatically builds packages first: `npm run build:packages`
- Then builds web app: `npm run build -w @mintenance/web`
- Verify package.json workspace configuration is correct

### Issue 2: Environment Variables Not Working
**Error:** App loads but features don't work
**Solution:**
1. Verify all environment variables are set in Vercel dashboard
2. Redeploy: `vercel --prod`
3. Check browser console for specific errors

### Issue 3: Supabase Connection Fails
**Error:** Database connection issues
**Solution:**
1. Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are correct
2. Check Supabase project is active and accessible
3. Verify RLS policies allow the operations

### Issue 4: Stripe Webhooks Fail
**Error:** Payment processing doesn't work
**Solution:**
1. Update Stripe webhook URL to your Vercel domain
2. Verify `STRIPE_WEBHOOK_SECRET` matches your webhook endpoint secret
3. Test webhook with Stripe CLI: `stripe listen --forward-to your-vercel-url/api/webhooks/stripe`

## Quick Commands Reference

```bash
# Login to Vercel
vercel login

# Deploy (from apps/web directory)
vercel

# Deploy to production
vercel --prod

# Check deployment status
vercel ls

# View logs
vercel logs

# Set environment variable
vercel env add VARIABLE_NAME

# Remove deployment
vercel rm deployment-url --yes
```

## Expected Deployment Results

**Successful deployment should show:**
- ✅ Build completes successfully
- ✅ All environment variables loaded
- ✅ Homepage accessible at `https://your-project.vercel.app`
- ✅ API endpoints responding at `/api/*`
- ✅ Authentication working
- ✅ Database connections functional

## Support

If you encounter issues:
1. Check Vercel logs: `vercel logs`
2. Verify environment variables in dashboard
3. Test locally first: `npm run build:web`
4. Check Vercel documentation: https://vercel.com/docs

---

**Next Steps After Deployment:**
1. Test all major features (auth, payments, messaging)
2. Set up monitoring and error tracking
3. Configure custom domain if needed
4. Set up automated deployments from Git
