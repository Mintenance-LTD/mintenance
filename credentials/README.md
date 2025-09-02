# 🔐 Credentials Directory

This directory contains sensitive production credentials. **NEVER COMMIT THESE FILES TO GIT.**

## Required Files for Production Deployment:

### 📱 iOS App Store
- `AuthKey_[KEY_ID].p8` - App Store Connect API Key
- `apple-credentials.env` - Apple Team ID, App ID, etc.

### 🤖 Google Play Store  
- `play-store-service-account.json` - Google Play Console service account

## 🚨 Security Notes:
1. All files in this directory are ignored by git (.gitignore)
2. Store backup copies securely (not in cloud sync folders)  
3. Use environment variables for CI/CD deployment
4. Rotate keys every 90 days

## 📋 Setup Checklist:
- [ ] Apple Developer Account enrolled ($99/year)
- [ ] Google Play Console account created ($25 one-time)
- [ ] App Store Connect app created
- [ ] Google Play Console app created  
- [ ] API keys generated and downloaded
- [ ] Service account configured with proper permissions
- [ ] eas.json updated with real credential paths
- [ ] Production environment variables configured

For detailed setup instructions, see: `PRODUCTION_CREDENTIALS_SETUP.md`