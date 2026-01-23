const data = require('./any-types-report.json');

const fileCounts = {};
data.forEach(item => {
  const file = item.file;
  fileCounts[file] = item.matches.length;
});

const sorted = Object.entries(fileCounts).sort((a,b) => b[1] - a[1]).slice(0, 15);

sorted.forEach(([file, count], i) => {
  const shortPath = file.replace(/.*mintenance-clean[\\\/]/, '');
  console.log(`${i+1}. ${shortPath} - ${count} any types`);
});
