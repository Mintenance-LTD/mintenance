# 🚀 Mintenance Web Deployment Guide

## Overview
This guide covers deploying the Mintenance Next.js web app to **mintenance.co.uk** using Vercel, replacing the current "Coming Soon" placeholder.

---

## Prerequisites

### 1. Accounts & Access
- [ ] Vercel account (sign up at https://vercel.com)
- [ ] GitHub repository access
- [ ] Domain registrar access (for mintenance.co.uk DNS)
- [ ] Supabase project credentials
- [ ] Stripe API keys

### 2. Environment Variables Required
Create a `.env.production` file with:

```bash
# App Configuration
NEXT_PUBLIC_APP_URL=https://mintenance.co.uk

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# JWT Configuration
JWT_SECRET=your-strong-jwt-secret-min-32-chars

# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_your-stripe-secret-key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your-stripe-publishable-key

# Sentry (Optional - for error tracking)
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
SENTRY_AUTH_TOKEN=your-sentry-auth-token
```

---

## Deployment Steps

### Step 1: Prepare Repository

```bash
# Ensure you're on the main branch
git checkout main

# Pull latest changes
git pull origin main

# Verify build works locally
cd apps/web
npm run build
npm run start
```

### Step 2: Connect to Vercel

#### Option A: Vercel CLI (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Link project (from repository root)
cd ../..
vercel link

# Configure project settings
vercel env add NEXT_PUBLIC_APP_URL production
vercel env add SUPABASE_URL production
vercel env add SUPABASE_ANON_KEY production
vercel env add JWT_SECRET production
vercel env add STRIPE_SECRET_KEY production
vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production

# Deploy to production
vercel --prod
```

#### Option B: Vercel Dashboard
1. Visit https://vercel.com/new
2. Import your GitHub repository
3. Configure project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/web`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`
4. Add environment variables from the dashboard
5. Click "Deploy"

### Step 3: Configure Custom Domain

1. **In Vercel Dashboard:**
   - Go to Project Settings → Domains
   - Add `mintenance.co.uk`
   - Add `www.mintenance.co.uk` (optional)

2. **Update DNS Records:**
   
   In your domain registrar (where mintenance.co.uk is registered):

   **Option A: Using A Records (Recommended)**
   ```
   Type: A
   Name: @
   Value: 76.76.21.21
   TTL: 3600
   
   Type: A
   Name: www
   Value: 76.76.21.21
   TTL: 3600
   ```

   **Option B: Using CNAME (Alternative)**
   ```
   Type: CNAME
   Name: @
   Value: cname.vercel-dns.com
   TTL: 3600
   ```

3. **Wait for DNS Propagation:**
   - Usually takes 5-60 minutes
   - Check status: https://www.whatsmydns.net/#A/mintenance.co.uk

### Step 4: Enable HTTPS & Security

Vercel automatically provisions SSL certificates. Verify:
1. Go to Project Settings → Domains
2. Check that SSL certificate shows "Active"
3. Enable "Redirect HTTP to HTTPS" (enabled by default)

### Step 5: Configure Monorepo Build Settings

Create `apps/web/.vercelignore`:
```
# Ignore files not needed for web build
../../apps/mobile
../../e2e
../../Screenshots
../../archive
../../beta-testing-data
../../coverage
../../dist
../../node_modules
```

Update `vercel.json` root directory setting if needed.

---

## Post-Deployment Verification

### 1. Functional Testing
```bash
# Run E2E tests against production
npx playwright test --config=playwright.config.js

# Specific tests
npx playwright test e2e/homepage.spec.js
npx playwright test e2e/auth.spec.js
npx playwright test e2e/security.spec.js
npx playwright test e2e/performance.spec.js
```

### 2. Manual Checks
- [ ] Homepage loads (https://mintenance.co.uk)
- [ ] Login/Register functionality works
- [ ] Security headers present (check browser DevTools → Network → Headers)
- [ ] Images load with proper caching
- [ ] API routes function correctly
- [ ] Payment flow works (Stripe)
- [ ] Mobile responsive design

### 3. Performance Verification
```bash
# Lighthouse CI (if configured)
npm run lighthouse

# Or use online tools:
# https://pagespeed.web.dev/?url=https://mintenance.co.uk
# https://www.webpagetest.org/
```

### 4. Security Validation
Check headers at: https://securityheaders.com/?q=mintenance.co.uk

Expected headers:
- ✅ Content-Security-Policy
- ✅ Strict-Transport-Security
- ✅ X-Frame-Options
- ✅ X-Content-Type-Options
- ✅ Referrer-Policy
- ✅ Permissions-Policy

---

## Monitoring & Maintenance

### 1. Set Up Monitoring

**Vercel Analytics** (Built-in)
- Enabled by default
- View at: Project → Analytics

**Sentry Error Tracking** (Recommended)
```bash
# Install Sentry
npm install --save @sentry/nextjs

# Initialize
npx @sentry/wizard -i nextjs

# Configure in apps/web/sentry.client.config.js and sentry.server.config.js
```

**Uptime Monitoring** (Optional)
- Use services like UptimeRobot, Pingdom, or Better Uptime
- Monitor: https://mintenance.co.uk/api/health

### 2. Deployment Workflow

**Automatic Deployments:**
- Every push to `main` branch → Production deployment
- Every pull request → Preview deployment

**Manual Deployments:**
```bash
# Deploy specific branch
vercel --prod

# Rollback to previous deployment
vercel rollback
```

### 3. Update Workflow
```bash
# Make changes
git add .
git commit -m "feat: add new feature"
git push origin main

# Vercel automatically deploys
# Monitor at: https://vercel.com/dashboard
```

---

## Troubleshooting

### Build Failures
```bash
# Check build logs in Vercel dashboard
# Common issues:
# 1. Missing environment variables
# 2. TypeScript errors
# 3. Missing dependencies

# Test locally:
cd apps/web
npm run build
```

### DNS Issues
```bash
# Verify DNS propagation
nslookup mintenance.co.uk

# Check Vercel DNS configuration
vercel domains inspect mintenance.co.uk
```

### SSL Certificate Issues
- Vercel auto-renews certificates
- If issues persist, remove and re-add domain
- Contact Vercel support if needed

### Performance Issues
```bash
# Analyze bundle size
npx @next/bundle-analyzer

# Check for large dependencies
npm run build -- --profile

# Enable Next.js analytics
# Add to next.config.js:
# experimental: { optimizeCss: true }
```

---

## Rollback Procedure

If deployment causes critical issues:

### Quick Rollback
```bash
# Via Vercel Dashboard:
# 1. Go to Deployments
# 2. Find last working deployment
# 3. Click "..." → "Promote to Production"

# Via CLI:
vercel rollback
```

### Emergency Fixes
```bash
# Hotfix workflow:
git checkout -b hotfix/critical-fix
# Make fixes
git commit -m "hotfix: critical issue"
git push origin hotfix/critical-fix

# Deploy hotfix directly:
vercel --prod
```

---

## Success Checklist

After deployment, verify:
- ✅ Site accessible at https://mintenance.co.uk
- ✅ HTTPS enforced (no mixed content warnings)
- ✅ Security headers configured correctly
- ✅ Images optimized and cached
- ✅ E2E tests pass
- ✅ Authentication flow works
- ✅ Payment processing functional
- ✅ Error monitoring active
- ✅ Analytics tracking enabled
- ✅ Mobile responsiveness verified

---

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Vercel CLI Reference](https://vercel.com/docs/cli)
- [Custom Domain Setup](https://vercel.com/docs/concepts/projects/domains)
- [Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

---

## Support Contacts

- **Vercel Support**: https://vercel.com/support
- **Next.js Discord**: https://nextjs.org/discord
- **GitHub Issues**: [Your repository]/issues

---

**🎉 Ready to Deploy!** Follow the steps above to replace the placeholder site with your full Mintenance application.
