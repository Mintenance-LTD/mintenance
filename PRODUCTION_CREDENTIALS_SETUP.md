# 🔐 **PRODUCTION CREDENTIALS SETUP GUIDE**
*Complete configuration for App Store deployment*

## 📋 **REQUIRED CREDENTIALS CHECKLIST**

### **🍎 iOS App Store Configuration**

#### **1. Apple Developer Account**
- [ ] Apple Developer Program membership ($99/year)
- [ ] Team ID: `[TEAM_ID_PLACEHOLDER]`
- [ ] Bundle Identifier: `com.mintenance.app` (matches app.config.js)

#### **2. App Store Connect Setup**
```bash
# Required App Information
App Name: "Mintenance - Home Maintenance"
Bundle ID: com.mintenance.app
SKU: mintenance-app-2024
Primary Language: English (U.S.)
```

#### **3. App Store Connect API Key**
```bash
# Generate at: https://appstoreconnect.apple.com/access/api
Key ID: [KEY_ID_PLACEHOLDER]
Issuer ID: [ISSUER_ID_PLACEHOLDER]
Download: AuthKey_[KEY_ID].p8 file
```

### **🤖 Google Play Store Configuration**

#### **1. Google Play Console Account**
- [ ] Google Play Console account ($25 one-time fee)
- [ ] Package name: `com.mintenance.app` (matches app.config.js)

#### **2. Google Play Console Setup**
```bash
# Required App Information
App Name: "Mintenance - Home Maintenance"
Package Name: com.mintenance.app
Default Language: English (United States)
App Category: House & Home
```

#### **3. Google Play Service Account**
```json
{
  "type": "service_account",
  "project_id": "[PROJECT_ID_PLACEHOLDER]",
  "private_key_id": "[PRIVATE_KEY_ID_PLACEHOLDER]",
  "private_key": "[PRIVATE_KEY_PLACEHOLDER]",
  "client_email": "[EMAIL_PLACEHOLDER]@[PROJECT_ID].iam.gserviceaccount.com",
  "client_id": "[CLIENT_ID_PLACEHOLDER]",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token"
}
```

---

## 🏗️ **EAS BUILD CONFIGURATION**

### **Current eas.json Status**
✅ Build profiles are properly configured  
❌ Store submission credentials need real values  
❌ Service account file path needs setup  

### **Required Updates to eas.json**
```json
{
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./credentials/play-store-service-account.json",
        "track": "production", // Change from "internal"
        "releaseStatus": "draft"
      },
      "ios": {
        "appleId": "your-apple-id@example.com", // Replace placeholder
        "ascAppId": "1234567890", // Get from App Store Connect
        "appleTeamId": "ABCD123456" // Get from Apple Developer
      }
    }
  }
}
```

---

## 📝 **STEP-BY-STEP SETUP PROCESS**

### **Phase 1: Apple App Store Setup (iOS)**

#### **Step 1: Apple Developer Account**
1. Go to [developer.apple.com](https://developer.apple.com)
2. Enroll in Apple Developer Program ($99/year)
3. Note your Team ID: Found in Account → Membership

#### **Step 2: App Store Connect**
1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. Click "+" to create new app
3. Fill in app information:
   ```
   Name: Mintenance - Home Maintenance
   Bundle ID: com.mintenance.app
   SKU: mintenance-2024
   Language: English (U.S.)
   ```
4. Note the App ID (numbers only, e.g., 1234567890)

#### **Step 3: Generate API Key**
1. App Store Connect → Users and Access → Keys
2. Generate new API Key with "Developer" access
3. Download the .p8 file
4. Note Key ID and Issuer ID

### **Phase 2: Google Play Store Setup (Android)**

#### **Step 1: Google Play Console**
1. Go to [play.google.com/console](https://play.google.com/console)
2. Pay $25 one-time registration fee
3. Create new app:
   ```
   App name: Mintenance - Home Maintenance
   Package name: com.mintenance.app
   Language: English (United States)
   Category: House & Home
   ```

#### **Step 2: Service Account Setup**
1. Google Play Console → Setup → API access
2. Create new service account or use existing
3. Download JSON key file
4. Grant "Release Manager" permissions

### **Phase 3: Credential Configuration**

#### **Step 1: Create Credentials Directory**
```bash
mkdir credentials
# Add to .gitignore to keep secure
echo "credentials/" >> .gitignore
```

#### **Step 2: Store Credentials Securely**
```bash
# Place files in credentials directory
credentials/
├── play-store-service-account.json (Google Play)
├── AuthKey_[KEY_ID].p8 (App Store Connect API)
└── apple-app-store-connect.env (Apple credentials)
```

#### **Step 3: Update eas.json**
```json
{
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./credentials/play-store-service-account.json",
        "track": "production",
        "releaseStatus": "draft"
      },
      "ios": {
        "appleId": "your-actual-apple-id@example.com",
        "ascAppId": "1234567890",
        "appleTeamId": "ABCD123456",
        "appleAuthKeyPath": "./credentials/AuthKey_[KEY_ID].p8",
        "appleAuthKeyId": "KEY_ID_HERE",
        "appleAuthKeyIssuerId": "ISSUER_ID_HERE"
      }
    }
  }
}
```

---

## 🔐 **ENVIRONMENT VARIABLES**

### **Production Environment Configuration**
```bash
# .env.production
NODE_ENV=production
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your-key
OPENAI_API_KEY=sk-your-openai-key (post-MVP)

# App Store specific
APPLE_ID=your-apple-id@example.com
APPLE_TEAM_ID=ABCD123456
APPLE_ASC_APP_ID=1234567890

# Google Play specific  
GOOGLE_PLAY_PACKAGE_NAME=com.mintenance.app
```

---

## ✅ **PRODUCTION DEPLOYMENT CHECKLIST**

### **Pre-Deployment Requirements**
- [ ] Apple Developer Program enrollment completed
- [ ] Google Play Console account created
- [ ] App Store Connect app created with correct Bundle ID
- [ ] Google Play Console app created with correct Package Name
- [ ] API keys and service accounts configured
- [ ] Credential files stored securely in `credentials/` directory
- [ ] eas.json updated with real credential values
- [ ] Environment variables configured for production
- [ ] App icons and splash screens created (1024x1024 for stores)

### **Build and Submit Process**
```bash
# Production builds
eas build --platform all --profile production-store

# Submit to stores (after credentials setup)
eas submit --platform ios --profile production
eas submit --platform android --profile production
```

### **Store-Specific Requirements**

#### **App Store (iOS)**
- [ ] Privacy Policy URL
- [ ] App description (up to 4,000 characters)
- [ ] Keywords for search optimization
- [ ] Screenshots (6.7", 6.5", 5.5" iPhone sizes)
- [ ] Age rating questionnaire completed
- [ ] Pricing and availability configured

#### **Google Play (Android)**
- [ ] Privacy Policy URL
- [ ] App description (up to 4,000 characters)
- [ ] Store listing assets (icons, screenshots, feature graphics)
- [ ] Content rating questionnaire completed
- [ ] Target audience and content guidelines
- [ ] App signing key management

---

## 🚨 **SECURITY CONSIDERATIONS**

### **Credential Protection**
1. **Never commit credentials to git**
2. **Use environment variables for sensitive data**
3. **Rotate API keys regularly (90 days)**
4. **Use least-privilege access for service accounts**
5. **Store production keys separately from development**

### **Store Submission Security**
1. **Enable two-factor authentication on all accounts**
2. **Use strong, unique passwords**
3. **Monitor account activity for unauthorized access**
4. **Keep backup copies of credential files**

---

## 📞 **SUPPORT CONTACTS**

### **Apple Developer Support**
- Developer Portal: [developer.apple.com](https://developer.apple.com)
- Support: Technical Support through Developer Portal
- Documentation: [developer.apple.com/documentation](https://developer.apple.com/documentation)

### **Google Play Support**
- Console: [play.google.com/console](https://play.google.com/console)
- Support: Play Console Help Center
- Documentation: [developer.android.com](https://developer.android.com)

### **EAS Support**
- Documentation: [docs.expo.dev/build-reference/](https://docs.expo.dev/build-reference/)
- Community: [forums.expo.dev](https://forums.expo.dev)
- Discord: Expo Community Discord

---

## 🎯 **NEXT STEPS AFTER CREDENTIAL SETUP**

1. **Test Production Builds**
   ```bash
   eas build --platform all --profile production --non-interactive
   ```

2. **Validate Store Submissions**
   ```bash
   eas submit --platform ios --profile production --dry-run
   eas submit --platform android --profile production --dry-run
   ```

3. **Configure CI/CD Pipeline**
   - Add credentials to GitHub Secrets
   - Test automated build and deployment
   - Set up staging → production promotion flow

4. **Monitor Deployment**
   - Set up error monitoring (Sentry)
   - Configure analytics (if needed)
   - Prepare customer support channels

**Estimated Setup Time**: 2-4 hours for first-time setup, 30 minutes for subsequent updates.

<function_calls>
<invoke name="Read">
<parameter name="file_path">C:\Users\Djodjo.Nkouka.ERICCOLE\Downloads\mintenance-clean\eas.json