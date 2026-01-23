const data = require('./console-statements-report.json');

const categories = {
  scripts: 0,
  logger: 0,
  errorHandlers: 0,
  components: 0,
  services: 0,
  other: 0
};

const scriptFiles = [];
const componentFiles = [];
const serviceFiles = [];

data.forEach(f => {
  const path = f.file;
  const count = f.matches.length;
  
  if (path.includes('/scripts/') || path.includes('\scripts\')) {
    categories.scripts += count;
    scriptFiles.push({ file: path.split('\').pop(), count });
  } else if (path.includes('logger.ts') || path.includes('ErrorHandler')) {
    categories.logger += count;
  } else if (path.includes('.catch(console')) {
    categories.errorHandlers += count;
  } else if (path.includes('/components/') || path.includes('\components\')) {
    categories.components += count;
    componentFiles.push({ file: path.split('\').pop(), count });
  } else if (path.includes('/services/') || path.includes('\services\') || path.includes('Service.ts')) {
    categories.services += count;
    serviceFiles.push({ file: path.split('\').pop(), count });
  } else {
    categories.other += count;
  }
});

console.log('Console Statement Distribution:');
console.log('==============================');
Object.entries(categories)
  .sort((a,b) => b[1] - a[1])
  .forEach(([cat, count]) => console.log(`${cat}: ${count}`));

console.log('\nTop Script Files:');
scriptFiles.sort((a,b) => b.count - a.count)
  .slice(0,10)
  .forEach(f => console.log(`  ${f.file}: ${f.count}`));

console.log('\nTop Component Files:');
componentFiles.sort((a,b) => b.count - a.count)
  .slice(0,5)
  .forEach(f => console.log(`  ${f.file}: ${f.count}`));

console.log('\nTop Service Files:');
serviceFiles.sort((a,b) => b.count - a.count)
  .slice(0,5)
  .forEach(f => console.log(`  ${f.file}: ${f.count}`));
