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

console.log('TOP 30 UNCOVERED COMPONENTS (by line count):');
console.log('='.repeat(60));
uncoveredComponents.forEach((c, i) => {
  console.log(`${(i+1).toString().padStart(2)}. ${c.file} (${c.lines} lines)`);
});

console.log('\n');

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

console.log('TOP 20 UNCOVERED SCREENS (by line count):');
console.log('='.repeat(60));
uncoveredScreens.forEach((c, i) => {
  console.log(`${(i+1).toString().padStart(2)}. ${c.file} (${c.lines} lines)`);
});

console.log('\n');

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

console.log('TOP 15 UNCOVERED UTILS (by line count):');
console.log('='.repeat(60));
uncoveredUtils.forEach((c, i) => {
  console.log(`${(i+1).toString().padStart(2)}. ${c.file} (${c.lines} lines)`);
});

console.log('\n');
console.log('SUMMARY:');
console.log('='.repeat(60));
console.log(`Total files: ${files.length}`);
console.log(`Uncovered components: ${files.filter(f => f.includes('/components/') && coverage[f].lines.pct === 0).length}`);
console.log(`Uncovered screens: ${files.filter(f => f.includes('/screens/') && coverage[f].lines.pct === 0).length}`);
console.log(`Uncovered utils: ${files.filter(f => f.includes('/utils/') && coverage[f].lines.pct === 0).length}`);
