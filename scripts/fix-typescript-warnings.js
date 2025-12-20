#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 TypeScript Warning Fixer');
console.log('==========================\n');

// Function to run TypeScript check and capture warnings
function getTypeScriptWarnings() {
  try {
    execSync('npx tsc --noEmit', { stdio: 'pipe' });
    return [];
  } catch (error) {
    const output = error.stdout?.toString() || error.stderr?.toString() || '';
    return output
      .split('\n')
      .filter((line) => line.trim() && line.includes('error TS'));
  }
}

// Function to fix common TypeScript issues
function fixCommonIssues() {
  console.log('📝 Applying common TypeScript fixes...\n');

  // Fix 1: Add proper imports for React components
  const testFiles = findFiles('./src', /\.test\.(ts|tsx)$/);
  testFiles.forEach((file) => {
    let content = fs.readFileSync(file, 'utf8');

    // Add React import if JSX is used but React not imported
    if (content.includes('<') && !content.includes('import React')) {
      content = `import React from 'react';\n${content}`;
      fs.writeFileSync(file, content);
      console.log(`✅ Fixed React import in ${file}`);
    }
  });

  // Fix 2: Add explicit return types for problematic functions
  const serviceFiles = findFiles('./src/services', /\.ts$/);
  serviceFiles.forEach((file) => {
    let content = fs.readFileSync(file, 'utf8');

    // Add Promise<void> return type where missing
    content = content.replace(
      /async (\w+)\([^)]*\)\s*{/g,
      (match, funcName) => {
        if (!match.includes(': Promise<')) {
          return match.replace('{', ': Promise<void> {');
        }
        return match;
      }
    );

    fs.writeFileSync(file, content);
  });

  // Fix 3: Update global declarations
  const globalDefsPath = './src/types/globals.d.ts';
  if (fs.existsSync(globalDefsPath)) {
    const globalDefs = `// Global type declarations for React Native and Expo
declare var __DEV__: boolean;

// Extend global object for React Native specific properties
declare global {
  var __DEV__: boolean;
  
  namespace NodeJS {
    interface Global {
      __DEV__: boolean;
    }
  }
  
  interface Window {
    __DEV__?: boolean;
  }
  
  // React Native globals
  var HermesInternal: any;
  var nativePerformanceNow: () => number;
  var nativeCallSyncHook: any;
}

export {};`;

    fs.writeFileSync(globalDefsPath, globalDefs);
    console.log('✅ Updated global type definitions');
  }

  console.log('\n📊 Running TypeScript check...\n');
}

// Helper function to find files recursively
function findFiles(dir, pattern) {
  let results = [];

  if (!fs.existsSync(dir)) return results;

  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        results = results.concat(findFiles(filePath, pattern));
      }
    } else if (pattern.test(file)) {
      results.push(filePath);
    }
  }

  return results;
}

// Function to create type definition files for missing modules
function createMissingTypeDefs() {
  console.log('📦 Creating missing type definitions...\n');

  const typesDir = './src/types';
  if (!fs.existsSync(typesDir)) {
    fs.mkdirSync(typesDir, { recursive: true });
  }

  // Create common missing module declarations
  const moduleDefsPath = path.join(typesDir, 'modules.d.ts');
  const moduleDefs = `// Type declarations for modules without official types

declare module '@react-native-community/netinfo' {
  export interface NetInfoState {
    isConnected: boolean | null;
    isInternetReachable: boolean | null;
    type: string;
    details: any;
  }
  
  export default {
    fetch: () => Promise<NetInfoState>;
    addEventListener: (listener: (state: NetInfoState) => void) => () => void;
  };
}

declare module 'react-native-deck-swiper' {
  import { Component } from 'react';
  
  export interface SwipeDirection {
    x: number;
    y: number;
  }
  
  export interface DeckSwiperProps {
    cards: any[];
    onSwipedLeft?: (index: number) => void;
    onSwipedRight?: (index: number) => void;
    onSwipedTop?: (index: number) => void;
    onSwipedBottom?: (index: number) => void;
    onSwiped?: (index: number) => void;
    renderCard: (card: any, index: number) => JSX.Element;
    cardIndex?: number;
    backgroundColor?: string;
    infinite?: boolean;
    showSecondCard?: boolean;
    stackSize?: number;
    overlayLabels?: any;
    animateOverlayLabelsOpacity?: boolean;
    animateCardOpacity?: boolean;
  }
  
  export default class DeckSwiper extends Component<DeckSwiperProps> {}
}

declare module 'react-native-elements' {
  export * from 'react-native-elements/src';
}`;

  fs.writeFileSync(moduleDefsPath, moduleDefs);
  console.log('✅ Created missing module type definitions');
}

// Main execution
async function main() {
  try {
    // Apply common fixes
    fixCommonIssues();

    // Create missing type definitions
    createMissingTypeDefs();

    // Check remaining warnings
    const warnings = getTypeScriptWarnings();

    if (warnings.length === 0) {
      console.log('🎉 All TypeScript warnings have been fixed!\n');
      return;
    }

    console.log(`⚠️  ${warnings.length} TypeScript warnings remaining:\n`);
    warnings.slice(0, 10).forEach((warning) => {
      console.log(`   ${warning}`);
    });

    if (warnings.length > 10) {
      console.log(`   ... and ${warnings.length - 10} more warnings`);
    }

    console.log('\n💡 Some warnings may require manual fixes.');
    console.log('   Run "npm run type-check" to see detailed warnings.');
  } catch (error) {
    console.error('❌ Error fixing TypeScript warnings:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { fixCommonIssues, createMissingTypeDefs };
