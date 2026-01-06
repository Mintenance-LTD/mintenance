# GitHub Secrets - Manual Entry Table

Use this table to add secrets manually via GitHub Web UI: https://github.com/Mintenance-LTD/mintenance/settings/secrets/actions

## Quick Steps:
1. Go to the link above
2. Click **"New repository secret"** for each row below
3. Copy the **Secret Name** exactly as shown
4. Paste your **Secret Value**
5. Click **"Add secret"**

---

## Secrets Table

| Secret Name | Description | Where to Get It | Example Format | Required |
|------------|-------------|-----------------|----------------|----------|
| `VERCEL_TOKEN` | Vercel personal access token for deployments | https://vercel.com/account/tokens → Create new token | `vercel_xxxxxxxxxxxxx` | ✅ Yes |
| `VERCEL_ORG_ID` | Vercel organization ID | Run `vercel whoami` after login, or check Vercel Dashboard → Settings | `team_xxxxxxxxxxxxx` | ✅ Yes |
| `VERCEL_PROJECT_ID` | Vercel project ID | Check `.vercel/project.json` after first deployment, or Vercel Dashboard → Project Settings | `prj_xxxxxxxxxxxxx` | ✅ Yes |
| `EXPO_TOKEN` | Expo access token for mobile app builds | https://expo.dev/accounts/[username]/settings/access-tokens → Create new token | `exp_xxxxxxxxxxxxx` | ✅ Yes |
| `SUPABASE_URL` | Supabase project URL | Supabase Dashboard → Settings → API → Project URL | `https://xxxxxxxxxxxxx.supabase.co` | ✅ Yes |
| `SUPABASE_ANON_KEY` | Supabase anonymous key (public) | Supabase Dashboard → Settings → API → anon/public key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | ✅ Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (⚠️ KEEP SECURE!) | Supabase Dashboard → Settings → API → service_role key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | ✅ Yes |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (public) | Stripe Dashboard → Developers → API keys → Publishable key | `pk_test_51xxxxxxxxxxxxx` or `pk_live_51xxxxxxxxxxxxx` | ✅ Yes |
| `STRIPE_SECRET_KEY` | Stripe secret key (⚠️ KEEP SECURE!) | Stripe Dashboard → Developers → API keys → Secret key | `sk_test_51xxxxxxxxxxxxx` or `sk_live_51xxxxxxxxxxxxx` | ✅ Yes |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook endpoint secret | Stripe Dashboard → Developers → Webhooks → Add endpoint → Reveal secret | `whsec_xxxxxxxxxxxxx` | ✅ Yes |
| `SENTRY_DSN` | Sentry project DSN for error tracking | Sentry Dashboard → Project Settings → Client Keys (DSN) | `https://xxxxxxxxxxxxx@xxxxxxxxxxxxx.ingest.sentry.io/xxxxxxxxxxxxx` | ✅ Yes |
| `SENTRY_AUTH_TOKEN` | Sentry auth token for source maps | Sentry Dashboard → Settings → Auth Tokens → Create New Token | `sntrys_xxxxxxxxxxxxx` | ✅ Yes |
| `JWT_SECRET` | Random 64+ character string for JWT signing | Generate with: `openssl rand -base64 64` (or use script) | `aB3cD4eF5gH6iJ7kL8mN9oP0qR1sT2uV3wX4yZ5aB6cD7eF8gH9iJ0kL1mN2oP3qR4s` | ✅ Yes |
| `CRON_SECRET` | Random string for cron job authentication | Generate with: `openssl rand -hex 32` (or use script) | `abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890` | ✅ Yes |
| `DATABASE_URL` | PostgreSQL connection string | Supabase Dashboard → Settings → Database → Connection string → URI | `postgresql://postgres:[PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres` | ✅ Yes |
| `REDIS_URL` | Redis/Upstash connection URL | Upstash Dashboard → Redis → Details → REST URL | `https://xxxxxxxxxxxxx.upstash.io` or `redis://default:xxxxxxxxxxxxx@xxxxxxxxxxxxx.upstash.io:6379` | ✅ Yes |
| `CODECOV_TOKEN` | Codecov upload token for coverage reports | Codecov Dashboard → Repository Settings → Upload Token | `xxxxxxxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxxx` | ⚠️ Optional |

---

## Generate Random Secrets

If you need to generate `JWT_SECRET` or `CRON_SECRET`, use these commands:

### Windows PowerShell:
```powershell
# Generate JWT_SECRET (64+ characters)
[Convert]::ToBase64String((1..64 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))

# Generate CRON_SECRET (hex string)
-join ((48..57) + (97..102) | Get-Random -Count 64 | ForEach-Object {[char]$_})
```

### Git Bash / Linux / macOS:
```bash
# Generate JWT_SECRET
openssl rand -base64 64

# Generate CRON_SECRET
openssl rand -hex 32
```

---

## Checklist

Use this checklist to track your progress:

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
- [ ] `CODECOV_TOKEN` (optional)

---

## Security Notes

⚠️ **Important Security Reminders:**

1. **Never commit secrets** to your repository
2. **Use test keys** for development/staging environments
3. **Rotate secrets regularly** (every 90 days recommended)
4. **Use different secrets** for staging and production
5. **Keep `SUPABASE_SERVICE_ROLE_KEY` and `STRIPE_SECRET_KEY` secure** - these have full access

---

## Need Help?

- Full documentation: `docs/GITHUB_SECRETS_SETUP.md`
- Quick start guide: `scripts/QUICK_START_GITHUB_SECRETS.md`
- Automated setup: `scripts/setup-github-secrets.ps1`
