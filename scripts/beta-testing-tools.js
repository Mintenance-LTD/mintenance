#!/usr/bin/env node

/**
 * 🧪 Beta Testing Management Tools
 * Utilities for managing beta testers and collecting feedback
 */

const fs = require('fs');
const path = require('path');

const BETA_DATA_DIR = path.join(__dirname, '..', 'beta-testing-data');

// Ensure beta data directory exists
if (!fs.existsSync(BETA_DATA_DIR)) {
  fs.mkdirSync(BETA_DATA_DIR, { recursive: true });
}

// Beta testing phase configuration
const PHASES = {
  1: { name: 'Internal Testing', duration: 7, targetUsers: 10 },
  2: { name: 'Closed Beta', duration: 14, targetUsers: 20 },
  3: { name: 'Open Beta', duration: 7, targetUsers: 100 },
};

class BetaTestingManager {
  constructor() {
    this.currentPhase = 1;
    this.testers = this.loadTesters();
    this.feedback = this.loadFeedback();
  }

  loadTesters() {
    const testersFile = path.join(BETA_DATA_DIR, 'testers.json');
    if (fs.existsSync(testersFile)) {
      return JSON.parse(fs.readFileSync(testersFile, 'utf8'));
    }
    return { phase1: [], phase2: [], phase3: [] };
  }

  saveTesters() {
    const testersFile = path.join(BETA_DATA_DIR, 'testers.json');
    fs.writeFileSync(testersFile, JSON.stringify(this.testers, null, 2));
  }

  loadFeedback() {
    const feedbackFile = path.join(BETA_DATA_DIR, 'feedback.json');
    if (fs.existsSync(feedbackFile)) {
      return JSON.parse(fs.readFileSync(feedbackFile, 'utf8'));
    }
    return [];
  }

  saveFeedback() {
    const feedbackFile = path.join(BETA_DATA_DIR, 'feedback.json');
    fs.writeFileSync(feedbackFile, JSON.stringify(this.feedback, null, 2));
  }

  // Add beta tester
  addTester(phase, name, email, role = 'homeowner', notes = '') {
    const tester = {
      id: Date.now().toString(),
      name,
      email,
      role, // 'homeowner' or 'contractor'
      phase,
      addedDate: new Date().toISOString(),
      status: 'invited', // 'invited', 'active', 'completed', 'dropped'
      notes,
      testingSessions: [],
    };

    this.testers[`phase${phase}`].push(tester);
    this.saveTesters();
    console.log(`✅ Added ${name} (${email}) to Phase ${phase}`);
    return tester;
  }

  // List testers for a phase
  listTesters(phase) {
    const phaseTesters = this.testers[`phase${phase}`] || [];
    console.log(`\n📋 Phase ${phase} Testers (${phaseTesters.length} total):`);

    phaseTesters.forEach((tester, index) => {
      console.log(`${index + 1}. ${tester.name} (${tester.email})`);
      console.log(`   Role: ${tester.role} | Status: ${tester.status}`);
      console.log(
        `   Added: ${new Date(tester.addedDate).toLocaleDateString()}`
      );
      if (tester.notes) console.log(`   Notes: ${tester.notes}`);
      console.log('');
    });
  }

  // Update tester status
  updateTesterStatus(email, status) {
    let found = false;
    for (const phase in this.testers) {
      const tester = this.testers[phase].find((t) => t.email === email);
      if (tester) {
        tester.status = status;
        tester.lastUpdated = new Date().toISOString();
        found = true;
        console.log(`✅ Updated ${tester.name} status to: ${status}`);
        break;
      }
    }

    if (!found) {
      console.log(`❌ Tester not found: ${email}`);
      return false;
    }

    this.saveTesters();
    return true;
  }

  // Add feedback entry
  addFeedback(
    testerEmail,
    rating,
    comments,
    category = 'general',
    bugReports = []
  ) {
    const feedback = {
      id: Date.now().toString(),
      testerEmail,
      rating, // 1-5 stars
      comments,
      category, // 'general', 'ui', 'performance', 'feature-request', 'bug'
      bugReports, // Array of bug descriptions
      timestamp: new Date().toISOString(),
      phase: this.currentPhase,
      processed: false,
    };

    this.feedback.push(feedback);
    this.saveFeedback();
    console.log(`✅ Added feedback from ${testerEmail} (${rating}/5 stars)`);
    return feedback;
  }

  // Generate status report
  generateStatusReport() {
    console.log('\n📊 BETA TESTING STATUS REPORT');
    console.log('=====================================');
    console.log(
      `Current Phase: ${this.currentPhase} - ${PHASES[this.currentPhase].name}`
    );
    console.log(`Date: ${new Date().toLocaleDateString()}\n`);

    // Tester statistics
    for (let phase = 1; phase <= 3; phase++) {
      const phaseTesters = this.testers[`phase${phase}`] || [];
      const active = phaseTesters.filter((t) => t.status === 'active').length;
      const completed = phaseTesters.filter(
        (t) => t.status === 'completed'
      ).length;
      const dropped = phaseTesters.filter((t) => t.status === 'dropped').length;

      console.log(`Phase ${phase} (${PHASES[phase].name}):`);
      console.log(
        `  Total: ${phaseTesters.length}/${PHASES[phase].targetUsers} target`
      );
      console.log(
        `  Active: ${active} | Completed: ${completed} | Dropped: ${dropped}`
      );
      console.log('');
    }

    // Feedback summary
    const recentFeedback = this.feedback.filter((f) => {
      const feedbackDate = new Date(f.timestamp);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return feedbackDate > weekAgo;
    });

    console.log(`📝 Feedback Summary (Last 7 days):`);
    console.log(`  Total feedback entries: ${recentFeedback.length}`);

    if (recentFeedback.length > 0) {
      const avgRating =
        recentFeedback.reduce((sum, f) => sum + f.rating, 0) /
        recentFeedback.length;
      console.log(`  Average rating: ${avgRating.toFixed(1)}/5 stars`);

      const bugReports = recentFeedback.filter(
        (f) => f.bugReports.length > 0
      ).length;
      console.log(`  Bug reports: ${bugReports}`);

      const categories = {};
      recentFeedback.forEach((f) => {
        categories[f.category] = (categories[f.category] || 0) + 1;
      });

      console.log(`  Feedback categories:`, categories);
    }

    console.log('\n🎯 Next Actions:');
    console.log(
      `  [ ] Review ${recentFeedback.filter((f) => !f.processed).length} unprocessed feedback entries`
    );
    console.log(
      `  [ ] Follow up with ${this.testers[`phase${this.currentPhase}`].filter((t) => t.status === 'invited').length} pending testers`
    );

    const phase = PHASES[this.currentPhase];
    const currentTesters = this.testers[`phase${this.currentPhase}`].length;
    if (currentTesters < phase.targetUsers) {
      console.log(
        `  [ ] Recruit ${phase.targetUsers - currentTesters} more testers for current phase`
      );
    }
  }

  // Export data for analysis
  exportData() {
    const exportData = {
      testers: this.testers,
      feedback: this.feedback,
      summary: this.generateSummaryStats(),
      exportDate: new Date().toISOString(),
    };

    const exportFile = path.join(
      BETA_DATA_DIR,
      `beta-export-${Date.now()}.json`
    );
    fs.writeFileSync(exportFile, JSON.stringify(exportData, null, 2));
    console.log(`✅ Data exported to: ${exportFile}`);
    return exportFile;
  }

  generateSummaryStats() {
    const stats = {
      totalTesters: 0,
      totalFeedback: this.feedback.length,
      averageRating: 0,
      phases: {},
    };

    // Calculate phase statistics
    for (let phase = 1; phase <= 3; phase++) {
      const phaseTesters = this.testers[`phase${phase}`] || [];
      const phaseFeedback = this.feedback.filter((f) => f.phase === phase);

      stats.phases[phase] = {
        testers: phaseTesters.length,
        feedback: phaseFeedback.length,
        averageRating:
          phaseFeedback.length > 0
            ? phaseFeedback.reduce((sum, f) => sum + f.rating, 0) /
              phaseFeedback.length
            : 0,
      };

      stats.totalTesters += phaseTesters.length;
    }

    // Calculate overall average rating
    if (this.feedback.length > 0) {
      stats.averageRating =
        this.feedback.reduce((sum, f) => sum + f.rating, 0) /
        this.feedback.length;
    }

    return stats;
  }
}

// Command line interface
function main() {
  const manager = new BetaTestingManager();
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'add-tester':
      if (args.length < 4) {
        console.log('Usage: add-tester <phase> <name> <email> [role] [notes]');
        return;
      }
      manager.addTester(
        parseInt(args[1]),
        args[2],
        args[3],
        args[4] || 'homeowner',
        args[5] || ''
      );
      break;

    case 'list-testers':
      const phase = parseInt(args[1]) || 1;
      manager.listTesters(phase);
      break;

    case 'update-status':
      if (args.length < 3) {
        console.log('Usage: update-status <email> <status>');
        console.log('Status options: invited, active, completed, dropped');
        return;
      }
      manager.updateTesterStatus(args[1], args[2]);
      break;

    case 'add-feedback':
      if (args.length < 4) {
        console.log(
          'Usage: add-feedback <email> <rating> <comments> [category]'
        );
        return;
      }
      manager.addFeedback(
        args[1],
        parseInt(args[2]),
        args[3],
        args[4] || 'general'
      );
      break;

    case 'status':
      manager.generateStatusReport();
      break;

    case 'export':
      manager.exportData();
      break;

    case 'init':
      console.log('🧪 Initializing beta testing management...');

      // Create sample testers for demo
      manager.addTester(
        1,
        'Alex Developer',
        'alex@team.com',
        'homeowner',
        'Internal team member'
      );
      manager.addTester(
        1,
        'Sam Tester',
        'sam@team.com',
        'contractor',
        'QA team member'
      );

      // Create sample feedback
      manager.addFeedback(
        'alex@team.com',
        4,
        'Great app concept! Login was smooth, job posting needs work.',
        'ui'
      );

      console.log('✅ Beta testing initialized with sample data');
      console.log('📝 Run "npm run beta status" to see current status');
      break;

    default:
      console.log('🧪 Beta Testing Management Tools\n');
      console.log('Available commands:');
      console.log('  init                           - Initialize beta testing');
      console.log(
        '  add-tester <phase> <name> <email> [role] [notes] - Add new tester'
      );
      console.log(
        '  list-testers [phase]           - List testers (default: phase 1)'
      );
      console.log('  update-status <email> <status> - Update tester status');
      console.log(
        '  add-feedback <email> <rating> <comments> [category] - Add feedback'
      );
      console.log('  status                         - Generate status report');
      console.log('  export                         - Export all data');
      console.log('\nExample:');
      console.log(
        '  node scripts/beta-testing-tools.js add-tester 1 "John Smith" john@example.com homeowner "Found via NextDoor"'
      );
      break;
  }
}

if (require.main === module) {
  main();
}

module.exports = { BetaTestingManager };
