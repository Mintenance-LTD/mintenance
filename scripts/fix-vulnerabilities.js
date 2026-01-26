#!/usr/bin/env node

/**
 * Script to fix known security vulnerabilities in dependencies
 * Run this after npm audit to address specific issues
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔒 Starting vulnerability fixes...\n');

// Known vulnerabilities and their fixes
const vulnerabilityFixes = {
  // Critical vulnerability
  'jspdf': {
    severity: 'critical',
    currentVersion: '3.0.4',
    fixedVersion: '^3.0.5',
    description: 'Local File Inclusion/Path Traversal vulnerability',
    package: 'apps/web/package.json',
  },

  // High severity vulnerabilities
  '@sentry/browser': {
    severity: 'high',
    currentVersion: '<7.119.1',
    fixedVersion: '^7.119.1',
    description: 'Prototype Pollution gadget',
    package: 'apps/mobile/package.json',
  },

  'vite': {
    severity: 'high',
    currentVersion: '<=6.1.6',
    fixedVersion: '^6.1.7',
    description: 'Server-side request vulnerability',
    packages: [
      'packages/api-services/package.json',
      'packages/auth-unified/package.json',
      'packages/security/package.json',
    ],
  },

  'esbuild': {
    severity: 'high',
    currentVersion: '<=0.24.2',
    fixedVersion: '^0.24.3',
    description: 'Development server request vulnerability',
    packages: [
      'packages/api-services/package.json',
      'packages/auth-unified/package.json',
      'packages/security/package.json',
    ],
  },

  'node-fetch': {
    severity: 'high',
    currentVersion: '<2.6.7',
    fixedVersion: '^2.6.7',
    description: 'Multiple vulnerabilities',
    package: 'node_modules/isomorphic-fetch/package.json',
  },
};

// Helper function to update package.json
function updatePackageJson(filePath, packageName, newVersion) {
  try {
    const fullPath = path.resolve(filePath);
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  File not found: ${fullPath}`);
      return false;
    }

    const packageJson = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    let updated = false;

    // Check dependencies
    if (packageJson.dependencies && packageJson.dependencies[packageName]) {
      packageJson.dependencies[packageName] = newVersion;
      updated = true;
    }

    // Check devDependencies
    if (packageJson.devDependencies && packageJson.devDependencies[packageName]) {
      packageJson.devDependencies[packageName] = newVersion;
      updated = true;
    }

    // Check peerDependencies
    if (packageJson.peerDependencies && packageJson.peerDependencies[packageName]) {
      packageJson.peerDependencies[packageName] = newVersion;
      updated = true;
    }

    if (updated) {
      fs.writeFileSync(fullPath, JSON.stringify(packageJson, null, 2) + '\n');
      console.log(`✅ Updated ${packageName} to ${newVersion} in ${filePath}`);
      return true;
    } else {
      console.log(`ℹ️  ${packageName} not found in ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
    return false;
  }
}

// Main fix function
async function fixVulnerabilities() {
  let fixCount = 0;

  console.log('📋 Fixing known vulnerabilities:\n');

  for (const [packageName, fix] of Object.entries(vulnerabilityFixes)) {
    console.log(`\n🔧 Fixing ${packageName} (${fix.severity} severity)`);
    console.log(`   Issue: ${fix.description}`);

    if (fix.package) {
      // Single package file
      if (updatePackageJson(fix.package, packageName, fix.fixedVersion)) {
        fixCount++;
      }
    } else if (fix.packages) {
      // Multiple package files
      for (const pkgFile of fix.packages) {
        if (updatePackageJson(pkgFile, packageName, fix.fixedVersion)) {
          fixCount++;
        }
      }
    }
  }

  console.log(`\n✅ Fixed ${fixCount} vulnerabilities\n`);

  // Run npm install to update lock file
  console.log('📦 Updating dependencies...\n');
  try {
    execSync('npm install', { stdio: 'inherit' });
    console.log('✅ Dependencies updated successfully\n');
  } catch (error) {
    console.error('❌ Error updating dependencies:', error.message);
  }

  // Run audit again to verify fixes
  console.log('🔍 Running security audit to verify fixes...\n');
  try {
    const auditResult = execSync('npm audit --json', { encoding: 'utf8' });
    const audit = JSON.parse(auditResult);

    console.log('📊 Audit Results:');
    console.log(`   Total: ${audit.metadata.vulnerabilities.total}`);
    console.log(`   Critical: ${audit.metadata.vulnerabilities.critical}`);
    console.log(`   High: ${audit.metadata.vulnerabilities.high}`);
    console.log(`   Moderate: ${audit.metadata.vulnerabilities.moderate}`);
    console.log(`   Low: ${audit.metadata.vulnerabilities.low}`);

    if (audit.metadata.vulnerabilities.critical === 0) {
      console.log('\n✅ No critical vulnerabilities!');
    } else {
      console.log(`\n⚠️  ${audit.metadata.vulnerabilities.critical} critical vulnerabilities remain`);
    }

    if (audit.metadata.vulnerabilities.high === 0) {
      console.log('✅ No high severity vulnerabilities!');
    } else {
      console.log(`⚠️  ${audit.metadata.vulnerabilities.high} high severity vulnerabilities remain`);
    }
  } catch (error) {
    // npm audit returns non-zero exit code when vulnerabilities exist
    console.log('ℹ️  Audit completed (vulnerabilities may still exist)');
  }
}

// Additional security recommendations
function printRecommendations() {
  console.log('\n📌 Additional Security Recommendations:\n');
  console.log('1. Regular Updates:');
  console.log('   - Run "npm audit" weekly');
  console.log('   - Update dependencies monthly');
  console.log('   - Monitor security advisories');
  console.log('');
  console.log('2. Automated Scanning:');
  console.log('   - Enable GitHub Dependabot');
  console.log('   - Set up Snyk monitoring');
  console.log('   - Use npm audit in CI/CD');
  console.log('');
  console.log('3. Best Practices:');
  console.log('   - Use exact versions in production');
  console.log('   - Review dependency licenses');
  console.log('   - Minimize dependency count');
  console.log('   - Use npm ci for production installs');
  console.log('');
  console.log('4. Emergency Response:');
  console.log('   - Have a security incident plan');
  console.log('   - Know how to quickly patch/deploy');
  console.log('   - Maintain security contacts');
}

// Create npm scripts for security
function createSecurityScripts() {
  console.log('\n📝 Recommended package.json scripts:\n');
  console.log(JSON.stringify({
    "scripts": {
      "security:audit": "npm audit",
      "security:fix": "npm audit fix",
      "security:fix-force": "npm audit fix --force",
      "security:check": "npm audit --audit-level=high",
      "security:report": "npm audit --json > security-audit.json",
      "security:update": "node scripts/fix-vulnerabilities.js",
      "precommit": "npm run security:check",
      "prepush": "npm run security:check"
    }
  }, null, 2));
}

// Main execution
async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('   🔒 Security Vulnerability Fix Script');
  console.log('═══════════════════════════════════════════\n');

  await fixVulnerabilities();
  printRecommendations();
  createSecurityScripts();

  console.log('\n✨ Security fix process complete!');
  console.log('═══════════════════════════════════════════');
}

// Run the script
main().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});