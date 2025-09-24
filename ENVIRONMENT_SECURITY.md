# 🛡️ Environment Security Guide

## Overview

This guide outlines the secure environment variable management system implemented in Mintenance to protect sensitive API keys, tokens, and configuration data.

## 🔐 Security Features

### 1. Environment Validation System
- **Automatic validation** of all environment variables on startup
- **Format validation** for API keys (Stripe, Google Maps, etc.)
- **Security issue detection** (exposed secrets, weak configurations)
- **Environment-specific requirements** (production vs development)

### 2. Secure Configuration Management
- **Type-safe environment access** with validation
- **Domain allowlisting** for API endpoints
- **Sensitive key detection** and protection
- **Comprehensive security reporting**

### 3. Development Tools
- **Secure environment setup** scripts
- **Validation utilities** for configuration files
- **Security status checking**
- **Automated backup** of existing configurations

## 📋 Quick Start

### 1. Initial Setup
```bash
# Create secure environment file
npm run setup-env

# For staging environment
npm run setup-env:staging

# For production environment
npm run setup-env:production
```

### 2. Validate Configuration
```bash
# Validate all environment files
npm run validate-env

# Check security status
npm run security-check
```

### 3. Update Your Environment Variables
Edit your `.env` file and replace placeholder values:

```bash
# Required: Get from Supabase Dashboard -> Settings -> API
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Required for payments: Get from Stripe Dashboard -> Developers -> API keys
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51234567890abcdef...

# Required for maps: Get from Google Cloud Console -> APIs & Services -> Credentials
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyDCtPcCQqECwanf7tn9avJU4gvT6nezSi8
```

## 🔒 Security Best Practices

### Environment Files
- ✅ **NEVER** commit `.env` files to version control
- ✅ Use different files for different environments (`.env.staging`, `.env.production`)
- ✅ Keep backups secure and encrypted
- ✅ Rotate API keys regularly
- ✅ Use least-privilege principle for API keys

### API Key Management
- ✅ Use **test keys** for development
- ✅ Use **live keys** only for production
- ✅ Restrict API key permissions where possible
- ✅ Monitor API key usage for anomalies
- ✅ Use environment-specific keys

### Development Workflow
```bash
# 1. Start with secure environment setup
npm run setup-env

# 2. Configure your API keys
# Edit .env file with real values

# 3. Validate configuration
npm run validate-env

# 4. Check security status
npm run security-check

# 5. Start development
npm start
```

## 🛠️ Environment Variables Reference

### Required Variables

| Variable | Description | Example | Environment |
|----------|-------------|---------|-------------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://abc123.supabase.co` | All |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJhbGciOiJIUzI1NiI...` | All |
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | `pk_test_1234...` | All |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps API key | `AIzaSyDCtPcCQ...` | All |

### Optional Variables

| Variable | Description | Default | Environment |
|----------|-------------|---------|-------------|
| `EXPO_PUBLIC_SENTRY_DSN` | Sentry error tracking URL | None | Production |
| `EXPO_PUBLIC_ENABLE_ANALYTICS` | Enable analytics tracking | `false` | Dev/Staging |
| `EXPO_PUBLIC_LOG_LEVEL` | Logging verbosity | `debug` | Development |
| `EXPO_PUBLIC_ENABLE_CRASH_REPORTING` | Enable crash reporting | `false` | Dev only |

### Sensitive Variables (Server-side only)
⚠️ **NEVER expose these in client-side code:**

| Variable | Description | Usage |
|----------|-------------|-------|
| `STRIPE_SECRET_KEY` | Stripe secret key | Server-side payments |
| `SUPABASE_ACCESS_TOKEN` | Supabase admin token | CLI operations |
| `OPENAI_API_KEY` | OpenAI API key | Server-side AI |

## 🔍 Validation Rules

### API Key Format Validation
```typescript
// Stripe Keys
Publishable: /^pk_(test_|live_)[a-zA-Z0-9]{99}$/
Secret: /^sk_(test_|live_)[a-zA-Z0-9]{99}$/

// Google Maps
API Key: /^AIza[a-zA-Z0-9_-]{35}$/

// Supabase
Anon Key: /^eyJ[a-zA-Z0-9+/=_-]+$/

// OpenAI
API Key: /^sk-[a-zA-Z0-9]{48}$/
```

### Security Checks
- ✅ No live keys in development
- ✅ No test keys in production
- ✅ No hardcoded secrets in public variables
- ✅ HTTPS URLs in production
- ✅ Allowed domain validation

## 🚨 Security Incidents

### If API Keys Are Compromised
1. **Immediately revoke** the compromised keys
2. **Generate new keys** from the service provider
3. **Update environment files** with new keys
4. **Redeploy applications** with new configuration
5. **Monitor for unauthorized usage**
6. **Review access logs** for suspicious activity

### If Environment File Is Committed
1. **Remove file from git history** using git-filter-branch or BFG
2. **Revoke all exposed keys** immediately
3. **Generate new keys** and update configuration
4. **Force push** cleaned history (coordinate with team)
5. **Audit repository** for other sensitive data

## 📊 Security Monitoring

### Automated Checks
The system automatically monitors for:
- Invalid API key formats
- Exposed sensitive data
- Environment misconfigurations
- Security policy violations

### Manual Audits
Regular security audits should check:
- API key rotation schedules
- Access log reviews
- Permission audits
- Configuration drift

## 🔄 Environment Management Workflow

### Development
```bash
# 1. Setup development environment
npm run setup-env

# 2. Use test/sandbox API keys
# Edit .env with test keys

# 3. Validate configuration
npm run validate-env
```

### Staging
```bash
# 1. Setup staging environment
npm run setup-env:staging

# 2. Use staging/test API keys
# Edit .env.staging with staging keys

# 3. Deploy to staging
npm run build:android:staging
```

### Production
```bash
# 1. Setup production environment
npm run setup-env:production

# 2. Use live/production API keys
# Edit .env.production with production keys

# 3. Validate security
npm run security-check

# 4. Deploy to production
npm run build:android:prod
```

## 🆘 Troubleshooting

### Common Issues

#### "Required environment variable missing"
```bash
# Check which variables are missing
npm run validate-env

# Ensure all required variables are set in .env
```

#### "Invalid API key format"
```bash
# Check API key format matches expected pattern
# Regenerate key from service provider if needed
```

#### "Security validation failed"
```bash
# Run security check for details
npm run security-check

# Review and fix security issues
```

### Support
For security-related issues:
1. Check this documentation first
2. Run `npm run security-check` for diagnostics
3. Contact the development team
4. **Never share sensitive keys** in support requests

## 📝 Change Log

### v1.0.0 - Initial Implementation
- Secure environment validation system
- Automated security checks
- Development tools and scripts
- Comprehensive documentation

---

**Remember**: Security is everyone's responsibility. When in doubt, err on the side of caution and ask for help.