/* CI environment validation: ensures expected variables are present */
/* eslint-disable no-console */

const required = {
  web: [
    'JWT_SECRET',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ],
  mobile: [
    'EXPO_PUBLIC_SUPABASE_URL',
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  ],
};

function check(keys) {
  const missing = keys.filter((k) => !process.env[k] || !String(process.env[k]).trim());
  return missing;
}

const missingWeb = check(required.web);
const missingMobile = check(required.mobile);

if (missingWeb.length || missingMobile.length) {
  console.error('[ENV VALIDATION] Missing required variables');
  if (missingWeb.length) console.error('Web:', missingWeb.join(', '));
  if (missingMobile.length) console.error('Mobile:', missingMobile.join(', '));
  process.exit(1);
}

console.log('[ENV VALIDATION] All required environment variables are set');

