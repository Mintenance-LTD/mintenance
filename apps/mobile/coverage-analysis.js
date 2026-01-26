import { logger } from '@mintenance/shared';

const coverage = require('./coverage/coverage-summary.json');

logger.info('OVERALL COVERAGE:');
logger.info('='.repeat(60));
logger.info('Lines:', coverage.total.lines.pct + '%');
logger.info('Statements:', coverage.total.statements.pct + '%');
logger.info('Functions:', coverage.total.functions.pct + '%');
logger.info('Branches:', coverage.total.branches.pct + '%');
logger.info('');

const files = Object.keys(coverage).filter(f => f !== 'total');
logger.info('Total files analyzed:', files.length);
logger.info('');

// Categorize by coverage level
const noCoverage = files.filter(f => coverage[f].lines.pct === 0);
const lowCoverage = files.filter(f => coverage[f].lines.pct > 0 && coverage[f].lines.pct < 50);
const mediumCoverage = files.filter(f => coverage[f].lines.pct >= 50 && coverage[f].lines.pct < 80);
const highCoverage = files.filter(f => coverage[f].lines.pct >= 80);

logger.info('FILES BY COVERAGE LEVEL:');
logger.info('='.repeat(60));
logger.info('0% coverage:', noCoverage.length, 'files');
logger.info('1-49% coverage:', lowCoverage.length, 'files');
logger.info('50-79% coverage:', mediumCoverage.length, 'files');
logger.info('80-100% coverage:', highCoverage.length, 'files');
logger.info('');

// Show top 20 largest uncovered files
const largestUncovered = noCoverage
  .map(f => ({
    path: f,
    lines: coverage[f].lines.total,
    type: f.includes('\\components\\') || f.includes('/components/') ? 'component' :
          f.includes('\\screens\\') || f.includes('/screens/') ? 'screen' :
          f.includes('\\services\\') || f.includes('/services/') ? 'service' :
          f.includes('\\utils\\') || f.includes('/utils/') ? 'util' : 'other'
  }))
  .sort((a, b) => b.lines - a.lines)
  .slice(0, 20);

logger.info('TOP 20 LARGEST UNCOVERED FILES:');
logger.info('='.repeat(60));
largestUncovered.forEach((file, i) => {
  const shortPath = file.path.split('\\src\\')[1] || file.path.split('/src/')[1] || file.path;
  logger.info(`${(i+1).toString().padStart(2)}. [${file.type}] ${shortPath} (${file.lines} lines)`);
});
