const fs = require('fs');
const path = require('path');

// Find all test files
function findTestFiles(dir, files = []) {
  try {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory() && !item.name.includes('node_modules') && !item.name.includes('_archive')) {
        findTestFiles(fullPath, files);
      } else if (item.isFile() && (item.name.endsWith('.test.tsx') || item.name.endsWith('.test.ts'))) {
        files.push(fullPath);
      }
    }
  } catch (e) {
    // ignore
  }
  return files;
}

const testFiles = findTestFiles('.');
let fixedCount = 0;

testFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;

  // Fix tests that call metadata as a function when it's an object
  // Pattern: expect(metadata('input')).toBeDefined();
  content = content.replace(
    /expect\(metadata\('input'\)\)\.toBeDefined\(\);/g,
    'expect(metadata).toBeDefined();'
  );

  // Pattern: expect(() => metadata(null)).not.toThrow();
  content = content.replace(
    /expect\(\(\) => metadata\(null\)\)\.not\.toThrow\(\);/g,
    'expect(metadata).toBeDefined();'
  );

  if (content !== original) {
    fs.writeFileSync(file, content);
    fixedCount++;
    console.log('Fixed:', file);
  }
});

console.log('\\nTotal files fixed:', fixedCount);
