#!/usr/bin/env node

/**
 * Deployment Verification Script
 * Checks that the deployed site has all required security headers and functionality
 */

const https = require('https');

const SITE_URL = process.env.SITE_URL || 'https://mintenance.co.uk';

const REQUIRED_HEADERS = {
  'content-security-policy': true,
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'strict-transport-security': true,
  'referrer-policy': true,
  'permissions-policy': true,
};

const CRITICAL_PATHS = [
  '/',
  '/login',
  '/register',
  '/api/health',
];

function checkHeaders(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const headers = res.headers;
      const issues = [];

      console.log(`\n✓ Checking headers for: ${url}`);
      
      Object.entries(REQUIRED_HEADERS).forEach(([header, expectedValue]) => {
        const actualValue = headers[header.toLowerCase()];
        
        if (!actualValue) {
          issues.push(`❌ Missing header: ${header}`);
        } else if (expectedValue !== true && !actualValue.includes(expectedValue)) {
          issues.push(`⚠️  Header ${header} has unexpected value: ${actualValue}`);
        } else {
          console.log(`  ✓ ${header}: ${actualValue.substring(0, 50)}${actualValue.length > 50 ? '...' : ''}`);
        }
      });

      resolve({ url, status: res.statusCode, issues });
    }).on('error', reject);
  });
}

async function verifyDeployment() {
  console.log('🔍 Verifying deployment...\n');
  console.log(`Site URL: ${SITE_URL}`);

  const results = [];
  
  for (const path of CRITICAL_PATHS) {
    try {
      const result = await checkHeaders(`${SITE_URL}${path}`);
      results.push(result);
      
      if (result.status !== 200 && result.status !== 404) {
        console.log(`⚠️  Unexpected status code: ${result.status}`);
      }
    } catch (error) {
      console.error(`❌ Failed to check ${path}:`, error.message);
      results.push({ url: `${SITE_URL}${path}`, status: 'error', issues: [error.message] });
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('='.repeat(60));

  const totalIssues = results.reduce((sum, r) => sum + (r.issues?.length || 0), 0);
  
  if (totalIssues === 0) {
    console.log('✅ All checks passed! Deployment is verified.');
    process.exit(0);
  } else {
    console.log(`❌ Found ${totalIssues} issue(s):`);
    results.forEach(result => {
      if (result.issues && result.issues.length > 0) {
        console.log(`\n${result.url}:`);
        result.issues.forEach(issue => console.log(`  ${issue}`));
      }
    });
    process.exit(1);
  }
}

verifyDeployment().catch(error => {
  console.error('❌ Verification failed:', error);
  process.exit(1);
});
