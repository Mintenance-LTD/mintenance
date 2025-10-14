const coverage = require('./coverage/coverage-summary.json');

console.log('OVERALL COVERAGE:');
console.log('='.repeat(60));
console.log('Lines:', coverage.total.lines.pct + '%');
console.log('Statements:', coverage.total.statements.pct + '%');
console.log('Functions:', coverage.total.functions.pct + '%');
console.log('Branches:', coverage.total.branches.pct + '%');
console.log('');

const files = Object.keys(coverage).filter(f => f !== 'total');
console.log('Total files analyzed:', files.length);
console.log('');

// Categorize by coverage level
const noCoverage = files.filter(f => coverage[f].lines.pct === 0);
const lowCoverage = files.filter(f => coverage[f].lines.pct > 0 && coverage[f].lines.pct < 50);
const mediumCoverage = files.filter(f => coverage[f].lines.pct >= 50 && coverage[f].lines.pct < 80);
const highCoverage = files.filter(f => coverage[f].lines.pct >= 80);

console.log('FILES BY COVERAGE LEVEL:');
console.log('='.repeat(60));
console.log('0% coverage:', noCoverage.length, 'files');
console.log('1-49% coverage:', lowCoverage.length, 'files');
console.log('50-79% coverage:', mediumCoverage.length, 'files');
console.log('80-100% coverage:', highCoverage.length, 'files');
console.log('');

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

console.log('TOP 20 LARGEST UNCOVERED FILES:');
console.log('='.repeat(60));
largestUncovered.forEach((file, i) => {
  const shortPath = file.path.split('\\src\\')[1] || file.path.split('/src/')[1] || file.path;
  console.log(`${(i+1).toString().padStart(2)}. [${file.type}] ${shortPath} (${file.lines} lines)`);
});
