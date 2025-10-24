# 🔐 GitHub Secrets Configuration

## Required Secrets for CI/CD Pipeline

To enable the automated CI/CD pipeline, configure these secrets in GitHub repository settings:

**Repository Settings → Secrets and variables → Actions → New repository secret**

### **Essential Secrets**

#### **1. EXPO_TOKEN**
```bash
# Get from Expo dashboard
Value: exp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Description: Expo access token for EAS builds
Required for: Build and deployment automation
```

#### **2. CODECOV_TOKEN**
```bash
# Get from codecov.io after connecting repository
Value: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
Description: Code coverage reporting token
Required for: Test coverage tracking
```

#### **3. SLACK_WEBHOOK** (Optional)
```bash
# Create Slack webhook for notifications
Value: https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX
Description: Slack webhook for deployment notifications
Required for: Team notifications
```

### **Vercel Deployment Secrets** (For Review Apps)

#### **4. VERCEL_TOKEN**
```bash
# Get from Vercel dashboard → Account → Tokens
Value: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Description: Vercel deployment token
Required for: Automated preview deployments on PRs
```

#### **5. VERCEL_ORG_ID**
```bash
# Get from .vercel/project.json after running 'vercel link'
Value: team_xxxxxxxxxxxxxxxxxxxxx
Description: Vercel organization/team ID
Required for: Preview deployment configuration
```

#### **6. VERCEL_PROJECT_ID**
```bash
# Get from .vercel/project.json after running 'vercel link'
Value: prj_xxxxxxxxxxxxxxxxxxxxx
Description: Vercel project ID
Required for: Preview deployment configuration
```

### **Future Production Secrets**

#### **7. GOOGLE_PLAY_SERVICE_ACCOUNT** (For store submission)
```bash
# Google Play Console service account JSON
Value: {"type": "service_account", "project_id": "...", ...}
Description: Google Play Store deployment credentials
Required for: Android store submission automation
```

#### **8. APPLE_APP_STORE_CONNECT_API_KEY** (For store submission)
```bash
# App Store Connect API key
Value: LS0tLS1CRUdJTi... (base64 encoded)
Description: Apple App Store deployment credentials  
Required for: iOS store submission automation
```

## How to Set Up Secrets

### 1. Expo Token
```bash
# Login to Expo CLI
npx expo login

# Generate access token
npx expo whoami
# Copy token from Expo dashboard → Access Tokens
```

### 2. Codecov Setup
```bash
# 1. Go to https://codecov.io
# 2. Connect GitHub repository
# 3. Copy the token from repository settings
# 4. Add as CODECOV_TOKEN secret
```

### 3. Slack Notifications
```bash
# 1. Create Slack app at https://api.slack.com/apps
# 2. Enable Incoming Webhooks
# 3. Add webhook to channel #mintenance-deployments
# 4. Copy webhook URL as SLACK_WEBHOOK secret
```

### 4. Vercel Setup (For Review Apps)
```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Login to Vercel
vercel login

# 3. Link your project
cd apps/web
vercel link

# 4. Get credentials from .vercel/project.json
cat .vercel/project.json

# 5. Generate access token
# Go to: https://vercel.com/account/tokens
# Click "Create Token"
# Copy token and add as VERCEL_TOKEN secret

# 6. Add VERCEL_ORG_ID and VERCEL_PROJECT_ID from .vercel/project.json
```

## Environment Variables (Public)

These can be set in GitHub Variables (not secrets):

```bash
# Repository Settings → Secrets and variables → Actions → Variables tab

NODE_VERSION=18
EXPO_SDK_VERSION=53
ANDROID_API_LEVEL=34
JAVA_VERSION=11
```

## Local Development Secrets

Create `.env.local` for local development:

```bash
# Copy from .env.example
EXPO_TOKEN=exp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
CODECOV_TOKEN=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# Never commit this file!
echo ".env.local" >> .gitignore
```

## Security Best Practices

1. **Never commit secrets to repository**
2. **Rotate tokens every 90 days**  
3. **Use least privilege access for service accounts**
4. **Monitor secret usage in GitHub Actions logs**
5. **Revoke tokens immediately if compromised**

## Troubleshooting

### Build Failures
```bash
# Check if EXPO_TOKEN is valid
npx expo whoami --token $EXPO_TOKEN

# Verify token permissions
npx expo build:status --token $EXPO_TOKEN
```

### Coverage Upload Issues
```bash
# Verify Codecov token
curl -X POST --data-binary @coverage/lcov.info \
  -H "Content-Type: text/plain" \
  "https://codecov.io/upload/v2?token=$CODECOV_TOKEN"
```

## Required Actions After Setup

1. **Test CI/CD Pipeline**: Push to `develop` branch to test staging builds
2. **Verify Coverage**: Check codecov.io dashboard after test runs
3. **Test Notifications**: Verify Slack messages in deployment channel
4. **Monitor Builds**: Check EAS dashboard for successful builds

The CI/CD pipeline will automatically:
- ✅ Run tests and type checking on every PR
- ✅ Build staging apps on `develop` branch  
- ✅ Build production apps on `main`/`master` branch
- ✅ Upload test coverage reports
- ✅ Perform security scans
- ✅ Notify team of deployment status