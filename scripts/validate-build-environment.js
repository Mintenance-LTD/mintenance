#!/usr/bin/env node

/**
 * Build Environment Validation Script
 * Validates that all necessary environment variables and configurations are set up correctly
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating Build Environment for Mintenance v1.1.0...\n');

let hasErrors = false;

// Helper function to log errors
function logError(message) {
  console.error(`❌ ${message}`);
  hasErrors = true;
}

// Helper function to log success
function logSuccess(message) {
  console.log(`✅ ${message}`);
}

// Helper function to log warning
function logWarning(message) {
  console.warn(`⚠️  ${message}`);
}

// 1. Check if required files exist
console.log('📁 Checking required files...');
const requiredFiles = [
  'app.config.js',
  'eas.json',
  'package.json',
  '.env.production',
  'src/config/environment.ts',
  'src/lib/queryClient.ts',
  'src/services/OfflineManager.ts',
  'src/hooks/useNetworkState.ts'
];

requiredFiles.forEach(file => {
  if (fs.existsSync(path.join(__dirname, '..', file))) {
    logSuccess(`${file} exists`);
  } else {
    logError(`${file} is missing`);
  }
});

// 2. Validate app.config.js
console.log('\n📱 Validating app configuration...');
try {
  const appConfigPath = path.join(__dirname, '..', 'app.config.js');
  delete require.cache[require.resolve(appConfigPath)];
  const appConfig = require(appConfigPath);
  
  const config = appConfig.default || appConfig;
  const expo = config.expo;
  
  if (expo.version === '1.1.0') {
    logSuccess('App version is 1.1.0');
  } else {
    logError(`App version is ${expo.version}, expected 1.1.0`);
  }
  
  if (expo.android.versionCode === 2) {
    logSuccess('Android versionCode is 2');
  } else {
    logError(`Android versionCode is ${expo.android.versionCode}, expected 2`);
  }
  
  if (expo.ios.buildNumber === '2') {
    logSuccess('iOS buildNumber is 2');
  } else {
    logError(`iOS buildNumber is ${expo.ios.buildNumber}, expected 2`);
  }
  
} catch (error) {
  logError(`Failed to validate app.config.js: ${error.message}`);
}

// 3. Validate package.json
console.log('\n📦 Validating package.json...');
try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
  
  if (packageJson.version === '1.1.0') {
    logSuccess('Package version is 1.1.0');
  } else {
    logError(`Package version is ${packageJson.version}, expected 1.1.0`);
  }
  
  // Check for required dependencies
  const requiredDeps = [
    '@react-native-community/netinfo',
    '@tanstack/react-query',
    '@react-native-async-storage/async-storage',
    '@supabase/supabase-js',
    'expo-haptics'
  ];
  
  requiredDeps.forEach(dep => {
    if (packageJson.dependencies[dep]) {
      logSuccess(`Dependency ${dep} is installed`);
    } else {
      logError(`Missing dependency: ${dep}`);
    }
  });
  
} catch (error) {
  logError(`Failed to validate package.json: ${error.message}`);
}

// 4. Validate EAS configuration
console.log('\n🏗️  Validating EAS configuration...');
try {
  const easConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'eas.json'), 'utf8'));
  
  if (easConfig.build.preview) {
    logSuccess('Preview build profile exists');
    
    if (easConfig.build.preview.android.buildType === 'apk') {
      logSuccess('Preview profile configured for APK build');
    } else {
      logWarning(`Preview build type is ${easConfig.build.preview.android.buildType}, expected 'apk'`);
    }
  } else {
    logError('Preview build profile is missing');
  }
  
} catch (error) {
  logError(`Failed to validate eas.json: ${error.message}`);
}

// 5. Validate environment files
console.log('\n🌍 Validating environment configuration...');
try {
  const envProd = fs.readFileSync(path.join(__dirname, '..', '.env.production'), 'utf8');
  
  if (envProd.includes('EXPO_PUBLIC_APP_VERSION=1.1.0')) {
    logSuccess('Production environment has correct app version');
  } else {
    logError('Production environment missing or incorrect app version');
  }
  
  if (envProd.includes('EXPO_PUBLIC_BUILD_NUMBER=2')) {
    logSuccess('Production environment has correct build number');
  } else {
    logError('Production environment missing or incorrect build number');
  }
  
} catch (error) {
  logError(`Failed to validate .env.production: ${error.message}`);
}

// 6. Check for new features
console.log('\n🆕 Validating new features...');
const featureFiles = [
  'src/services/OfflineManager.ts',
  'src/hooks/useNetworkState.ts',
  'src/hooks/useOfflineQuery.ts',
  'src/components/OfflineSyncStatus.tsx',
  'src/utils/logger.ts'
];

featureFiles.forEach(file => {
  if (fs.existsSync(path.join(__dirname, '..', file))) {
    logSuccess(`New feature file ${file} exists`);
  } else {
    logError(`New feature file ${file} is missing`);
  }
});

// 7. Check test files
console.log('\n🧪 Checking test coverage...');
const testFiles = [
  'src/__tests__/utils/logger.test.ts',
  'src/__tests__/services/BiometricService.test.ts',
  'src/__tests__/hooks/useNetworkState.test.ts',
  'src/__tests__/services/OfflineManager.test.ts'
];

testFiles.forEach(file => {
  if (fs.existsSync(path.join(__dirname, '..', file))) {
    logSuccess(`Test file ${file} exists`);
  } else {
    logWarning(`Test file ${file} is missing (recommended)`);
  }
});

// 8. Final validation
console.log('\n📊 Validation Summary:');
if (hasErrors) {
  console.error('\n❌ Validation failed! Please fix the errors above before building.');
  process.exit(1);
} else {
  console.log('\n✅ All validations passed! Ready for build.');
  console.log('\n🚀 To build the APK, run:');
  console.log('   npx eas build --platform android --profile preview');
  console.log('\n📱 Build will be available at:');
  console.log('   https://expo.dev/accounts/[your-account]/projects/mintenance/builds');
}

console.log('\n🎯 Version 1.1.0 Features:');
console.log('   • Complete offline capabilities');
console.log('   • Smart network state management');
console.log('   • Automatic data synchronization');
console.log('   • Enhanced logging system');
console.log('   • Improved error handling');
console.log('   • Performance optimizations');
console.log('\n📝 Don\'t forget to update:');
console.log('   • Release notes');
console.log('   • App store descriptions');
console.log('   • User documentation');

console.log('\n✨ Happy building!');