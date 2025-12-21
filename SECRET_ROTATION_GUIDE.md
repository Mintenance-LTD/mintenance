# Secret Rotation Guide - Mintenance Platform

## Overview
This guide provides step-by-step instructions for rotating all secrets in the Mintenance platform. Regular secret rotation is a critical security practice that reduces the impact of credential compromise.

## Rotation Schedule

| Secret Type | Rotation Frequency | Priority |
|------------|-------------------|----------|
| JWT Secrets | Every 90 days | CRITICAL |
| Database Passwords | Every 90 days | CRITICAL |
| API Keys (OpenAI, Stripe, etc.) | Every 90 days | HIGH |
| Encryption Keys | Every 180 days | CRITICAL |
| Service Role Keys | Every 90 days | CRITICAL |
| Webhook Secrets | Every 180 days | MEDIUM |
| OAuth Client Secrets | Every 180 days | HIGH |

## Emergency Rotation
Rotate immediately if:
- Secret appears in version control history
- Secret appears in logs or monitoring tools
- Team member with access leaves the organization
- Suspected security breach or unauthorized access
- Secret is found in a public repository or paste site
- Monitoring alerts indicate unusual API usage

---

## 1. JWT Secret Rotation

### Impact
- All active user sessions will be invalidated
- Users will need to re-authenticate
- Requires coordinated deployment

### Prerequisites
```bash
# Install OpenSSL (should be pre-installed on Linux/Mac)
which openssl

# Or on Windows with Git Bash or WSL
```

### Step-by-Step Process

#### 1.1 Generate New Secrets
```bash
# Generate new JWT access token secret (64 bytes = 88 characters base64)
openssl rand -base64 64

# Generate new JWT refresh token secret (use different value)
openssl rand -hex 64
```

#### 1.2 Update Environment Variables
```bash
# Development (.env.local)
JWT_SECRET=NEW_ACCESS_TOKEN_SECRET_HERE
JWT_REFRESH_SECRET=NEW_REFRESH_TOKEN_SECRET_HERE

# Add old secret temporarily for grace period (optional)
JWT_SECRET_OLD=OLD_SECRET_FOR_VALIDATION_DURING_TRANSITION
```

#### 1.3 Dual-Key Validation (Graceful Rotation)
Implement support for validating both old and new keys during transition:

```typescript
// lib/auth/jwt.ts
const verifyToken = (token: string) => {
  try {
    // Try new secret first
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    // Fall back to old secret during grace period
    if (process.env.JWT_SECRET_OLD) {
      try {
        return jwt.verify(token, process.env.JWT_SECRET_OLD);
      } catch {
        throw new Error('Invalid token');
      }
    }
    throw error;
  }
};
```

#### 1.4 Deploy and Monitor
```bash
# Deploy to staging first
vercel --prod --env-file=.env.staging

# Monitor for authentication errors
# Check Sentry/CloudWatch for JWT validation errors

# If no issues after 24 hours, deploy to production
vercel --prod

# Remove old secret after 7 days grace period
```

#### 1.5 Update Secrets Manager
```bash
# AWS Secrets Manager
aws secretsmanager update-secret \
  --secret-id mintenance/production/jwt-secret \
  --secret-string "NEW_SECRET_HERE"

# Vercel (for web app)
vercel env rm JWT_SECRET production
vercel env add JWT_SECRET production
# Paste new secret when prompted
```

---

## 2. Supabase Service Role Key Rotation

### Impact
- Server-side database operations affected
- No impact on client-side operations (uses anon key)
- Brief downtime during deployment

### Step-by-Step Process

#### 2.1 Generate New Service Role Key
```bash
# Go to Supabase Dashboard
# https://app.supabase.com/project/YOUR_PROJECT/settings/api

# Click "Reset service role key"
# WARNING: This invalidates the old key immediately
# Copy the new key before closing
```

#### 2.2 Update All Environments

**Local Development:**
```bash
# .env.local
SUPABASE_SERVICE_ROLE_KEY=new_service_role_key_here
```

**Staging:**
```bash
# Vercel Dashboard > mintenance-staging > Settings > Environment Variables
# Update SUPABASE_SERVICE_ROLE_KEY
```

**Production:**
```bash
vercel env rm SUPABASE_SERVICE_ROLE_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
# Paste new key

# Or use Vercel CLI
echo "new_key_here" | vercel env add SUPABASE_SERVICE_ROLE_KEY production
```

#### 2.3 Update Backend Services
```bash
# If using AWS Lambda
aws lambda update-function-configuration \
  --function-name mintenance-api \
  --environment Variables={SUPABASE_SERVICE_ROLE_KEY=new_key}

# If using Docker/Kubernetes
kubectl set env deployment/mintenance-api \
  SUPABASE_SERVICE_ROLE_KEY=new_key
```

#### 2.4 Test and Deploy
```bash
# Test locally first
npm run dev
# Verify database operations work

# Deploy to staging
vercel --prod --target=staging

# Verify staging works
curl https://staging.mintenance.com/api/health

# Deploy to production
vercel --prod
```

---

## 3. Stripe Keys Rotation

### Impact
- Payment processing affected during rotation
- Requires webhook endpoint update
- Must coordinate with Stripe dashboard

### Step-by-Step Process

#### 3.1 Roll Secret Key
```bash
# Stripe Dashboard > Developers > API Keys
# Click "Roll secret key"
# This creates a new key while keeping the old key active for 24 hours
```

#### 3.2 Update Environment Variables
```bash
# Update .env.local (development)
STRIPE_SECRET_KEY=sk_test_NEW_KEY_HERE

# Update production (Vercel)
vercel env add STRIPE_SECRET_KEY production
# Paste new key
```

#### 3.3 Rotate Webhook Secret
```bash
# Stripe Dashboard > Developers > Webhooks
# Click on your webhook endpoint
# Click "Roll secret"

# Update environment
STRIPE_WEBHOOK_SECRET=whsec_NEW_SECRET_HERE
```

#### 3.4 Test Webhook
```bash
# Use Stripe CLI to test locally
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Trigger test event
stripe trigger payment_intent.succeeded

# Verify webhook signature validation works
```

#### 3.5 Deploy Changes
```bash
# Deploy to production
vercel --prod

# Monitor webhook deliveries in Stripe Dashboard
# Verify successful webhook processing
```

---

## 4. OpenAI API Key Rotation

### Impact
- AI-powered features temporarily unavailable during rotation
- No data loss
- Consider rotating during low-traffic period

### Step-by-Step Process

#### 4.1 Create New API Key
```bash
# OpenAI Platform > API Keys
# https://platform.openai.com/api-keys
# Click "Create new secret key"
# Name it: "mintenance-production-YYYY-MM-DD"
# Copy the key (only shown once)
```

#### 4.2 Update Environment Variables
```bash
# Local development
OPENAI_API_KEY=sk-proj-NEW_KEY_HERE

# Production
vercel env add OPENAI_API_KEY production
# Or use AWS Secrets Manager, etc.
```

#### 4.3 Test AI Features
```bash
# Test locally
npm run dev

# Test AI assessment endpoint
curl -X POST http://localhost:3000/api/building-surveyor/assess \
  -H "Content-Type: application/json" \
  -d '{"imageUrl": "test-image.jpg"}'

# Verify response is valid
```

#### 4.4 Deploy and Deactivate Old Key
```bash
# Deploy to production
vercel --prod

# Wait 24 hours to ensure no issues

# Deactivate old key in OpenAI Platform
# This prevents further use of compromised key
```

#### 4.5 Monitor Usage
```bash
# OpenAI Platform > Usage
# Monitor for unexpected spikes
# Set up usage alerts if not already configured
```

---

## 5. Database Password Rotation

### Impact
- **HIGH IMPACT** - All database connections affected
- Requires coordinated deployment
- Brief downtime expected

### Step-by-Step Process

#### 5.1 Generate New Password
```bash
# Generate strong password (32 characters, mixed case, numbers, symbols)
openssl rand -base64 32 | tr -d "=+/" | cut -c1-32

# Or use a password manager to generate
```

#### 5.2 Update Supabase Database Password
```bash
# Supabase Dashboard > Settings > Database
# Click "Reset database password"
# Enter new password
# Confirm change

# WARNING: This immediately invalidates old password
```

#### 5.3 Update Connection Strings
```bash
# Old format:
DATABASE_URL="postgresql://postgres.PROJECT:OLD_PASSWORD@host:6543/postgres"
DIRECT_URL="postgresql://postgres.PROJECT:OLD_PASSWORD@host:5432/postgres"

# New format:
DATABASE_URL="postgresql://postgres.PROJECT:NEW_PASSWORD@host:6543/postgres"
DIRECT_URL="postgresql://postgres.PROJECT:NEW_PASSWORD@host:5432/postgres"

# Special characters must be URL-encoded:
# ! becomes %21
# @ becomes %40
# # becomes %23
# etc.
```

#### 5.4 Update All Environments Simultaneously
```bash
# Local
# Update .env.local

# Staging
vercel env add DATABASE_URL staging
vercel env add DIRECT_URL staging

# Production (BE READY - this must be fast)
vercel env add DATABASE_URL production
vercel env add DIRECT_URL production

# Immediately redeploy
vercel --prod
```

#### 5.5 Update Backup Systems
```bash
# Update any backup scripts
# Update monitoring tools
# Update database migration tools
```

#### 5.6 Verify Connectivity
```bash
# Test database connection
psql $DATABASE_URL -c "SELECT NOW();"

# Verify web app can connect
curl https://mintenance.com/api/health

# Check monitoring for errors
```

---

## 6. Encryption Master Key Rotation

### Impact
- **CRITICAL** - Requires re-encryption of all encrypted data
- Must be done carefully to avoid data loss
- Implement zero-downtime rotation strategy

### Step-by-Step Process

#### 6.1 Generate New Encryption Key
```bash
# Generate new 256-bit key (64 hex characters)
openssl rand -hex 32
```

#### 6.2 Implement Multi-Key Decryption
```typescript
// lib/encryption/service.ts
const ENCRYPTION_KEYS = {
  current: process.env.ENCRYPTION_MASTER_KEY,
  previous: process.env.ENCRYPTION_MASTER_KEY_OLD,
};

const decrypt = (encryptedData: string) => {
  // Try current key first
  try {
    return decryptWithKey(encryptedData, ENCRYPTION_KEYS.current);
  } catch {
    // Fall back to old key
    return decryptWithKey(encryptedData, ENCRYPTION_KEYS.previous);
  }
};

const encrypt = (data: string) => {
  // Always encrypt with current key
  return encryptWithKey(data, ENCRYPTION_KEYS.current);
};
```

#### 6.3 Add New Key to Environment
```bash
# Add new key while keeping old key
ENCRYPTION_MASTER_KEY=NEW_KEY_HERE
ENCRYPTION_MASTER_KEY_OLD=OLD_KEY_HERE
```

#### 6.4 Deploy Dual-Key Support
```bash
vercel --prod
```

#### 6.5 Re-encrypt Data in Background
```typescript
// scripts/rotate-encryption-keys.ts
async function rotateEncryptionKeys() {
  const encryptedFields = [
    { table: 'users', fields: ['email', 'phone', 'national_insurance'] },
    { table: 'payments', fields: ['bank_account'] },
  ];

  for (const { table, fields } of encryptedFields) {
    const records = await db.select('*').from(table);

    for (const record of records) {
      const updates = {};

      for (const field of fields) {
        if (record[field]) {
          // Decrypt with old key, encrypt with new key
          const decrypted = decrypt(record[field]); // Uses old key if needed
          updates[field] = encrypt(decrypted); // Uses new key
        }
      }

      await db.update(table).where({ id: record.id }).set(updates);
    }

    console.log(`Re-encrypted ${records.length} records in ${table}`);
  }
}
```

#### 6.6 Run Re-encryption Script
```bash
# Run during low-traffic period
npm run rotate-encryption-keys

# Monitor progress
# Verify no errors in logs
```

#### 6.7 Remove Old Key
```bash
# After all data is re-encrypted (verify with queries)
# Remove old key from environment
vercel env rm ENCRYPTION_MASTER_KEY_OLD production

# Redeploy
vercel --prod
```

---

## 7. Twilio Credentials Rotation

### Impact
- SMS verification temporarily unavailable during rotation
- Consider during low-traffic period

### Step-by-Step Process

#### 7.1 Create New API Key
```bash
# Twilio Console > Settings > API Keys & Tokens
# Click "Create API key"
# Save the SID and Secret (shown only once)
```

#### 7.2 Update Environment Variables
```bash
TWILIO_ACCOUNT_SID=NEW_ACCOUNT_SID
TWILIO_AUTH_TOKEN=NEW_AUTH_TOKEN
TWILIO_VERIFY_SERVICE_SID=SAME_SERVICE_SID
```

#### 7.3 Test SMS Functionality
```bash
# Test locally
npm run dev

# Trigger SMS verification
curl -X POST http://localhost:3000/api/auth/send-verification \
  -H "Content-Type: application/json" \
  -d '{"phone": "+447XXXXXXXXX"}'

# Verify SMS is received
```

#### 7.4 Deploy and Deactivate Old Credentials
```bash
vercel --prod

# After 24 hours, deactivate old API key in Twilio Console
```

---

## 8. Google Maps API Key Rotation

### Impact
- Maps functionality affected during rotation
- Must update API restrictions

### Step-by-Step Process

#### 8.1 Create New API Key
```bash
# Google Cloud Console > APIs & Services > Credentials
# Click "Create Credentials" > "API Key"
# Immediately restrict the key
```

#### 8.2 Configure API Restrictions
```bash
# Application restrictions:
# - HTTP referrers (web app): https://mintenance.com/*, https://*.mintenance.com/*
# - iOS apps: Bundle ID: com.mintenance.app
# - Android apps: Package name: com.mintenance.app, SHA-1 fingerprint

# API restrictions:
# - Maps JavaScript API
# - Maps SDK for iOS
# - Maps SDK for Android
# - Geocoding API
# - Places API
```

#### 8.3 Update Environment Variables
```bash
# Web app
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=NEW_KEY_HERE

# Mobile app
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=NEW_KEY_HERE
```

#### 8.4 Test Map Features
```bash
# Test locally
npm run dev

# Test map rendering
# Test geocoding
# Test place search
```

#### 8.5 Deploy and Deactivate Old Key
```bash
# Web app
vercel --prod

# Mobile app
eas build --platform all --profile production

# After 24 hours, delete old key in Google Cloud Console
```

---

## 9. SendGrid API Key Rotation

### Impact
- Email functionality temporarily unavailable during rotation

### Step-by-Step Process

#### 9.1 Create New API Key
```bash
# SendGrid Dashboard > Settings > API Keys
# Click "Create API Key"
# Name: mintenance-production-YYYY-MM-DD
# Select "Full Access" or required permissions
# Copy key (shown only once)
```

#### 9.2 Update Environment Variables
```bash
SENDGRID_API_KEY=NEW_API_KEY_HERE
```

#### 9.3 Test Email Functionality
```bash
# Test locally
npm run dev

# Trigger test email
curl -X POST http://localhost:3000/api/email/test \
  -H "Content-Type: application/json" \
  -d '{"to": "test@example.com", "template": "welcome"}'

# Verify email is received
```

#### 9.4 Deploy and Deactivate Old Key
```bash
vercel --prod

# After 24 hours, delete old API key in SendGrid
```

---

## 10. Rotation Checklist Template

Use this checklist for each rotation:

```markdown
## Secret Rotation - [SECRET_NAME] - [DATE]

### Pre-Rotation
- [ ] Identify all locations where secret is used
- [ ] Schedule rotation during low-traffic period
- [ ] Notify team of planned rotation
- [ ] Backup current configuration
- [ ] Prepare rollback plan

### Rotation Process
- [ ] Generate new secret
- [ ] Update development environment
- [ ] Test functionality locally
- [ ] Update staging environment
- [ ] Test functionality in staging
- [ ] Update production environment
- [ ] Deploy changes to production
- [ ] Monitor for errors (15 minutes)
- [ ] Verify all functionality works

### Post-Rotation
- [ ] Deactivate/delete old secret
- [ ] Update documentation
- [ ] Update secrets inventory
- [ ] Schedule next rotation
- [ ] Document any issues encountered

### Rollback (if needed)
- [ ] Revert environment variables
- [ ] Redeploy previous version
- [ ] Restore old secret
- [ ] Investigate and document failure
```

---

## 11. Automated Rotation with Scripts

### Rotation Script Template
```bash
#!/bin/bash
# rotate-secret.sh

set -e

SECRET_NAME=$1
NEW_SECRET=$2

if [ -z "$SECRET_NAME" ] || [ -z "$NEW_SECRET" ]; then
  echo "Usage: ./rotate-secret.sh SECRET_NAME NEW_SECRET"
  exit 1
fi

echo "Rotating $SECRET_NAME..."

# Update Vercel
echo "Updating Vercel production environment..."
vercel env rm $SECRET_NAME production --yes
echo $NEW_SECRET | vercel env add $SECRET_NAME production

# Update AWS Secrets Manager
echo "Updating AWS Secrets Manager..."
aws secretsmanager update-secret \
  --secret-id mintenance/production/$SECRET_NAME \
  --secret-string "$NEW_SECRET"

# Trigger deployment
echo "Deploying changes..."
vercel --prod

echo "Rotation complete! Monitor for errors."
echo "Old secret will be deactivated in 24 hours."
```

### Usage
```bash
chmod +x rotate-secret.sh

# Rotate JWT secret
./rotate-secret.sh JWT_SECRET $(openssl rand -base64 64)

# Rotate Stripe secret
./rotate-secret.sh STRIPE_SECRET_KEY sk_live_NEW_KEY
```

---

## 12. Emergency Exposure Response

If a secret is exposed (e.g., committed to GitHub):

### Immediate Actions (within 1 hour)
1. **Rotate the exposed secret immediately**
   ```bash
   # Don't wait for grace period - rotate NOW
   ./rotate-secret.sh EXPOSED_SECRET NEW_SECRET
   ```

2. **Revoke the old secret**
   ```bash
   # Deactivate in service dashboard immediately
   # Don't wait 24 hours
   ```

3. **Check for unauthorized usage**
   ```bash
   # Review logs for suspicious activity
   # Check for unusual API calls, database queries, etc.
   ```

4. **Remove from version control history**
   ```bash
   # If exposed in Git commit
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch .env" \
     --prune-empty --tag-name-filter cat -- --all

   # Force push (coordinate with team first!)
   git push origin --force --all
   ```

5. **Notify the team**
   ```bash
   # Send urgent notification
   # Document the incident
   # Update security log
   ```

### Follow-up Actions (within 24 hours)
1. Review all access logs for the exposed secret
2. Audit all resources that used the secret
3. Document the incident and response
4. Update security training materials
5. Implement preventive measures (pre-commit hooks, etc.)

---

## 13. Secret Management Best Practices

### Storage
- **Development**: Use `.env.local` (gitignored)
- **Staging/Production**: Use secrets manager (Vercel, AWS, etc.)
- **Never** commit secrets to version control
- **Never** include secrets in Docker images
- **Never** log secrets (even in debug mode)

### Access Control
- Limit secret access to necessary personnel
- Use service accounts with minimal permissions
- Rotate secrets when team members leave
- Audit secret access regularly

### Monitoring
- Set up alerts for unusual API usage
- Monitor for secret exposure in public repositories
- Track secret age and rotation schedule
- Log all secret access (without logging the secret itself)

### Tools
- **1Password** / **LastPass**: Team password management
- **AWS Secrets Manager**: Cloud-based secret storage
- **HashiCorp Vault**: Enterprise secret management
- **Vercel Env**: Platform-specific secret management
- **git-secrets**: Pre-commit hook to prevent secret commits

---

## 14. Secrets Inventory

Maintain an inventory of all secrets:

| Secret | Location | Last Rotated | Next Rotation | Owner |
|--------|----------|--------------|---------------|-------|
| JWT_SECRET | Vercel, AWS | 2025-01-15 | 2025-04-15 | Security Team |
| STRIPE_SECRET_KEY | Vercel | 2025-01-20 | 2025-04-20 | Finance Team |
| OPENAI_API_KEY | Vercel, AWS | 2025-02-01 | 2025-05-01 | AI Team |
| ... | ... | ... | ... | ... |

---

## 15. Contact Information

For secret rotation issues:

- **Security Lead**: security@mintenance.com
- **DevOps Team**: devops@mintenance.com
- **Emergency Hotline**: +44-XXX-XXXXXXX
- **Incident Response**: https://mintenance.com/incident-response

---

## Conclusion

Regular secret rotation is essential for maintaining the security of the Mintenance platform. Follow this guide carefully, test thoroughly, and always have a rollback plan ready.

**Remember**: When in doubt, rotate it out!
