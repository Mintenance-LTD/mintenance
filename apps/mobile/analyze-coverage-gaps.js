const fs = require('fs');
const path = require('path');

const coverageFile = path.join(__dirname, 'coverage', 'coverage-summary.json');
const data = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));

console.log('=== MOBILE TEST COVERAGE ANALYSIS ===\n');

// Overall stats
const total = data.total;
console.log('OVERALL COVERAGE:');
console.log(`Lines:      ${total.lines.covered}/${total.lines.total} (${total.lines.pct}%)`);
console.log(`Statements: ${total.statements.covered}/${total.statements.total} (${total.statements.pct}%)`);
console.log(`Functions:  ${total.functions.covered}/${total.functions.total} (${total.functions.pct}%)`);
console.log(`Branches:   ${total.branches.covered}/${total.branches.total} (${total.branches.pct}%)`);

// Files with any coverage
console.log('\n=== FILES WITH COVERAGE (>0%) ===');
const filesWithCoverage = Object.entries(data)
  .filter(([key, val]) => key !== 'total' && val.lines?.pct > 0)
  .map(([file, cov]) => ({
    file: file.split('\\').pop(),
    fullPath: file,
    lines: cov.lines.pct,
    statements: cov.statements.pct,
    functions: cov.functions.pct
  }))
  .sort((a, b) => b.lines - a.lines);

console.log(`Total files with coverage: ${filesWithCoverage.length}\n`);
filesWithCoverage.forEach(({ file, lines, statements, functions }) => {
  console.log(`${file}:`);
  console.log(`  Lines: ${lines}% | Statements: ${statements}% | Functions: ${functions}%`);
});

// Critical paths with 0% coverage
console.log('\n=== CRITICAL SERVICES WITH 0% COVERAGE ===');
const criticalPaths = [
  'PaymentService.ts',
  'AuthService.ts',
  'JobService.ts',
  'ContractorService.ts',
  'MessagingService.ts',
  'NotificationService.ts'
];

Object.entries(data)
  .filter(([key]) => key !== 'total')
  .filter(([file]) => criticalPaths.some(cp => file.includes(cp)))
  .forEach(([file, cov]) => {
    const fileName = file.split('\\').pop();
    console.log(`${fileName}: ${cov.lines.pct}% (${cov.lines.covered}/${cov.lines.total} lines)`);
  });

// Calculate gap to 80%
console.log('\n=== GAP TO 80% COVERAGE ===');
const targetPct = 80;
const currentPct = total.lines.pct;
const gap = targetPct - currentPct;
const linesToCover = Math.ceil((total.lines.total * targetPct / 100) - total.lines.covered);

console.log(`Current: ${currentPct}%`);
console.log(`Target: ${targetPct}%`);
console.log(`Gap: ${gap.toFixed(2)}%`);
console.log(`Lines to cover: ${linesToCover} (out of ${total.lines.total})`);
console.log(`Estimated tests needed: ~${Math.ceil(linesToCover / 50)} comprehensive test files`);
