# GitHub Actions Secrets Guide

This document lists all secrets required for GitHub Actions workflows in the Mintenance project.

## Required Secrets

### Core Application Secrets

#### `NEXT_PUBLIC_APP_URL`
- **Used in:** `deploy.yml`
- **Description:** Public URL of the deployed application
- **Example:** `https://mintenance.app`
- **Required:** Yes (for web deployment)

#### `SUPABASE_URL`
- **Used in:** `deploy.yml`
- **Description:** Supabase project URL
- **Example:** `https://xxxxxxxxxxxxx.supabase.co`
- **Required:** Yes
- **How to get:** Supabase Dashboard → Project Settings → API

#### `SUPABASE_ANON_KEY`
- **Used in:** `deploy.yml`
- **Description:** Supabase anonymous/public API key
- **Required:** Yes
- **How to get:** Supabase Dashboard → Project Settings → API → anon/public key

#### `JWT_SECRET`
- **Used in:** `deploy.yml`
- **Description:** Secret for signing JWT tokens
- **Required:** Yes
- **How to generate:** Use a strong random string (32+ characters)
- **Example command:** `openssl rand -base64 32`

---

### Code Coverage & Quality

#### `CODECOV_TOKEN`
- **Used in:** `ci-cd.yml`, `mobile-tests.yml`
- **Description:** Token for uploading coverage reports to Codecov
- **Required:** Optional (for coverage reporting)
- **How to get:**
  1. Visit [codecov.io](https://codecov.io)
  2. Connect your repository
  3. Copy the token from repository settings

---

### Security Scanning

#### `SNYK_TOKEN`
- **Used in:** `security-scan.yml`
- **Description:** Snyk API token for vulnerability scanning
- **Required:** Optional (for Snyk security scanning)
- **How to get:**
  1. Visit [snyk.io](https://snyk.io)
  2. Go to Account Settings → API Token
  3. Generate and copy the token

---

### Deployment Services

#### `VERCEL_TOKEN`
- **Used in:** `deploy.yml` (commented out)
- **Description:** Vercel authentication token
- **Required:** Optional (if using manual Vercel deployment)
- **How to get:**
  1. Visit Vercel Dashboard
  2. Account Settings → Tokens
  3. Create new token

#### `VERCEL_ORG_ID`
- **Used in:** `deploy.yml` (commented out)
- **Description:** Vercel organization/team ID
- **Required:** Optional (with VERCEL_TOKEN)
- **How to get:** Found in Vercel project settings

#### `VERCEL_PROJECT_ID`
- **Used in:** `deploy.yml` (commented out)
- **Description:** Vercel project ID
- **Required:** Optional (with VERCEL_TOKEN)
- **How to get:** Found in Vercel project settings

#### `EXPO_TOKEN`
- **Used in:** `ci-cd.yml` (commented out)
- **Description:** Expo authentication token for EAS builds
- **Required:** Optional (for mobile app builds)
- **How to get:**
  1. Login to Expo: `npx expo login`
  2. Generate token: `npx expo whoami --json`

---

### Notifications

#### `SLACK_WEBHOOK`
- **Used in:** `ci-cd.yml`, `security-scan.yml` (commented out)
- **Description:** Slack webhook URL for notifications
- **Required:** Optional (for Slack notifications)
- **How to get:**
  1. Go to your Slack workspace
  2. Create an Incoming Webhook app
  3. Copy the webhook URL
- **Format:** `https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX`

---

## Setting Up Secrets

### Step 1: Navigate to Repository Settings
1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**

### Step 2: Add New Secret
1. Click **New repository secret**
2. Enter the secret name (must match exactly)
3. Paste the secret value
4. Click **Add secret**

### Step 3: Verify Secrets
Run the workflow and check for any missing secret errors in the logs.

---

## Security Best Practices

### ✅ DO
- Use strong, randomly generated secrets
- Rotate secrets regularly (every 90 days recommended)
- Use different secrets for different environments
- Keep secrets in secure password managers
- Limit secret access to necessary workflows only

### ❌ DON'T
- Commit secrets to the repository
- Share secrets via unsecured channels
- Use the same secret across multiple projects
- Log or print secrets in workflow outputs
- Store secrets in code or comments

---

## Secrets Priority Matrix

### Critical (Application Won't Work Without)
1. `SUPABASE_URL`
2. `SUPABASE_ANON_KEY`
3. `JWT_SECRET`
4. `NEXT_PUBLIC_APP_URL`

### High Priority (Core Features Affected)
1. `CODECOV_TOKEN` - For test coverage tracking
2. `SNYK_TOKEN` - For security scanning

### Medium Priority (Enhanced Functionality)
1. `VERCEL_TOKEN` - For manual deployments
2. `EXPO_TOKEN` - For mobile builds

### Low Priority (Nice to Have)
1. `SLACK_WEBHOOK` - For team notifications

---

## Environment Variables vs Secrets

### Secrets (GitHub Secrets)
Use for sensitive data:
- API keys
- Access tokens
- Passwords
- Private keys

### Environment Variables (workflow YAML)
Use for non-sensitive configuration:
- Node version
- Build settings
- Public URLs
- Feature flags

---

## Troubleshooting

### Secret Not Found Error
```
Error: Input required and not supplied: token
```
**Solution:** Verify the secret name matches exactly (case-sensitive)

### Secret Value Empty
```
Error: Secret value is empty or null
```
**Solution:** Re-add the secret ensuring there are no extra spaces

### Unauthorized Error
```
Error: 401 Unauthorized
```
**Solution:** The secret may be expired or invalid. Generate a new one.

---

## Audit Log

To review secret usage:
1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click on any secret to see when it was last used
3. Review workflow runs to see which jobs accessed the secret

---

## Support

If you need help setting up secrets:
1. Check this guide thoroughly
2. Review the workflow files to understand requirements
3. Contact the DevOps team
4. Create an issue in the repository

---

**Last Updated:** 2025-10-28
**Maintained By:** DevOps Team
