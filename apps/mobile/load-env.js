/**
 * Load environment variables from root or web app .env files
 * This allows sharing Supabase credentials between web and mobile apps
 */

const fs = require('fs');
const path = require('path');

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
  console.log(`📋 Loading environment variables from: ${path.relative(process.cwd(), envPath)}`);
  
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
        console.log(`   ✓ Mapped ${key} → ${expoKey}`);
      } else if (key.startsWith('NEXT_PUBLIC_STRIPE_')) {
        const expoKey = key.replace('NEXT_PUBLIC_', 'EXPO_PUBLIC_');
        process.env[expoKey] = value;
        console.log(`   ✓ Mapped ${key} → ${expoKey}`);
      } else if (key === 'SUPABASE_URL' || key === 'SUPABASE_ANON_KEY') {
        // Also support non-prefixed versions
        process.env[`EXPO_PUBLIC_${key}`] = value;
        console.log(`   ✓ Mapped ${key} → EXPO_PUBLIC_${key}`);
      }
    }
  });
} else {
  console.log('⚠️  No shared .env file found. Using mobile-specific .env if it exists.');
}

