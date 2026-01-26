#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

// Priority files to fix first (with high any count)
const PRIORITY_FILES = [
  'apps/mobile/src/services/RealtimeService.ts',
  'apps/mobile/src/services/OfflineManager.ts',
  'apps/mobile/src/test-utils/navigationMockFactory.ts',
];

// Define proper types for common entities
const TYPE_DEFINITIONS = `
// Common data types used throughout the application
export interface Job {
  id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export interface Bid {
  id: string;
  job_id: string;
  contractor_id: string;
  amount: number;
  message: string;
  status: string;
  created_at: string;
  [key: string]: unknown;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  [key: string]: unknown;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  [key: string]: unknown;
}

export interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: string;
  [key: string]: unknown;
}
`;

async function fixRealtimeService() {
  const filePath = 'apps/mobile/src/services/RealtimeService.ts';
  
  try {
    let content = await fs.readFile(filePath, 'utf8');
    
    // Replace specific any types with proper types
    content = content.replace(/job: any/g, 'job: Job');
    content = content.replace(/bid: any/g, 'bid: Bid');
    content = content.replace(/message: any/g, 'message: Message');
    content = content.replace(/notification: any/g, 'notification: Notification');
    content = content.replace(/changes: any/g, 'changes: Partial<Job>');
    content = content.replace(/conversation: any/g, 'conversation: { id: string; participants: string[]; [key: string]: unknown }');
    content = content.replace(/userInfo: any/g, 'userInfo: User');
    content = content.replace(/mockSocket: any/g, 'mockSocket: { connected: boolean; emit: (event: string, data: unknown) => void; on: (event: string, handler: Function) => void; disconnect: () => void } | null');
    content = content.replace(/data: any/g, 'data: unknown');
    content = content.replace(/EventListener<T = any>/g, 'EventListener<T = unknown>');
    content = content.replace(/z\.any\(\)/g, 'z.unknown()');
    
    // Add import for types if not already present
    if (!content.includes("import type { Job, Bid, Message, Notification, User }")) {
      content = "import type { Job, Bid, Message, Notification, User } from '../types/entities';\n" + content;
    }
    
    await fs.writeFile(filePath, content, 'utf8');
    console.log(`✓ Fixed RealtimeService.ts`);
    return true;
  } catch (error) {
    console.error(`Error fixing RealtimeService.ts: ${error.message}`);
    return false;
  }
}

async function createTypesFile() {
  const typesDir = 'apps/mobile/src/types';
  const typesFile = path.join(typesDir, 'entities.ts');
  
  try {
    await fs.mkdir(typesDir, { recursive: true });
    await fs.writeFile(typesFile, TYPE_DEFINITIONS, 'utf8');
    console.log(`✓ Created types/entities.ts`);
    return true;
  } catch (error) {
    console.error(`Error creating types file: ${error.message}`);
    return false;
  }
}

async function fixCommonPatterns(filePath) {
  try {
    let content = await fs.readFile(filePath, 'utf8');
    let originalContent = content;
    
    // Common safe replacements
    const replacements = [
      [/:\s*any\[\]/g, ': unknown[]'],
      [/Array<any>/g, 'Array<unknown>'],
      [/Promise<any>/g, 'Promise<unknown>'],
      [/\(error:\s*any\)/g, '(error: Error | unknown)'],
      [/\(e:\s*any\)/g, '(e: unknown)'],
      [/\(data:\s*any\)/g, '(data: unknown)'],
      [/\(response:\s*any\)/g, '(response: unknown)'],
      [/\(result:\s*any\)/g, '(result: unknown)'],
      [/\(value:\s*any\)/g, '(value: unknown)'],
      [/\bas\s+any\b/g, 'as unknown'],
      [/<any>/g, '<unknown>'],
    ];
    
    for (const [pattern, replacement] of replacements) {
      content = content.replace(pattern, replacement);
    }
    
    if (content !== originalContent) {
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
  console.log('🔧 Fixing TypeScript "any" types...\n');
  
  // Step 1: Create types file
  await createTypesFile();
  
  // Step 2: Fix RealtimeService specifically
  await fixRealtimeService();
  
  // Step 3: Fix other priority files
  let totalFixed = 0;
  
  for (const file of PRIORITY_FILES) {
    if (file !== 'apps/mobile/src/services/RealtimeService.ts') {
      const fixed = await fixCommonPatterns(file);
      if (fixed) {
        console.log(`✓ Fixed ${path.basename(file)}`);
        totalFixed++;
      }
    }
  }
  
  console.log(`\n✅ Fixed ${totalFixed + 2} files`);
  console.log('💡 Remember to run TypeScript compiler to check for errors!');
}

main().catch(console.error);
