#!/usr/bin/env node

/**
 * ENVIRONMENT VALIDATION FIX
 * Validates required environment variables before build
 * Prevents builds with missing/invalid credentials
 */

// Simple color functions (no external dependency required)
const colors = {
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
};

const REQUIRED_VARS = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  'EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY'
];

const errors = [];
const warnings = [];

console.log(colors.blue('\n🔍 Validating environment variables for mobile build...\n'));

// Check each required variable
REQUIRED_VARS.forEach(varName => {
  const value = process.env[varName];

  if (!value || !value.trim()) {
    errors.push(`❌ ${varName} is missing or empty`);
    return;
  }

  // Validate Supabase URL format
  if (varName === 'EXPO_PUBLIC_SUPABASE_URL') {
    const dashboardPattern = /supabase\.com\/dashboard\/project\//i;
    const apiPattern = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i;

    if (dashboardPattern.test(value)) {
      errors.push(`❌ ${varName} appears to be a dashboard URL. Use the API URL (https://<project>.supabase.co)`);
    } else if (!apiPattern.test(value)) {
      errors.push(`❌ ${varName} has invalid format: ${value}`);
    }
  }

  // Validate Supabase anon key looks like JWT
  if (varName === 'EXPO_PUBLIC_SUPABASE_ANON_KEY') {
    const looksLikeJwt = value.length >= 40 && value.includes('.');
    if (!looksLikeJwt) {
      errors.push(`❌ ${varName} does not appear to be a valid JWT token`);
    }
  }

  // Validate Stripe publishable key format
  if (varName === 'EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY') {
    if (!value.startsWith('pk_')) {
      errors.push(`❌ ${varName} should start with "pk_"`);
    }
    if (value.startsWith('pk_test_')) {
      warnings.push(`⚠️  ${varName} is a TEST key (not production)`);
    }
  }

  console.log(colors.green(`✓ ${varName}`));
});

// Check NODE_ENV
const nodeEnv = process.env.NODE_ENV;
if (!nodeEnv) {
  warnings.push('⚠️  NODE_ENV is not set');
} else {
  console.log(colors.green(`✓ NODE_ENV = ${nodeEnv}`));
}

// Print warnings
if (warnings.length > 0) {
  console.log(colors.yellow('\n⚠️  Warnings:\n'));
  warnings.forEach(warning => console.log(colors.yellow(`  ${warning}`)));
}

// Print errors and exit if any
if (errors.length > 0) {
  console.log(colors.red('\n❌ Environment validation FAILED:\n'));
  errors.forEach(error => console.log(colors.red(`  ${error}`)));
  console.log(colors.red('\n💡 Please set missing environment variables in .env or EAS Secrets\n'));
  process.exit(1);
}

console.log(colors.green('\n✅ Environment validation passed!\n'));
process.exit(0);
