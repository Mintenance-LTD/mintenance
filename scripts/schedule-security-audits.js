#!/usr/bin/env node

/**
 * Security Audit Scheduler
 * 
 * This script sets up automated security audits and monitoring
 * according to the security monitoring configuration.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class SecurityAuditScheduler {
  constructor() {
    this.configPath = path.join(process.cwd(), 'security-monitoring.config.js');
    this.config = this.loadConfig();
  }

  loadConfig() {
    if (fs.existsSync(this.configPath)) {
      return require(this.configPath);
    }
    
    console.warn('Security monitoring config not found, using defaults');
    return {
      scanning: {
        schedule: {
          daily: { enabled: true, time: '02:00' },
          weekly: { enabled: true, day: 'sunday', time: '03:00' },
          monthly: { enabled: true, day: 1, time: '04:00' },
        },
      },
    };
  }

  async setupCronJobs() {
    console.log('🕐 Setting up security audit cron jobs...');

    const cronJobs = [];

    // Daily security scan
    if (this.config.scanning.schedule.daily.enabled) {
      const dailyTime = this.config.scanning.schedule.daily.time;
      const [hour, minute] = dailyTime.split(':');
      
      cronJobs.push({
        schedule: `${minute} ${hour} * * *`,
        command: `cd ${process.cwd()} && node scripts/security-audit.js`,
        description: 'Daily security audit',
      });
    }

    // Weekly comprehensive scan
    if (this.config.scanning.schedule.weekly.enabled) {
      const weeklyDay = this.getDayNumber(this.config.scanning.schedule.weekly.day);
      const weeklyTime = this.config.scanning.schedule.weekly.time;
      const [hour, minute] = weeklyTime.split(':');
      
      cronJobs.push({
        schedule: `${minute} ${hour} * * ${weeklyDay}`,
        command: `cd ${process.cwd()} && node scripts/security-audit.js --comprehensive`,
        description: 'Weekly comprehensive security audit',
      });
    }

    // Monthly full audit
    if (this.config.scanning.schedule.monthly.enabled) {
      const monthlyDay = this.config.scanning.schedule.monthly.day;
      const monthlyTime = this.config.scanning.schedule.monthly.time;
      const [hour, minute] = monthlyTime.split(':');
      
      cronJobs.push({
        schedule: `${minute} ${hour} ${monthlyDay} * *`,
        command: `cd ${process.cwd()} && node scripts/security-audit.js --full-audit`,
        description: 'Monthly full security audit',
      });
    }

    // Generate cron file
    const cronContent = cronJobs.map(job => 
      `# ${job.description}\n${job.schedule} ${job.command}\n`
    ).join('\n');

    const cronFile = path.join(process.cwd(), 'security-audit.cron');
    fs.writeFileSync(cronFile, cronContent);

    console.log(`✅ Generated cron file: ${cronFile}`);
    console.log('\n📋 Cron jobs to install:');
    cronJobs.forEach(job => {
      console.log(`   ${job.schedule} - ${job.description}`);
    });

    console.log('\n🔧 To install cron jobs, run:');
    console.log(`   crontab ${cronFile}`);
  }

  getDayNumber(dayName) {
    const days = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };
    return days[dayName.toLowerCase()] || 0;
  }

  async setupGitHubActions() {
    console.log('🚀 Setting up GitHub Actions security workflows...');

    const workflowsDir = path.join(process.cwd(), '.github', 'workflows');
    
    // Ensure workflows directory exists
    if (!fs.existsSync(workflowsDir)) {
      fs.mkdirSync(workflowsDir, { recursive: true });
    }

    // Security scan workflow (already created)
    const securityScanPath = path.join(workflowsDir, 'security-scan.yml');
    if (fs.existsSync(securityScanPath)) {
      console.log('✅ Security scan workflow already exists');
    } else {
      console.log('⚠️  Security scan workflow not found');
    }

    // Dependency update workflow
    const dependencyUpdateWorkflow = `name: Dependency Security Updates

on:
  schedule:
    # Run weekly on Sundays at 1 AM UTC
    - cron: '0 1 * * 0'
  workflow_dispatch:

jobs:
  dependency-update:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Check for outdated packages
      run: |
        npm outdated --json > outdated.json || true
        if [ -s outdated.json ]; then
          echo "Outdated packages found:"
          cat outdated.json
        else
          echo "No outdated packages found"
        fi

    - name: Run security audit
      run: npm audit --audit-level moderate

    - name: Update dependencies
      run: |
        npm update
        npm audit fix --force || true

    - name: Run tests
      run: npm test

    - name: Create security update PR
      if: github.event_name == 'schedule'
      uses: peter-evans/create-pull-request@v5
      with:
        token: \${{ secrets.GITHUB_TOKEN }}
        commit-message: 'Security: Update dependencies'
        title: 'Security: Automated dependency updates'
        body: |
          This PR contains automated security updates for dependencies.
          
          ## Changes
          - Updated outdated packages
          - Applied security fixes
          - Ran security audit
          
          ## Review Required
          Please review the changes and test thoroughly before merging.
        branch: security/update-dependencies-\${{ github.run_number }}
        delete-branch: true
`;

    const dependencyUpdatePath = path.join(workflowsDir, 'dependency-update.yml');
    fs.writeFileSync(dependencyUpdatePath, dependencyUpdateWorkflow);
    console.log(`✅ Created dependency update workflow: ${dependencyUpdatePath}`);
  }

  async setupMonitoringAlerts() {
    console.log('📊 Setting up monitoring alerts...');

    // Create monitoring configuration for different environments
    const monitoringConfigs = {
      development: {
        enabled: true,
        logLevel: 'debug',
        alertThresholds: {
          criticalEvents: 1,
          highSeverityEvents: 5,
        },
      },
      staging: {
        enabled: true,
        logLevel: 'info',
        alertThresholds: {
          criticalEvents: 3,
          highSeverityEvents: 10,
        },
      },
      production: {
        enabled: true,
        logLevel: 'warn',
        alertThresholds: {
          criticalEvents: 1,
          highSeverityEvents: 5,
        },
      },
    };

    const monitoringDir = path.join(process.cwd(), 'monitoring');
    if (!fs.existsSync(monitoringDir)) {
      fs.mkdirSync(monitoringDir, { recursive: true });
    }

    Object.entries(monitoringConfigs).forEach(([env, config]) => {
      const configPath = path.join(monitoringDir, `${env}-monitoring.json`);
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      console.log(`✅ Created ${env} monitoring config: ${configPath}`);
    });
  }

  async generateSecurityReport() {
    console.log('📋 Generating security audit schedule report...');

    const report = {
      generated_at: new Date().toISOString(),
      configuration: this.config,
      schedules: {
        daily: this.config.scanning.schedule.daily.enabled ? 
          `Daily at ${this.config.scanning.schedule.daily.time}` : 'Disabled',
        weekly: this.config.scanning.schedule.weekly.enabled ? 
          `Weekly on ${this.config.scanning.schedule.weekly.day} at ${this.config.scanning.schedule.weekly.time}` : 'Disabled',
        monthly: this.config.scanning.schedule.monthly.enabled ? 
          `Monthly on day ${this.config.scanning.schedule.monthly.day} at ${this.config.scanning.schedule.monthly.time}` : 'Disabled',
      },
      monitoring: {
        realtime: this.config.monitoring.realtime.enabled,
        retention: this.config.monitoring.retention,
        thresholds: this.config.monitoring.thresholds,
      },
      compliance: {
        gdpr: this.config.compliance.gdpr.enabled,
        pci: this.config.compliance.pci.enabled,
        iso27001: this.config.compliance.iso27001.enabled,
      },
      next_audit: this.getNextAuditTime(),
      recommendations: [
        'Review security audit results regularly',
        'Update security thresholds based on business needs',
        'Test incident response procedures quarterly',
        'Conduct penetration testing annually',
        'Review and update security policies bi-annually',
      ],
    };

    const reportPath = path.join(process.cwd(), 'security-audit-schedule-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`✅ Generated security audit schedule report: ${reportPath}`);

    return report;
  }

  getNextAuditTime() {
    const now = new Date();
    const dailyTime = this.config.scanning.schedule.daily.time;
    const [hour, minute] = dailyTime.split(':').map(Number);
    
    const nextDaily = new Date(now);
    nextDaily.setHours(hour, minute, 0, 0);
    
    if (nextDaily <= now) {
      nextDaily.setDate(nextDaily.getDate() + 1);
    }
    
    return nextDaily.toISOString();
  }

  async run() {
    console.log('🔒 Security Audit Scheduler Setup');
    console.log('================================\n');

    try {
      await this.setupCronJobs();
      await this.setupGitHubActions();
      await this.setupMonitoringAlerts();
      const report = await this.generateSecurityReport();

      console.log('\n✅ Security audit scheduling setup complete!');
      console.log('\n📅 Next scheduled audit:', new Date(report.next_audit).toLocaleString());
      
      console.log('\n🔧 Manual setup required:');
      console.log('1. Install cron jobs: crontab security-audit.cron');
      console.log('2. Configure GitHub secrets for automated workflows');
      console.log('3. Set up monitoring alerts in your hosting platform');
      console.log('4. Test security audit script: node scripts/security-audit.js');
      
      console.log('\n📚 Documentation:');
      console.log('- Security monitoring config: security-monitoring.config.js');
      console.log('- Audit schedule report: security-audit-schedule-report.json');
      console.log('- Cron jobs file: security-audit.cron');

    } catch (error) {
      console.error('❌ Setup failed:', error.message);
      process.exit(1);
    }
  }
}

// Run the scheduler setup
const scheduler = new SecurityAuditScheduler();
scheduler.run().catch(error => {
  console.error('Scheduler setup failed:', error);
  process.exit(1);
});
