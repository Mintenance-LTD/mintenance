# Mintenance - App Store & Play Store Submission Guide

## App Information

| Field | Value |
|-------|-------|
| App Name | Mintenance |
| Bundle ID (iOS) | com.mintenance.app |
| Package Name (Android) | com.mintenance.app |
| Current Version | 1.2.4 |
| Build Number (iOS) | 16 |
| Version Code (Android) | 16 |
| Primary Language | English (UK) |
| Primary Color | #10B981 |

## Required URLs

| URL | Status | Notes |
|-----|--------|-------|
| Privacy Policy | https://mintenance.co.uk/privacy | REQUIRED before submission |
| Terms of Service | https://mintenance.co.uk/terms | REQUIRED for iOS |
| Support URL | https://mintenance.co.uk/support | REQUIRED for iOS |
| Marketing URL | https://mintenance.co.uk | Optional but recommended |

These URLs must be live and publicly accessible before submission.

## App Store Connect (iOS)

### Category
- Primary: Lifestyle
- Secondary: Utilities

### App Description (4000 chars max)

Mintenance makes property maintenance simple. Whether you are a homeowner looking for trusted local contractors or a skilled tradesperson seeking new jobs, Mintenance connects you in one place.

For Homeowners:
- Post maintenance jobs with photos and descriptions
- Receive competitive bids from verified local contractors
- Compare contractor profiles, ratings, and reviews
- Manage projects from start to finish with photo evidence
- Pay securely through built-in escrow protection
- Review before-and-after photos of completed work
- Communicate directly with your chosen contractor

For Contractors:
- Discover local jobs matching your skills and location
- Submit bids and win new work
- Build your reputation with verified reviews
- Get paid promptly via secure escrow release
- Manage your schedule and active jobs
- Upload progress photos to document your work
- Receive instant notifications for new opportunities

Key Features:
- Secure escrow payments protect both parties
- Photo verification for job start and completion
- Real-time messaging between homeowner and contractor
- Push notifications for bids, messages, and job updates
- Biometric authentication for account security
- Offline support for browsing and drafting

### Keywords (100 chars max, comma-separated)

property,maintenance,contractor,handyman,repair,plumber,electrician,home,tradesperson,builder

### What's New (for updates)

Bug fixes and performance improvements. Enhanced push notification reliability and improved offline support.

### App Rating

Rating: 4+ (No objectionable content)

### Screenshots Required

#### iPhone 6.7" (iPhone 15 Pro Max / 16 Pro Max) - REQUIRED
- Size: 1290 x 2796 pixels
- Minimum: 3 screenshots, Maximum: 10
- Suggested screens:
  1. Home/Dashboard showing nearby jobs
  2. Job detail with bid submission
  3. Before/after photo comparison slider
  4. Contractor profile with reviews
  5. Secure messaging thread
  6. Payment/escrow confirmation

#### iPhone 6.5" (iPhone 15 Plus / 14 Pro Max) - REQUIRED
- Size: 1284 x 2778 pixels (or 1242 x 2688)
- Same screenshots as 6.7" (can be auto-generated from 6.7")

#### iPhone 5.5" (iPhone 8 Plus) - Optional but recommended
- Size: 1242 x 2208 pixels

#### iPad Pro 12.9" (6th gen) - REQUIRED if supportsTablet=true
- Size: 2048 x 2732 pixels
- Same screens adapted for tablet layout

#### iPad Pro 11" - Optional
- Size: 1668 x 2388 pixels

### App Preview Videos (Optional)
- Up to 30 seconds
- Formats: .mov, .m4v, .mp4
- Show core user flow: post job -> receive bid -> accept -> payment -> completion

## Google Play Console (Android)

### Category
- Application type: Application
- Category: House & Home

### Content Rating
- Complete the IARC questionnaire
- Expected rating: Everyone

### Short Description (80 chars max)

Find trusted local contractors for home repairs and maintenance jobs.

### Full Description (4000 chars max)

Use the same description as iOS App Store (above).

### Screenshots Required

#### Phone - REQUIRED
- Minimum: 2, Maximum: 8
- Size: 16:9 or 9:16 aspect ratio
- Minimum dimension: 320px, Maximum: 3840px
- Recommended: 1080 x 1920 pixels
- Suggested: same screens as iOS

#### 7-inch Tablet - REQUIRED if targeting tablets
- Size: 1200 x 1920 pixels recommended

#### 10-inch Tablet - REQUIRED if targeting tablets
- Size: 1600 x 2560 pixels recommended

### Feature Graphic - REQUIRED
- Size: 1024 x 500 pixels
- This appears at the top of the Play Store listing
- Should show app branding + key value proposition

### App Icon - REQUIRED
- Size: 512 x 512 pixels (hi-res, 32-bit PNG)

### Promotional Video (Optional)
- YouTube URL
- Auto-plays in listing

## Data Safety / Privacy

### iOS App Privacy (App Store Connect)

Data types collected:
- Contact Info: Name, email, phone number (for account creation)
- Location: Precise location (for finding nearby jobs/contractors)
- Photos: User photos (for job documentation)
- Identifiers: User ID (for account management)
- Financial Info: Payment info (processed by Stripe, not stored)
- Usage Data: Crash logs, performance data (via Sentry)

Data NOT collected:
- Health & Fitness
- Browsing History
- Search History
- Sensitive Info

Data linked to user: Contact info, location, photos, identifiers, financial info
Data used for tracking: None

### Android Data Safety (Play Console)

Fill the data safety form with:
- Account info collected: Yes (name, email, phone)
- Location collected: Yes (approximate and precise, for service matching)
- Photos collected: Yes (job documentation)
- Financial info collected: Yes (payment processing via Stripe)
- Device identifiers: Yes (push notification tokens)
- Crash logs: Yes (Sentry)
- Data shared with third parties: Stripe (payments), Sentry (crash reports), Expo (push notifications)
- Data encryption in transit: Yes (TLS/HTTPS)
- Data deletion mechanism: Yes (users can request account deletion)

## Pre-Submission Checklist

### Both Platforms
- [ ] Privacy policy URL is live and accessible
- [ ] Terms of service URL is live and accessible
- [ ] Support URL/email is configured and monitored
- [ ] All screenshots are taken on latest OS versions
- [ ] App description is accurate and up to date
- [ ] google-services.json uploaded to EAS Secrets
- [ ] GoogleService-Info.plist uploaded to EAS Secrets
- [ ] APNs key (.p8) uploaded to Firebase Console
- [ ] Production Supabase URL and anon key set in EAS Secrets
- [ ] Stripe live publishable key set in EAS Secrets
- [ ] Sentry DSN configured for production

### iOS Specific
- [ ] Apple Developer Program membership is active
- [ ] App Store Connect app record is created
- [ ] Bundle ID matches: com.mintenance.app
- [ ] Push notification capability is enabled in Apple Developer portal
- [ ] Associated Domains configured (applinks:mintenance.co.uk)
- [ ] App Privacy answers completed in App Store Connect
- [ ] Build uploaded via `eas submit -p ios`

### Android Specific
- [ ] Google Play Developer account is active
- [ ] Play Console app listing is created
- [ ] Package name matches: com.mintenance.app
- [ ] Play Store service account key is in credentials/
- [ ] Data safety form is completed
- [ ] Content rating questionnaire completed
- [ ] Feature graphic (1024x500) uploaded
- [ ] Build uploaded via `eas submit -p android`

## EAS Build & Submit Commands

```bash
# Build for App Store
eas build --platform ios --profile production-store

# Build for Play Store
eas build --platform android --profile production-store

# Submit to App Store
eas submit --platform ios --profile production

# Submit to Play Store
eas submit --platform android --profile production

# Build and submit in one step
eas build --platform all --profile production-store --auto-submit
```

## EAS Secrets Required for Production

Upload these via `eas secret:create --scope project`:

| Secret Name | Type | Description |
|------------|------|-------------|
| GOOGLE_SERVICES_JSON | file | Firebase config for Android (google-services.json) |
| GOOGLE_SERVICES_PLIST | file | Firebase config for iOS (GoogleService-Info.plist) |
| EXPO_PUBLIC_SUPABASE_URL | string | Production Supabase project URL |
| EXPO_PUBLIC_SUPABASE_ANON_KEY | string | Production Supabase anon key |
| EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY | string | Stripe live publishable key |
| EXPO_PUBLIC_SENTRY_DSN | string | Sentry DSN for error tracking |
| SENTRY_AUTH_TOKEN | string | Sentry auth token for source map uploads |
| GOOGLE_MAPS_API_KEY | string | Google Maps API key (restricted to app) |
