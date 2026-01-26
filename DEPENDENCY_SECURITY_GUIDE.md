# Dependency Security Management Guide

## Overview
This guide covers dependency vulnerability management for the Mintenance codebase, addressing OWASP A06:2021 - Vulnerable and Outdated Components.

## Current Security Status

### Vulnerability Summary (as of January 2026)
```
Total: 14 vulnerabilities
- Critical: 1 (jsPDF)
- High: 5 (Sentry, Vite, ESBuild, Node-fetch)
- Moderate: 8
- Low: 0
```

### Critical Vulnerabilities
| Package | Severity | Issue | Fix Version |
|---------|----------|-------|-------------|
| jspdf | Critical | Local File Inclusion/Path Traversal | >=3.0.5 |

### High Severity Vulnerabilities
| Package | Severity | Issue | Fix Version |
|---------|----------|-------|-------------|
| @sentry/browser | High | Prototype Pollution | >=7.119.1 |
| vite | High | Dev server vulnerability | >=6.1.7 |
| esbuild | High | Request forgery | >=0.24.3 |
| node-fetch | High | Multiple issues | >=2.6.7 |

## Automated Security Scanning

### 1. GitHub Actions Workflow
**File**: `.github/workflows/security-scanning.yml`

**Features**:
- Daily automated scans
- Multiple security tools integration
- PR blocking for critical issues
- Security report generation

**Tools Integrated**:
1. **npm audit** - Native Node.js vulnerability scanning
2. **Snyk** - Advanced vulnerability detection
3. **OWASP Dependency Check** - Comprehensive CVE scanning
4. **CodeQL** - Static code analysis
5. **TruffleHog** - Secret scanning
6. **Gitleaks** - Git history secret detection
7. **License Checker** - License compliance

### 2. Local Security Commands

```bash
# Check for vulnerabilities
npm audit

# Fix automatically (safe)
npm audit fix

# Fix with breaking changes (careful!)
npm audit fix --force

# Check specific severity level
npm audit --audit-level=high

# Generate JSON report
npm audit --json > audit-report.json

# Run custom fix script
node scripts/fix-vulnerabilities.js
```

## Manual Vulnerability Fixes

### Step 1: Identify Vulnerabilities
```bash
npm audit
```

### Step 2: Review Impact
```bash
# Check which packages depend on vulnerable package
npm ls [package-name]

# Example:
npm ls jspdf
```

### Step 3: Update Package
```bash
# Update specific package
npm update [package-name]

# Or manually edit package.json and run
npm install
```

### Step 4: Test Application
```bash
# Run tests
npm test

# Build application
npm run build

# Run E2E tests
npm run test:e2e
```

### Step 5: Verify Fix
```bash
npm audit
```

## Security Best Practices

### 1. Dependency Management

#### DO's ✅
- Use exact versions in production (`1.2.3` not `^1.2.3`)
- Review changelogs before major updates
- Use `npm ci` for production installs
- Keep dependencies minimal
- Audit new packages before adding
- Use lock files (package-lock.json)
- Regular security audits (weekly)

#### DON'Ts ❌
- Don't ignore security warnings
- Don't use deprecated packages
- Don't install from untrusted sources
- Don't use packages with no recent updates
- Don't skip security checks in CI/CD
- Don't use `--force` without review

### 2. Package Selection Criteria

Before adding a new dependency, check:
- [ ] Weekly downloads > 10,000
- [ ] Last update < 6 months ago
- [ ] No known vulnerabilities
- [ ] Appropriate license (MIT, Apache, BSD)
- [ ] Maintained by reputable source
- [ ] Size appropriate for use case
- [ ] Has security policy
- [ ] TypeScript support (preferred)

### 3. Security Update Schedule

| Frequency | Action |
|-----------|--------|
| Daily | Automated security scans (CI/CD) |
| Weekly | Manual `npm audit` review |
| Bi-weekly | Update patch versions |
| Monthly | Update minor versions |
| Quarterly | Major version updates |
| Emergency | Critical vulnerability patches |

## Vulnerability Response Plan

### Severity Levels and Response Times

| Severity | CVSS Score | Response Time | Action |
|----------|------------|---------------|--------|
| Critical | 9.0-10.0 | Immediate | Emergency patch |
| High | 7.0-8.9 | 24 hours | Priority fix |
| Medium | 4.0-6.9 | 1 week | Scheduled update |
| Low | 0.1-3.9 | 1 month | Regular maintenance |

### Emergency Response Process

1. **Detection** (0-15 minutes)
   ```bash
   npm audit
   # Check specific package
   npm ls [vulnerable-package]
   ```

2. **Assessment** (15-30 minutes)
   - Review vulnerability details
   - Check exposure in production
   - Assess exploitability
   - Determine affected features

3. **Mitigation** (30-60 minutes)
   ```bash
   # Option 1: Update package
   npm update [package]

   # Option 2: Use resolution (package.json)
   "overrides": {
     "vulnerable-package": "safe-version"
   }

   # Option 3: Remove if possible
   npm uninstall [package]
   ```

4. **Testing** (1-2 hours)
   ```bash
   npm test
   npm run build
   npm run test:e2e
   ```

5. **Deployment** (2-3 hours)
   - Create hotfix branch
   - Run CI/CD pipeline
   - Deploy to staging
   - Deploy to production

6. **Verification** (3-4 hours)
   ```bash
   # Verify fix in production
   npm audit --production
   ```

## Specific Package Fixes

### jsPDF (Critical)
```bash
# Update in apps/web
cd apps/web
npm install jspdf@latest
```

### Sentry (High)
```bash
# Update in apps/mobile
cd apps/mobile
npm install @sentry/react-native@latest sentry-expo@latest
```

### Vite/ESBuild (High)
```bash
# Update in packages
cd packages/api-services
npm install vite@latest esbuild@latest --save-dev

cd ../auth-unified
npm install vite@latest esbuild@latest --save-dev

cd ../security
npm install vite@latest esbuild@latest --save-dev
```

## CI/CD Integration

### GitHub Actions Setup
```yaml
# .github/workflows/security-scanning.yml
- Runs on: Push, PR, Daily schedule
- Blocks PR if: Critical vulnerabilities found
- Reports to: GitHub Security tab
- Notifications: Slack/Email on failures
```

### Pre-commit Hooks
```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm audit --audit-level=high"
    }
  }
}
```

### Dependabot Configuration
```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "daily"
    security-updates-only: true
    open-pull-requests-limit: 10
```

## Monitoring and Alerts

### 1. GitHub Security Advisories
- Enable: Settings → Security → Advisories
- Subscribe to: Security alerts
- Review: Weekly

### 2. Snyk Integration
```bash
# Install Snyk CLI
npm install -g snyk

# Authenticate
snyk auth

# Test project
snyk test

# Monitor project
snyk monitor
```

### 3. npm Audit Reports
```bash
# Generate weekly report
npm audit --json > reports/npm-audit-$(date +%Y%m%d).json

# Parse for critical issues
cat reports/npm-audit-*.json | jq '.metadata.vulnerabilities.critical'
```

## Security Metrics

### Key Performance Indicators (KPIs)

1. **Mean Time to Remediation (MTTR)**
   - Target: < 24 hours for critical
   - Current: Track in security-metrics.json

2. **Vulnerability Density**
   - Target: < 1 per 100 dependencies
   - Formula: vulnerabilities / total_dependencies * 100

3. **Patch Coverage**
   - Target: 100% within SLA
   - Track: patched / total_discovered * 100

4. **Security Debt**
   - Outstanding vulnerabilities by age
   - Technical debt from outdated packages

### Reporting Dashboard
```javascript
// scripts/security-metrics.js
const metrics = {
  lastScan: new Date(),
  vulnerabilities: {
    critical: 0,
    high: 0,
    moderate: 0,
    low: 0
  },
  mttr: {
    critical: "4 hours",
    high: "24 hours",
    moderate: "1 week"
  },
  compliance: {
    owasp: "A06 - In Progress",
    pci: "N/A",
    sox: "N/A"
  }
};
```

## Compliance and Auditing

### OWASP A06:2021 Requirements
- ✅ Remove unused dependencies
- ✅ Continuous inventory of versions
- ✅ Monitor for vulnerabilities (CVE/NVD)
- ✅ Subscribe to security alerts
- ✅ Use official sources
- ✅ Monitor unmaintained libraries
- ✅ Prefer signed packages
- ⚠️ Virtual patching (WAF) - Consider adding

### Audit Trail
All security events are logged:
- Vulnerability discoveries
- Patch applications
- Security scan results
- Failed security checks
- Manual interventions

## Resources

### Security Tools
- [npm audit](https://docs.npmjs.com/cli/v9/commands/npm-audit)
- [Snyk](https://snyk.io/)
- [OWASP Dependency Check](https://owasp.org/www-project-dependency-check/)
- [GitHub Security Advisories](https://github.com/advisories)
- [CVE Database](https://cve.mitre.org/)
- [NVD](https://nvd.nist.gov/)

### Documentation
- [OWASP A06:2021](https://owasp.org/Top10/A06_2021-Vulnerable_and_Outdated_Components/)
- [npm Security Best Practices](https://docs.npmjs.com/packages-and-modules/securing-your-code)
- [Node.js Security Checklist](https://blog.risingstack.com/node-js-security-checklist/)

### Emergency Contacts
- Security Team: security@mintenance.com
- DevOps On-Call: [PagerDuty]
- CISO: [Contact Info]
- External Security Firm: [Contact Info]

## Summary

Dependency security is an ongoing process requiring:
1. **Automated scanning** (daily via CI/CD)
2. **Regular updates** (weekly patches, monthly minors)
3. **Rapid response** (immediate for critical)
4. **Continuous monitoring** (Snyk, GitHub, npm)
5. **Team awareness** (training, documentation)

By following this guide, the Mintenance codebase maintains strong security posture against vulnerable dependencies, achieving OWASP A06:2021 compliance.