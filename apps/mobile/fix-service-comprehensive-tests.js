#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const glob = require('glob');

console.log('🔧 Fixing service comprehensive tests...\n');

// Find service comprehensive test files
const testFiles = glob.sync('src/__tests__/services/comprehensive/*.test.ts', {
  cwd: __dirname,
  absolute: true,
});

// Also check for other comprehensive service tests
const additionalTests = glob.sync('src/__tests__/services/*.comprehensive.test.ts', {
  cwd: __dirname,
  absolute: true,
});

const allTests = [...testFiles, ...additionalTests];

let totalFixes = 0;

allTests.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;
  const fileName = path.basename(file);
  let modified = false;

  // Fix UserService comprehensive test
  if (fileName.includes('UserService')) {
    // Add proper mocks at the beginning
    const userServiceMocks = `
jest.mock('../../../config/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      updateUser: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
          maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
        })),
        single: jest.fn(() => Promise.resolve({ data: null, error: null })),
      })),
      insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
      update: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
  },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));
`;

    if (!content.includes("jest.mock('../../../config/supabase'")) {
      const firstImport = content.indexOf('import');
      content = userServiceMocks + '\n' + content;
      modified = true;
    }
  }

  // Fix NotificationService comprehensive test
  if (fileName.includes('NotificationService')) {
    const notificationMocks = `
jest.mock('../../../config/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
      insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
      update: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
  },
}));

jest.mock('expo-notifications', () => ({
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getExpoPushTokenAsync: jest.fn(() => Promise.resolve({ data: 'ExpoToken' })),
  setNotificationHandler: jest.fn(),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve('notification-id')),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
  addNotificationReceivedListener: jest.fn((handler) => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn((handler) => ({ remove: jest.fn() })),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
}));
`;

    if (!content.includes("jest.mock('expo-notifications'")) {
      const firstImport = content.indexOf('import');
      content = notificationMocks + '\n' + content;
      modified = true;
    }
  }

  // Fix import paths for test-utils if needed
  if (content.includes("from '../../../test-utils'")) {
    content = content.replace(
      /from ['"]\.\.\/\.\.\/\.\.\/test-utils['"]/g,
      `from '../../test-utils'`
    );
    modified = true;
  }

  // Fix relative imports for the service being tested
  if (!fileName.includes('UserService') && !fileName.includes('NotificationService')) {
    // For other services, ensure proper mocks
    const genericMocks = `
jest.mock('../../../config/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
      update: jest.fn(() => Promise.resolve({ data: null, error: null })),
      delete: jest.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  },
}));
`;

    if (!content.includes("jest.mock('../../../config/supabase'") && !content.includes("jest.mock('..")) {
      const firstImport = content.indexOf('import');
      content = genericMocks + '\n' + content;
      modified = true;
    }
  }

  if (modified && content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    totalFixes++;
    console.log(`  Fixed ${fileName}`);
  }
});

console.log(`\n📊 Summary:`);
console.log(`  Total files fixed: ${totalFixes}`);
console.log('\n✨ Service comprehensive test fixes complete!');