# 🔐 MCP Authentication Setup Guide

## Overview
This guide will help you set up authentication for the three MCP services:
- **Supabase MCP**: Database operations and queries
- **Stripe MCP**: Payment processing and testing
- **Sentry MCP**: Error tracking and monitoring

---

## 📋 Prerequisites

You already have most of the API keys! Based on your project files, here's what you need:

### ✅ Already Available:
- Supabase project configuration
- Stripe publishable key: `pk_test_qblFNYngBkEdjEZ16jxxoWSM`
- Project structure and configurations

### ❌ Missing (Need to Add):
- Stripe secret key
- Sentry auth token
- Environment variables file

---

## 🗄️ 1. Supabase MCP Setup

**Status**: ✅ **Already Configured**

Your Supabase is already set up with:
- Local development server on port 54321
- Database on port 54322
- Studio on port 54323

**To authenticate Supabase MCP:**
```bash
# Get your Supabase project URL and anon key from:
# https://supabase.com/dashboard/project/[your-project]/settings/api

# Then configure MCP:
claude mcp update supabase --url "https://your-project.supabase.co" --key "your-anon-key"
```

---

## 💳 2. Stripe MCP Setup

**Status**: ⚠️ **Needs Secret Key**

**You already have:**
- Publishable key: `pk_test_qblFNYngBkEdjEZ16jxxoWSM`

**Missing:**
- Secret key (starts with `sk_test_`)

**Setup Steps:**

1. **Get Stripe Secret Key:**
   - Go to https://dashboard.stripe.com/test/apikeys
   - Copy the "Secret key" (starts with `sk_test_`)

2. **Add to Environment:**
   ```bash
   # Create .env.local file in apps/web/
   STRIPE_SECRET_KEY=sk_test_your-secret-key-here
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_qblFNYngBkEdjEZ16jxxoWSM
   ```

3. **Configure Stripe MCP:**
   ```bash
   claude mcp update stripe --header "Authorization: Bearer sk_test_your-secret-key"
   ```

**What You Can Test:**
- ✅ Create test payment intents
- ✅ Test customer creation
- ✅ Process test refunds
- ✅ Verify webhook events

---

## 🐛 3. Sentry MCP Setup

**Status**: ⚠️ **Needs Auth Token**

**Setup Steps:**

1. **Get Sentry Auth Token:**
   - Go to https://sentry.io/settings/account/api/auth-tokens/
   - Create new auth token with permissions:
     - `project:read`
     - `event:read`
     - `project:write` (optional)

2. **Add to Environment:**
   ```bash
   # Add to .env.local
   NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id
   SENTRY_AUTH_TOKEN=your-sentry-auth-token
   ```

3. **Configure Sentry MCP:**
   ```bash
   claude mcp update sentry --header "Authorization: Bearer your-sentry-token"
   ```

**What You Can Monitor:**
- ✅ Check error rates
- ✅ View recent crashes
- ✅ Analyze performance metrics
- ✅ Set up alerts

---

## 🚀 Quick Setup Commands

**Create Environment File:**
```bash
# In apps/web/ directory
cat > .env.local << 'EOF'
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase (get from your dashboard)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# JWT (generate a strong secret)
JWT_SECRET=your-strong-jwt-secret-minimum-32-characters-long

# Stripe (get secret key from dashboard)
STRIPE_SECRET_KEY=sk_test_your-secret-key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_qblFNYngBkEdjEZ16jxxoWSM

# Sentry (optional)
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id
SENTRY_AUTH_TOKEN=your-sentry-token
EOF
```

**Configure MCP Services:**
```bash
# Supabase MCP
claude mcp update supabase --url "https://your-project.supabase.co" --key "your-anon-key"

# Stripe MCP
claude mcp update stripe --header "Authorization: Bearer sk_test_your-secret-key"

# Sentry MCP
claude mcp update sentry --header "Authorization: Bearer your-sentry-token"
```

---

## 🧪 Testing Your Setup

Once configured, you can test each service:

**Test Supabase:**
```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
```

**Test Stripe:**
```javascript
// Create test payment intent
stripe.paymentIntents.create({
  amount: 1000,
  currency: 'usd',
  metadata: { test: true }
});
```

**Test Sentry:**
```javascript
// Check recent errors
sentry.events.list({ limit: 10 });
```

---

## 📞 Need Help?

If you need help getting any of these API keys:
- **Supabase**: Check your project dashboard
- **Stripe**: Go to API keys section in test mode
- **Sentry**: Create auth token in account settings

All the configuration files are already in your project - you just need to add the missing keys!
