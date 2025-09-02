# Mintenance App - Production Deployment Guide

## 🚨 CRITICAL: Before Production Deployment

### 1. Environment Configuration

**Required Steps:**
1. Copy `.env.production` to `.env`
2. Replace ALL placeholder values with actual production credentials:
   - `EXPO_PUBLIC_SUPABASE_URL`: Your production Supabase project URL
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Your production Supabase anonymous key
   - `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Your live Stripe publishable key
   - `STRIPE_SECRET_KEY`: Your live Stripe secret key (store securely)
   - `EXPO_PUBLIC_SENTRY_DSN`: Your production Sentry DSN

### 2. EAS Configuration (eas.json)

**Update these values:**
- `appleId`: Replace `YOUR_APPLE_ID_EMAIL_HERE` with your Apple ID
- `ascAppId`: Replace `YOUR_APP_STORE_CONNECT_APP_ID_HERE` with your App Store Connect app ID
- `appleTeamId`: Replace `YOUR_APPLE_TEAM_ID_HERE` with your Apple Team ID

### 3. Database Setup

**Production Database:**
1. Create a production Supabase project
2. Run `supabase-setup.sql` in the SQL Editor
3. **IMPORTANT**: The sample data is commented out - DO NOT uncomment for production
4. Enable Realtime for tables: `jobs`, `bids`, `escrow_transactions`

### 4. App Store Credentials

**Android:**
- Place your Google Play service account JSON file at: `./credentials/play-store-service-account.json`

**iOS:**
- Configure Apple Developer account credentials in EAS

## 🔧 Development vs Production

### Development Mode Features
- Detailed error messages displayed to users
- Console logging enabled
- Sentry disabled
- Mock payment mode available

### Production Mode Features
- User-friendly error messages only
- Comprehensive error reporting via Sentry
- Real payment processing
- Performance optimizations enabled

## 📋 Pre-Launch Checklist

- [ ] All environment variables configured with production values
- [ ] Database schema deployed to production Supabase project
- [ ] Sentry project created and DSN configured
- [ ] Stripe account verified and live keys configured
- [ ] App Store credentials configured in EAS
- [ ] Test payment flow with live Stripe keys in staging
- [ ] App icons and splash screens finalized
- [ ] Privacy policy and terms of service implemented
- [ ] App Store listings prepared

## 🚀 Deployment Commands

### Build for Production
```bash
# Android
npm run build:android:store

# iOS  
npm run build:ios:prod
```

### Submit to Stores
```bash
# Android
npm run submit:android

# iOS
npm run submit:ios
```

## 🧪 Testing Strategy

### Before Production:
1. Run tests: `npm run test:coverage`
2. Type checking: `npm run type-check`
3. Build validation: Test builds on both platforms
4. Payment testing: Verify escrow flow with live Stripe keys in staging
5. Error reporting: Trigger test errors to verify Sentry integration

## 🔒 Security Notes

- Never commit production credentials to version control
- Rotate API keys regularly
- Monitor Sentry for unusual error patterns
- Review Supabase RLS policies before launch
- Test authentication flows thoroughly

## 📈 Post-Launch Monitoring

### Key Metrics to Monitor:
- App crashes (via Sentry)
- Payment success rates
- API response times
- User registration/authentication issues
- Database performance (Supabase dashboard)

### Recommended Tools:
- Sentry: Error tracking and performance monitoring
- Supabase: Database and API monitoring
- Stripe: Payment monitoring and dispute management
- App Store Connect: App performance metrics

## 🆘 Emergency Procedures

### If Critical Issues Occur:
1. **App Crashes**: Check Sentry dashboard for error details
2. **Payment Issues**: Review Stripe dashboard and webhook logs
3. **Database Issues**: Check Supabase logs and connection limits
4. **Build Issues**: Verify EAS build logs

### Rollback Plan:
- Keep previous working build available
- Document all configuration changes
- Maintain staging environment that mirrors production

---

**Remember**: Test everything in staging with production-like data before deploying to live users.