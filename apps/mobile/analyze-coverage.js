import { logger } from '@mintenance/shared';

const coverage = require('./coverage/coverage-summary.json');
const files = Object.keys(coverage).filter(f => f !== 'total');

// Get components with 0% coverage
const uncoveredComponents = files
  .filter(f => f.includes('/components/') && coverage[f].lines.pct === 0)
  .map(f => ({
    file: f.split('\\components\\')[1] || f.split('/components/')[1] || f,
    fullPath: f,
    lines: coverage[f].lines.total
  }))
  .sort((a, b) => b.lines - a.lines)
  .slice(0, 30);

logger.info('TOP 30 UNCOVERED COMPONENTS (by line count):');
logger.info('='.repeat(60));
uncoveredComponents.forEach((c, i) => {
  logger.info(`${(i+1).toString().padStart(2)}. ${c.file} (${c.lines} lines)`);
});

logger.info('\n');

// Get screens with 0% coverage
const uncoveredScreens = files
  .filter(f => f.includes('/screens/') && coverage[f].lines.pct === 0)
  .map(f => ({
    file: f.split('\\screens\\')[1] || f.split('/screens/')[1] || f,
    fullPath: f,
    lines: coverage[f].lines.total
  }))
  .sort((a, b) => b.lines - a.lines)
  .slice(0, 20);

logger.info('TOP 20 UNCOVERED SCREENS (by line count):');
logger.info('='.repeat(60));
uncoveredScreens.forEach((c, i) => {
  logger.info(`${(i+1).toString().padStart(2)}. ${c.file} (${c.lines} lines)`);
});

logger.info('\n');

// Get utils with 0% coverage
const uncoveredUtils = files
  .filter(f => f.includes('/utils/') && coverage[f].lines.pct === 0)
  .map(f => ({
    file: f.split('\\utils\\')[1] || f.split('/utils/')[1] || f,
    fullPath: f,
    lines: coverage[f].lines.total
  }))
  .sort((a, b) => b.lines - a.lines)
  .slice(0, 15);

logger.info('TOP 15 UNCOVERED UTILS (by line count):');
logger.info('='.repeat(60));
uncoveredUtils.forEach((c, i) => {
  logger.info(`${(i+1).toString().padStart(2)}. ${c.file} (${c.lines} lines)`);
});

logger.info('\n');
logger.info('SUMMARY:');
logger.info('='.repeat(60));
logger.info(`Total files: ${files.length}`);
logger.info(`Uncovered components: ${files.filter(f => f.includes('/components/') && coverage[f].lines.pct === 0).length}`);
logger.info(`Uncovered screens: ${files.filter(f => f.includes('/screens/') && coverage[f].lines.pct === 0).length}`);
logger.info(`Uncovered utils: ${files.filter(f => f.includes('/utils/') && coverage[f].lines.pct === 0).length}`);
