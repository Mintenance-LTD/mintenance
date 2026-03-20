# Mintenance Production Deployment Runbook

Last updated: 2026-03-17
Version: 1.2.4

---

## Table of Contents

1. [Pre-Deployment Checklist](#1-pre-deployment-checklist)
2. [Web Deployment (Vercel)](#2-web-deployment-vercel)
3. [Mobile Deployment (EAS)](#3-mobile-deployment-eas)
4. [Database Migration (Supabase)](#4-database-migration-supabase)
5. [Environment Variables Reference](#5-environment-variables-reference)
6. [Monitoring and Observability](#6-monitoring-and-observability)
7. [Incident Response and Rollback](#7-incident-response-and-rollback)
8. [Appendix: Cron Jobs](#appendix-a-cron-jobs)

---

## 1. Pre-Deployment Checklist

Complete every item before merging to `main`. Do not skip steps.

### 1.1 Code Quality

- [ ] All CI checks passing on the PR (quality-checks, performance-monitoring jobs)
- [ ] TypeScript compilation clean: `npm run type-check:web`
- [ ] Lint clean: `npm run lint:web && npm run lint:mobile`
- [ ] No new `any` types introduced (run `npm run audit:any-types`)
- [ ] No files exceed 300-line soft limit (run `npm run audit:file-sizes`)

### 1.2 Tests

- [ ] Web tests passing: `npm run test:web -- run` (target: 97%+ suite pass rate)
- [ ] Mobile tests passing: `npm run test:mobile -- --watchAll=false` (target: 93%+ pass rate)
- [ ] E2E tests passing (if applicable): `npm run e2e`
- [ ] No new test regressions introduced

### 1.3 Security

- [ ] `npm audit --audit-level high` returns no new high/critical vulnerabilities
- [ ] Security scan workflow passed on the PR branch
- [ ] No secrets committed (TruffleHog scan clean)
- [ ] If new API routes added: `withApiHandler()` wrapper used, rate limiting configured
- [ ] If new database tables added: RLS policies in place

### 1.4 Database

- [ ] Migration files reviewed by a second engineer
- [ ] Migrations tested on staging Supabase project
- [ ] Migration is backward-compatible (no destructive column drops without data migration)
- [ ] `npx supabase db diff --local` shows expected changes only
- [ ] Rollback SQL prepared if migration is non-trivial

### 1.5 Staging Verification

- [ ] Code deployed to staging (`develop` branch, `deploy-staging.yml` workflow)
- [ ] Staging smoke tests passed (version, health, stats, auth guard endpoints)
- [ ] Manual QA completed on staging URL
- [ ] If mobile changes: staging APK installed and tested on device
- [ ] Performance acceptable (no regressions in page load times)

### 1.6 Feature Flags

- [ ] New features behind feature flags if partially complete
- [ ] Feature flags configured in environment variables for production
- [ ] Gradual rollout percentages set (if applicable: SAM3_ROLLOUT_PERCENTAGE, CORS_ROLLOUT_PERCENTAGE)

### 1.7 Communication

- [ ] Team notified in #mintenance-deployments Slack channel
- [ ] If breaking change: downstream consumers notified
- [ ] Deployment window agreed (avoid Fridays and peak hours)

---

## 2. Web Deployment (Vercel)

### 2.1 Architecture

- **Platform:** Vercel (Next.js)
- **Region:** `lhr1` (London)
- **Build command:** `bash scripts/vercel-build.sh` (copies public assets, runs `next build --webpack`)
- **Output directory:** `apps/web/.next`
- **Framework:** Next.js with App Router

### 2.2 Standard Deployment (merge to main)

**Step 1: Merge the PR**

```bash
# On GitHub, merge the approved PR to main
# This triggers the "Deploy to Vercel" workflow (.github/workflows/deploy.yml)
```

**Step 2: Automated pipeline executes**

The `deploy.yml` workflow runs these steps in order:
1. Checkout code
2. Install dependencies (`npm ci`)
3. TypeScript type check (`npm run type-check:web`)
4. Lint (`npm run lint:web`)
5. Build (`npm run build:web`)
6. Push Supabase migrations to production
7. Verify schema sync
8. Deploy to Vercel (production)
9. Post-deploy health check

**Step 3: Monitor the deployment**

1. Watch the GitHub Actions run: `https://github.com/<org>/mintenance/actions/workflows/deploy.yml`
2. Check the Vercel dashboard for deployment status
3. Verify the health check step passed

**Step 4: Post-deploy verification**

```bash
# Health check (should return 200 with status: "healthy")
curl -sf https://mintenance.com/api/health | python3 -m json.tool

# Version check (confirm new commit SHA)
curl -sf https://mintenance.com/api/version | python3 -m json.tool

# Platform stats (should return 200 with real data)
curl -sf https://mintenance.com/api/stats/platform | python3 -m json.tool

# Auth guard (should return 401 without token)
curl -s -o /dev/null -w "%{http_code}" https://mintenance.com/api/jobs
# Expected: 401
```

### 2.3 Vercel Function Configuration

These are defined in `vercel.json` and apply automatically:

| Route Pattern | Max Duration |
|--------------|-------------|
| `app/api/ai/**/*.ts` | 60s |
| `app/api/payments/**/*.ts` | 30s |
| `app/api/webhooks/**/*.ts` | 30s |
| `app/api/cron/**/*.ts` | 60s |
| `app/api/jobs/**/*.ts` | 30s |
| `app/api/admin/**/*.ts` | 30s |

### 2.4 Rollback Procedure (Web)

**Option A: Instant rollback via Vercel dashboard**

1. Go to Vercel dashboard > Project > Deployments
2. Find the last known-good deployment
3. Click the three-dot menu > "Promote to Production"
4. Deployment switches instantly (no rebuild)

**Option B: Rollback via Git**

```bash
# Revert the merge commit
git revert -m 1 <merge-commit-sha>
git push origin main
# This triggers a new deployment with the reverted code
```

**Option C: Vercel CLI rollback**

```bash
# List recent deployments
vercel ls --prod

# Promote a specific deployment
vercel promote <deployment-url> --token=$VERCEL_TOKEN
```

### 2.5 DNS and Domain Configuration

| Domain | Target |
|--------|--------|
| `mintenance.com` | Vercel production |
| `www.mintenance.com` | Redirect to `mintenance.com` |
| `staging.mintenance.com` | Vercel preview (staging) |
| `app.mintenance.com` | Vercel production (alias) |

DNS is managed through the domain registrar. Vercel SSL certificates are auto-provisioned and auto-renewed.

---

## 3. Mobile Deployment (EAS)

### 3.1 Architecture

- **Build service:** Expo Application Services (EAS Build)
- **Update service:** Expo Updates (OTA)
- **iOS bundle ID:** `com.mintenance.app`
- **Android package:** `com.mintenance.app`
- **Node version:** 20.19.4
- **EAS CLI version:** >= 16.17.4

### 3.2 Build Profiles

| Profile | Distribution | Android Output | iOS Config | Channel |
|---------|-------------|----------------|------------|---------|
| `development` | internal | APK (debug) | Debug (simulator) | development |
| `staging` | internal | APK (release) | Release | staging |
| `stable` | internal | APK (release) | Release | stable |
| `production` | default | AAB (bundle) | Release | production |
| `production-store` | store | AAB (bundle) | Release | production |

### 3.3 iOS Deployment

**Step 1: Trigger production build**

```bash
cd apps/mobile

# Build for iOS (production profile)
eas build --platform ios --profile production --non-interactive

# Or trigger via GitHub Actions:
# Push to main with mobile changes, or use workflow_dispatch
```

**Step 2: Wait for EAS build to complete**

- Monitor at: https://expo.dev/accounts/mintenance-ltd/projects/mintenance/builds
- Typical iOS build time: 15-30 minutes

**Step 3: Submit to App Store Connect**

```bash
# Submit the latest iOS build to TestFlight
eas submit --platform ios --latest --profile production

# Or submit a specific build
eas submit --platform ios --id <build-id> --profile production
```

**Step 4: TestFlight internal testing**

1. Build appears in App Store Connect > TestFlight > Internal Testing
2. Test on physical devices
3. Verify all critical flows (login, job creation, bidding, payments)

**Step 5: Submit for App Store review**

1. Go to App Store Connect > App Store > Prepare for Submission
2. Select the build from TestFlight
3. Fill in release notes
4. Submit for review (typically 24-48 hours)

**Step 6: Release**

1. Once approved, release manually or configure automatic release
2. Monitor crash reports in Sentry for the first 24 hours

### 3.4 Android Deployment

**Step 1: Trigger production build**

```bash
cd apps/mobile

# Build Android AAB for Play Store
eas build --platform android --profile production-store --non-interactive
```

**Step 2: Submit to Google Play Console**

```bash
# Submit to internal testing track
eas submit --platform android --latest --profile production

# This uses the service account key at:
# ./credentials/play-store-service-account.json
```

**Step 3: Internal testing**

1. Go to Google Play Console > Internal testing
2. Promote the build to internal testers
3. Install via Google Play (internal testing link)
4. Test critical flows

**Step 4: Staged rollout to production**

1. Google Play Console > Production > Create new release
2. Select the tested AAB
3. Set rollout percentage:
   - Day 1: 5%
   - Day 2: 25% (if no critical issues)
   - Day 3: 50%
   - Day 5: 100%
4. Monitor crash rates and ANR rates between each stage

### 3.5 OTA Updates (Expo Updates)

For JavaScript-only changes that do not modify native code:

```bash
cd apps/mobile

# Publish OTA update to the production channel
eas update --branch production --message "Description of the update"

# Publish to staging for testing first
eas update --branch staging --message "Description of the update"
```

**When to use OTA vs native build:**

| Change Type | OTA Safe? | Requires Native Build? |
|------------|-----------|----------------------|
| JS/TS logic fixes | Yes | No |
| React component changes | Yes | No |
| Style/UI changes | Yes | No |
| New npm package (JS-only) | Yes | No |
| New native module | No | Yes |
| `app.config.js` changes | No | Yes |
| iOS `Info.plist` changes | No | Yes |
| Android `build.gradle` changes | No | Yes |
| Expo SDK upgrade | No | Yes |

### 3.6 Rollback Procedure (Mobile)

**OTA rollback (instant, JS changes only):**

```bash
# List recent updates
eas update:list --branch production

# Roll back by publishing a new update pointing to previous code
eas update:rollback --branch production

# Or publish the previous commit as a new update
git checkout <previous-commit>
eas update --branch production --message "Rollback to <version>"
```

**Native build rollback:**

- iOS: The previous App Store version remains available. Contact Apple to expedite a new review if needed.
- Android: Use Google Play Console to halt the rollout and revert to the previous release.

---

## 4. Database Migration (Supabase)

### 4.1 Architecture

- **Database:** PostgreSQL (managed by Supabase)
- **Migration tool:** Supabase CLI
- **Migration files:** `supabase/migrations/*.sql`
- **RLS:** Enabled on all tables (334 tables, 806 policies)

### 4.2 Running Migrations Against Production

**Automated (recommended):**

Migrations run automatically as part of the `deploy.yml` workflow when code is pushed to `main`:

```yaml
# From .github/workflows/deploy.yml
- name: Run Supabase Migrations (Production)
  run: npx supabase db push --db-url "${{ secrets.SUPABASE_DB_URL }}"
```

**Manual (emergency or debugging):**

```bash
# Check what would be applied
npx supabase db diff --db-url "$SUPABASE_DB_URL" --schema public

# Push migrations
npx supabase db push --db-url "$SUPABASE_DB_URL"

# Verify no drift remains
npx supabase db diff --db-url "$SUPABASE_DB_URL" --schema public
```

### 4.3 Migration Verification Steps

After migration runs:

1. **Schema diff check** -- The CI workflow automatically runs `supabase db diff` and warns if drift is detected.

2. **Spot check critical tables:**

```sql
-- Verify RLS is enabled on new tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = false;

-- Check for tables without policies
SELECT t.tablename
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename
WHERE t.schemaname = 'public'
GROUP BY t.tablename
HAVING COUNT(p.policyname) = 0;
```

3. **Test the affected API endpoints** on the live system.

### 4.4 Migration Rollback

**For additive migrations (new tables, columns, indexes):**

No rollback needed. The old code simply does not use the new schema elements.

**For destructive migrations (column drops, type changes):**

1. Prepare a rollback SQL file before deploying.
2. Test the rollback SQL on staging first.
3. Run rollback SQL via Supabase SQL Editor or CLI:

```bash
# Connect to production database
npx supabase db execute --db-url "$SUPABASE_DB_URL" < rollback.sql
```

**General guidance:**

- Never drop columns in the same release that stops using them. Deploy the code change first, then drop the column in the next release.
- Always add `IF NOT EXISTS` / `IF EXISTS` guards in migration SQL.
- Keep migration files small and focused on a single concern.

---

## 5. Environment Variables Reference

### 5.1 Web Application (Vercel)

Configure these in the Vercel project dashboard under Settings > Environment Variables.

#### Required -- Core

| Variable | Public? | Where Configured | Description |
|----------|---------|-----------------|-------------|
| `NODE_ENV` | No | Vercel (auto) | `production` in prod |
| `JWT_SECRET` | No | Vercel Secrets | JWT signing key (64+ chars). Generate: `openssl rand -base64 64` |
| `NEXT_PUBLIC_APP_URL` | Yes | Vercel Env | `https://mintenance.com` |

#### Required -- Supabase

| Variable | Public? | Where Configured | Description |
|----------|---------|-----------------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Vercel Env | `https://<project-id>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Vercel Env | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Vercel Secrets | Supabase service role key (server-side only) |
| `SUPABASE_DB_URL` | No | GitHub Secrets | Direct DB connection string (for migrations in CI) |
| `SUPABASE_ACCESS_TOKEN` | No | GitHub Secrets | Supabase management API token (for CLI in CI) |

#### Required -- Stripe

| Variable | Public? | Where Configured | Description |
|----------|---------|-----------------|-------------|
| `STRIPE_SECRET_KEY` | No | Vercel Secrets | `sk_live_...` (production) |
| `STRIPE_WEBHOOK_SECRET` | No | Vercel Secrets | `whsec_...` (Stripe webhook signing) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Yes | Vercel Env | `pk_live_...` (production) |

#### Required -- Redis (Rate Limiting)

| Variable | Public? | Where Configured | Description |
|----------|---------|-----------------|-------------|
| `UPSTASH_REDIS_REST_URL` | No | Vercel Secrets | Upstash Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | No | Vercel Secrets | Upstash Redis REST token |

#### Required -- Security

| Variable | Public? | Where Configured | Description |
|----------|---------|-----------------|-------------|
| `ENCRYPTION_MASTER_KEY` | No | Vercel Secrets | AES-256 key for PII encryption. Generate: `openssl rand -hex 32` |
| `CSRF_SECRET` | No | Vercel Secrets | CSRF token generation secret. Generate: `openssl rand -hex 32` |
| `CRON_SECRET` | No | Vercel Secrets | Auth token for `/api/cron/*` endpoints. Generate: `openssl rand -hex 32` |

#### Optional -- AI/ML

| Variable | Public? | Where Configured | Description |
|----------|---------|-----------------|-------------|
| `OPENAI_API_KEY` | No | Vercel Secrets | GPT-4 Vision for AI assessments |
| `ROBOFLOW_API_KEY` | No | Vercel Secrets | Building damage detection model |
| `ROBOFLOW_MODEL_ID` | No | Vercel Env | Default: `building-defect-detection-7-ks0im` |
| `ROBOFLOW_MODEL_VERSION` | No | Vercel Env | Default: `4` |

#### Optional -- External Services

| Variable | Public? | Where Configured | Description |
|----------|---------|-----------------|-------------|
| `GOOGLE_MAPS_API_KEY` | No | Vercel Secrets | Server-side geocoding (restrict to server IPs) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Yes | Vercel Env | Client-side maps (restrict to domain) |
| `OPENWEATHER_API_KEY` | No | Vercel Secrets | Weather-based job scheduling |
| `SENDGRID_API_KEY` | No | Vercel Secrets | Email delivery |
| `RESEND_API_KEY` | No | Vercel Secrets | Alternative email provider |
| `SENTRY_DSN` | No | Vercel Env | Error tracking DSN |

#### Optional -- Alerting

| Variable | Public? | Where Configured | Description |
|----------|---------|-----------------|-------------|
| `SLACK_BOT_TOKEN` | No | Vercel Secrets | Slack alert notifications |
| `SLACK_ALERT_CHANNEL` | No | Vercel Env | Default: `#mintenance-alerts` |
| `PAGERDUTY_ROUTING_KEY` | No | Vercel Secrets | Critical alert escalation |
| `DATADOG_API_KEY` | No | Vercel Secrets | Enhanced logging |

#### Session and Security Policy

| Variable | Public? | Default | Description |
|----------|---------|---------|-------------|
| `SESSION_ABSOLUTE_TIMEOUT_HOURS` | No | `12` | Max session duration (PCI DSS) |
| `SESSION_IDLE_TIMEOUT_MINUTES` | No | `30` | Idle timeout |
| `ENFORCE_SESSION_TIMEOUTS` | No | `true` | Enable hard enforcement |
| `ALLOWED_ORIGINS` | No | (hardcoded prod domains) | CORS allowed origins |
| `ENABLE_CORS_VALIDATION` | No | `true` | Strict CORS whitelist |

### 5.2 Mobile Application (EAS)

Configure these as EAS Secrets: `eas secret:create --scope project --name <NAME> --value <VALUE>`

| Variable | Where Configured | Description |
|----------|-----------------|-------------|
| `EXPO_PUBLIC_SUPABASE_URL` | EAS Secrets / eas.json env | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | EAS Secrets / eas.json env | Supabase anon key |
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | EAS Secrets / eas.json env | Stripe publishable key |
| `EXPO_PUBLIC_API_BASE_URL` | EAS Secrets / eas.json env | Backend API URL |
| `EXPO_PUBLIC_ENVIRONMENT` | eas.json env | `staging` or `production` |
| `EXPO_PUBLIC_SENTRY_DSN` | EAS Secrets | Sentry DSN for mobile |
| `SENTRY_ORG` | EAS Secrets | Sentry organization slug |
| `SENTRY_PROJECT` | EAS Secrets | Sentry project slug |
| `SENTRY_AUTH_TOKEN` | EAS Secrets | Sentry auth token (source map uploads) |
| `GOOGLE_SERVICES_JSON` | EAS Secrets (file) | Firebase config for Android push notifications |
| `GOOGLE_SERVICES_PLIST` | EAS Secrets (file) | Firebase config for iOS push notifications |
| `APPLE_ID_EMAIL` | EAS Secrets | Apple ID for App Store submission |
| `ASC_APP_ID` | EAS Secrets | App Store Connect app ID |
| `APPLE_TEAM_ID` | EAS Secrets | Apple Developer Team ID |

### 5.3 GitHub Actions Secrets

These are configured in the GitHub repository settings under Secrets and Variables > Actions.

| Secret | Purpose |
|--------|---------|
| `VERCEL_TOKEN` | Vercel API token for CLI deployments |
| `VERCEL_ORG_ID` | Vercel organization ID |
| `VERCEL_PROJECT_ID` | Vercel project ID |
| `SUPABASE_URL` | Production Supabase URL |
| `SUPABASE_ANON_KEY` | Production Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Production service role key |
| `SUPABASE_DB_URL` | Production direct DB URL |
| `SUPABASE_ACCESS_TOKEN` | Supabase management API token |
| `STAGING_SUPABASE_URL` | Staging Supabase URL |
| `STAGING_SUPABASE_ANON_KEY` | Staging Supabase anon key |
| `STAGING_SUPABASE_SERVICE_ROLE_KEY` | Staging service role key |
| `STAGING_SUPABASE_DB_URL` | Staging direct DB URL |
| `STAGING_URL` | Staging web URL (e.g., `https://staging.mintenance.com`) |
| `STAGING_STRIPE_SECRET_KEY` | Staging Stripe secret (test mode) |
| `STAGING_STRIPE_PUBLISHABLE_KEY` | Staging Stripe publishable (test mode) |
| `STAGING_STRIPE_WEBHOOK_SECRET` | Staging Stripe webhook secret |
| `STAGING_JWT_SECRET` | Staging JWT signing secret |
| `STAGING_CRON_SECRET` | Staging cron auth secret |
| `STAGING_UPSTASH_REDIS_REST_URL` | Staging Redis URL |
| `STAGING_UPSTASH_REDIS_REST_TOKEN` | Staging Redis token |
| `EXPO_TOKEN` | Expo/EAS authentication token |
| `SLACK_WEBHOOK` | Slack webhook URL for deployment notifications |
| `SNYK_TOKEN` | Snyk API token for security scanning |
| `CODECOV_TOKEN` | Codecov upload token |
| `NEXT_PUBLIC_APP_URL` | Production app URL |
| `JWT_SECRET` | Production JWT secret |
| `STRIPE_SECRET_KEY` | Production Stripe secret |
| `CRON_SECRET` | Production cron secret |

---

## 6. Monitoring and Observability

### 6.1 Health Check Endpoints

| Endpoint | Auth | Rate Limit | Purpose |
|----------|------|-----------|---------|
| `GET /api/health` | None | 30 req/min | Full health check (DB, Redis, Stripe) |
| `GET /api/version` | None | Default | Build ID and deploy timestamp |
| `GET /api/stats/platform` | None | 30 req/min | Platform statistics (cached 1 hour) |

**Health check response format:**

```json
{
  "status": "healthy",
  "timestamp": "2026-03-17T10:30:00.000Z",
  "version": "2026-02-09",
  "latencyMs": 245
}
```

Status values: `healthy`, `degraded` (non-critical service down), `unhealthy` (critical service down, returns HTTP 503).

Services checked: `database` (Supabase PostgreSQL), `redis` (Upstash), `payments` (Stripe API).

### 6.2 Sentry Error Monitoring

- **Web DSN:** Configured via `SENTRY_DSN` in Vercel
- **Mobile DSN:** Configured via `EXPO_PUBLIC_SENTRY_DSN` in EAS Secrets
- **Source maps:** Uploaded automatically during production EAS builds (`SENTRY_DISABLE_AUTO_UPLOAD: "false"` in production profile)

**What to monitor:**

1. Error rate spikes after deployment (compare to baseline)
2. New error types not seen before the deploy
3. Crash-free session rate (target: > 99.5%)
4. Performance transactions (slow API calls, slow page loads)

### 6.3 Vercel Analytics

- **Web Vitals:** LCP, FID, CLS, TTFB tracked automatically
- **Function logs:** Available in Vercel dashboard > Logs
- **Function metrics:** Invocation count, duration, errors per function

### 6.4 Supabase Dashboard

- **Database:** Connection count, query performance, storage usage
- **Auth:** Active users, sign-up rate, failed auth attempts
- **Storage:** Bucket sizes, bandwidth usage
- **Realtime:** Active connections, message throughput
- **URL:** `https://supabase.com/dashboard/project/<project-id>`

### 6.5 Upstash Redis Dashboard

- **Rate limiting:** Hit rate, key count, memory usage
- **URL:** `https://console.upstash.com`

### 6.6 Stripe Dashboard

- **Payments:** Successful/failed payments, dispute rate
- **Webhooks:** Delivery success rate, failed webhook events
- **URL:** `https://dashboard.stripe.com`

---

## 7. Incident Response and Rollback

### 7.1 Severity Levels

| Level | Description | Examples | Response Time |
|-------|-------------|----------|--------------|
| P0 - Critical | Service down, data loss risk | Health check returning 503, payments failing | Immediate |
| P1 - High | Major feature broken | Login failing, job creation broken | < 30 minutes |
| P2 - Medium | Minor feature broken | Stats page wrong, notification delay | < 4 hours |
| P3 - Low | Cosmetic/minor issue | UI alignment, typo | Next sprint |

### 7.2 Web Rollback (Vercel)

**Time to rollback: < 2 minutes**

```bash
# Option 1: Vercel dashboard (fastest)
# Go to Vercel > Deployments > select last good deploy > Promote to Production

# Option 2: Vercel CLI
vercel ls --prod
vercel promote <previous-deployment-url> --token=$VERCEL_TOKEN

# Option 3: Git revert (triggers new deploy, takes ~5 minutes)
git revert -m 1 <merge-commit-sha>
git push origin main
```

### 7.3 Mobile Rollback (OTA)

**Time to rollback: < 5 minutes (for JS changes)**

```bash
cd apps/mobile

# List recent updates on the production branch
eas update:list --branch production

# Roll back to a previous update
eas update:rollback --branch production

# Users will receive the rollback on next app restart
```

For native code changes, there is no instant rollback. Submit a hotfix build through EAS and expedite the app store review.

### 7.4 Database Rollback

**For migrations that have already been applied:**

1. Identify the problematic migration in `supabase/migrations/`
2. Write and test reverse SQL on staging
3. Apply reverse SQL to production:

```bash
npx supabase db execute --db-url "$SUPABASE_DB_URL" < rollback.sql
```

4. Remove or fix the migration file in the repository

**If the migration caused data corruption:**

1. Stop the application (enable maintenance mode -- see 7.6)
2. Restore from Supabase point-in-time recovery (available in Supabase dashboard)
3. Re-apply only safe migrations

### 7.5 Emergency Contacts and Escalation

| Role | Contact | When to Notify |
|------|---------|---------------|
| On-call engineer | #mintenance-alerts Slack | All P0/P1 incidents |
| Engineering lead | Direct message | P0 incidents, data loss |
| Product owner | #mintenance-deployments Slack | P0/P1 with user impact |
| Supabase support | support@supabase.io | Database-level issues |
| Vercel support | Vercel dashboard support | Hosting/CDN issues |
| Stripe support | dashboard.stripe.com/support | Payment processing issues |

**Escalation timeline:**

- 0 min: On-call engineer alerted via Slack/PagerDuty
- 15 min: If no acknowledgment, escalate to engineering lead
- 30 min: If P0 unresolved, bring in additional engineers
- 1 hour: If P0 unresolved, notify product owner and consider maintenance mode

### 7.6 Maintenance Mode

To temporarily stop all user-facing traffic:

**Option A: Vercel edge middleware (soft maintenance)**

Set `MAINTENANCE_MODE=true` in Vercel environment variables. If a maintenance mode middleware is implemented, this will redirect all non-API traffic to a maintenance page.

**Option B: DNS-level redirect**

Point the domain to a static maintenance page hosted on a different service.

**Option C: Disable Supabase APIs**

In the Supabase dashboard, disable the REST API. This will cause all API calls to fail with an error, stopping all operations.

**Option D: Disable cron jobs**

Remove the `CRON_SECRET` environment variable in Vercel to prevent cron jobs from authenticating.

### 7.7 Post-Incident Review

After every P0/P1 incident:

1. Write a blameless incident report within 48 hours
2. Include: timeline, root cause, impact, mitigation steps taken
3. Identify action items to prevent recurrence
4. Share in #mintenance-engineering channel
5. Update this runbook if procedures need to change

---

## Appendix A: Cron Jobs

These are configured in `vercel.json` and run automatically on Vercel.

| Path | Schedule | Description |
|------|----------|-------------|
| `/api/cron/payment-setup-reminders` | Daily 09:00 UTC | Remind users to set up payment methods |
| `/api/cron/low-activity-contractor-nudge` | Daily 09:15 UTC | Nudge inactive contractors |
| `/api/cron/win-back-campaign` | Daily 10:00 UTC | Re-engagement campaign |
| `/api/cron/anniversary-recognition` | Daily 08:00 UTC | Anniversary recognition messages |
| `/api/cron/contractor-job-digest` | Weekly Mon 08:00 UTC | Weekly job digest for contractors |
| `/api/cron/compliance-expiry-reminders` | Daily 07:00 UTC | Compliance document expiry alerts |
| `/api/cron/recurring-job-creator` | Daily 06:00 UTC | Create recurring scheduled jobs |

All cron endpoints require the `CRON_SECRET` header for authentication. Vercel automatically provides this for scheduled invocations.

---

## Appendix B: Quick Commands Reference

```bash
# === WEB ===
npm run type-check:web          # TypeScript check
npm run lint:web                # Lint check
npm run test:web -- run         # Run all web tests
npm run build:web               # Production build
npm run audit:all               # Full code quality audit

# === MOBILE ===
npm run type-check:mobile       # TypeScript check
npm run lint:mobile             # Lint check
npm run test:mobile -- --watchAll=false  # Run all mobile tests

# === DATABASE ===
npx supabase db diff --local    # Check local migration diff
npx supabase db push --db-url "$DB_URL"  # Push migrations

# === DEPLOYMENT ===
vercel ls --prod                # List production deployments
vercel promote <url>            # Promote deployment to production
eas build:list --platform all   # List recent EAS builds
eas update:list --branch production  # List OTA updates

# === HEALTH ===
curl -sf https://mintenance.com/api/health | python3 -m json.tool
curl -sf https://mintenance.com/api/version | python3 -m json.tool
```
