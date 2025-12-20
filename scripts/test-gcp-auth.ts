#!/usr/bin/env tsx
/**
 * Test GCP Authentication Setup
 * 
 * Run this script to verify your GCP authentication is working correctly.
 * 
 * Prerequisites:
 * 1. Run: gcloud auth application-default login
 * 2. Set GOOGLE_CLOUD_PROJECT_ID in .env.local
 */

// Load environment variables from .env.local FIRST, before any other imports
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local from apps/web directory BEFORE importing config
config({ path: resolve(__dirname, '../apps/web/.env.local') });

// Now import config modules (they will read from process.env which is now populated)
import { GCPAuthService } from '../apps/web/lib/services/gcp/GCPAuthService';
import { gcpConfig } from '../apps/web/lib/config/gcp.config';

async function main() {
  console.log('🔐 Testing GCP Authentication Setup\n');
  console.log('='.repeat(50));
  console.log(`Project ID: ${gcpConfig.projectId || 'NOT SET'}`);
  console.log(`Region: ${gcpConfig.region}`);
  console.log('='.repeat(50) + '\n');

  // Validate config
  const configValidation = gcpConfig.validate();
  if (!configValidation.valid) {
    console.error('❌ Configuration errors:');
    configValidation.errors.forEach((error) => console.error(`   - ${error}`));
    console.error('\n💡 Set GOOGLE_CLOUD_PROJECT_ID in .env.local');
    process.exit(1);
  }

  // Run all tests
  const results = await GCPAuthService.runAllTests();

  // Display results
  console.log('\n📊 Test Results:\n');

  // Auth test
  console.log('1️⃣  Authentication Test:');
  if (results.auth.success) {
    console.log('   ✅ PASSED');
    console.log(`   Project: ${results.auth.projectId}`);
    console.log(`   Method: ${results.auth.method}`);
  } else {
    console.log('   ❌ FAILED');
    console.log(`   Error: ${results.auth.error}`);
    console.log('\n💡 Try running: gcloud auth application-default login');
  }

  // Storage test
  console.log('\n2️⃣  Storage Access Test:');
  if (results.storage.success) {
    console.log('   ✅ PASSED');
    if (results.storage.buckets && results.storage.buckets.length > 0) {
      console.log(`   Found ${results.storage.buckets.length} buckets:`);
      results.storage.buckets.forEach((bucket) => {
        console.log(`     - ${bucket}`);
      });
    } else {
      console.log('   No buckets found (this is OK if you haven\'t created any)');
    }
  } else {
    console.log('   ❌ FAILED');
    console.log(`   Error: ${results.storage.error}`);
  }

  // Vertex AI test
  console.log('\n3️⃣  Vertex AI Access Test:');
  if (results.vertexAI.success) {
    console.log('   ✅ PASSED');
    console.log('   Vertex AI API access verified');
  } else {
    console.log('   ❌ FAILED');
    console.log(`   Error: ${results.vertexAI.error}`);
    console.log('\n💡 Ensure Vertex AI API is enabled in your project');
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  const allPassed =
    results.auth.success && results.storage.success && results.vertexAI.success;

  if (allPassed) {
    console.log('🎉 All tests passed! GCP authentication is configured correctly.');
    console.log('\n✅ You can now use GCP services for ML training.');
  } else {
    console.log('⚠️  Some tests failed. Please fix the issues above.');
    console.log('\n📚 Next steps:');
    console.log('   1. Run: gcloud auth application-default login');
    console.log('   2. Verify: gcloud config get-value project');
    console.log('   3. Enable APIs: Vertex AI, Cloud Storage');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('\n❌ Unexpected error:', error);
  process.exit(1);
});

