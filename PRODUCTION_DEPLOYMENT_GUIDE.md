# 🚀 Production Deployment Guide

## Pre-Deployment Checklist

### ✅ **Code Quality Verification**
- [ ] All tests passing (`npm run test`)
- [ ] TypeScript compilation successful (`npm run type-check`)
- [ ] Linting passed (`npm run lint`)
- [ ] Test coverage > 80% (`npm run test:coverage`)
- [ ] No security vulnerabilities (`npm audit`)

### ✅ **Environment Configuration**
- [ ] Production environment variables configured
- [ ] Database migrations applied
- [ ] API endpoints updated to production
- [ ] Stripe keys updated to live keys
- [ ] Sentry DSN configured for production

### ✅ **Build Verification**
- [ ] Production build successful (`npx expo build`)
- [ ] Bundle size within limits (< 3MB)
- [ ] No development dependencies in production build
- [ ] Source maps generated for debugging

## Deployment Steps

### **1. iOS Deployment**
```bash
# Build for iOS
npx eas build --platform ios --profile production

# Submit to App Store
npx eas submit --platform ios
```

### **2. Android Deployment**
```bash
# Build for Android
npx eas build --platform android --profile production

# Submit to Google Play
npx eas submit --platform android
```

### **3. Web Deployment**
```bash
# Build for web
npx expo build:web

# Deploy to hosting provider
npm run deploy:web
```

## Post-Deployment

### **Monitoring Setup**
- [ ] Error tracking active (Sentry)
- [ ] Performance monitoring enabled
- [ ] User analytics configured
- [ ] Push notification service active

### **Health Checks**
- [ ] App launches successfully
- [ ] User authentication working
- [ ] Payment processing functional
- [ ] Push notifications delivering
- [ ] Offline functionality working

## Rollback Procedure

If issues are detected:

1. **Immediate Actions**
   - Stop new deployments
   - Monitor error rates
   - Check user reports

2. **Rollback Steps**
   ```bash
   # Revert to previous version
   npx eas update --branch production --message "Rollback to stable version"
   ```

3. **Investigation**
   - Check error logs in Sentry
   - Review deployment diff
   - Run post-mortem analysis

## Environment-Specific Configurations

### **Production**
- Database: Production Supabase instance
- Payments: Live Stripe keys
- Push: Production FCM/APN certificates
- Analytics: Production tracking IDs

### **Staging**
- Database: Staging Supabase instance
- Payments: Test Stripe keys
- Push: Development certificates
- Analytics: Test tracking IDs

## Security Considerations

- [ ] API keys are environment-specific
- [ ] No hardcoded secrets in code
- [ ] HTTPS enforced for all endpoints
- [ ] User data encryption enabled
- [ ] Regular security audits scheduled