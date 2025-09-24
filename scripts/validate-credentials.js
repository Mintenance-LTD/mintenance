#!/usr/bin/env node
// Simple prebuild validator for required mobile env vars in non-dev builds

const required = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
];

const isCI = !!process.env.CI;
const nodeEnv = process.env.NODE_ENV || '';

// In CI or when not explicitly in development, enforce required vars
if (isCI || nodeEnv === 'production' || nodeEnv === 'staging' || process.env.EAS_BUILD === 'true') {
  const missing = required.filter((k) => !process.env[k] || String(process.env[k]).trim() === '');
  if (missing.length) {
    console.error('[Env Validation] Missing required environment variables for mobile build:');
    missing.forEach((k) => console.error(`  - ${k}`));
    console.error('\nSet these in your EAS Secret/Environment configuration.');
    process.exit(1);
  }
}

console.log('[Env Validation] Required variables present or dev build detected.');

