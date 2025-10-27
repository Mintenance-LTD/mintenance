# Manual Vercel Deployment Guide

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

**Navigate to your web app directory:**
```bash
cd apps/web
```

**Deploy the application:**
```bash
vercel
```

**What happens during deployment:**
- Vercel will detect it's a Next.js project
- It will ask you to confirm the project settings
- It will build and deploy your app

**Expected questions during deployment:**
1. **Project name**: Press Enter to use "mintenance-web" (from vercel.json)
2. **Directory**: Should auto-detect as current directory
3. **Build settings**: Should auto-detect Next.js configuration

## Step 3: Add Environment Variables

After deployment, you need to add your environment variables in the Vercel dashboard:

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Find your project (should be named "mintenance-web")
3. Go to **Settings** → **Environment Variables**
4. Add these variables:

### Required Environment Variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key

# JWT Configuration
JWT_SECRET=your-jwt-secret-here

# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_publishable_key

# App Configuration
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NODE_ENV=production

# Redis Configuration (for rate limiting)
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token
```

## Step 4: Redeploy with Environment Variables

After adding environment variables:

```bash
vercel --prod
```

This will trigger a production deployment with all your environment variables.

## Step 5: Verify Deployment

1. **Check the deployment URL** - Vercel will show you the live URL
2. **Test key features**:
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

### Issue 1: Build Fails
**Error:** Build fails during deployment
**Solution:**
```bash
# Check if your app builds locally first
npm run build:web

# If that works, the issue might be environment variables
# Make sure all required env vars are set in Vercel dashboard
```

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
