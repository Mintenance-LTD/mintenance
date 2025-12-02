const coverage = require('./coverage/coverage-summary.json');

const files = Object.keys(coverage).filter(f => f !== 'total');
const noCoverage = files.filter(f => coverage[f].lines.pct === 0);

// Calculate total lines needed for 50% coverage
const totalLines = coverage.total.lines.total;
const currentCovered = coverage.total.lines.covered;
const targetCovered = Math.ceil(totalLines * 0.50);
const linesNeeded = targetCovered - currentCovered;

logger.info('WEEK 3 TEST COVERAGE PLAN');
logger.info('='.repeat(70));
logger.info('Current Coverage:', coverage.total.lines.pct.toFixed(2) + '%');
logger.info('Target Coverage: 50%');
logger.info('Total Lines:', totalLines);
logger.info('Currently Covered:', currentCovered);
logger.info('Target Covered:', targetCovered);
logger.info('Lines Needed:', linesNeeded);
logger.info('');

// Categorize uncovered files
const categorized = noCoverage.map(f => {
  const shortPath = f.split('\\src\\')[1] || f.split('/src/')[1] || f;
  const category =
    shortPath.includes('utils\\') || shortPath.includes('utils/') ? 'util' :
    shortPath.includes('services\\') || shortPath.includes('services/') ? 'service' :
    shortPath.includes('hooks\\') || shortPath.includes('hooks/') ? 'hook' :
    shortPath.includes('components\\') || shortPath.includes('components/') ? 'component' :
    shortPath.includes('screens\\') || shortPath.includes('screens/') ? 'screen' :
    'other';

  return {
    path: f,
    shortPath,
    category,
    lines: coverage[f].lines.total,
    functions: coverage[f].functions.total,
    branches: coverage[f].branches.total
  };
});

// Sort by impact score (lines + functions * 2 + branches)
const scored = categorized
  .map(f => ({
    ...f,
    impactScore: f.lines + (f.functions * 2) + f.branches
  }))
  .sort((a, b) => b.impactScore - a.impactScore);

// Select top files by category for balanced coverage
const plan = {
  utils: scored.filter(f => f.category === 'util').slice(0, 8),
  services: scored.filter(f => f.category === 'service').slice(0, 10),
  hooks: scored.filter(f => f.category === 'hook').slice(0, 5),
  components: scored.filter(f => f.category === 'component').slice(0, 7),
};

const totalPlanFiles = Object.values(plan).flat().length;
const totalPlanLines = Object.values(plan).flat().reduce((sum, f) => sum + f.lines, 0);
const estimatedCoverage = ((currentCovered + totalPlanLines) / totalLines * 100).toFixed(2);

logger.info('RECOMMENDED TEST PLAN: ' + totalPlanFiles + ' FILES');
logger.info('='.repeat(70));
logger.info('Total Lines to Test:', totalPlanLines);
logger.info('Estimated Final Coverage:', estimatedCoverage + '%');
logger.info('');

// Print plan by category
Object.entries(plan).forEach(([category, items]) => {
  logger.info(`\n${category.toUpperCase()} (${items.length} files, ${items.reduce((s, f) => s + f.lines, 0)} lines):`);
  logger.info('-'.repeat(70));
  items.forEach((item, i) => {
    logger.info(`${(i+1).toString().padStart(2)}. ${item.shortPath}`);
    logger.info(`    ${item.lines} lines, ${item.functions} functions, ${item.branches} branches`);
  });
});

logger.info('\n');
logger.info('EXECUTION STRATEGY:');
logger.info('='.repeat(70));
logger.info('Phase 1 (Day 1): Utils - 8 files, highest impact');
logger.info('Phase 2 (Day 2): Services - 10 files, business logic');
logger.info('Phase 3 (Day 3): Hooks - 5 files, React patterns');
logger.info('Phase 4 (Day 4): Components - 7 files, UI testing');
logger.info('Phase 5 (Day 5): Review and adjust to hit 50% target');
