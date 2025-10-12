#!/usr/bin/env node

/**
 * Comprehensive Security Audit Script for Mintenance
 * 
 * This script performs automated security checks including:
 * - Dependency vulnerability scanning
 * - Code security analysis
 * - Configuration security review
 * - Database security checks
 * - API security validation
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class SecurityAuditor {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.recommendations = [];
    this.score = 100;
  }

  log(level, message, details = null) {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, level, message, details };
    
    switch (level) {
      case 'error':
        this.issues.push(logEntry);
        this.score -= 10;
        console.error(`❌ ${message}`);
        break;
      case 'warning':
        this.warnings.push(logEntry);
        this.score -= 5;
        console.warn(`⚠️  ${message}`);
        break;
      case 'info':
        console.log(`ℹ️  ${message}`);
        break;
      case 'success':
        console.log(`✅ ${message}`);
        break;
    }
  }

  getAllFiles(dirPath, extensions = []) {
    const files = [];
    
    function traverse(currentPath) {
      try {
        const items = fs.readdirSync(currentPath);
        
        for (const item of items) {
          const fullPath = path.join(currentPath, item);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            // Skip node_modules and other common directories
            if (!['node_modules', '.git', '.next', 'dist', 'build'].includes(item)) {
              traverse(fullPath);
            }
          } else if (stat.isFile()) {
            // Check if file has one of the target extensions
            if (extensions.length === 0 || extensions.some(ext => item.endsWith(ext))) {
              files.push(fullPath);
            }
          }
        }
      } catch (error) {
        // Skip directories that can't be read
      }
    }
    
    traverse(dirPath);
    return files;
  }

  async runAudit() {
    console.log('🔒 Starting Security Audit for Mintenance...\n');
    
    await this.checkDependencies();
    await this.checkCodeSecurity();
    await this.checkConfiguration();
    await this.checkDatabaseSecurity();
    await this.checkAPISecurity();
    await this.checkAuthentication();
    await this.checkAuthorization();
    await this.checkDataProtection();
    
    this.generateReport();
  }

  async checkDependencies() {
    this.log('info', 'Checking dependencies for vulnerabilities...');
    
    try {
      // Check npm audit - capture both stdout and stderr, ignore exit code
      const auditResult = execSync('npm audit --json', { 
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      const audit = JSON.parse(auditResult);
      
      if (audit.metadata && audit.metadata.vulnerabilities) {
        if (audit.metadata.vulnerabilities.high > 0) {
          this.log('error', `High severity vulnerabilities found: ${audit.metadata.vulnerabilities.high}`);
        }
        
        if (audit.metadata.vulnerabilities.moderate > 0) {
          this.log('warning', `Moderate severity vulnerabilities found: ${audit.metadata.vulnerabilities.moderate}`);
        }
        
        if (audit.metadata.vulnerabilities.total === 0) {
          this.log('success', 'No dependency vulnerabilities found');
        }
      } else {
        this.log('info', 'npm audit completed - check output for details');
      }
    } catch (error) {
      // npm audit exits with non-zero when vulnerabilities are found
      // Parse the error output as JSON to get the actual results
      try {
        const auditData = JSON.parse(error.stdout || error.stderr || '{}');
        if (auditData.metadata && auditData.metadata.vulnerabilities) {
          if (auditData.metadata.vulnerabilities.high > 0) {
            this.log('error', `High severity vulnerabilities found: ${auditData.metadata.vulnerabilities.high}`);
          }
          if (auditData.metadata.vulnerabilities.moderate > 0) {
            this.log('warning', `Moderate severity vulnerabilities found: ${auditData.metadata.vulnerabilities.moderate}`);
          }
          if (auditData.metadata.vulnerabilities.total === 0) {
            this.log('success', 'No dependency vulnerabilities found');
          }
        } else {
          this.log('warning', 'Could not parse npm audit results', error.message);
        }
      } catch (parseError) {
        this.log('warning', 'Could not run npm audit', error.message);
      }
    }

    // Check for outdated packages
    try {
      const outdated = execSync('npm outdated --json', { 
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      const outdatedPackages = JSON.parse(outdated);
      
      if (Object.keys(outdatedPackages).length > 0) {
        this.log('warning', `${Object.keys(outdatedPackages).length} outdated packages found`);
        this.recommendations.push('Update outdated packages to latest versions');
      }
    } catch (error) {
      // npm outdated exits with non-zero when packages are outdated
      // Parse the error output as JSON to get the actual results
      try {
        const outdatedData = JSON.parse(error.stdout || error.stderr || '{}');
        if (Object.keys(outdatedData).length > 0) {
          this.log('warning', `${Object.keys(outdatedData).length} outdated packages found`);
          this.recommendations.push('Update outdated packages to latest versions');
        } else {
          this.log('success', 'All packages are up to date');
        }
      } catch (parseError) {
        this.log('warning', 'Could not check outdated packages', error.message);
      }
    }
  }

  async checkCodeSecurity() {
    this.log('info', 'Analyzing code for security issues...');
    
    // Check for hardcoded secrets
    const secretPatterns = [
      /password\s*=\s*['"][^'"]+['"]/gi,
      /api[_-]?key\s*=\s*['"][^'"]+['"]/gi,
      /secret\s*=\s*['"][^'"]+['"]/gi,
      /token\s*=\s*['"][^'"]+['"]/gi,
    ];
    
    // Skip test files and test-specific patterns
    const testPatterns = [
      /test/gi,
      /spec/gi,
      /mock/gi,
      /jest\.env\.js/gi,
      /__tests__/gi,
      /\.test\./gi,
      /\.spec\./gi,
    ];
    
    const filesToCheck = [
      'apps/web',
      'apps/mobile',
      'packages',
    ];
    
    let foundSecrets = false;
    
    // Use Node.js file system instead of grep for Windows compatibility
    for (const dir of filesToCheck) {
      if (fs.existsSync(dir)) {
        const files = this.getAllFiles(dir, ['.ts', '.tsx', '.js', '.jsx']);
        for (const file of files) {
          // Skip test files
          if (testPatterns.some(pattern => pattern.test(file))) {
            continue;
          }
          
          try {
            const content = fs.readFileSync(file, 'utf8');
            for (const pattern of secretPatterns) {
              if (pattern.test(content)) {
                foundSecrets = true;
                this.log('error', `Potential hardcoded secret found in ${file}`);
              }
            }
          } catch (error) {
            // Skip files that can't be read
          }
        }
      }
    }
    
    if (!foundSecrets) {
      this.log('success', 'No hardcoded secrets detected');
    }

    // Check for unsafe eval usage
    const unsafePatterns = [
      /eval\s*\(/gi,
      /new\s+Function\s*\(/gi,
      /setTimeout\s*\([^,]*,\s*['"][^'"]*['"]/gi,
      /setInterval\s*\([^,]*,\s*['"][^'"]*['"]/gi,
    ];
    
    let foundUnsafePatterns = false;
    for (const dir of filesToCheck) {
      if (fs.existsSync(dir)) {
        const files = this.getAllFiles(dir, ['.ts', '.tsx', '.js', '.jsx']);
        for (const file of files) {
          // Skip test files
          if (testPatterns.some(pattern => pattern.test(file))) {
            continue;
          }
          
          try {
            const content = fs.readFileSync(file, 'utf8');
            for (const pattern of unsafePatterns) {
              if (pattern.test(content)) {
                foundUnsafePatterns = true;
                this.log('warning', `Potentially unsafe code execution pattern found in ${file}`);
              }
            }
          } catch (error) {
            // Skip files that can't be read
          }
        }
      }
    }
    
    if (foundUnsafePatterns) {
      this.recommendations.push('Review and replace unsafe eval/Function usage');
    }
  }

  async checkConfiguration() {
    this.log('info', 'Reviewing security configuration...');
    
    // Check Next.js security headers
    const nextConfigPath = 'apps/web/next.config.js';
    if (fs.existsSync(nextConfigPath)) {
      const nextConfig = fs.readFileSync(nextConfigPath, 'utf8');
      
      if (!nextConfig.includes('Content-Security-Policy')) {
        this.log('error', 'Content Security Policy not configured');
      } else {
        this.log('success', 'Content Security Policy configured');
      }
      
      if (!nextConfig.includes('X-Frame-Options')) {
        this.log('warning', 'X-Frame-Options header not set');
      }
      
      if (!nextConfig.includes('Strict-Transport-Security')) {
        this.log('warning', 'HSTS header not configured');
      }
    }

    // Check environment variables
    const envFiles = ['.env', '.env.local', '.env.production'];
    let jwtSecretFound = false;
    
    for (const envFile of envFiles) {
      if (fs.existsSync(envFile)) {
        const envContent = fs.readFileSync(envFile, 'utf8');
        
        if (envContent.includes('JWT_SECRET=') && !envContent.includes('JWT_SECRET=your-secret-key')) {
          jwtSecretFound = true;
          break;
        }
      }
    }
    
    // Also check if JWT_SECRET is set in environment
    if (!jwtSecretFound && process.env.JWT_SECRET && process.env.JWT_SECRET !== 'your-secret-key') {
      jwtSecretFound = true;
    }
    
    if (jwtSecretFound) {
      this.log('success', 'JWT secret configured');
    } else {
      this.log('warning', 'JWT secret not properly configured');
    }
  }

  async checkDatabaseSecurity() {
    this.log('info', 'Checking database security...');
    
    // Check RLS policies
    const migrationFiles = fs.readdirSync('supabase/migrations').filter(f => f.endsWith('.sql'));
    let hasRLS = false;
    
    for (const file of migrationFiles) {
      const content = fs.readFileSync(path.join('supabase/migrations', file), 'utf8');
      
      if (content.includes('ROW LEVEL SECURITY') || content.includes('ENABLE ROW LEVEL SECURITY')) {
        hasRLS = true;
        break;
      }
    }
    
    if (hasRLS) {
      this.log('success', 'Row Level Security policies found');
    } else {
      this.log('error', 'No Row Level Security policies detected');
    }

    // Check for admin functions
    let hasAdminFunctions = false;
    for (const file of migrationFiles) {
      const content = fs.readFileSync(path.join('supabase/migrations', file), 'utf8');
      
      if (content.includes('SECURITY DEFINER') && content.includes('is_admin')) {
        hasAdminFunctions = true;
        break;
      }
    }
    
    if (hasAdminFunctions) {
      this.log('success', 'Admin security functions found');
    } else {
      this.log('warning', 'Admin security functions not detected');
    }
  }

  async checkAPISecurity() {
    this.log('info', 'Validating API security...');
    
    // Check for input validation
    const apiFiles = fs.readdirSync('apps/web/app/api', { recursive: true })
      .filter(f => f.endsWith('.ts'))
      .map(f => path.join('apps/web/app/api', f));
    
    let hasValidation = false;
    
    for (const file of apiFiles) {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        
        if (content.includes('zod') || content.includes('sanitize') || content.includes('validate')) {
          hasValidation = true;
          break;
        }
      }
    }
    
    if (hasValidation) {
      this.log('success', 'Input validation found in API routes');
    } else {
      this.log('warning', 'Input validation not detected in API routes');
    }

    // Check for rate limiting
    let hasRateLimiting = false;
    for (const file of apiFiles) {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        
        if (content.includes('rate') && content.includes('limit')) {
          hasRateLimiting = true;
          break;
        }
      }
    }
    
    if (hasRateLimiting) {
      this.log('success', 'Rate limiting implemented');
    } else {
      this.log('warning', 'Rate limiting not detected');
    }
  }

  async checkAuthentication() {
    this.log('info', 'Reviewing authentication security...');
    
    // Check JWT implementation
    const authFiles = [
      'apps/web/lib/auth.ts',
      'packages/auth/src/jwt.ts',
    ];
    
    let hasJWT = false;
    for (const file of authFiles) {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        if (content.includes('jwt') || content.includes('JWT')) {
          hasJWT = true;
          break;
        }
      }
    }
    
    if (hasJWT) {
      this.log('success', 'JWT authentication implemented');
    } else {
      this.log('error', 'JWT authentication not found');
    }

    // Check for token rotation
    const authManagerPath = 'apps/web/lib/auth-manager.ts';
    if (fs.existsSync(authManagerPath)) {
      const content = fs.readFileSync(authManagerPath, 'utf8');
      if (content.includes('refresh') && content.includes('token')) {
        this.log('success', 'Token rotation implemented');
      } else {
        this.log('warning', 'Token rotation not detected');
      }
    }
  }

  async checkAuthorization() {
    this.log('info', 'Checking authorization controls...');
    
    // Check for role-based access
    const middlewarePath = 'apps/web/middleware.ts';
    if (fs.existsSync(middlewarePath)) {
      const content = fs.readFileSync(middlewarePath, 'utf8');
      
      if (content.includes('role') || content.includes('admin')) {
        this.log('success', 'Role-based authorization found');
      } else {
        this.log('warning', 'Role-based authorization not detected');
      }
    }

    // Check for admin endpoints
    const adminApiPath = 'apps/web/app/api/admin';
    if (fs.existsSync(adminApiPath)) {
      this.log('success', 'Admin API endpoints found');
    } else {
      this.log('info', 'No admin API endpoints detected');
    }
  }

  async checkDataProtection() {
    this.log('info', 'Checking data protection measures...');
    
    // Check for GDPR compliance
    const gdprApiPath = 'apps/web/app/api/gdpr';
    if (fs.existsSync(gdprApiPath)) {
      this.log('success', 'GDPR compliance endpoints found');
    } else {
      this.log('warning', 'GDPR compliance endpoints not found');
    }

    // Check for data encryption
    const cryptoPatterns = [
      /crypto/gi,
      /encrypt/gi,
      /hash/gi,
      /bcrypt/gi,
      /jwt/gi,
    ];
    
    let foundCrypto = false;
    const cryptoDirs = ['apps/web', 'apps/mobile', 'packages'];
    
    for (const dir of cryptoDirs) {
      if (fs.existsSync(dir)) {
        const files = this.getAllFiles(dir, ['.ts', '.tsx', '.js', '.jsx']);
        for (const file of files) {
          try {
            const content = fs.readFileSync(file, 'utf8');
            for (const pattern of cryptoPatterns) {
              if (pattern.test(content)) {
                foundCrypto = true;
                break;
              }
            }
            if (foundCrypto) break;
          } catch (error) {
            // Skip files that can't be read
          }
        }
        if (foundCrypto) break;
      }
    }
    
    if (foundCrypto) {
      this.log('success', 'Cryptographic functions detected');
    } else {
      this.log('warning', 'No cryptographic functions detected');
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('🔒 SECURITY AUDIT REPORT');
    console.log('='.repeat(60));
    
    console.log(`\n📊 Security Score: ${Math.max(0, this.score)}/100`);
    
    if (this.issues.length > 0) {
      console.log(`\n❌ Critical Issues (${this.issues.length}):`);
      this.issues.forEach(issue => {
        console.log(`   • ${issue.message}`);
        if (issue.details) {
          console.log(`     Details: ${issue.details}`);
        }
      });
    }
    
    if (this.warnings.length > 0) {
      console.log(`\n⚠️  Warnings (${this.warnings.length}):`);
      this.warnings.forEach(warning => {
        console.log(`   • ${warning.message}`);
      });
    }
    
    if (this.recommendations.length > 0) {
      console.log(`\n💡 Recommendations:`);
      this.recommendations.forEach(rec => {
        console.log(`   • ${rec}`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
    
    // Save report to file
    const report = {
      timestamp: new Date().toISOString(),
      score: Math.max(0, this.score),
      issues: this.issues,
      warnings: this.warnings,
      recommendations: this.recommendations,
    };
    
    fs.writeFileSync('security-audit-report.json', JSON.stringify(report, null, 2));
    console.log('\n📄 Report saved to: security-audit-report.json');
    
    // Exit with appropriate code
    if (this.issues.length > 0) {
      process.exit(1);
    } else if (this.warnings.length > 5) {
      process.exit(2);
    } else {
      process.exit(0);
    }
  }
}

// Run the audit
const auditor = new SecurityAuditor();
auditor.runAudit().catch(error => {
  console.error('Audit failed:', error);
  process.exit(1);
});
