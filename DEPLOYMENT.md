# Mintenance App Deployment Guide

This guide covers setting up Supabase, configuring environments, and deploying your Mintenance app to production.

## 🗄️ Database Setup

### 1. Create Supabase Project
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New Project" 
3. Choose organization and set project name: `mintenance-app`
4. Set database password (save this securely)
5. Choose region closest to your users
6. Click "Create new project"

### 2. Run Database Schema
1. In your Supabase project, go to **SQL Editor**
2. Copy contents of `supabase-setup.sql`
3. Paste and click **Run**
4. Verify tables were created in **Table Editor**

### 3. Enable Realtime
1. Go to **Settings** > **API**
2. Scroll to **Realtime**
3. Enable realtime for tables: `jobs`, `bids`, `escrow_transactions`

### 4. Configure Authentication
1. Go to **Authentication** > **Settings**
2. Add your app URLs to **Allowed origins**:
   - Development: `http://localhost:19006`, `exp://localhost:19000`
   - Production: `https://yourdomain.com`
3. Configure email templates (optional)
4. Set up OAuth providers if needed (Google, Apple, etc.)

## ⚙️ Environment Configuration

### 1. Get Supabase Credentials
1. In Supabase dashboard, go to **Settings** > **API**
2. Copy **Project URL** and **anon public key**

### 2. Setup Environment Files

**For Development:**
```bash
cp .env.example .env
```
Update `.env` with your Supabase credentials.

**For Production:**
```bash
cp .env.production .env
```
Update with production Supabase project credentials.

**For Staging:**
```bash
cp .env.staging .env  
```
Update with staging Supabase project credentials.

## 📱 Mobile Build Setup

### 1. Install EAS CLI
```bash
npm install -g @expo/cli eas-cli
```

### 2. Login to Expo
```bash
eas login
```

### 3. Configure EAS Build
```bash
eas build:configure
```

This creates/updates `eas.json` with build configurations.

### 4. Set Project ID
1. Run `eas init` to get your project ID
2. Update `app.config.js` with your actual project ID:
```javascript
extra: {
  eas: {
    projectId: "your-actual-eas-project-id-here"
  }
}
```

## 🚀 Building and Deployment

### Quick Setup (Automated)
**Windows:**
```cmd
scripts\setup.bat
```

**macOS/Linux:**
```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

### Manual Build Commands

**Development Build:**
```bash
eas build --profile development --platform android
```

**Production APK:**
```bash
eas build --profile preview --platform android
```

**App Store Production:**
```bash
eas build --profile production-store --platform ios
eas build --profile production-store --platform android
```

**Using Build Scripts:**
```bash
# Windows
scripts\build.bat production android

# macOS/Linux  
chmod +x scripts/build.sh
./scripts/build.sh production android
```

## 📲 App Store Submission

### Android (Google Play)
1. Build production app bundle:
   ```bash
   eas build --profile production-store --platform android
   ```

2. Download the AAB file from EAS dashboard

3. Upload to Google Play Console:
   - Go to Google Play Console
   - Select your app or create new app
   - Upload AAB in **Release Management** > **App releases**

### iOS (App Store)
1. Build production IPA:
   ```bash
   eas build --profile production-store --platform ios
   ```

2. Submit using EAS Submit:
   ```bash
   eas submit --platform ios
   ```

3. Or download IPA and use Transporter app

## 🔧 Configuration Files

### `eas.json` Build Profiles
- **development**: Development client for testing
- **staging**: Internal testing builds
- **preview**: Production-like builds for testing
- **production**: App store production builds
- **production-store**: Optimized store submissions

### Environment Variables
- `EXPO_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Stripe publishable key (optional)
- `NODE_ENV`: Environment (development/staging/production)

## 🧪 Testing Deployments

### Internal Testing
1. Build preview version:
   ```bash
   eas build --profile preview --platform android
   ```

2. Download APK and test on devices

3. Use EAS Update for OTA updates:
   ```bash
   eas update --branch preview
   ```

### Production Validation
- Test authentication flows
- Verify database connections
- Test payment flows (in sandbox mode)
- Validate push notifications
- Test offline functionality

## 🔒 Security Checklist

- [ ] Production Supabase project configured
- [ ] RLS policies enabled and tested
- [ ] Environment variables properly set
- [ ] API keys secured (no test keys in production)
- [ ] HTTPS enforced for all endpoints
- [ ] App signing certificates configured
- [ ] Store listings configured with proper permissions

## 📊 Monitoring

### Supabase Monitoring
- **Logs**: Monitor API requests and errors
- **Realtime**: Check connection status
- **Auth**: Monitor user registrations and logins

### EAS Monitoring  
- **Builds**: Track build success/failure rates
- **Updates**: Monitor OTA update adoption
- **Crashes**: Set up crash reporting

## 🚨 Troubleshooting

### Common Build Issues
1. **Environment variables not loading**: Ensure `.env` file exists and variables are prefixed with `EXPO_PUBLIC_`

2. **Supabase connection errors**: Verify URL and API keys in environment files

3. **iOS build failures**: Check bundle identifier and Apple Developer account

4. **Android build failures**: Verify package name and signing configuration

### Database Issues
1. **RLS policy errors**: Check Row Level Security policies in Supabase
2. **Connection timeouts**: Verify database region and network connectivity
3. **Migration errors**: Run database setup script again

### Support Resources
- [Expo Documentation](https://docs.expo.dev/)
- [Supabase Documentation](https://supabase.com/docs)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)

---

## Quick Commands Reference

```bash
# Setup
npm install
cp .env.example .env
eas login

# Development  
npm start
npm run android
npm run ios

# Building
eas build --profile preview --platform android
eas build --profile production --platform ios

# Submission
eas submit --platform android
eas submit --platform ios

# Updates
eas update --branch main
```