# 🔐 GitHub Secrets Configuration Guide

## Required Secrets for Production Deployment

### 1. Vercel Deployment Secrets

```bash
# Required for Web App deployment
VERCEL_TOKEN          # Your Vercel personal access token
VERCEL_ORG_ID         # Your Vercel organization ID
VERCEL_PROJECT_ID     # Your Vercel project ID
```

**How to obtain:**
1. Go to [Vercel Dashboard](https://vercel.com/account/tokens)
2. Create a new token with deployment permissions
3. Get Org ID: `vercel whoami` (after login)
4. Get Project ID: Check `.vercel/project.json` after first manual deployment

### 2. Expo/EAS Build Secrets

```bash
# Required for Mobile App deployment
EXPO_TOKEN            # Your Expo access token
```

**How to obtain:**
1. Go to [Expo Access Tokens](https://expo.dev/accounts/[username]/settings/access-tokens)
2. Create a new token with build permissions

### 3. Supabase Secrets

```bash
# Required for database operations
SUPABASE_URL          # Your Supabase project URL
SUPABASE_ANON_KEY     # Your Supabase anonymous key
SUPABASE_SERVICE_ROLE_KEY  # Your Supabase service role key (KEEP SECURE!)
```

**How to obtain:**
1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project → Settings → API
3. Copy the URL and keys

### 4. Stripe Secrets

```bash
# Required for payment processing
STRIPE_PUBLISHABLE_KEY  # Your Stripe publishable key
STRIPE_SECRET_KEY       # Your Stripe secret key (KEEP SECURE!)
STRIPE_WEBHOOK_SECRET   # Your Stripe webhook endpoint secret
```

**How to obtain:**
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
2. Copy your keys (use test keys for staging)
3. For webhook secret: Webhooks → Add endpoint → Reveal secret

### 5. Monitoring Secrets

```bash
# Required for error tracking
SENTRY_DSN            # Your Sentry project DSN
SENTRY_AUTH_TOKEN     # Your Sentry auth token for source maps
CODECOV_TOKEN         # Your Codecov upload token
```

**How to obtain:**
1. Sentry: Project Settings → Client Keys (DSN)
2. Sentry Auth: Settings → Auth Tokens
3. Codecov: Repository Settings → Upload Token

### 6. General Secrets

```bash
# Required for various features
JWT_SECRET            # Random 64+ character string for JWT signing
CRON_SECRET          # Random string for cron job authentication
DATABASE_URL         # PostgreSQL connection string
REDIS_URL            # Redis/Upstash connection URL
```

**Generate secure secrets:**
```bash
# Generate JWT_SECRET
openssl rand -base64 64

# Generate CRON_SECRET
openssl rand -hex 32
```

## Setting Up Secrets in GitHub

### Via GitHub Web Interface:

1. Navigate to your repository
2. Go to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret with its name and value
5. Click **Add secret**

### Via GitHub CLI:

```bash
# Install GitHub CLI
brew install gh  # macOS
# or
winget install --id GitHub.cli  # Windows

# Authenticate
gh auth login

# Add secrets
gh secret set VERCEL_TOKEN --body "your-vercel-token"
gh secret set VERCEL_ORG_ID --body "your-org-id"
gh secret set VERCEL_PROJECT_ID --body "your-project-id"
gh secret set EXPO_TOKEN --body "your-expo-token"
gh secret set SUPABASE_URL --body "https://your-project.supabase.co"
gh secret set SUPABASE_ANON_KEY --body "your-anon-key"
gh secret set SUPABASE_SERVICE_ROLE_KEY --body "your-service-role-key"
gh secret set STRIPE_PUBLISHABLE_KEY --body "pk_test_..."
gh secret set STRIPE_SECRET_KEY --body "sk_test_..."
gh secret set STRIPE_WEBHOOK_SECRET --body "whsec_..."
gh secret set SENTRY_DSN --body "https://...@sentry.io/..."
gh secret set SENTRY_AUTH_TOKEN --body "your-auth-token"
gh secret set JWT_SECRET --body "$(openssl rand -base64 64)"
gh secret set CRON_SECRET --body "$(openssl rand -hex 32)"
gh secret set DATABASE_URL --body "postgresql://..."
gh secret set REDIS_URL --body "redis://..."
gh secret set CODECOV_TOKEN --body "your-codecov-token"
```

## Environment-Specific Secrets

For different environments, use prefixes:

```bash
# Staging
STAGING_VERCEL_PROJECT_ID
STAGING_DATABASE_URL
STAGING_STRIPE_SECRET_KEY

# Production
PROD_VERCEL_PROJECT_ID
PROD_DATABASE_URL
PROD_STRIPE_SECRET_KEY
```

## Verifying Secrets

After adding secrets, verify they're available:

```bash
# List all secrets (names only)
gh secret list

# In your workflow, add a debug step (remove after testing)
- name: Verify secrets are set
  run: |
    if [ -z "${{ secrets.VERCEL_TOKEN }}" ]; then
      echo "❌ VERCEL_TOKEN is not set"
    else
      echo "✅ VERCEL_TOKEN is set"
    fi
```

## Security Best Practices

1. **Never commit secrets** to the repository
2. **Rotate secrets regularly** (every 90 days)
3. **Use least privilege** - only grant necessary permissions
4. **Separate environments** - use different secrets for staging/production
5. **Audit access** - regularly review who has access to secrets
6. **Use secret scanning** - enable GitHub secret scanning
7. **Encrypt in transit** - always use HTTPS/TLS

## Troubleshooting

### Common Issues:

1. **Secret not found in workflow**
   - Check secret name matches exactly (case-sensitive)
   - Ensure secret is in the correct repository
   - Verify workflow has permission to access secrets

2. **Deployment fails with auth error**
   - Regenerate and update the token
   - Check token has correct permissions
   - Verify token hasn't expired

3. **Webhook signature validation fails**
   - Ensure webhook secret matches exactly
   - Check for trailing spaces or newlines
   - Verify webhook URL is correct

## Required Secrets Checklist

- [ ] `VERCEL_TOKEN`
- [ ] `VERCEL_ORG_ID`
- [ ] `VERCEL_PROJECT_ID`
- [ ] `EXPO_TOKEN`
- [ ] `SUPABASE_URL`
- [ ] `SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `STRIPE_PUBLISHABLE_KEY`
- [ ] `STRIPE_SECRET_KEY`
- [ ] `STRIPE_WEBHOOK_SECRET`
- [ ] `SENTRY_DSN`
- [ ] `SENTRY_AUTH_TOKEN`
- [ ] `JWT_SECRET`
- [ ] `CRON_SECRET`
- [ ] `DATABASE_URL`
- [ ] `REDIS_URL`
- [ ] `CODECOV_TOKEN`

Once all secrets are configured, the deployment workflows can be enabled!