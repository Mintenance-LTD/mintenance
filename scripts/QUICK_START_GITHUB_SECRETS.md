# Quick Start: GitHub Secrets Setup

## Option 1: Automated Setup (Recommended)

### Step 1: Install GitHub CLI

```powershell
winget install --id GitHub.cli
```

### Step 2: Authenticate

```powershell
gh auth login
```

Follow the prompts to authenticate with your GitHub account.

### Step 3: Run the Setup Script

```powershell
.\scripts\setup-github-secrets.ps1
```

The script will:
- ✅ Guide you through adding each secret
- ✅ Generate random values for JWT_SECRET and CRON_SECRET
- ✅ Validate and add secrets to your repository
- ✅ Allow you to skip secrets you don't have yet

## Option 2: Manual Setup via Web UI

1. Go to: https://github.com/Mintenance-LTD/mintenance/settings/secrets/actions
2. Click **"New repository secret"** for each secret
3. Add the following secrets:

### Required Secrets

- `VERCEL_TOKEN` - Get from https://vercel.com/account/tokens
- `VERCEL_ORG_ID` - Run `vercel whoami` after login
- `VERCEL_PROJECT_ID` - Check `.vercel/project.json` after first deployment
- `EXPO_TOKEN` - Get from https://expo.dev/accounts/[username]/settings/access-tokens
- `SUPABASE_URL` - Your Supabase project URL (https://your-project.supabase.co)
- `SUPABASE_ANON_KEY` - From Supabase Dashboard → Settings → API
- `SUPABASE_SERVICE_ROLE_KEY` - From Supabase Dashboard → Settings → API
- `STRIPE_PUBLISHABLE_KEY` - From Stripe Dashboard → API Keys (pk_test_...)
- `STRIPE_SECRET_KEY` - From Stripe Dashboard → API Keys (sk_test_...)
- `STRIPE_WEBHOOK_SECRET` - From Stripe Dashboard → Webhooks → Reveal secret
- `SENTRY_DSN` - From Sentry Project Settings → Client Keys
- `SENTRY_AUTH_TOKEN` - From Sentry Settings → Auth Tokens
- `JWT_SECRET` - Generate with: `openssl rand -base64 64`
- `CRON_SECRET` - Generate with: `openssl rand -hex 32`
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis/Upstash connection URL
- `CODECOV_TOKEN` - From Codecov Repository Settings

## Option 3: One-Line GitHub CLI Commands

If you have all values ready, you can add them all at once:

```powershell
# First, authenticate
gh auth login

# Then add secrets (replace values with your actual secrets)
gh secret set VERCEL_TOKEN --body "your-vercel-token" --repo Mintenance-LTD/mintenance
gh secret set VERCEL_ORG_ID --body "your-org-id" --repo Mintenance-LTD/mintenance
gh secret set VERCEL_PROJECT_ID --body "your-project-id" --repo Mintenance-LTD/mintenance
gh secret set EXPO_TOKEN --body "your-expo-token" --repo Mintenance-LTD/mintenance
gh secret set SUPABASE_URL --body "https://your-project.supabase.co" --repo Mintenance-LTD/mintenance
gh secret set SUPABASE_ANON_KEY --body "your-anon-key" --repo Mintenance-LTD/mintenance
gh secret set SUPABASE_SERVICE_ROLE_KEY --body "your-service-role-key" --repo Mintenance-LTD/mintenance
gh secret set STRIPE_PUBLISHABLE_KEY --body "pk_test_..." --repo Mintenance-LTD/mintenance
gh secret set STRIPE_SECRET_KEY --body "sk_test_..." --repo Mintenance-LTD/mintenance
gh secret set STRIPE_WEBHOOK_SECRET --body "whsec_..." --repo Mintenance-LTD/mintenance
gh secret set SENTRY_DSN --body "https://...@sentry.io/..." --repo Mintenance-LTD/mintenance
gh secret set SENTRY_AUTH_TOKEN --body "your-auth-token" --repo Mintenance-LTD/mintenance
gh secret set JWT_SECRET --body "$(openssl rand -base64 64)" --repo Mintenance-LTD/mintenance
gh secret set CRON_SECRET --body "$(openssl rand -hex 32)" --repo Mintenance-LTD/mintenance
gh secret set DATABASE_URL --body "postgresql://..." --repo Mintenance-LTD/mintenance
gh secret set REDIS_URL --body "redis://..." --repo Mintenance-LTD/mintenance
gh secret set CODECOV_TOKEN --body "your-codecov-token" --repo Mintenance-LTD/mintenance
```

## Verify Secrets

After adding secrets, verify they're set:

```powershell
gh secret list --repo Mintenance-LTD/mintenance
```

## Need Help?

See the full documentation: `docs/GITHUB_SECRETS_SETUP.md`
