#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

async function fixFile(filePath) {
  try {
    let content = await fs.readFile(filePath, 'utf8');
    let original = content;
    
    // Simple replacements
    content = content.replace(/let mockSupabase: any/g, 'let mockSupabase: { from: jest.Mock; auth: { getUser: jest.Mock } }');
    content = content.replace(/let tokenService: any/g, 'let tokenService: { validateToken: jest.Mock; rotateToken: jest.Mock }');
    content = content.replace(/let mfaService: any/g, 'let mfaService: { generateTOTP: jest.Mock; verifyTOTP: jest.Mock }');
    content = content.replace(/context\?: any/g, 'context?: { params?: Record<string, string> }');
    content = content.replace(/params\?: any/g, 'params?: Record<string, string | string[]>');
    content = content.replace(/value: any/g, 'value: unknown');
    content = content.replace(/metric: any/g, 'metric: { name: string; value: number; delta?: number; id: string }');
    content = content.replace(/error: any/g, 'error: Error | { message: string; code?: string } | null');
    
    // Generic any patterns
    content = content.replace(/:\s*any\[\]/g, ': unknown[]');
    content = content.replace(/Array<any>/g, 'Array<unknown>');
    content = content.replace(/Promise<any>/g, 'Promise<unknown>');
    content = content.replace(/\bas\s+any\b/g, 'as unknown');
    
    if (content !== original) {
      await fs.writeFile(filePath, content, 'utf8');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error fixing ${filePath}: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🔧 Fixing any types in web/lib...\n');
  
  const files = [
    'apps/web/lib/auth/__tests__/token-breach-detection.test.ts',
    'apps/web/lib/csrf-protection.ts',
    'apps/web/lib/error-handler.ts',
    'apps/web/lib/hooks/queries/__test-component.tsx',
    'apps/web/lib/mfa/__tests__/mfa-service.test.ts',
    'apps/web/lib/monitoring/QueryPerformanceMonitor.ts',
    'apps/web/lib/performance/web-vitals.ts',
    'apps/web/lib/queries/airbnb-optimized-v2.ts',
  ];
  
  let fixed = 0;
  
  for (const file of files) {
    const result = await fixFile(file);
    if (result) {
      console.log(`✓ Fixed ${path.basename(file)}`);
      fixed++;
    }
  }
  
  console.log(`\n✅ Fixed ${fixed} files`);
}

main().catch(console.error);
