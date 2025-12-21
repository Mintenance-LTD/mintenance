# Security Quick Start - Mintenance Platform

## CRITICAL: Immediate Actions Required

**Status:** 🔴 CRITICAL SECURITY ISSUE IDENTIFIED
**Date:** 2025-12-20
**Action Required:** IMMEDIATE

---

## 1. STOP - Read This First

Multiple production secrets have been exposed in environment files. You must take immediate action to prevent unauthorized access and potential security breaches.

**Exposed Secrets:**
- ✅ OpenAI API Key
- ✅ Stripe Secret Keys
- ✅ Supabase Service Role Key
- ✅ Database Password
- ✅ Twilio Credentials
- ✅ Google Maps API Keys
- ✅ SendGrid API Key
- ✅ Encryption Keys

---

## 2. Emergency Response (Do This NOW)

### Step 1: Check Git History (5 minutes)
```bash
# Check if secrets were committed to Git
git log --all --full-history --source -- "**/.env*"

# If you find .env files in Git history:
# ⚠️ ASSUME ALL SECRETS ARE COMPROMISED
# ⚠️ ROTATE EVERYTHING IMMEDIATELY
```

### Step 2: Rotate Critical Secrets (2-4 hours)
Follow this order for maximum security with minimum downtime:

#### A. OpenAI API Key (15 minutes)
```bash
# 1. Go to: https://platform.openai.com/api-keys
# 2. Click "Revoke" on exposed key: sk-proj-_4tdJ7nkaZ4QDla4ZI5QV7yZ...
# 3. Click "Create new secret key"
# 4. Name: mintenance-production-2025-12-20
# 5. Update .env.local:
OPENAI_API_KEY=sk-proj-NEW_KEY_HERE

# 6. Update Vercel:
vercel env add OPENAI_API_KEY production
# Paste new key

# 7. Deploy:
vercel --prod
```

#### B. Stripe Keys (30 minutes)
```bash
# 1. Go to: https://dashboard.stripe.com/apikeys
# 2. Click "Roll" on Secret Key (24h grace period)
# 3. Update .env.local:
STRIPE_SECRET_KEY=sk_test_NEW_KEY_HERE

# 4. Update webhook secret:
#    Go to: https://dashboard.stripe.com/webhooks
#    Click "Roll secret"
STRIPE_WEBHOOK_SECRET=whsec_NEW_SECRET_HERE

# 5. Update Vercel:
vercel env add STRIPE_SECRET_KEY production
vercel env add STRIPE_WEBHOOK_SECRET production

# 6. Deploy:
vercel --prod
```

#### C. Supabase Service Role Key (45 minutes)
```bash
# WARNING: This will briefly break server-side database operations

# 1. Go to: https://app.supabase.com/project/ukrjudtlvapiajkjbcrd/settings/api
# 2. Click "Reset service role key"
# 3. Copy new key IMMEDIATELY (shown only once)
# 4. Update .env.local:
SUPABASE_SERVICE_ROLE_KEY=sb_secret_NEW_KEY_HERE

# 5. Update Vercel (FAST - minimize downtime):
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel --prod

# 6. Test:
curl https://mintenance.com/api/health
```

#### D. Database Password (1 hour)
```bash
# WARNING: This requires coordinated deployment

# 1. Generate new password:
openssl rand -base64 32 | tr -d "=+/" | cut -c1-32

# 2. Go to: https://app.supabase.com/project/ukrjudtlvapiajkjbcrd/settings/database
# 3. Click "Reset database password"
# 4. Enter new password (NOT: Iambald1995!)

# 5. Update connection strings:
DATABASE_URL="postgresql://postgres.ukrjudtlvapiajkjbcrd:NEW_PASSWORD@aws-1-eu-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.ukrjudtlvapiajkjbcrd:NEW_PASSWORD@aws-1-eu-west-2.pooler.supabase.com:5432/postgres"

# 6. Update Vercel IMMEDIATELY:
vercel env add DATABASE_URL production
vercel env add DIRECT_URL production
vercel --prod

# 7. Verify:
psql $DATABASE_URL -c "SELECT NOW();"
```

#### E. Other Services (1-2 hours)
```bash
# Twilio (15 min)
# https://console.twilio.com/ > Reset Auth Token
vercel env add TWILIO_AUTH_TOKEN production

# Google Maps (30 min)
# https://console.cloud.google.com/apis/credentials
# Delete old keys, create new with restrictions
vercel env add GOOGLE_MAPS_API_KEY production

# SendGrid (15 min)
# https://app.sendgrid.com/settings/api_keys
# Delete old key, create new
vercel env add SENDGRID_API_KEY production

# Deploy all changes
vercel --prod
```

---

## 3. Verify Security (30 minutes)

### Check 1: Secrets Not in Git
```bash
git status
# Should show: .env* files are untracked

cat .gitignore | grep -E "\.env"
# Should show: .env* patterns

git log --all --full-history -- ".env*"
# Should show: No commits with .env files
```

### Check 2: No Real Secrets in .env.example
```bash
cat .env.example | grep -E "sk-|sb_secret|whsec"
# Should show: NO MATCHES

cat apps/web/.env.example | grep -E "sk-|sb_secret"
# Should show: NO MATCHES
```

### Check 3: API Keys Have Restrictions
```bash
# Google Maps:
# https://console.cloud.google.com/apis/credentials
# Check: HTTP referrers, Bundle ID restrictions ✅

# Stripe:
# https://dashboard.stripe.com/apikeys
# Check: IP whitelist (if available) ✅

# OpenAI:
# https://platform.openai.com/account/limits
# Check: Usage limits configured ✅
```

---

## 4. Prevent Future Exposures (1 hour)

### Setup Pre-Commit Hooks
```bash
# Install git-secrets
brew install git-secrets  # macOS
# or
sudo apt-get install git-secrets  # Ubuntu

# Initialize for repo
git secrets --install

# Add patterns
git secrets --add 'sk-[a-zA-Z0-9]{32,}'  # OpenAI
git secrets --add 'sk_test_[a-zA-Z0-9]{99}'  # Stripe test
git secrets --add 'sk_live_[a-zA-Z0-9]{99}'  # Stripe live
git secrets --add 'whsec_[a-zA-Z0-9]{32,}'  # Stripe webhook
git secrets --add 'sb_secret_[a-zA-Z0-9]{32,}'  # Supabase
git secrets --add 'AC[a-z0-9]{32}'  # Twilio

# Test
git secrets --scan
```

### Install Husky
```bash
npm install --save-dev husky
npx husky install
npm pkg set scripts.prepare="husky install"

# Add pre-commit hook
npx husky add .husky/pre-commit "git secrets --scan"

# Test
git add .
git commit -m "test"
# Should block if secrets found
```

---

## 5. Setup Monitoring (30 minutes)

### Billing Alerts
```bash
# OpenAI
# https://platform.openai.com/account/billing/limits
# Set hard limit: $100/month
# Set soft limit: $50/month (email alert)

# Stripe
# https://dashboard.stripe.com/settings/billing/automatic
# Enable fraud prevention
# Set up payment alerts

# Google Maps
# https://console.cloud.google.com/billing/budgets
# Create budget: $50/month
# Alert threshold: 80%

# Twilio
# https://console.twilio.com/billing/alerts
# Create alert: $50/day
```

### Usage Monitoring
```bash
# Review daily for first week:
# - OpenAI: https://platform.openai.com/usage
# - Stripe: https://dashboard.stripe.com/payments
# - Supabase: https://app.supabase.com/project/ukrjudtlvapiajkjbcrd/logs
# - Google Maps: https://console.cloud.google.com/apis/dashboard
```

---

## 6. Documentation Review (15 minutes)

### Read These Documents
1. ✅ **SECURITY_AUDIT_REPORT.md** - Full audit findings
2. ✅ **SECRET_ROTATION_GUIDE.md** - Detailed rotation procedures
3. ✅ **SECRETS_MANAGEMENT_RECOMMENDATIONS.md** - Long-term strategy
4. ✅ **This document** - Quick start guide

### Share With Team
```bash
# Send to team:
# - Security audit report
# - New secret rotation schedule
# - Pre-commit hook setup instructions
# - Monitoring dashboard access
```

---

## 7. Schedule Regular Rotation (10 minutes)

### Calendar Reminders
```
Add to calendar:

🔐 January 1: Quarterly Secret Rotation
  - JWT_SECRET
  - STRIPE_SECRET_KEY
  - OPENAI_API_KEY
  - SUPABASE_SERVICE_ROLE_KEY
  - DATABASE_URL

🔐 April 1: Quarterly Secret Rotation
  - JWT_SECRET
  - STRIPE_SECRET_KEY
  - OPENAI_API_KEY
  - SUPABASE_SERVICE_ROLE_KEY
  - DATABASE_URL

🔐 July 1: Semi-Annual + Quarterly Rotation
  - All quarterly secrets
  - ENCRYPTION_MASTER_KEY
  - GOOGLE_MAPS_API_KEY

🔐 October 1: Quarterly Secret Rotation
  - JWT_SECRET
  - STRIPE_SECRET_KEY
  - OPENAI_API_KEY
  - SUPABASE_SERVICE_ROLE_KEY
  - DATABASE_URL
```

---

## 8. Team Training (30 minutes)

### Security Best Practices
1. ✅ Never commit .env files
2. ✅ Never log secrets (even in debug mode)
3. ✅ Never share secrets in Slack/email
4. ✅ Use secrets manager (Vercel/EAS)
5. ✅ Rotate secrets when team members leave
6. ✅ Report suspected exposures immediately

### What to Do If Secret is Exposed
```
1. STOP - Don't commit if you see secrets in staged files
2. ALERT - Notify security team immediately
3. ROTATE - Follow SECRET_ROTATION_GUIDE.md
4. DOCUMENT - Record incident in security log
5. PREVENT - Implement additional safeguards
```

---

## 9. Quick Reference

### Generate New Secrets
```bash
# JWT Secret (64 bytes)
openssl rand -base64 64

# Encryption Key (32 bytes)
openssl rand -hex 32

# Strong Password (32 chars)
openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
```

### Update Vercel Secrets
```bash
# Add/update
vercel env add SECRET_NAME production

# Remove
vercel env rm SECRET_NAME production

# Pull to local
vercel env pull .env.local
```

### Update EAS Secrets
```bash
# Add
eas secret:create --scope project --name SECRET_NAME --value "value"

# List
eas secret:list

# Delete
eas secret:delete --name SECRET_NAME
```

---

## 10. Completion Checklist

### Immediate (Today)
- [ ] Rotated all exposed secrets
- [ ] Updated Vercel environment variables
- [ ] Deployed updated secrets to production
- [ ] Verified application works with new secrets
- [ ] Checked billing for unauthorized usage

### This Week
- [ ] Installed git-secrets and Husky
- [ ] Setup billing alerts on all services
- [ ] Configured API restrictions
- [ ] Reviewed monitoring dashboards
- [ ] Documented incident in security log

### This Month
- [ ] Team security training completed
- [ ] Secrets manager implemented (Vercel/EAS/AWS)
- [ ] Rotation schedule created and shared
- [ ] Incident response plan updated
- [ ] Regular security review scheduled

---

## 11. Support and Resources

### Documentation
- **Detailed Audit:** `SECURITY_AUDIT_REPORT.md`
- **Rotation Guide:** `SECRET_ROTATION_GUIDE.md`
- **Long-term Strategy:** `SECRETS_MANAGEMENT_RECOMMENDATIONS.md`

### Tools
- **Vercel CLI:** `npm i -g vercel`
- **EAS CLI:** `npm i -g eas-cli`
- **git-secrets:** `brew install git-secrets`

### Emergency Contacts
- **Security Team:** security@mintenance.com
- **DevOps:** devops@mintenance.com
- **On-call:** See incident response plan

---

## 12. Success Metrics

After completing this quick start, you should have:

✅ **Zero exposed secrets** in version control
✅ **All production secrets rotated** from compromised values
✅ **API restrictions configured** on all third-party services
✅ **Pre-commit hooks** preventing future exposures
✅ **Billing alerts** catching unauthorized usage
✅ **Rotation schedule** ensuring regular updates
✅ **Team awareness** of security best practices
✅ **Documentation** for future reference

---

## Final Notes

**Time Investment:**
- Emergency response: 2-4 hours
- Prevention setup: 2-3 hours
- Team training: 1 hour
- **Total: ~6-8 hours**

**Risk Reduction:**
- Before: 🔴 CRITICAL (Score: 36/100)
- After: 🟢 ACCEPTABLE (Score: 85+/100)

**ROI:**
- Prevent data breaches: Priceless
- Avoid compliance violations: $$$
- Protect customer trust: Essential
- Peace of mind: ✅

---

**START NOW - Your platform's security depends on it!**

Good luck! 🔒
