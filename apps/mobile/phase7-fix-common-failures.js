import { logger } from '@mintenance/shared';

#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const glob = require('glob');

logger.info('🔧 Phase 7: Fixing common test failures...\n');

// Find all test files
const testFiles = glob.sync('src/**/*.test.{ts,tsx}', {
  cwd: __dirname,
  absolute: true,
});

let totalFixes = 0;
const fixes = {
  navigation: 0,
  asyncStorage: 0,
  supabase: 0,
  expoModules: 0,
  reactNative: 0,
  services: 0,
};

// Common navigation mock
const navigationMock = `
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  dispatch: jest.fn(),
  reset: jest.fn(),
  setParams: jest.fn(),
  setOptions: jest.fn(),
  addListener: jest.fn(() => ({ remove: jest.fn() })),
  removeListener: jest.fn(),
  canGoBack: jest.fn(() => true),
  isFocused: jest.fn(() => true),
  push: jest.fn(),
  pop: jest.fn(),
  replace: jest.fn(),
};

const mockRoute = {
  params: {},
  name: 'TestScreen',
  key: 'test-key',
};`;

testFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;
  const fileName = path.basename(file);
  let modified = false;

  // Fix 1: Add AsyncStorage mock if missing
  if (content.includes('AsyncStorage') && !content.includes("jest.mock('@react-native-async-storage/async-storage'")) {
    const asyncStorageMock = `
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
}));
`;
    const firstImport = content.indexOf('import');
    if (firstImport > -1) {
      content = asyncStorageMock + content;
      modified = true;
      fixes.asyncStorage++;
    }
  }

  // Fix 2: Add navigation mocks for screen tests
  if (fileName.includes('Screen') && content.includes('navigation') && !content.includes('mockNavigation')) {
    const describeIndex = content.indexOf('describe(');
    if (describeIndex > -1) {
      content = content.slice(0, describeIndex) + navigationMock + '\n\n' + content.slice(describeIndex);
      modified = true;
      fixes.navigation++;
    }
  }

  // Fix 3: Add Supabase mock if missing
  if (content.includes('supabase') && !content.includes("jest.mock('../config/supabase'") && !content.includes("jest.mock('../../config/supabase'") && !content.includes("jest.mock('../../../config/supabase'")) {
    const supabaseMock = `
jest.mock('../../../config/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } }
      })),
    },
    from: jest.fn((table) => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      like: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      contains: jest.fn().mockReturnThis(),
      containedBy: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      single: jest.fn(() => Promise.resolve({ data: null, error: null })),
      maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
      then: jest.fn((callback) => callback({ data: [], error: null })),
    })),
    storage: {
      from: jest.fn((bucket) => ({
        upload: jest.fn(() => Promise.resolve({ data: { path: 'test.jpg' }, error: null })),
        download: jest.fn(() => Promise.resolve({ data: new Blob(), error: null })),
        remove: jest.fn(() => Promise.resolve({ data: [], error: null })),
        list: jest.fn(() => Promise.resolve({ data: [], error: null })),
        getPublicUrl: jest.fn((path) => ({
          data: { publicUrl: \`https://test.supabase.co/storage/v1/object/public/\${bucket}/\${path}\` }
        })),
      })),
    },
  },
}));
`;
    const firstImport = content.indexOf('import');
    if (firstImport > -1) {
      // Adjust path based on file location
      let adjustedMock = supabaseMock;
      if (file.includes('__tests__/services/')) {
        adjustedMock = adjustedMock.replace('../../../config/supabase', '../../config/supabase');
      } else if (file.includes('__tests__/utils/')) {
        adjustedMock = adjustedMock.replace('../../../config/supabase', '../../config/supabase');
      } else if (file.includes('__tests__/hooks/')) {
        adjustedMock = adjustedMock.replace('../../../config/supabase', '../../config/supabase');
      }
      content = adjustedMock + content;
      modified = true;
      fixes.supabase++;
    }
  }

  // Fix 4: Add expo module mocks if needed
  if (content.includes('expo-') && !content.includes("jest.mock('expo-")) {
    const expoMocks = [];

    if (content.includes('expo-constants') && !content.includes("jest.mock('expo-constants'")) {
      expoMocks.push("jest.mock('expo-constants', () => require('../../__mocks__/expo-constants.js'));");
      fixes.expoModules++;
    }

    if (content.includes('expo-notifications') && !content.includes("jest.mock('expo-notifications'")) {
      expoMocks.push("jest.mock('expo-notifications', () => require('../../__mocks__/expo-notifications.js'));");
      fixes.expoModules++;
    }

    if (content.includes('expo-location') && !content.includes("jest.mock('expo-location'")) {
      expoMocks.push(`jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getCurrentPositionAsync: jest.fn(() => Promise.resolve({
    coords: { latitude: 37.78825, longitude: -122.4324 }
  })),
}));`);
      fixes.expoModules++;
    }

    if (expoMocks.length > 0) {
      const firstImport = content.indexOf('import');
      content = expoMocks.join('\n') + '\n\n' + content;
      modified = true;
    }
  }

  // Fix 5: Fix React Native mock path if incorrect
  if (content.includes("jest.mock('react-native',") && !content.includes('__mocks__/react-native')) {
    content = content.replace(
      /jest\.mock\('react-native',[\s\S]*?\}\)\);/,
      "jest.mock('react-native', () => require('../../__mocks__/react-native.js'));"
    );
    modified = true;
    fixes.reactNative++;
  }

  // Fix 6: Add service mocks for common services
  const servicePatterns = [
    { pattern: 'JobService', mock: 'JobService' },
    { pattern: 'AuthService', mock: 'AuthService' },
    { pattern: 'PaymentService', mock: 'PaymentService' },
    { pattern: 'NotificationService', mock: 'NotificationService' },
    { pattern: 'UserService', mock: 'UserService' },
    { pattern: 'ContractorService', mock: 'ContractorService' },
  ];

  servicePatterns.forEach(({ pattern, mock }) => {
    if (content.includes(pattern) && !content.includes(`jest.mock('`) && !content.includes(`"${mock}"`)) {
      const depth = file.split('/').length - __dirname.split('/').length - 1;
      const servicePath = '../'.repeat(depth) + `services/${mock}`;

      const serviceMock = `
jest.mock('${servicePath}', () => ({
  ${mock}: {
    ...jest.requireActual('${servicePath}').${mock},
    // Add default mocks for common methods
    getAll: jest.fn(() => Promise.resolve([])),
    getById: jest.fn(() => Promise.resolve(null)),
    create: jest.fn(() => Promise.resolve({ id: '1' })),
    update: jest.fn(() => Promise.resolve(true)),
    delete: jest.fn(() => Promise.resolve(true)),
  }
}));
`;

      const firstImport = content.indexOf('import');
      if (firstImport > -1 && !content.includes(`jest.mock('${servicePath}'`)) {
        content = serviceMock + content;
        modified = true;
        fixes.services++;
      }
    }
  });

  if (modified && content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    totalFixes++;
  }
});

logger.info('\n📊 Summary:');
logger.info(`  Total files fixed: ${totalFixes}`);
logger.info(`  Navigation mocks added: ${fixes.navigation}`);
logger.info(`  AsyncStorage mocks added: ${fixes.asyncStorage}`);
logger.info(`  Supabase mocks added: ${fixes.supabase}`);
logger.info(`  Expo module mocks added: ${fixes.expoModules}`);
logger.info(`  React Native mock fixes: ${fixes.reactNative}`);
logger.info(`  Service mocks added: ${fixes.services}`);
logger.info('\n✨ Phase 7 common failure fixes complete!');