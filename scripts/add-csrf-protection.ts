#!/usr/bin/env node
/**
 * CSRF Vulnerability Scanner and Auto-Fix Script
 * 
 * This script:
 * 1. Scans all API route files for state-changing methods (POST, PUT, PATCH, DELETE)
 * 2. Identifies endpoints missing CSRF protection
 * 3. Automatically adds CSRF protection to vulnerable endpoints
 * 
 * Usage:
 *   node scripts/add-csrf-protection.js [--dry-run] [--fix]
 * 
 * Options:
 *   --dry-run: Only report vulnerabilities without fixing
 *   --fix: Automatically add CSRF protection to vulnerable endpoints
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_DIR = path.join(__dirname, '../apps/web/app/api');
const CSRF_IMPORT_PATTERNS = [
  /import\s+.*requireCSRF.*from\s+['"]@\/lib\/csrf['"]/,
  /import\s+.*requireCSRF.*from\s+['"]@\/lib\/csrf-validator['"]/,
  /import\s+.*validateCSRF.*from\s+['"]@\/lib\/csrf['"]/,
  /import\s+.*validateCSRF.*from\s+['"]@\/lib\/csrf-validator['"]/,
];

const STATE_CHANGING_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];
const WEBHOOK_PATHS = ['/api/webhooks'];

interface EndpointInfo {
  file: string;
  method: string;
  hasCSRF: boolean;
  hasTryCatch: boolean;
  lineNumber: number;
  functionName: string;
}

interface VulnerabilityReport {
  totalEndpoints: number;
  protectedEndpoints: number;
  vulnerableEndpoints: number;
  endpoints: EndpointInfo[];
}

/**
 * Check if a file path should be excluded from CSRF checks
 */
function shouldExcludeFile(filePath: string): boolean {
  const relativePath = path.relative(API_DIR, filePath);
  
  // Exclude webhook endpoints (they use signature validation)
  if (WEBHOOK_PATHS.some(webhookPath => relativePath.includes(webhookPath.replace('/api/', '')))) {
    return true;
  }
  
  // Exclude test files
  if (filePath.includes('.test.') || filePath.includes('.spec.')) {
    return true;
  }
  
  return false;
}

/**
 * Check if endpoint has CSRF protection
 */
function hasCSRFProtection(content: string, functionName: string): boolean {
  // Check for CSRF import
  const hasCSRFImport = CSRF_IMPORT_PATTERNS.some(pattern => pattern.test(content));
  
  if (!hasCSRFImport) {
    return false;
  }
  
  // Check if CSRF is called in the function
  const functionStart = content.indexOf(`export async function ${functionName}`);
  if (functionStart === -1) {
    return false;
  }
  
  // Find the function body
  const functionBody = extractFunctionBody(content, functionStart);
  
  // Check for CSRF calls
  const csrfPatterns = [
    /await\s+requireCSRF\s*\(/,
    /requireCSRF\s*\(/,
    /validateCSRF\s*\(/,
    /if\s*\(\s*!.*requireCSRF/,
  ];
  
  return csrfPatterns.some(pattern => pattern.test(functionBody));
}

/**
 * Extract function body from content
 */
function extractFunctionBody(content: string, startIndex: number): string {
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

/**
 * Check if function has try-catch block
 */
function hasTryCatch(content: string, functionName: string): boolean {
  const functionStart = content.indexOf(`export async function ${functionName}`);
  if (functionStart === -1) {
    return false;
  }
  
  const functionBody = extractFunctionBody(content, functionStart);
  return /try\s*\{/.test(functionBody);
}

/**
 * Find all API route files
 */
function findRouteFiles(dir: string, fileList: string[] = []): string[] {
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

/**
 * Scan a single route file for vulnerabilities
 */
function scanRouteFile(filePath: string): EndpointInfo[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const endpoints: EndpointInfo[] = [];
  
  // Find all exported functions
  const functionRegex = /export\s+async\s+function\s+(\w+)\s*\(/g;
  let match;
  
  while ((match = functionRegex.exec(content)) !== null) {
    const functionName = match[1];
    const lineNumber = content.substring(0, match.index).split('\n').length;
    
    // Check if it's a state-changing method
    if (STATE_CHANGING_METHODS.includes(functionName)) {
      const hasCSRF = hasCSRFProtection(content, functionName);
      const hasTryCatch = hasTryCatch(content, functionName);
      
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

/**
 * Generate vulnerability report
 */
function generateReport(): VulnerabilityReport {
  const routeFiles = findRouteFiles(API_DIR);
  const endpoints: EndpointInfo[] = [];
  
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

/**
 * Add CSRF protection to a vulnerable endpoint
 */
function addCSRFProtection(filePath: string, endpoint: EndpointInfo): boolean {
  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;
  
  // Check if CSRF import exists
  const hasCSRFImport = CSRF_IMPORT_PATTERNS.some(pattern => pattern.test(content));
  
  // Add CSRF import if missing
  if (!hasCSRFImport) {
    // Find the last import statement
    const importRegex = /^import\s+.*from\s+['"].*['"];?$/gm;
    const imports = content.match(importRegex) || [];
    
    if (imports.length > 0) {
      const lastImport = imports[imports.length - 1];
      const lastImportIndex = content.lastIndexOf(lastImport);
      const insertIndex = lastImportIndex + lastImport.length;
      
      // Add CSRF import after last import
      const csrfImport = "\nimport { requireCSRF } from '@/lib/csrf';";
      content = content.slice(0, insertIndex) + csrfImport + content.slice(insertIndex);
    } else {
      // No imports, add at the top after NextRequest import
      const nextRequestImport = content.match(/^import\s+.*NextRequest.*from\s+['"]next\/server['"];?$/m);
      if (nextRequestImport) {
        const insertIndex = nextRequestImport.index! + nextRequestImport[0].length;
        const csrfImport = "\nimport { requireCSRF } from '@/lib/csrf';";
        content = content.slice(0, insertIndex) + csrfImport + content.slice(insertIndex);
      } else {
        // Add at the very beginning
        const csrfImport = "import { requireCSRF } from '@/lib/csrf';\n";
        content = csrfImport + content;
      }
    }
  }
  
  // Find the function
  const functionRegex = new RegExp(`export\\s+async\\s+function\\s+${endpoint.functionName}\\s*\\(`, 'g');
  const functionMatch = functionRegex.exec(content);
  
  if (!functionMatch) {
    console.error(`Could not find function ${endpoint.functionName} in ${filePath}`);
    return false;
  }
  
  // Find the opening brace
  let braceIndex = functionMatch.index + functionMatch[0].length;
  while (braceIndex < content.length && content[braceIndex] !== '{') {
    braceIndex++;
  }
  
  if (braceIndex >= content.length) {
    console.error(`Could not find function body for ${endpoint.functionName} in ${filePath}`);
    return false;
  }
  
  const functionBodyStart = braceIndex + 1;
  
  // Check if function already has CSRF protection
  const functionBody = extractFunctionBody(content, functionMatch.index);
  if (/await\s+requireCSRF\s*\(/.test(functionBody) || /requireCSRF\s*\(/.test(functionBody)) {
    return false; // Already has CSRF
  }
  
  // Find where to insert CSRF check
  let insertIndex = functionBodyStart;
  
  // Skip whitespace
  while (insertIndex < content.length && /\s/.test(content[insertIndex])) {
    insertIndex++;
  }
  
  // Check if function has try-catch
  const tryCatchMatch = content.substring(functionBodyStart).match(/^\s*try\s*\{/);
  
  if (tryCatchMatch) {
    // Insert after try {
    const tryIndex = functionBodyStart + tryCatchMatch.index! + tryCatchMatch[0].length;
    insertIndex = tryIndex;
    
    // Skip whitespace after try {
    while (insertIndex < content.length && /\s/.test(content[insertIndex])) {
      insertIndex++;
    }
  }
  
  // Insert CSRF protection
  const csrfCode = endpoint.hasTryCatch
    ? "\n    // CSRF protection\n    await requireCSRF(request);\n"
    : "\n  // CSRF protection\n  await requireCSRF(request);\n";
  
  content = content.slice(0, insertIndex) + csrfCode + content.slice(insertIndex);
  
  // Write back if changed
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf-8');
    return true;
  }
  
  return false;
}

/**
 * Main execution
 */
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
        console.error(`      Error: ${error instanceof Error ? error.message : String(error)}`);
        failed++;
      }
    }
    
    console.log(`\n✅ Fixed: ${fixed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`\n⚠️  Please review the changes and test the endpoints!`);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { generateReport, addCSRFProtection };

