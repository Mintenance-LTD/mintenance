#!/usr/bin/env node

/**
 * 🔐 Production Credentials Validation Script
 * Validates that all required credentials are properly configured for app store deployment
 */

const fs = require('fs');
const path = require('path');

console.log('🔐 VALIDATING PRODUCTION CREDENTIALS...\n');

const credentialsDir = path.join(__dirname, '..', 'credentials');
const easConfigPath = path.join(__dirname, '..', 'eas.json');

let validationErrors = [];
let warnings = [];

// Check if credentials directory exists
if (!fs.existsSync(credentialsDir)) {
  validationErrors.push('❌ credentials/ directory does not exist');
} else {
  console.log('✅ credentials/ directory exists');
}

// Validate Apple credentials
console.log('\n🍎 APPLE APP STORE VALIDATION:');

const appleCredentialsPath = path.join(credentialsDir, 'apple-credentials.env');
if (fs.existsSync(appleCredentialsPath)) {
  console.log('✅ apple-credentials.env found');
  
  const appleCredentials = fs.readFileSync(appleCredentialsPath, 'utf8');
  
  // Check for placeholder values
  if (appleCredentials.includes('your-apple-id@example.com')) {
    validationErrors.push('❌ apple-credentials.env contains placeholder values');
  } else {
    console.log('✅ apple-credentials.env appears to have real values');
  }
  
  // Check for required fields
  const requiredAppleFields = ['APPLE_ID', 'APPLE_TEAM_ID', 'APPLE_ASC_APP_ID'];
  for (const field of requiredAppleFields) {
    if (!appleCredentials.includes(field)) {
      validationErrors.push(`❌ Missing ${field} in apple-credentials.env`);
    } else {
      console.log(`✅ ${field} present`);
    }
  }
} else {
  validationErrors.push('❌ apple-credentials.env not found');
  console.log('💡 Copy apple-credentials.env.template and fill in your values');
}

// Check for Apple API key file
const appleKeyFiles = fs.readdirSync(credentialsDir).filter(file => file.startsWith('AuthKey_') && file.endsWith('.p8'));
if (appleKeyFiles.length === 0) {
  validationErrors.push('❌ No Apple API key (.p8) file found');
} else {
  console.log(`✅ Apple API key file found: ${appleKeyFiles[0]}`);
}

// Validate Google Play credentials
console.log('\n🤖 GOOGLE PLAY STORE VALIDATION:');

const googleServiceAccountPath = path.join(credentialsDir, 'play-store-service-account.json');
if (fs.existsSync(googleServiceAccountPath)) {
  console.log('✅ play-store-service-account.json found');
  
  try {
    const serviceAccount = JSON.parse(fs.readFileSync(googleServiceAccountPath, 'utf8'));
    
    // Validate service account structure
    const requiredFields = ['type', 'project_id', 'private_key', 'client_email'];
    for (const field of requiredFields) {
      if (!serviceAccount[field]) {
        validationErrors.push(`❌ Missing ${field} in service account JSON`);
      } else {
        console.log(`✅ ${field} present`);
      }
    }
    
    if (serviceAccount.type !== 'service_account') {
      validationErrors.push('❌ Invalid service account type');
    }
    
  } catch (error) {
    validationErrors.push('❌ Invalid JSON in play-store-service-account.json');
  }
} else {
  validationErrors.push('❌ play-store-service-account.json not found');
  console.log('💡 See google-play-setup-instructions.md for setup steps');
}

// Validate EAS configuration
console.log('\n⚙️ EAS CONFIGURATION VALIDATION:');

if (fs.existsSync(easConfigPath)) {
  console.log('✅ eas.json found');
  
  try {
    const easConfig = JSON.parse(fs.readFileSync(easConfigPath, 'utf8'));
    
    // Check submit configuration
    if (easConfig.submit && easConfig.submit.production) {
      const production = easConfig.submit.production;
      
      // iOS validation
      if (production.ios) {
        const ios = production.ios;
        if (ios.appleId && ios.appleId.includes('YOUR_')) {
          validationErrors.push('❌ eas.json contains placeholder values for iOS');
        } else {
          console.log('✅ iOS submit configuration has real values');
        }
      }
      
      // Android validation
      if (production.android) {
        const android = production.android;
        if (android.track === 'internal') {
          warnings.push('⚠️ Android track is set to "internal" - change to "production" for store release');
        } else {
          console.log('✅ Android track configured for production');
        }
      }
    }
  } catch (error) {
    validationErrors.push('❌ Invalid JSON in eas.json');
  }
} else {
  validationErrors.push('❌ eas.json not found');
}

// Environment variables validation
console.log('\n🌍 ENVIRONMENT VARIABLES VALIDATION:');

const requiredEnvVars = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  'EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY'
];

for (const envVar of requiredEnvVars) {
  if (process.env[envVar]) {
    console.log(`✅ ${envVar} is set`);
  } else {
    warnings.push(`⚠️ ${envVar} not set - ensure it's configured in production`);
  }
}

// Final validation report
console.log('\n📊 VALIDATION SUMMARY:');
console.log(`Total errors: ${validationErrors.length}`);
console.log(`Total warnings: ${warnings.length}`);

if (validationErrors.length > 0) {
  console.log('\n🚨 ERRORS THAT MUST BE FIXED:');
  validationErrors.forEach(error => console.log(error));
}

if (warnings.length > 0) {
  console.log('\n⚠️ WARNINGS TO CONSIDER:');
  warnings.forEach(warning => console.log(warning));
}

if (validationErrors.length === 0) {
  console.log('\n🎉 CREDENTIALS VALIDATION PASSED!');
  console.log('Your app is ready for production deployment.');
  console.log('\nNext steps:');
  console.log('1. eas build --platform all --profile production-store');
  console.log('2. eas submit --platform ios --profile production');
  console.log('3. eas submit --platform android --profile production');
} else {
  console.log('\n❌ CREDENTIALS VALIDATION FAILED!');
  console.log('Please fix the errors above before deploying to production.');
  process.exit(1);
}

console.log('\nFor detailed setup instructions, see: PRODUCTION_CREDENTIALS_SETUP.md');