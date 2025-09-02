# 🔧 **BUILD TROUBLESHOOTING GUIDE**
*Solutions for common build issues*

## 🚨 **COMMON BUILD ERRORS**

### **Error: Missing Assets**
```
Error: [android.dangerous]: withAndroidDangerousBaseMod: ENOENT: no such file or directory, open './assets/splash.png'
```

**Solution:**
```bash
# Generate minimal assets for building
npm run generate-assets

# Or manually create assets (see assets/README.md for specifications)
```

**Root Cause:** App configuration references assets that don't exist in the assets/ directory.

---

### **Error: Environment Variables**
```
Missing required environment variable: EXPO_PUBLIC_SUPABASE_URL
```

**Solution:**
```bash
# Create environment file for your build profile
cp .env.example .env.production

# Fill in real values:
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_or_live_key
```

---

### **Error: Credentials Not Found**
```
Error: Could not find credentials for platform: ios
```

**Solution:**
```bash
# Validate credential setup
npm run validate-credentials

# Follow instructions in PRODUCTION_CREDENTIALS_SETUP.md
# Ensure all placeholder values in eas.json are replaced
```

---

### **Error: Bundle Identifier Conflicts**
```
Error: Bundle identifier 'com.mintenance.app' is already taken
```

**Solution:**
```bash
# Update app.config.js with your unique bundle identifier
ios: {
  bundleIdentifier: "com.yourcompany.mintenance",
}
android: {
  package: "com.yourcompany.mintenance",
}
```

---

## 🛠️ **BUILD COMMANDS REFERENCE**

### **Development Builds**
```bash
# Local development
npm start

# Device testing
eas build --platform ios --profile development
eas build --platform android --profile development
```

### **Staging Builds**
```bash
# Internal testing
eas build --platform all --profile staging

# Update over-the-air
eas update --branch staging --message "Staging update"
```

### **Production Builds**
```bash
# Store submission builds
eas build --platform all --profile production-store

# Regular production builds  
eas build --platform all --profile production
```

### **Store Submission**
```bash
# Submit to app stores
eas submit --platform ios --profile production
eas submit --platform android --profile production

# Dry run (test without submitting)
eas submit --platform ios --profile production --dry-run
```

---

## 🔍 **PRE-BUILD CHECKLIST**

### **Required Files**
- [ ] `assets/icon.png` (1024x1024)
- [ ] `assets/splash.png` (1242x2436)
- [ ] `assets/adaptive-icon.png` (1024x1024)
- [ ] `assets/favicon.png` (48x48)
- [ ] `.env.production` (for production builds)

### **Configuration**
- [ ] `app.config.js` has correct bundle identifiers
- [ ] `eas.json` has real credential values (not placeholders)
- [ ] Environment variables are set for target environment
- [ ] All dependencies are installed (`npm install`)

### **Credentials (for store builds)**
- [ ] Apple Developer account enrolled
- [ ] Google Play Console account created
- [ ] Service account keys generated and placed in `credentials/`
- [ ] Run `npm run validate-credentials` successfully

---

## 🚀 **BUILD OPTIMIZATION TIPS**

### **Faster Builds**
```bash
# Use cached builds when possible
eas build --platform android --clear-cache=false

# Build single platform first for testing
eas build --platform ios --profile staging
```

### **Debug Build Issues**
```bash
# Verbose logging
eas build --platform android --profile development --debug

# Check EAS build logs online
# Go to expo.dev → Your Project → Builds
```

### **Reduce Build Time**
```bash
# Use specific node version
"engines": {
  "node": "18.x"
}

# Optimize dependencies
npm ci --only=production
```

---

## 📱 **PLATFORM-SPECIFIC ISSUES**

### **iOS Issues**

**Provisioning Profile Errors:**
```bash
# Regenerate certificates in Apple Developer Portal
# Update eas.json with new team ID and certificates
```

**Simulator vs Device:**
```bash
# For simulator testing
eas build --platform ios --profile development

# For device testing (requires Apple Developer account)
eas device:create
```

### **Android Issues**

**Gradle Build Failures:**
```bash
# Clear Android build cache
cd android && ./gradlew clean
cd .. && eas build --platform android --clear-cache
```

**API Level Compatibility:**
```json
// In app.config.js
"android": {
  "compileSdkVersion": 34,
  "targetSdkVersion": 34,
  "buildToolsVersion": "34.0.0"
}
```

---

## 🔧 **EMERGENCY FIXES**

### **Quick Asset Fix**
```bash
# Generate placeholder assets immediately
npm run generate-assets
```

### **Reset Build Environment**
```bash
# Clear all EAS caches
eas build:cancel --all
eas build --platform all --profile development --clear-cache

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### **Rollback Strategy**
```bash
# If a build breaks production
eas update --branch production --republish --message "Rollback to stable"

# Or submit previous working build
eas submit --id <PREVIOUS_WORKING_BUILD_ID>
```

---

## 📞 **GETTING HELP**

### **Log Analysis**
1. Check EAS build logs at expo.dev
2. Look for specific error messages
3. Check asset file paths and sizes
4. Verify environment variable values

### **Community Resources**
- Expo Discord: https://discord.gg/4gtbPAdpaE
- Expo Forums: https://forums.expo.dev
- Stack Overflow: Tag with 'expo' and 'react-native'

### **Documentation**
- EAS Build: https://docs.expo.dev/build/introduction/
- App Config: https://docs.expo.dev/workflow/configuration/
- Asset Management: https://docs.expo.dev/guides/assets/

---

## ✅ **SUCCESS INDICATORS**

Your build is ready when:
- [ ] Build completes without errors
- [ ] App installs and launches on device/simulator
- [ ] All core features function correctly
- [ ] No critical performance issues
- [ ] Assets display properly across screen sizes
- [ ] Environment variables are loaded correctly

---

**🎯 Remember:** Most build issues are related to missing assets, incorrect configuration, or environment setup. Always check these basics first!