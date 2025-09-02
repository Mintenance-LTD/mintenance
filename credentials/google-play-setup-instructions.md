# 🤖 Google Play Store Setup Instructions

## Step 1: Create Google Play Console Account
1. Go to [play.google.com/console](https://play.google.com/console)
2. Pay $25 one-time registration fee
3. Complete developer profile verification

## Step 2: Create App in Google Play Console
1. Click "Create app"
2. Fill in details:
   - **App name**: `Mintenance - Home Maintenance`
   - **Package name**: `com.mintenance.app`
   - **Default language**: English (United States)
   - **App or game**: App
   - **Free or paid**: Free (or set pricing)

## Step 3: Generate Service Account Key
1. Google Play Console → Setup → API access
2. Click "Create new service account"
3. Follow link to Google Cloud Console
4. Create new service account:
   - **Service account name**: `mintenance-app-deployment`
   - **Service account ID**: `mintenance-app-deployment`
   - **Description**: `Service account for Mintenance app EAS deployment`
5. Click "Create and continue"
6. Grant role: **Service Account User**
7. Click "Done"
8. In the service accounts list, click on the newly created account
9. Go to "Keys" tab
10. Click "Add Key" → "Create new key" → JSON
11. Download the JSON file
12. Rename to `play-store-service-account.json`
13. Place in this `credentials/` directory

## Step 4: Grant Permissions in Google Play Console
1. Back in Google Play Console → Setup → API access
2. Find your service account in the list
3. Click "Grant access"
4. Set permissions:
   - **Release Manager**: ✅ (allows uploading builds)
   - **Financial data**: ❌ (not needed)
5. Click "Save changes"

## Step 5: Verify Setup
Your `credentials/` directory should now contain:
- `play-store-service-account.json`
- `README.md`
- `.gitkeep`

## 🚨 Security Notes:
- The service account key grants significant access to your Google Play Console
- Store the JSON file securely and never commit to git
- Consider rotating keys every 90 days
- Monitor account activity regularly

## Next Steps:
1. Update `eas.json` with the correct service account path
2. Run test build: `eas build --platform android --profile production-store`
3. Run test submit: `eas submit --platform android --profile production --dry-run`