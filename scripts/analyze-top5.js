const fs = require('fs');
const data = JSON.parse(fs.readFileSync('any-types-report.json', 'utf8'));

const top5Files = [
  'ReportingService.ts',
  'FeedbackProcessingService.ts', 
  'NotificationController.ts',
  'ExportService.ts',
  'InsightsService.ts'
];

const top5 = data.filter(f => 
  top5Files.some(name => f.file.includes(name))
);

console.log('Top 5 Files - Pattern Analysis:\n');

top5.forEach(f => {
  const filename = f.file.split('\\').pop();
  console.log(`${filename} (${f.matches.length} any types):`);
  
  // Show first 5 samples
  f.matches.slice(0, 5).forEach(m => {
    const sample = m.content.substring(0, 70).trim();
    console.log(`  Line ${m.line}: ${sample}`);
  });
  console.log('');
});
