# Deployment Guide - Map Systems

**Date**: October 31, 2025  
**Project**: Map Systems Implementation  
**Target**: Production Deployment

---

## 📋 Pre-Deployment Checklist

### Code Quality

- [x] All linting errors fixed (0 errors)
- [x] All TypeScript errors fixed (0 errors)
- [x] Code reviewed and approved
- [x] Documentation complete

### Testing

- [ ] **Unit tests written and passing**
- [ ] **Integration tests written and passing**
- [ ] **Manual testing checklist completed** (see `MANUAL_TESTING_CHECKLIST.md`)
- [ ] Cross-browser testing complete (Chrome, Firefox, Safari, Edge)
- [ ] Mobile device testing complete (iOS, Android)
- [ ] Accessibility audit complete (WCAG AA)

### Configuration

- [ ] **API key configured in production environment**
- [ ] **API key restricted** (HTTP referrers, API restrictions)
- [ ] **Billing alerts set up** in Google Cloud Console
- [ ] Environment variables verified

---

## 🚀 Deployment Steps

### Step 1: Run Tests Locally

```bash
# Navigate to web app directory
cd apps/web

# Run unit tests
npm run test

# Run integration tests (if configured)
npm run test:integration

# Run linting
npm run lint

# Type check
npm run type-check
```

**Success Criteria**:
- All tests pass
- Zero linting errors
- Zero TypeScript errors

---

### Step 2: Configure Production Environment

#### 2.1 Add API Key to Production

**For Vercel**:
```bash
# Via Vercel CLI
vercel env add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

# Or via Vercel Dashboard:
# 1. Go to Project Settings → Environment Variables
# 2. Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key_here
# 3. Select "Production" environment
```

**For Other Platforms**:
```bash
# Add to your deployment platform's environment variables
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyDCtPcCQqECwanf7tn9avJU4gvT6nezSi8
GOOGLE_MAPS_API_KEY=AIzaSyDCtPcCQqECwanf7tn9avJU4gvT6nezSi8
```

#### 2.2 Restrict API Key

**Go to Google Cloud Console**:
1. Navigate to: https://console.cloud.google.com/apis/credentials
2. Find your API key
3. Click "Restrict Key"

**HTTP Referrer Restrictions**:
```
# Add these referrers
https://yourdomain.com/*
https://*.yourdomain.com/*
http://localhost:3000/* (for development only)
```

**API Restrictions**:
- ✅ Maps JavaScript API
- ✅ Geocoding API
- ✅ Places API (if using autocomplete)

#### 2.3 Set Up Billing Alerts

**In Google Cloud Console**:
1. Go to: Billing → Budgets & alerts
2. Create budget: $100/month
3. Set alerts at: 50%, 90%, 100%
4. Add email notifications

---

### Step 3: Deploy to Staging

```bash
# Build the application
npm run build

# Test the production build locally
npm run start

# Verify no errors in console
# Navigate to /contractors and /contractor/service-areas
# Test map functionality

# Deploy to staging
# (Command depends on your hosting platform)

# Vercel:
vercel --prod --env staging

# Other platforms:
# Follow your platform's deployment guide
```

**Staging Verification**:
- [ ] Maps load correctly
- [ ] Service areas display
- [ ] No console errors
- [ ] Mobile responsive
- [ ] API calls succeed

---

### Step 4: QA Review on Staging

**Share staging URL with QA team**:
```
https://staging.yourdomain.com
```

**QA Checklist**:
- [ ] Complete manual testing checklist
- [ ] Test on multiple browsers
- [ ] Test on multiple devices
- [ ] Verify accessibility
- [ ] Check performance metrics
- [ ] Review error handling

**QA Sign-off Required**: ☐

---

### Step 5: Production Deployment (Gradual Rollout)

#### 5.1 Deploy to 10% of Users

**For Vercel** (using feature flags):
```typescript
// Add to feature flags config
export const FEATURE_FLAGS = {
  REAL_MAPS_ENABLED: {
    enabled: true,
    rollout: 0.1, // 10% of users
  },
};
```

**For Other Platforms**:
- Use your platform's feature flag system
- Or deploy to 10% of servers/instances

**Monitor for 24 hours**:
- Check error logs
- Monitor API costs
- Watch performance metrics
- Collect user feedback

#### 5.2 Increase to 50%

**If no issues after 24 hours**:
```typescript
rollout: 0.5, // 50% of users
```

**Monitor for 24 hours**:
- Continue monitoring metrics
- Check for any new issues
- Review user feedback

#### 5.3 Full Rollout (100%)

**If stable after 48 hours total**:
```typescript
rollout: 1.0, // 100% of users
```

**Final Verification**:
- All metrics stable
- No error spikes
- User feedback positive
- Performance acceptable

---

## 📊 Monitoring & Observability

### Metrics to Monitor

**Performance Metrics**:
- Page load time (should be < 3s)
- Time to Interactive (should be < 3s)
- API response time (should be < 500ms)
- Error rate (should be < 1%)

**Cost Metrics**:
- Google Maps API calls per day
- Total API cost per month
- Cost per user

**User Metrics**:
- Map usage (views per day)
- Contractor discovery rate
- Service area views
- User engagement

### Monitoring Tools

**Application Monitoring**:
- [ ] Set up error tracking (Sentry, LogRocket, etc.)
- [ ] Set up performance monitoring
- [ ] Set up user analytics

**API Monitoring**:
- [ ] Google Cloud Console monitoring
- [ ] API usage dashboard
- [ ] Cost tracking alerts

---

## 🚨 Rollback Plan

### When to Rollback

Rollback immediately if:
- Error rate > 5%
- Page load time > 5s
- API costs exceed budget by 200%
- Critical accessibility issues
- Major user complaints

### How to Rollback

**Method 1: Feature Flag**:
```typescript
// Disable feature immediately
REAL_MAPS_ENABLED: {
  enabled: false,
}
```

**Method 2: Revert Deployment**:
```bash
# Vercel
vercel rollback

# Other platforms
# Use your platform's rollback command
```

**Method 3: Code Revert**:
```bash
# Revert to previous version
git revert <commit-hash>
git push origin main

# Redeploy
vercel --prod
```

---

## ✅ Post-Deployment Verification

### Immediate Checks (within 1 hour)

- [ ] Maps loading on production
- [ ] No 404 errors in console
- [ ] API calls succeeding
- [ ] Service areas displaying
- [ ] Mobile responsive
- [ ] No error spikes in monitoring

### 24-Hour Checks

- [ ] Error rate stable (< 1%)
- [ ] Performance metrics acceptable
- [ ] API costs within budget
- [ ] No user complaints
- [ ] All features working

### 7-Day Checks

- [ ] Weekly API cost review
- [ ] User feedback review
- [ ] Performance optimization opportunities
- [ ] Feature usage analytics

---

## 📞 Support & Troubleshooting

### Common Issues

**Issue: Maps not loading**
```
Symptoms: Blank map area, "Failed to load map" error
Solution: 
1. Check API key is set in production
2. Verify API key restrictions allow production domain
3. Check Google Cloud Console for API errors
```

**Issue: Service areas not displaying**
```
Symptoms: Contractors visible but no circles
Solution:
1. Check API endpoint is accessible
2. Verify database has service area data
3. Check browser console for errors
```

**Issue: High API costs**
```
Symptoms: Unexpected billing charges
Solution:
1. Review API usage in Google Cloud Console
2. Implement additional caching
3. Reduce map refresh frequency
4. Consider limiting features for free users
```

### Emergency Contacts

**Technical Lead**: [Your Name/Email]  
**DevOps**: [DevOps Team Contact]  
**On-Call**: [On-Call Rotation]

---

## 🎯 Success Criteria

### Deployment is Successful When:

- [x] Code deployed without errors
- [ ] All tests passing
- [ ] Monitoring shows healthy metrics
- [ ] Error rate < 1%
- [ ] Performance within acceptable range
- [ ] API costs within budget
- [ ] User feedback positive
- [ ] Accessibility verified
- [ ] Mobile experience smooth

### Ready for Full Rollout When:

- [ ] 10% rollout stable for 24 hours
- [ ] 50% rollout stable for 24 hours
- [ ] All metrics within targets
- [ ] No critical issues reported
- [ ] QA sign-off received
- [ ] Stakeholder approval obtained

---

## 📋 Deployment Commands Reference

### Testing

```bash
# Run all tests
npm run test

# Run specific test file
npm run test map-utils.test.ts

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Building

```bash
# Build for production
npm run build

# Test production build locally
npm run start
```

### Deploying (Vercel)

```bash
# Deploy to staging
vercel

# Deploy to production
vercel --prod

# Check deployment status
vercel ls

# View logs
vercel logs

# Rollback
vercel rollback
```

---

## 📊 Estimated Timeline

**Total Deployment Time**: 3-5 days

- **Day 1**: Final testing, staging deployment
- **Day 2**: QA review, fix any issues
- **Day 3**: 10% production rollout, monitor
- **Day 4**: 50% rollout, monitor
- **Day 5**: 100% rollout, final verification

---

## ✅ Final Checklist

Before marking deployment complete:

- [ ] All tests passing
- [ ] Staging deployment successful
- [ ] QA sign-off received
- [ ] Production deployment successful
- [ ] Gradual rollout complete (10% → 50% → 100%)
- [ ] Monitoring configured
- [ ] Error tracking active
- [ ] API costs within budget
- [ ] User feedback collected
- [ ] Documentation updated
- [ ] Team notified
- [ ] Stakeholders informed

---

**Deployment Status**: ⏳ Ready to Begin  
**Last Updated**: October 31, 2025  
**Next Step**: Run tests locally and deploy to staging

