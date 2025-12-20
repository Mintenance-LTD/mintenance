#!/usr/bin/env node

/**
 * Generate .env.example file from env.ts schema
 * This script extracts environment variables from apps/web/lib/env.ts
 * and creates a comprehensive .env.example file with documentation
 */

const fs = require('fs');
const path = require('path');

const envExampleContent = `# Mintenance Web App Environment Variables
# Copy this file to .env.local and fill in your actual values
# Never commit .env.local to version control

# =============================================================================
# REQUIRED - Core Configuration
# =============================================================================

# Node Environment
# Options: development, production, test
# Default: development
NODE_ENV=development

# JWT Configuration (CRITICAL)
# Secret key for JWT signing - must be strong and random
# Minimum 64 characters for production security
# Generate with: openssl rand -base64 64
JWT_SECRET=your-jwt-secret-minimum-64-characters-here-generate-a-strong-random-secret

# =============================================================================
# REQUIRED - Supabase Configuration
# =============================================================================

# Supabase project URL
# Get this from your Supabase project settings
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co

# Supabase service role key (server-side only)
# WARNING: Never expose this in client-side code
# Get this from your Supabase project settings > API > service_role key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key-here

# =============================================================================
# REQUIRED - Stripe Configuration
# =============================================================================

# Stripe secret key (server-side only)
# Must start with sk_test_ (test mode) or sk_live_ (production)
# Get from: https://dashboard.stripe.com/apikeys
STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key-here

# Stripe webhook signing secret
# Must start with whsec_
# Get from: https://dashboard.stripe.com/webhooks
STRIPE_WEBHOOK_SECRET=whsec_your-stripe-webhook-secret-here

# Stripe publishable key (client-side)
# Must start with pk_test_ (test mode) or pk_live_ (production)
# Get from: https://dashboard.stripe.com/apikeys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-publishable-key-here

# =============================================================================
# REQUIRED IN PRODUCTION - Redis Configuration
# =============================================================================

# Upstash Redis URL for rate limiting
# Required in production for distributed rate limiting
# Get from: https://console.upstash.com/
UPSTASH_REDIS_REST_URL=https://your-redis-instance.upstash.io

# Upstash Redis token
# Required in production for distributed rate limiting
# Get from: https://console.upstash.com/
UPSTASH_REDIS_REST_TOKEN=your-upstash-redis-token-here

# =============================================================================
# OPTIONAL - AI Service Configuration
# =============================================================================

# OpenAI API key for GPT-4 Vision and embeddings (server-side only)
# Required for AI assessment features
# Must start with sk- or sk-proj-
# Get from: https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-your-openai-api-key-here

# =============================================================================
# OPTIONAL - Roboflow Configuration
# =============================================================================

# Roboflow API key for building damage detection
# Get from: https://roboflow.com/
ROBOFLOW_API_KEY=your-roboflow-api-key-here

# Roboflow model ID
# Default: building-defect-detection-7-ks0im
ROBOFLOW_MODEL_ID=building-defect-detection-7-ks0im

# Roboflow model version
# Default: 1
ROBOFLOW_MODEL_VERSION=1

# Roboflow API timeout in milliseconds
# Default: 10000
ROBOFLOW_TIMEOUT_MS=10000

# =============================================================================
# OPTIONAL - Google Maps Configuration
# =============================================================================

# Google Maps API key for geocoding and map display
# Required for location features
# Get from: https://console.cloud.google.com/apis/credentials
GOOGLE_MAPS_API_KEY=your-google-maps-api-key-here

# =============================================================================
# OPTIONAL - AWS Configuration
# =============================================================================

# AWS access key for Rekognition
AWS_ACCESS_KEY_ID=your-aws-access-key-id-here

# AWS secret access key
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key-here

# AWS region
# Default: us-east-1
AWS_REGION=us-east-1

# =============================================================================
# OPTIONAL - Google Cloud Configuration
# =============================================================================

# Google Cloud API key for Vision API
GOOGLE_CLOUD_API_KEY=your-google-cloud-api-key-here

# =============================================================================
# OPTIONAL - Monitoring & Analytics
# =============================================================================

# Sentry DSN for error tracking
# Get from: https://sentry.io/settings/
SENTRY_DSN=https://your-sentry-dsn@sentry.io/your-project-id

# =============================================================================
# OPTIONAL - Application Configuration
# =============================================================================

# Application public URL
# Used for generating absolute URLs (e.g., email links)
# Example: https://mintenance.co.uk
NEXT_PUBLIC_APP_URL=http://localhost:3000
`;

const envExamplePath = path.join(__dirname, '..', 'apps', 'web', '.env.example');
// Ensure directory exists
const envExampleDir = path.dirname(envExamplePath);
if (!fs.existsSync(envExampleDir)) {
  fs.mkdirSync(envExampleDir, { recursive: true });
}

try {
  fs.writeFileSync(envExamplePath, envExampleContent, 'utf8');
  console.log('✅ Created .env.example file at:', envExamplePath);
} catch (error) {
  console.error('❌ Failed to create .env.example file:', error.message);
  process.exit(1);
}

