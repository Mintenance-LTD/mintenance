/**
 * Load environment variables from root or web app .env files
 * This allows sharing Supabase credentials between web and mobile apps
 */

const fs = require('fs');
const path = require('path');

// Simple logger for config file
const logger = {
  info: (...args) => console.log('[INFO]', ...args),
  warn: (...args) => console.warn('[WARN]', ...args),
  error: (...args) => console.error('[ERROR]', ...args),
};

// Paths to check for .env files (in order of priority)
const envPaths = [
  path.join(__dirname, '../web/.env.local'),  // Web app's .env.local
  path.join(__dirname, '../web/.env'),         // Web app's .env
  path.join(__dirname, '../../.env.local'),   // Root .env.local
  path.join(__dirname, '../../.env'),          // Root .env
];

// Find the first existing .env file
let envPath = null;
for (const candidatePath of envPaths) {
  if (fs.existsSync(candidatePath)) {
    envPath = candidatePath;
    break;
  }
}

if (envPath) {
  logger.info(`📋 Loading environment variables from: ${path.relative(process.cwd(), envPath)}`);
  
  // Read and parse .env file
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envLines = envContent.split('\n');
  
  // Parse environment variables
  envLines.forEach(line => {
    // Skip comments and empty lines
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    
    // Parse KEY=VALUE
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, ''); // Remove quotes
      
      // Map NEXT_PUBLIC_* to EXPO_PUBLIC_* for Supabase and Stripe
      if (key.startsWith('NEXT_PUBLIC_SUPABASE_')) {
        const expoKey = key.replace('NEXT_PUBLIC_', 'EXPO_PUBLIC_');
        process.env[expoKey] = value;
        logger.info(`   ✓ Mapped ${key} → ${expoKey}`);
      } else if (key.startsWith('NEXT_PUBLIC_STRIPE_')) {
        const expoKey = key.replace('NEXT_PUBLIC_', 'EXPO_PUBLIC_');
        process.env[expoKey] = value;
        logger.info(`   ✓ Mapped ${key} → ${expoKey}`);
      } else if (key.startsWith('EXPO_PUBLIC_')) {
        // Directly use EXPO_PUBLIC_* variables (already in correct format)
        process.env[key] = value;
        logger.info(`   ✓ Loaded ${key}`);
      } else if (key === 'SUPABASE_URL' || key === 'SUPABASE_ANON_KEY') {
        // Also support non-prefixed versions
        process.env[`EXPO_PUBLIC_${key}`] = value;
        logger.info(`   ✓ Mapped ${key} → EXPO_PUBLIC_${key}`);
      }
    }
  });
} else {
  logger.info('⚠️  No shared .env file found. Using mobile-specific .env if it exists.');
}

