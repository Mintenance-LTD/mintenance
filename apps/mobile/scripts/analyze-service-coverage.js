const fs = require('fs');
const path = require('path');

// Read coverage summary
const coveragePath = path.join(__dirname, '../coverage/coverage-summary.json');
const data = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));

const services = {};

// Extract service files
Object.keys(data).forEach(filePath => {
  // Match files in /services/ or /services-v2/ directories
  if ((filePath.includes(path.sep + 'services' + path.sep) || filePath.includes(path.sep + 'services-v2' + path.sep)) &&
      filePath.endsWith('.ts') &&
      !filePath.includes('__tests__') &&
      !filePath.includes('__examples__') &&
      !filePath.includes('.test.')) {

    const parts = filePath.split(path.sep);
    const fileName = parts[parts.length - 1];
    const serviceName = fileName.replace('.ts', '');
    const coverage = data[filePath];

    services[serviceName] = {
      filePath,
      lines: coverage.lines.pct,
      functions: coverage.functions.pct,
      statements: coverage.statements.pct,
      branches: coverage.branches.pct,
      totalLines: coverage.lines.total,
      coveredLines: coverage.lines.covered,
      totalFunctions: coverage.functions.total,
      coveredFunctions: coverage.functions.covered
    };
  }
});

// Sort by line coverage ascending (lowest first)
const sortedByLowestCoverage = Object.entries(services)
  .sort((a, b) => a[1].lines - b[1].lines);

const sortedByMostLines = Object.entries(services)
  .sort((a, b) => b[1].totalLines - a[1].totalLines);

console.log('='.repeat(100));
console.log('SERVICE COVERAGE ANALYSIS - 30 LOWEST COVERAGE SERVICES');
console.log('='.repeat(100));
console.log('');
console.log('Service'.padEnd(50) + 'Lines%'.padStart(8) + 'Funcs%'.padStart(8) + 'Total'.padStart(8) + 'Covered'.padStart(9));
console.log('-'.repeat(100));

sortedByLowestCoverage.slice(0, 30).forEach(([name, cov]) => {
  console.log(
    name.padEnd(50) +
    cov.lines.toFixed(1).padStart(8) +
    cov.functions.toFixed(1).padStart(8) +
    cov.totalLines.toString().padStart(8) +
    cov.coveredLines.toString().padStart(9)
  );
});

console.log('');
console.log('='.repeat(100));
console.log('SERVICE COVERAGE ANALYSIS - 20 LARGEST SERVICES (By Line Count)');
console.log('='.repeat(100));
console.log('');
console.log('Service'.padEnd(50) + 'Lines%'.padStart(8) + 'Funcs%'.padStart(8) + 'Total'.padStart(8) + 'Covered'.padStart(9));
console.log('-'.repeat(100));

sortedByMostLines.slice(0, 20).forEach(([name, cov]) => {
  console.log(
    name.padEnd(50) +
    cov.lines.toFixed(1).padStart(8) +
    cov.functions.toFixed(1).padStart(8) +
    cov.totalLines.toString().padStart(8) +
    cov.coveredLines.toString().padStart(9)
  );
});

console.log('');
console.log('='.repeat(100));
console.log('SUMMARY STATISTICS');
console.log('='.repeat(100));
console.log('Total Services Analyzed: ' + Object.keys(services).length);
console.log('Services with 0% Coverage: ' + sortedByLowestCoverage.filter(([, c]) => c.lines === 0).length);
console.log('Services with <20% Coverage: ' + sortedByLowestCoverage.filter(([, c]) => c.lines < 20).length);
console.log('Services with <50% Coverage: ' + sortedByLowestCoverage.filter(([, c]) => c.lines < 50).length);
console.log('Services with >=60% Coverage: ' + sortedByLowestCoverage.filter(([, c]) => c.lines >= 60).length);
console.log('');

// Calculate average
const avg = sortedByLowestCoverage.reduce((sum, [, c]) => sum + c.lines, 0) / sortedByLowestCoverage.length;
console.log('Average Service Coverage: ' + avg.toFixed(2) + '%');
console.log('='.repeat(100));
