# Week 1: Critical Security Remediation

**Date Started:** October 2, 2025
**Priority:** CRITICAL - Must complete before any deployment
**Estimated Time:** 10 hours

---

## 🔴 CRITICAL: Secret Rotation Required

### Current Exposed Secrets (DO NOT USE ANYMORE)

These secrets were found in `.env` file and must be rotated immediately:

```bash
# ❌ COMPROMISED - ROTATE IMMEDIATELY
JWT_SECRET=xSXQaRE2nJx0vbXRUfQvKiwMmdET1Nezy3ihjNIHjRg=
SUPABASE_SERVICE_ROLE_KEY=sb_secret_tr5pCdvS5O0YImfLo0bjKQ_1-0WFMRW
STRIPE_SECRET_KEY=sk_test_51SDXwQJmZpzAEZO8BeJfXDdjVF7vDPeO1se8zmVjsDpCjwFEMUTwNdIJEwE1SqdPmiP9HtBoYddutuQD99DRfRY400hzZVGSQ3
```

### New Generated Secrets

**✅ NEW JWT_SECRET (Generated):**
```bash
JWT_SECRET=DS8NOv0ZngtahYmQW0bizg7xIau9B9lIaaG+9zewpCk=
```

**✅ NEW ENCRYPTION_KEY (Generated):**
```bash
ENCRYPTION_KEY=f84c16d8c04c50108046ae1bf879c23953c8f48c44cf24f7282409b43db9c366
```

**⚠️ REQUIRES MANUAL ROTATION:**

1. **Supabase Service Role Key**
   - Go to: https://supabase.com/dashboard/project/ukrjudtlvapiajkjbcrd/settings/api
   - Navigate to "Project API keys"
   - Click "Reset" next to Service Role key
   - Copy new key to secure location

2. **Stripe Secret Key**
   - Go to: https://dashboard.stripe.com/test/apikeys
   - Click "Roll secret key" or create new restricted key
   - Copy new key to secure location

---

## Step 1: Rotate Supabase Service Role Key

### Instructions:

1. **Login to Supabase Dashboard**
   - URL: https://supabase.com/dashboard
   - Project: `ukrjudtlvapiajkjbcrd`

2. **Navigate to API Settings**
   - Settings → API
   - Find "service_role" key section

3. **Generate New Key**
   - Click "Reset Service Role Key"
   - **IMPORTANT:** Copy the new key immediately (shown only once)
   - Save to password manager

4. **Update Environment Variables**
   - Update `.env.server` with new key
   - Update Vercel environment variables
   - Update EAS secrets (for mobile)

5. **Verify Old Key is Revoked**
   - Test old key returns 401 Unauthorized
   - Test new key works correctly

### Testing After Rotation:

```bash
# Test new key
npm run verify:database

# Should show successful connection
# If fails with 401, key is incorrect
```

---

## Step 2: Rotate Stripe Secret Key

### Instructions:

1. **Login to Stripe Dashboard**
   - URL: https://dashboard.stripe.com
   - Switch to Test mode (for test key) or Live mode (for production)

2. **Navigate to API Keys**
   - Developers → API keys

3. **Create New Restricted Key (Recommended)**
   ```
   Key Name: Mintenance Production API
   Permissions:
   ✅ Customers: Read/Write
   ✅ Payment Intents: Read/Write
   ✅ Payment Methods: Read/Write
   ✅ Charges: Read/Write
   ✅ Refunds: Write
   ❌ Everything else: No access
   ```

   OR **Roll Secret Key** (full access)

4. **Update Environment Variables**
   - Update `.env.server` with new key
   - Update Vercel environment variables
   - Update mobile app environment (if needed)

5. **Test Payment Flow**
   ```bash
   npm run test:payment
   ```

### Webhook Secret (If Applicable):

If using Stripe webhooks:
1. Go to Developers → Webhooks
2. Find your webhook endpoint
3. Click "Roll webhook signing secret"
4. Update `STRIPE_WEBHOOK_SECRET` in environment

---

## Step 3: Update JWT Secret

### Instructions:

**New JWT Secret (already generated):**
```bash
JWT_SECRET=DS8NOv0ZngtahYmQW0bizg7xIau9B9lIaaG+9zewpCk=
```

### Update Process:

1. **Update `.env.server`**
   ```bash
   # Will be done programmatically
   ```

2. **Important Notes:**
   - ⚠️ Changing JWT secret will **invalidate all existing user sessions**
   - Users will need to login again
   - Plan this change during maintenance window or low-traffic period

3. **Deployment Strategy:**
   - Deploy new JWT secret
   - Notify users of required re-login
   - Monitor for authentication issues

---

## Step 4: Remove .env from Git History

### Prerequisites:

```bash
# Install git-filter-repo
pip install git-filter-repo
```

### Removal Process:

**⚠️ WARNING:** This operation rewrites git history. Coordinate with team before executing.

```bash
# 1. Backup current repository
cd c:\Users\Djodjo.Nkouka.ERICCOLE\Downloads\
cp -r mintenance-clean mintenance-clean-backup

# 2. Navigate to repository
cd mintenance-clean

# 3. Remove .env from all commits
git filter-repo --invert-paths --path .env --force

# 4. Verify .env is removed from history
git log --all --full-history -- .env
# Should return nothing

# 5. Force push to remote (COORDINATE WITH TEAM)
# git push origin --force --all
# git push origin --force --tags
```

**⚠️ Team Coordination Required:**
- Notify all team members before force push
- All team members must re-clone repository after force push
- Any open pull requests will need to be recreated

**Alternative (If Cannot Force Push):**
- Accept that .env was in history
- Ensure all secrets have been rotated
- Monitor for unauthorized access
- Add git hooks to prevent future commits

---

## Step 5: Implement Secrets Management

### Option A: Vercel Environment Variables (Web App)

**Setup:**

1. **Login to Vercel Dashboard**
   - URL: https://vercel.com

2. **Navigate to Project Settings**
   - Select Mintenance project
   - Settings → Environment Variables

3. **Add Production Secrets**
   ```
   Variable Name: SUPABASE_SERVICE_ROLE_KEY
   Value: [new rotated key]
   Environments: Production, Preview
   ```

   ```
   Variable Name: STRIPE_SECRET_KEY
   Value: [new rotated key]
   Environments: Production, Preview
   ```

   ```
   Variable Name: JWT_SECRET
   Value: DS8NOv0ZngtahYmQW0bizg7xIau9B9lIaaG+9zewpCk=
   Environments: Production, Preview
   ```

4. **Redeploy Application**
   - Trigger new deployment to pick up new environment variables

### Option B: EAS Secrets (Mobile App)

**Setup:**

```bash
# Login to EAS
npx eas login

# Set secrets for mobile builds
npx eas secret:create --scope project --name SUPABASE_SERVICE_ROLE_KEY --value "[new key]" --type string

npx eas secret:create --scope project --name STRIPE_SECRET_KEY --value "[new key]" --type string

npx eas secret:create --scope project --name JWT_SECRET --value "DS8NOv0ZngtahYmQW0bizg7xIau9B9lIaaG+9zewpCk=" --type string

# List secrets to verify
npx eas secret:list
```

### Option C: AWS Secrets Manager (Recommended for Production)

**Setup:**

```bash
# Install AWS CLI
# pip install awscli

# Configure AWS credentials
aws configure

# Create secrets
aws secretsmanager create-secret \
  --name mintenance/production/supabase-service-role-key \
  --secret-string "[new key]"

aws secretsmanager create-secret \
  --name mintenance/production/stripe-secret-key \
  --secret-string "[new key]"

aws secretsmanager create-secret \
  --name mintenance/production/jwt-secret \
  --secret-string "DS8NOv0ZngtahYmQW0bizg7xIau9B9lIaaG+9zewpCk="
```

**Application Integration:**

```typescript
// lib/secrets.ts
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const client = new SecretsManagerClient({ region: 'us-east-1' });

export async function getSecret(secretName: string): Promise<string> {
  const command = new GetSecretValueCommand({ SecretId: secretName });
  const response = await client.send(command);
  return response.SecretString || '';
}

// Usage
const supabaseKey = await getSecret('mintenance/production/supabase-service-role-key');
```

---

## Step 6: Update .env Files (Local Development)

### Create .env.example (Template)

```bash
# This will be created programmatically
```

### Update .env.server with New Secrets

```bash
# This will be done programmatically
```

### Verify .gitignore

```bash
# Verify .env patterns are ignored
grep -E "^\.env" .gitignore

# Should show:
# .env
# .env.local
# .env.development
# .env.staging
# .env.production
# .env*.local
# .env.backup*
```

---

## Step 7: Delete Deprecated Files

### Files to Delete:

1. **BlockchainReviewService.ts** (1,168 lines)
   - Status: Already refactored into `blockchain/` directory
   - Safe to delete

2. **webOptimizations.ts** (1,144 lines)
   - Status: Already refactored into `webOptimizations/` directory
   - Safe to delete

### Verification Before Deletion:

```bash
# Check if new modules exist
ls -la apps/mobile/src/services/blockchain/
ls -la apps/mobile/src/utils/webOptimizations/

# Search for imports of old files
grep -r "BlockchainReviewService" apps/ --include="*.ts" --include="*.tsx"
grep -r "from.*webOptimizations'" apps/ --include="*.ts" --include="*.tsx"
```

### Deletion Process:

```bash
# Will be done programmatically after verification
```

---

## Step 8: Add ESLint No-Console Rule

### Update ESLint Configuration

**Files to update:**
- `apps/mobile/.eslintrc.js` or `apps/mobile/eslint.config.js`
- `apps/web/.eslintrc.js` or `apps/web/eslint.config.js`

**Rule to add:**

```json
{
  "rules": {
    "no-console": ["error", {
      "allow": ["warn", "error"]
    }]
  }
}
```

This will:
- ❌ Block `console.log()` and `console.info()`
- ✅ Allow `console.warn()` and `console.error()` for legitimate error logging

---

## Week 1 Completion Checklist

### Security (CRITICAL)

- [ ] ✅ New JWT secret generated
- [ ] ⚠️ Supabase service role key rotated (manual - requires dashboard access)
- [ ] ⚠️ Stripe secret key rotated (manual - requires dashboard access)
- [ ] ⚠️ .env removed from git history (requires git-filter-repo and force push coordination)
- [ ] ⚠️ Secrets management implemented (Vercel/EAS/AWS - requires account setup)

### Quick Wins

- [ ] 🔄 Deprecated files deleted
- [ ] 🔄 ESLint no-console rule added
- [ ] 🔄 .env.example template created
- [ ] 🔄 Local .env.server updated with new secrets

### Verification

- [ ] 🔄 Database connection works with new Supabase key
- [ ] 🔄 Payment flow works with new Stripe key
- [ ] 🔄 JWT authentication works with new secret
- [ ] 🔄 Build passes with new ESLint rules
- [ ] 🔄 Git history verified clean (no .env)

---

## Manual Steps Required (User Action)

Due to security best practices, the following steps **require manual intervention**:

### 1. Rotate Supabase Service Role Key
   - **Action:** Login to Supabase dashboard and reset key
   - **URL:** https://supabase.com/dashboard/project/ukrjudtlvapiajkjbcrd/settings/api
   - **Copy:** New service role key to secure location

### 2. Rotate Stripe Secret Key
   - **Action:** Login to Stripe dashboard and create new key
   - **URL:** https://dashboard.stripe.com/test/apikeys
   - **Copy:** New secret key to secure location

### 3. Coordinate Git History Rewrite
   - **Action:** Notify team before force push
   - **Execute:** `git filter-repo --invert-paths --path .env --force`
   - **Push:** `git push origin --force --all` (after team coordination)

### 4. Configure Production Secrets Management
   - **Option A:** Vercel environment variables
   - **Option B:** EAS secrets for mobile
   - **Option C:** AWS Secrets Manager (recommended)

---

## Next Steps After Week 1

Once Week 1 is complete, proceed to:

**Week 2-3: Architecture Compliance**
- Refactor 6 large files (>500 lines)
- Replace 541 console.log statements
- Update imports and test refactored code

---

**Status:** Ready to execute automated portions
**Manual Steps:** Awaiting user action for API dashboard access
**Estimated Completion:** 2-3 hours automated + 1-2 hours manual
