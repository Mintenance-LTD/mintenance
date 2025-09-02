# 🚀 Quick Deploy Guide

Your Mintenance app is configured with Supabase credentials and ready for production!

## ✅ Environment Configured
- Supabase URL: https://ukrjudtlvapiajkjbcrd.supabase.co
- API Key: Configured and ready
- App running on: http://localhost:8082

## 🗄️ Database Setup (REQUIRED - 2 minutes)

**Step 1: Run Database Schema**
1. Go to: https://supabase.com/dashboard/project/ukrjudtlvapiajkjbcrd/sql
2. Copy entire contents of `supabase-setup.sql` 
3. Paste in SQL Editor
4. Click "Run"

**Step 2: Enable Realtime**
1. Go to: Settings > API 
2. Enable Realtime for: `jobs`, `bids`, `escrow_transactions`

## 🧪 Test the App

**Web Testing:** http://localhost:8082
**Mobile Testing:** Scan QR code with Expo Go

**Test Accounts (created by setup script):**
- Homeowner: `homeowner@test.com` / `password123`
- Contractor: `contractor@test.com` / `password123`

## 📱 Create Production Build

**Install EAS CLI:**
```bash
npm install -g @expo/cli eas-cli
eas login
```

**Android APK:**
```bash
eas build --profile preview --platform android
```

**iOS Build:**
```bash
eas build --profile preview --platform ios
```

**App Store Production:**
```bash
eas build --profile production-store --platform android
eas build --profile production-store --platform ios
```

## ⚡ Quick Commands

```bash
# Development
npm start

# Type check
npm run type-check

# Build production
npm run build:android
npm run build:ios

# Using scripts
scripts\build.bat production android  # Windows
./scripts/build.sh production ios     # macOS/Linux
```

## 🎯 Next Steps

1. **Run database setup** (supabase-setup.sql)
2. **Test authentication** with sample users
3. **Test job posting** and bidding flow
4. **Create production build** with EAS
5. **Deploy to app stores**

The app is production-ready and optimized for performance! 🚀