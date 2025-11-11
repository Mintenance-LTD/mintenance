#!/usr/bin/env node
/**
 * CSRF Protection Auto-Fix Script (JavaScript version)
 * 
 * This script automatically adds CSRF protection to vulnerable API endpoints.
 * 
 * Usage:
 *   node scripts/add-csrf-protection.js [--dry-run] [--fix]
 */

const fs = require('fs');
const path = require('path');

// Get the project root directory (where scripts folder is located)
const PROJECT_ROOT = path.resolve(__dirname, '..');
const API_DIR = path.join(PROJECT_ROOT, 'apps/web/app/api');
const CSRF_IMPORT_PATTERNS = [
  /import\s+.*requireCSRF.*from\s+['"]@\/lib\/csrf['"]/,
  /import\s+.*requireCSRF.*from\s+['"]@\/lib\/csrf-validator['"]/,
  /import\s+.*validateCSRF.*from\s+['"]@\/lib\/csrf['"]/,
  /import\s+.*validateCSRF.*from\s+['"]@\/lib\/csrf-validator['"]/,
];

const STATE_CHANGING_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];
const WEBHOOK_PATHS = ['/api/webhooks'];

function shouldExcludeFile(filePath) {
  const relativePath = path.relative(API_DIR, filePath);
  
  if (WEBHOOK_PATHS.some(webhookPath => relativePath.includes(webhookPath.replace('/api/', '')))) {
    return true;
  }
  
  if (filePath.includes('.test.') || filePath.includes('.spec.')) {
    return true;
  }
  
  return false;
}

function extractFunctionBody(content, startIndex) {
  let braceCount = 0;
  let inFunction = false;
  let bodyStart = -1;
  
  for (let i = startIndex; i < content.length; i++) {
    const char = content[i];
    
    if (char === '{') {
      if (!inFunction) {
        inFunction = true;
        bodyStart = i + 1;
      }
      braceCount++;
    } else if (char === '}') {
      braceCount--;
      if (inFunction && braceCount === 0) {
        return content.substring(bodyStart, i);
      }
    }
  }
  
  return '';
}

function hasCSRFProtection(content, functionName) {
  const hasCSRFImport = CSRF_IMPORT_PATTERNS.some(pattern => pattern.test(content));
  
  if (!hasCSRFImport) {
    return false;
  }
  
  const functionStart = content.indexOf(`export async function ${functionName}`);
  if (functionStart === -1) {
    return false;
  }
  
  const functionBody = extractFunctionBody(content, functionStart);
  
  const csrfPatterns = [
    /await\s+requireCSRF\s*\(/,
    /requireCSRF\s*\(/,
    /validateCSRF\s*\(/,
    /if\s*\(\s*!.*requireCSRF/,
  ];
  
  return csrfPatterns.some(pattern => pattern.test(functionBody));
}

function hasTryCatchBlock(content, functionName) {
  const functionStart = content.indexOf(`export async function ${functionName}`);
  if (functionStart === -1) {
    return false;
  }
  
  const functionBody = extractFunctionBody(content, functionStart);
  return /try\s*\{/.test(functionBody);
}

function findRouteFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findRouteFiles(filePath, fileList);
    } else if (file === 'route.ts' || file === 'route.js') {
      if (!shouldExcludeFile(filePath)) {
        fileList.push(filePath);
      }
    }
  }
  
  return fileList;
}

function scanRouteFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const endpoints = [];
  
  const functionRegex = /export\s+async\s+function\s+(\w+)\s*\(/g;
  let match;
  
  while ((match = functionRegex.exec(content)) !== null) {
    const functionName = match[1];
    const lineNumber = content.substring(0, match.index).split('\n').length;
    
    if (STATE_CHANGING_METHODS.includes(functionName)) {
      const hasCSRF = hasCSRFProtection(content, functionName);
      const hasTryCatch = hasTryCatchBlock(content, functionName);
      
      endpoints.push({
        file: filePath,
        method: functionName,
        hasCSRF,
        hasTryCatch,
        lineNumber,
        functionName,
      });
    }
  }
  
  return endpoints;
}

function generateReport() {
  const routeFiles = findRouteFiles(API_DIR);
  const endpoints = [];
  
  for (const file of routeFiles) {
    const fileEndpoints = scanRouteFile(file);
    endpoints.push(...fileEndpoints);
  }
  
  const protectedEndpoints = endpoints.filter(e => e.hasCSRF).length;
  const vulnerableEndpoints = endpoints.filter(e => !e.hasCSRF).length;
  
  return {
    totalEndpoints: endpoints.length,
    protectedEndpoints,
    vulnerableEndpoints,
    endpoints,
  };
}

function addCSRFProtection(filePath, endpoint) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;
  
  const hasCSRFImport = CSRF_IMPORT_PATTERNS.some(pattern => pattern.test(content));
  
  if (!hasCSRFImport) {
    const importRegex = /^import\s+.*from\s+['"].*['"];?$/gm;
    const imports = content.match(importRegex) || [];
    
    if (imports.length > 0) {
      const lastImport = imports[imports.length - 1];
      const lastImportIndex = content.lastIndexOf(lastImport);
      const insertIndex = lastImportIndex + lastImport.length;
      
      const csrfImport = "\nimport { requireCSRF } from '@/lib/csrf';";
      content = content.slice(0, insertIndex) + csrfImport + content.slice(insertIndex);
    } else {
      const nextRequestImport = content.match(/^import\s+.*NextRequest.*from\s+['"]next\/server['"];?$/m);
      if (nextRequestImport) {
        const insertIndex = nextRequestImport.index + nextRequestImport[0].length;
        const csrfImport = "\nimport { requireCSRF } from '@/lib/csrf';";
        content = content.slice(0, insertIndex) + csrfImport + content.slice(insertIndex);
      } else {
        const csrfImport = "import { requireCSRF } from '@/lib/csrf';\n";
        content = csrfImport + content;
      }
    }
  }
  
  const functionRegex = new RegExp(`export\\s+async\\s+function\\s+${endpoint.functionName}\\s*\\(`, 'g');
  const functionMatch = functionRegex.exec(content);
  
  if (!functionMatch) {
    console.error(`Could not find function ${endpoint.functionName} in ${filePath}`);
    return false;
  }
  
  let braceIndex = functionMatch.index + functionMatch[0].length;
  while (braceIndex < content.length && content[braceIndex] !== '{') {
    braceIndex++;
  }
  
  if (braceIndex >= content.length) {
    console.error(`Could not find function body for ${endpoint.functionName} in ${filePath}`);
    return false;
  }
  
  const functionBodyStart = braceIndex + 1;
  const functionBody = extractFunctionBody(content, functionMatch.index);
  
  if (/await\s+requireCSRF\s*\(/.test(functionBody) || /requireCSRF\s*\(/.test(functionBody)) {
    return false;
  }
  
  let insertIndex = functionBodyStart;
  
  while (insertIndex < content.length && /\s/.test(content[insertIndex])) {
    insertIndex++;
  }
  
  const tryCatchMatch = content.substring(functionBodyStart).match(/^\s*try\s*\{/);
  
  if (tryCatchMatch) {
    const tryIndex = functionBodyStart + tryCatchMatch.index + tryCatchMatch[0].length;
    insertIndex = tryIndex;
    
    while (insertIndex < content.length && /\s/.test(content[insertIndex])) {
      insertIndex++;
    }
  }
  
  const csrfCode = endpoint.hasTryCatch
    ? "\n    // CSRF protection\n    await requireCSRF(request);\n"
    : "\n  // CSRF protection\n  await requireCSRF(request);\n";
  
  content = content.slice(0, insertIndex) + csrfCode + content.slice(insertIndex);
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf-8');
    return true;
  }
  
  return false;
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const fix = args.includes('--fix');
  
  console.log('🔍 Scanning for CSRF vulnerabilities...\n');
  
  const report = generateReport();
  
  console.log('📊 Vulnerability Report:');
  console.log(`   Total endpoints: ${report.totalEndpoints}`);
  console.log(`   Protected: ${report.protectedEndpoints}`);
  console.log(`   Vulnerable: ${report.vulnerableEndpoints}\n`);
  
  if (report.vulnerableEndpoints === 0) {
    console.log('✅ All endpoints are protected!');
    return;
  }
  
  console.log('⚠️  Vulnerable Endpoints:\n');
  
  const vulnerableEndpoints = report.endpoints.filter(e => !e.hasCSRF);
  
  for (const endpoint of vulnerableEndpoints) {
    const relativePath = path.relative(process.cwd(), endpoint.file);
    console.log(`   ${endpoint.method.padEnd(6)} ${relativePath}`);
  }
  
  if (dryRun) {
    console.log('\n💡 Run with --fix to automatically add CSRF protection');
    return;
  }
  
  if (fix) {
    console.log('\n🔧 Adding CSRF protection...\n');
    
    let fixed = 0;
    let failed = 0;
    
    for (const endpoint of vulnerableEndpoints) {
      try {
        if (addCSRFProtection(endpoint.file, endpoint)) {
          const relativePath = path.relative(process.cwd(), endpoint.file);
          console.log(`   ✅ Fixed: ${endpoint.method} ${relativePath}`);
          fixed++;
        } else {
          const relativePath = path.relative(process.cwd(), endpoint.file);
          console.log(`   ⚠️  Skipped: ${endpoint.method} ${relativePath} (may already have protection or needs manual review)`);
        }
      } catch (error) {
        const relativePath = path.relative(process.cwd(), endpoint.file);
        console.error(`   ❌ Failed: ${endpoint.method} ${relativePath}`);
        console.error(`      Error: ${error.message || String(error)}`);
        failed++;
      }
    }
    
    console.log(`\n✅ Fixed: ${fixed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`\n⚠️  Please review the changes and test the endpoints!`);
  } else {
    console.log('\n💡 Run with --fix to automatically add CSRF protection');
  }
}

if (require.main === module) {
  main();
}

module.exports = { generateReport, addCSRFProtection };

