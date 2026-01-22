#!/usr/bin/env node
/**
 * Fix Common Mock Configuration Issues
 * Adds proper default exports and mock structures
 */

const fs = require('fs');

const mockPatterns = {
  // React Hot Toast - needs default export
  'react-hot-toast': {
    pattern: /vi\.mock\(['"]react-hot-toast['"]\s*\)/g,
    replacement: `vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}))`,
  },

  // Next Navigation - comprehensive mock
  'next/navigation': {
    pattern: /vi\.mock\(['"]next\/navigation['"]\s*\)/g,
    replacement: `vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  })),
  useParams: vi.fn(() => ({})),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  usePathname: vi.fn(() => '/'),
  redirect: vi.fn(),
  notFound: vi.fn(),
}))`,
  },

  // Supabase client - partial mock pattern
  '@/lib/supabase/client': {
    pattern: /vi\.mock\(['"]@\/lib\/supabase\/client['"]\s*\)/g,
    replacement: `vi.mock('@/lib/supabase/client', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    createClient: vi.fn(() => ({
      from: vi.fn(),
      auth: {
        getSession: vi.fn(),
        signOut: vi.fn(),
        onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      },
    })),
  };
})`,
  },
};

function fixMockConfigurations(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  Object.entries(mockPatterns).forEach(([name, config]) => {
    // Check if file has the incomplete mock
    if (config.pattern.test(content)) {
      // Check if it's NOT already properly configured
      if (!content.includes(config.replacement.substring(0, 50))) {
        content = content.replace(config.pattern, config.replacement);
        modified = true;
        console.log(`  ✅ Fixed ${name} mock`);
      }
    }
  });

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }

  return false;
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage: node fix-mock-configurations.js <file1> <file2> ...');
  console.error('   or: find . -name "*.test.ts*" | xargs node fix-mock-configurations.js');
  process.exit(1);
}

let fixedCount = 0;
let skippedCount = 0;

args.forEach(filePath => {
  try {
    console.log(`\nChecking: ${filePath}`);
    if (fixMockConfigurations(filePath)) {
      fixedCount++;
    } else {
      console.log(`  ⏭️  No fixes needed`);
      skippedCount++;
    }
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
  }
});

console.log(`\n✅ Fixed ${fixedCount} files, ${skippedCount} files already correct`);
