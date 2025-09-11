# 🔔 Push Notifications Setup Guide

## Firebase Cloud Messaging (FCM) Setup

### 1. Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project named "Mintenance"
3. Enable Google Analytics (optional)

### 2. Add Android App
1. Click "Add app" → Android
2. Package name: `com.mintenance.app`
3. Download `google-services.json`
4. Place file in project root (will be auto-referenced in builds)

### 3. Add iOS App
1. Click "Add app" → iOS
2. Bundle ID: `com.mintenance.app`
3. Download `GoogleService-Info.plist`
4. Place file in project root (will be auto-referenced in builds)

### 4. Configure EAS Secrets
Add these environment variables to EAS:
```bash
# Add to EAS Dashboard > Project Settings > Environment variables
GOOGLE_SERVICES_JSON=1  # Enables Android FCM
GOOGLE_SERVICES_PLIST=1 # Enables iOS FCM
```

## Apple Push Notifications (APNs) Setup

### 1. Apple Developer Console
1. Go to [Apple Developer](https://developer.apple.com/account/)
2. Navigate to Certificates, Identifiers & Profiles
3. Create App ID for `com.mintenance.app`
4. Enable Push Notifications capability

### 2. Create Push Notification Key
1. Go to Keys section
2. Create new key with APNs enabled
3. Download `.p8` file
4. Note the Key ID and Team ID

### 3. Configure in Firebase
1. In Firebase Console → Project Settings → Cloud Messaging
2. Upload APNs key (.p8 file)
3. Enter Key ID and Team ID

## Implementation Status

### ✅ Completed Configuration
- **App Config**: FCM/APNs service files conditionally loaded
- **Deep Linking**: Universal links configured for both platforms
- **Intent Filters**: Android auto-verify setup for mintenance.app
- **Associated Domains**: iOS universal links for mintenance.app

### 📋 Next Steps Required
1. **Create Firebase project** and download service files
2. **Add service files** to project root:
   - `google-services.json` (Android)
   - `GoogleService-Info.plist` (iOS)
3. **Set EAS environment variables**:
   ```bash
   eas env:set GOOGLE_SERVICES_JSON=1 --environment=production
   eas env:set GOOGLE_SERVICES_PLIST=1 --environment=production
   ```
4. **Update NotificationService.ts** with FCM token handling
5. **Test push notifications** on device

## Notification Service Integration

The `NotificationService.ts` already exists and handles:
- ✅ Permission requests
- ✅ Token management  
- ✅ Notification display
- ✅ Background handling

Once Firebase is configured, tokens will automatically sync with FCM.

## Universal Links Configuration

### Domain Setup Required
1. **Host `.well-known/apple-app-site-association`** at:
   - `https://mintenance.app/.well-known/apple-app-site-association`
   - `https://www.mintenance.app/.well-known/apple-app-site-association`

2. **Host `.well-known/assetlinks.json`** for Android App Links:
   - `https://mintenance.app/.well-known/assetlinks.json`

### Example apple-app-site-association:
```json
{
  "applinks": {
    "details": [
      {
        "appIDs": ["TEAM_ID.com.mintenance.app"],
        "components": [
          {
            "/": "/contractors/*",
            "comment": "Contractor profiles"
          },
          {
            "/": "/jobs/*", 
            "comment": "Job details"
          }
        ]
      }
    ]
  }
}
```

## Security Considerations

- ✅ Service files are conditionally loaded (not committed to repo)
- ✅ Use EAS Secrets for sensitive configuration
- ✅ Universal links properly configured with auto-verify
- ✅ Associated domains restricted to mintenance.app

## Testing Checklist

- [ ] FCM token generation on Android
- [ ] APNs token generation on iOS  
- [ ] Push notification delivery
- [ ] Universal link navigation
- [ ] Deep link handling in app
- [ ] Background notification handling