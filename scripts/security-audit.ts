/**
 * Security Audit Script
 *
 * ⚠️ SECURITY CRITICAL: Automated security vulnerability scanner
 * Run this before deployment to check for security issues
 */

import * as fs from 'fs';
import * as path from 'path';

interface SecurityIssue {
  file: string;
  line: number;
  issue: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

class SecurityAuditor {
  private issues: SecurityIssue[] = [];

  /**
   * Run comprehensive security audit
   */
  async runAudit(): Promise<SecurityIssue[]> {
    console.log('🔍 Starting security audit...');

    // Check for exposed secrets
    await this.checkExposedSecrets();

    // Check for SQL injection vulnerabilities
    await this.checkSqlInjection();

    // Check for XSS vulnerabilities
    await this.checkXssVulnerabilities();

    // Check for insecure dependencies
    await this.checkDependencies();

    // Check for proper security headers
    await this.checkSecurityHeaders();

    // Check environment configuration
    await this.checkEnvironmentSecurity();

    return this.issues;
  }

  /**
   * Check for exposed API keys and secrets
   */
  private async checkExposedSecrets(): Promise<void> {
    console.log('🔑 Checking for exposed secrets...');

    const secretPatterns = [
      { pattern: /sk_live_[a-zA-Z0-9]+/, name: 'Stripe Live Secret Key' },
      { pattern: /pk_live_[a-zA-Z0-9]+/, name: 'Stripe Live Publishable Key' },
      { pattern: /AIza[0-9A-Za-z\\-_]{35}/, name: 'Google API Key' },
      { pattern: /AKIA[0-9A-Z]{16}/, name: 'AWS Access Key' },
      { pattern: /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/, name: 'UUID/API Key' },
      { pattern: /(?:password|passwd|pwd|secret|token|key)\s*[:=]\s*["\']?[a-zA-Z0-9!@#$%^&*()_+-=\[\]{}|;:,.<>?]+["\']?/i, name: 'Hardcoded Password/Secret' }
    ];

    const filesToCheck = await this.getSourceFiles();

    for (const file of filesToCheck) {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        for (const { pattern, name } of secretPatterns) {
          if (pattern.test(line)) {
            this.issues.push({
              file,
              line: i + 1,
              issue: `Exposed ${name}`,
              severity: 'critical',
              description: `Potential ${name} found in source code. This should be moved to server-side environment variables.`
            });
          }
        }
      }
    }
  }

  /**
   * Check for SQL injection vulnerabilities
   */
  private async checkSqlInjection(): Promise<void> {
    console.log('💉 Checking for SQL injection vulnerabilities...');

    const sqlPatterns = [
      { pattern: /\$\{[^}]*\}.*\.(query|exec|execute)/i, name: 'Template Literal SQL' },
      { pattern: /["\']?\s*\+\s*[a-zA-Z_][a-zA-Z0-9_]*\s*\+\s*["\']?\s*\)/i, name: 'String Concatenation in SQL' },
      { pattern: /\.query\s*\(\s*["\']?[^"']*["\']?\s*\+/i, name: 'Concatenated SQL Query' },
    ];

    const filesToCheck = await this.getSourceFiles();

    for (const file of filesToCheck) {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        for (const { pattern, name } of sqlPatterns) {
          if (pattern.test(line)) {
            this.issues.push({
              file,
              line: i + 1,
              issue: `Potential SQL Injection: ${name}`,
              severity: 'high',
              description: 'Use parameterized queries instead of string concatenation to prevent SQL injection.'
            });
          }
        }
      }
    }
  }

  /**
   * Check for XSS vulnerabilities
   */
  private async checkXssVulnerabilities(): Promise<void> {
    console.log('🚨 Checking for XSS vulnerabilities...');

    const xssPatterns = [
      { pattern: /dangerouslySetInnerHTML/i, name: 'Dangerous innerHTML' },
      { pattern: /innerHTML\s*=\s*[^;]+;/i, name: 'Direct innerHTML Assignment' },
      { pattern: /eval\s*\(/i, name: 'Eval Usage' },
      { pattern: /document\.write\s*\(/i, name: 'Document.write Usage' },
    ];

    const filesToCheck = await this.getSourceFiles();

    for (const file of filesToCheck) {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        for (const { pattern, name } of xssPatterns) {
          if (pattern.test(line)) {
            this.issues.push({
              file,
              line: i + 1,
              issue: `Potential XSS: ${name}`,
              severity: 'medium',
              description: 'This pattern may allow XSS attacks. Ensure proper input validation and sanitization.'
            });
          }
        }
      }
    }
  }

  /**
   * Check dependencies for known vulnerabilities
   */
  private async checkDependencies(): Promise<void> {
    console.log('📦 Checking dependencies...');

    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

      // Check for known vulnerable packages (this should be integrated with npm audit)
      const knownVulnerable = [
        'lodash@4.17.20', // Example vulnerable version
        'moment@2.29.1', // Example vulnerable version
      ];

      for (const [name, version] of Object.entries(dependencies)) {
        const depString = `${name}@${version}`;
        if (knownVulnerable.includes(depString)) {
          this.issues.push({
            file: 'package.json',
            line: 0,
            issue: `Vulnerable dependency: ${depString}`,
            severity: 'high',
            description: 'This dependency has known security vulnerabilities. Update to a secure version.'
          });
        }
      }
    } catch (error) {
      console.error('Error checking dependencies:', error);
    }
  }

  /**
   * Check for proper security headers
   */
  private async checkSecurityHeaders(): Promise<void> {
    console.log('🛡️ Checking security headers configuration...');

    // This would typically check server configuration files
    // For now, just check if security middleware is properly configured
    const securityFiles = [
      'src/middleware/SecurityMiddleware.ts',
      'src/config/security.ts',
      'src/utils/SecurityManager.ts'
    ];

    for (const file of securityFiles) {
      if (!fs.existsSync(file)) {
        this.issues.push({
          file,
          line: 0,
          issue: 'Missing security configuration',
          severity: 'medium',
          description: `Security configuration file ${file} is missing. Ensure proper security headers and middleware are configured.`
        });
      }
    }
  }

  /**
   * Check environment security
   */
  private async checkEnvironmentSecurity(): Promise<void> {
    console.log('⚙️ Checking environment security...');

    // Check if sensitive files are properly gitignored
    const gitignore = fs.readFileSync('.gitignore', 'utf8');
    const requiredIgnores = ['.env', '.env.local', '.env.server', '*.key', '*.pem'];

    for (const ignore of requiredIgnores) {
      if (!gitignore.includes(ignore)) {
        this.issues.push({
          file: '.gitignore',
          line: 0,
          issue: `Missing gitignore entry: ${ignore}`,
          severity: 'high',
          description: `Sensitive file pattern ${ignore} is not in .gitignore. This could expose secrets.`
        });
      }
    }

    // Check if .env files contain production secrets
    if (fs.existsSync('.env')) {
      const envContent = fs.readFileSync('.env', 'utf8');
      const productionPatterns = [
        /sk_live_/,
        /pk_live_/,
        /production/i
      ];

      for (const pattern of productionPatterns) {
        if (pattern.test(envContent)) {
          this.issues.push({
            file: '.env',
            line: 0,
            issue: 'Production secrets in development .env',
            severity: 'critical',
            description: 'Production secrets found in .env file. Use separate environment files for different environments.'
          });
        }
      }
    }
  }

  /**
   * Get all source files to check
   */
  private async getSourceFiles(): Promise<string[]> {
    const extensions = ['.ts', '.tsx', '.js', '.jsx'];
    const directories = ['src/', 'scripts/'];
    const files: string[] = [];

    const scanDirectory = (dir: string) => {
      if (!fs.existsSync(dir)) return;

      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory() && !item.includes('node_modules') && !item.includes('.git')) {
          scanDirectory(fullPath);
        } else if (stat.isFile() && extensions.some(ext => item.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    };

    for (const dir of directories) {
      scanDirectory(dir);
    }

    return files;
  }

  /**
   * Generate security report
   */
  generateReport(): string {
    const severityCounts = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };

    for (const issue of this.issues) {
      severityCounts[issue.severity]++;
    }

    let report = '\n🔒 SECURITY AUDIT REPORT\n';
    report += '========================\n\n';

    report += `Total Issues Found: ${this.issues.length}\n`;
    report += `Critical: ${severityCounts.critical}\n`;
    report += `High: ${severityCounts.high}\n`;
    report += `Medium: ${severityCounts.medium}\n`;
    report += `Low: ${severityCounts.low}\n\n`;

    if (this.issues.length === 0) {
      report += '✅ No security issues found!\n';
    } else {
      report += 'ISSUES FOUND:\n';
      report += '=============\n\n';

      for (const issue of this.issues) {
        const severity = issue.severity.toUpperCase();
        report += `[${severity}] ${issue.issue}\n`;
        report += `File: ${issue.file}:${issue.line}\n`;
        report += `Description: ${issue.description}\n\n`;
      }
    }

    return report;
  }
}

// Run the audit if this script is executed directly
if (require.main === module) {
  const auditor = new SecurityAuditor();
  auditor.runAudit().then(issues => {
    const report = auditor.generateReport();
    console.log(report);

    // Write report to file
    fs.writeFileSync('security-audit-report.txt', report);

    // Exit with error code if critical issues found
    const criticalIssues = issues.filter(issue => issue.severity === 'critical');
    if (criticalIssues.length > 0) {
      console.error(`\n🚨 CRITICAL SECURITY ISSUES FOUND: ${criticalIssues.length}`);
      process.exit(1);
    }
  });
}

export default SecurityAuditor;