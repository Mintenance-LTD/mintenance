# 📋 Post-Deployment Checklist for Mintenance

## Immediate Verification (Do Right After Deployment)

### 1. Site Accessibility
- [ ] Site loads at https://mintenance.co.uk
- [ ] HTTPS is enforced (HTTP redirects to HTTPS)
- [ ] No SSL certificate warnings
- [ ] www.mintenance.co.uk redirects properly (if configured)

### 2. Security Headers
Run verification script:
```bash
npm run deploy:verify
```

Manual check at: https://securityheaders.com/?q=mintenance.co.uk

Expected Grade: **A or A+**

Verify these headers are present:
- [ ] Content-Security-Policy
- [ ] Strict-Transport-Security  
- [ ] X-Frame-Options: DENY
- [ ] X-Content-Type-Options: nosniff
- [ ] Referrer-Policy
- [ ] Permissions-Policy

### 3. Core Functionality
- [ ] Homepage loads without errors
- [ ] Navigation menu works
- [ ] Login page accessible (/login)
- [ ] Register page accessible (/register)
- [ ] Images load properly
- [ ] No console errors (check browser DevTools)

### 4. API Endpoints
Test critical endpoints:
```bash
# Health check
curl https://mintenance.co.uk/api/health

# Auth endpoint (should return 405 for GET)
curl https://mintenance.co.uk/api/auth/login
```

Expected responses:
- [ ] /api/health returns 200 OK
- [ ] /api/auth/* endpoints are accessible
- [ ] CORS headers configured correctly

### 5. Authentication Flow
- [ ] Can navigate to login page
- [ ] Login form submits (test with invalid credentials)
- [ ] Error messages display correctly
- [ ] Forgot password link works
- [ ] Register form loads
- [ ] Supabase connection working

### 6. Performance Check
Quick Lighthouse audit:
```bash
npx lighthouse https://mintenance.co.uk --view
```

Minimum acceptable scores:
- [ ] Performance: > 80
- [ ] Accessibility: > 90
- [ ] Best Practices: > 90
- [ ] SEO: > 80

### 7. Mobile Responsiveness
Test on different devices:
- [ ] iPhone (Safari)
- [ ] Android (Chrome)
- [ ] Tablet (iPad)
- [ ] Desktop (Chrome, Firefox, Safari)

---

## E2E Test Verification

Run full E2E test suite:
```bash
npm run e2e
```

### Expected Results:
- [ ] Homepage tests pass
- [ ] Auth tests pass (or gracefully handle missing functionality)
- [ ] Security header tests pass
- [ ] Performance tests pass
- [ ] No critical failures

### Review Test Report:
```bash
npx playwright show-report
```

Key metrics to check:
- [ ] Pass rate > 90%
- [ ] All security tests passing
- [ ] No blocking issues found
- [ ] Screenshots show proper rendering

---

## Environment Variables Validation

Verify all required env vars are set in Vercel:

```bash
# Via Vercel CLI
vercel env ls

# Or check in Vercel Dashboard:
# Project → Settings → Environment Variables
```

Required variables:
- [ ] NEXT_PUBLIC_APP_URL
- [ ] SUPABASE_URL
- [ ] SUPABASE_ANON_KEY
- [ ] JWT_SECRET (min 32 chars)
- [ ] STRIPE_SECRET_KEY (if using payments)
- [ ] NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

---

## Database & Backend Services

### Supabase Checks:
- [ ] Database accessible
- [ ] RLS policies active
- [ ] Auth service configured
- [ ] API keys valid
- [ ] Storage buckets configured (if using)

### Stripe Checks (if applicable):
- [ ] Webhook endpoint configured
- [ ] Test payment flow works
- [ ] Live keys are correct
- [ ] Products/prices configured

---

## Monitoring Setup

### 1. Vercel Analytics
- [ ] Analytics enabled in project settings
- [ ] Data flowing (check after 24 hours)

### 2. Error Tracking
If using Sentry:
- [ ] Sentry DSN configured
- [ ] Error tracking active
- [ ] Source maps uploaded
- [ ] Test error captured successfully

### 3. Uptime Monitoring
Set up external monitoring:
- [ ] UptimeRobot or similar configured
- [ ] Alert emails configured
- [ ] Monitoring https://mintenance.co.uk
- [ ] Checking every 5 minutes

### 4. Performance Monitoring
- [ ] Core Web Vitals tracking active
- [ ] Real User Monitoring (RUM) configured
- [ ] Baseline metrics captured

---

## DNS & Domain Configuration

### Verify DNS Records:
```bash
# Check A record
nslookup mintenance.co.uk

# Check propagation
# Visit: https://www.whatsmydns.net/#A/mintenance.co.uk
```

Expected DNS:
- [ ] A record points to Vercel IP (76.76.21.21)
- [ ] CNAME for www (if configured)
- [ ] DNS propagated globally (green checks worldwide)
- [ ] TTL appropriate (3600 seconds)

### Domain Security:
- [ ] DNSSEC enabled (if supported by registrar)
- [ ] Domain locked to prevent transfers
- [ ] Registrar contact info current
- [ ] Auto-renewal enabled

---

## Content & SEO

### Meta Tags & SEO:
- [ ] Title tag present and descriptive
- [ ] Meta description set
- [ ] Open Graph tags configured
- [ ] Twitter Card tags set
- [ ] Favicon loads
- [ ] robots.txt accessible (/robots.txt)
- [ ] sitemap.xml accessible (/sitemap.xml)

### Content Check:
- [ ] No "Coming Soon" placeholder text
- [ ] Branding consistent
- [ ] Images have alt text
- [ ] Links work (no 404s)
- [ ] Contact information correct
- [ ] Privacy policy linked
- [ ] Terms of service linked

---

## Post-Deployment Actions

### Communication:
- [ ] Notify team of successful deployment
- [ ] Update status page (if applicable)
- [ ] Announce on social media (if planned)
- [ ] Email beta testers (if applicable)

### Documentation:
- [ ] Update deployment date in README
- [ ] Document any deployment issues encountered
- [ ] Update changelog
- [ ] Tag release in git

### Backup & Recovery:
- [ ] Database backup taken
- [ ] Deployment snapshot captured in Vercel
- [ ] Rollback procedure tested
- [ ] Recovery plan documented

---

## 24-Hour Follow-Up

After 24 hours, check:

### Analytics Review:
- [ ] Traffic flowing to site
- [ ] Page views being tracked
- [ ] No unusual error rates
- [ ] Geographic distribution as expected

### Performance Review:
- [ ] Response times acceptable
- [ ] No memory leaks
- [ ] Database queries optimized
- [ ] CDN cache hit rate > 80%

### Error Review:
- [ ] Sentry dashboard shows low error rate
- [ ] No critical errors
- [ ] Known issues documented
- [ ] Hot fixes planned if needed

### User Feedback:
- [ ] Monitor support channels
- [ ] Check social media mentions
- [ ] Review any user reports
- [ ] Address critical feedback

---

## Week 1 Follow-Up

After one week:

### Stability Check:
- [ ] Uptime > 99.9%
- [ ] No major incidents
- [ ] Performance stable
- [ ] Error rates within acceptable range

### Feature Validation:
- [ ] All core features working
- [ ] Payment processing (if applicable)
- [ ] User registration flow
- [ ] Data persistence working

### Optimization Opportunities:
- [ ] Identify slow pages
- [ ] Review largest images
- [ ] Check bundle size
- [ ] Plan optimizations

---

## Sign-Off

**Deployment completed by:** _________________

**Date:** _________________

**Sign-off approvals:**
- [ ] Technical Lead
- [ ] Product Owner
- [ ] QA Lead

**Notes:**
_______________________________________________________
_______________________________________________________
_______________________________________________________

---

## Emergency Contacts

**If critical issues arise:**

1. **Immediate Rollback:**
   ```bash
   vercel rollback
   ```

2. **Vercel Support:** https://vercel.com/support

3. **Team Escalation:**
   - Technical Lead: [contact info]
   - On-call Engineer: [contact info]

4. **Service Status:**
   - Vercel: https://www.vercel-status.com/
   - Supabase: https://status.supabase.com/
   - Stripe: https://status.stripe.com/

---

**🎉 Congratulations on your deployment!** Use this checklist to ensure everything is running smoothly.
