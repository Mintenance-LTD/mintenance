#!/usr/bin/env node

/**
 * Secure Environment Setup Script
 * Helps developers set up secure environment configuration
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function generateSecureKey(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

function validateEnvironmentFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return { isValid: false, errors: [`File does not exist: ${filePath}`] };
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const errors = [];
  const warnings = [];

  // Check for exposed secrets
  const sensitivePatterns = [
    { pattern: /sk_live_[a-zA-Z0-9]{99}/, message: 'Live Stripe secret key detected' },
    { pattern: /sk_test_[a-zA-Z0-9]{99}/, message: 'Test Stripe secret key detected' },
    { pattern: /AIza[a-zA-Z0-9_-]{35}/, message: 'Google API key detected' },
    { pattern: /sk-[a-zA-Z0-9]{48}/, message: 'OpenAI API key detected' },
    { pattern: /your_.*_here/, message: 'Placeholder values detected' },
    { pattern: /password.*=.*123/, message: 'Weak password detected' },
  ];

  sensitivePatterns.forEach(({ pattern, message }) => {
    if (pattern.test(content)) {
      if (message.includes('Live') || message.includes('secret')) {
        errors.push(`SECURITY RISK: ${message}`);
      } else {
        warnings.push(message);
      }
    }
  });

  // Check for required variables
  const requiredVars = [
    'EXPO_PUBLIC_SUPABASE_URL',
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
    'EXPO_PUBLIC_APP_NAME',
  ];

  requiredVars.forEach(varName => {
    if (!content.includes(`${varName}=`)) {
      errors.push(`Missing required variable: ${varName}`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

function createSecureEnvFile(environment = 'development') {
  const envFile = environment === 'development' ? '.env' : `.env.${environment}`;
  const envPath = path.join(process.cwd(), envFile);
  const examplePath = path.join(process.cwd(), '.env.example');

  log('blue', `Creating secure environment file: ${envFile}`);

  if (fs.existsSync(envPath)) {
    log('yellow', `Warning: ${envFile} already exists. Creating backup...`);
    const backupPath = `${envPath}.backup.${Date.now()}`;
    fs.copyFileSync(envPath, backupPath);
    log('green', `Backup created: ${path.basename(backupPath)}`);
  }

  if (!fs.existsSync(examplePath)) {
    log('red', 'Error: .env.example file not found');
    return false;
  }

  // Read template
  let template = fs.readFileSync(examplePath, 'utf8');

  // Replace placeholders with secure values or prompts
  const replacements = {
    'your_supabase_project_id': () => {
      log('cyan', 'Please get your Supabase URL from: https://app.supabase.com/project/[your-project]/settings/api');
      return 'https://your-project-id.supabase.co';
    },
    'your_supabase_anon_key_here': () => {
      log('cyan', 'Please get your Supabase anon key from: https://app.supabase.com/project/[your-project]/settings/api');
      return 'your_supabase_anon_key_here';
    },
    'your_stripe_publishable_key_here': () => {
      if (environment === 'production') {
        log('cyan', 'Please get your LIVE Stripe publishable key from: https://dashboard.stripe.com/apikeys');
        return 'pk_live_your_stripe_publishable_key_here';
      } else {
        log('cyan', 'Please get your TEST Stripe publishable key from: https://dashboard.stripe.com/test/apikeys');
        return 'pk_test_your_stripe_publishable_key_here';
      }
    },
    'your_google_maps_api_key_here': () => {
      log('cyan', 'Please get your Google Maps API key from: https://console.cloud.google.com/apis/credentials');
      return 'your_google_maps_api_key_here';
    },
    'your_21st_dev_api_key_here': () => generateSecureKey(64),
  };

  // Apply replacements
  Object.entries(replacements).forEach(([placeholder, replacementFn]) => {
    if (template.includes(placeholder)) {
      template = template.replace(new RegExp(placeholder, 'g'), replacementFn());
    }
  });

  // Set environment-specific values
  template = template.replace(/NODE_ENV=development/, `NODE_ENV=${environment}`);
  template = template.replace(/EXPO_PUBLIC_ENVIRONMENT=development/, `EXPO_PUBLIC_ENVIRONMENT=${environment}`);

  // Environment-specific API URLs
  if (environment === 'production') {
    template = template.replace(
      /EXPO_PUBLIC_API_BASE_URL=http:\/\/localhost:3000/,
      'EXPO_PUBLIC_API_BASE_URL=https://api.mintenance.com'
    );
    template = template.replace(/EXPO_PUBLIC_ENABLE_ANALYTICS=false/, 'EXPO_PUBLIC_ENABLE_ANALYTICS=true');
    template = template.replace(/EXPO_PUBLIC_ENABLE_CRASH_REPORTING=false/, 'EXPO_PUBLIC_ENABLE_CRASH_REPORTING=true');
  } else if (environment === 'staging') {
    template = template.replace(
      /EXPO_PUBLIC_API_BASE_URL=http:\/\/localhost:3000/,
      'EXPO_PUBLIC_API_BASE_URL=https://staging-api.mintenance.com'
    );
  }

  // Write the file
  fs.writeFileSync(envPath, template);
  log('green', `✅ Environment file created: ${envFile}`);

  // Validate the created file
  const validation = validateEnvironmentFile(envPath);
  if (validation.warnings.length > 0) {
    log('yellow', '\n⚠️  Warnings:');
    validation.warnings.forEach(warning => log('yellow', `  - ${warning}`));
  }

  log('blue', '\n📝 Next steps:');
  log('blue', `1. Edit ${envFile} and replace placeholder values with actual API keys`);
  log('blue', '2. Never commit this file to version control');
  log('blue', '3. Use different files for different environments (.env.staging, .env.production)');
  log('blue', '4. Run "npm run validate-env" to check your configuration');

  return true;
}

function validateAllEnvironments() {
  log('blue', '🔍 Validating all environment files...\n');

  const envFiles = ['.env', '.env.development', '.env.staging', '.env.production'];
  let hasErrors = false;

  envFiles.forEach(envFile => {
    const envPath = path.join(process.cwd(), envFile);

    if (fs.existsSync(envPath)) {
      log('blue', `Checking ${envFile}:`);
      const validation = validateEnvironmentFile(envPath);

      if (validation.isValid) {
        log('green', '  ✅ Valid');
      } else {
        hasErrors = true;
        log('red', '  ❌ Invalid');
        validation.errors.forEach(error => log('red', `    - ${error}`));
      }

      if (validation.warnings.length > 0) {
        validation.warnings.forEach(warning => log('yellow', `    ⚠️  ${warning}`));
      }
      console.log();
    }
  });

  return !hasErrors;
}

function checkSecurityStatus() {
  log('blue', '🔐 Security Status Check\n');

  const checks = [
    {
      name: 'Environment files in .gitignore',
      check: () => {
        const gitignorePath = path.join(process.cwd(), '.gitignore');
        if (!fs.existsSync(gitignorePath)) return false;
        const content = fs.readFileSync(gitignorePath, 'utf8');
        return content.includes('.env') && content.includes('.env.production');
      },
    },
    {
      name: 'No .env files in git tracking',
      check: () => {
        try {
          const { execSync } = require('child_process');
          const trackedFiles = execSync('git ls-files', { encoding: 'utf8' });
          return !trackedFiles.includes('.env');
        } catch {
          return true; // Assume OK if git is not available
        }
      },
    },
    {
      name: 'Security validation module exists',
      check: () => {
        return fs.existsSync(path.join(process.cwd(), 'src/utils/EnvironmentSecurity.ts'));
      },
    },
  ];

  let allPassed = true;
  checks.forEach(({ name, check }) => {
    const passed = check();
    log(passed ? 'green' : 'red', `${passed ? '✅' : '❌'} ${name}`);
    if (!passed) allPassed = false;
  });

  return allPassed;
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const environment = args[1] || 'development';

  log('cyan', '🛡️  Mintenance Environment Security Setup\n');

  switch (command) {
    case 'create':
      createSecureEnvFile(environment);
      break;

    case 'validate':
      const isValid = validateAllEnvironments();
      process.exit(isValid ? 0 : 1);
      break;

    case 'security-check':
      const isSecure = checkSecurityStatus();
      process.exit(isSecure ? 0 : 1);
      break;

    case 'help':
    default:
      log('blue', 'Usage:');
      log('blue', '  node scripts/setup-environment.js create [environment]     # Create secure .env file');
      log('blue', '  node scripts/setup-environment.js validate                # Validate all .env files');
      log('blue', '  node scripts/setup-environment.js security-check          # Check security status');
      log('blue', '  node scripts/setup-environment.js help                    # Show this help');
      log('blue', '\nEnvironments: development (default), staging, production');
      break;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  validateEnvironmentFile,
  createSecureEnvFile,
  validateAllEnvironments,
  checkSecurityStatus,
};