import { logger } from '@mintenance/shared';

#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const glob = require('glob');

logger.info('🔧 Recovery: Fixing service tests for coverage gain...\n');

// Find all service test files
const serviceTests = glob.sync('src/__tests__/services/**/*.test.ts', {
  cwd: __dirname,
  absolute: true,
});

// Also find service tests in other locations
const additionalServiceTests = glob.sync('src/services/**/__tests__/*.test.ts', {
  cwd: __dirname,
  absolute: true,
});

const allServiceTests = [...new Set([...serviceTests, ...additionalServiceTests])];

logger.info(`Found ${allServiceTests.length} service test files\n`);

let fixedCount = 0;
const fixes = {
  asyncStorage: 0,
  supabase: 0,
  imports: 0,
  mocks: 0,
};

// Common mock configurations
const commonMocks = {
  asyncStorage: `jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiRemove: jest.fn(() => Promise.resolve()),
}));`,

  supabase: `jest.mock('../../config/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      signIn: jest.fn(() => Promise.resolve({ data: null, error: null })),
      signUp: jest.fn(() => Promise.resolve({ data: null, error: null })),
      signOut: jest.fn(() => Promise.resolve()),
      onAuthStateChange: jest.fn((callback) => ({
        data: { subscription: { unsubscribe: jest.fn() } }
      })),
      updateUser: jest.fn(() => Promise.resolve({ data: null, error: null })),
      resetPasswordForEmail: jest.fn(() => Promise.resolve({ data: null, error: null })),
    },
    from: jest.fn((table) => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
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
      is: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      single: jest.fn(() => Promise.resolve({ data: null, error: null })),
      maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
      then: jest.fn((callback) => {
        const result = { data: [], error: null };
        if (callback) return Promise.resolve(callback(result));
        return Promise.resolve(result);
      }),
      catch: jest.fn(),
    })),
    storage: {
      from: jest.fn((bucket) => ({
        upload: jest.fn(() => Promise.resolve({ data: { path: 'test-path' }, error: null })),
        download: jest.fn(() => Promise.resolve({ data: new Blob(), error: null })),
        remove: jest.fn(() => Promise.resolve({ data: [], error: null })),
        list: jest.fn(() => Promise.resolve({ data: [], error: null })),
        getPublicUrl: jest.fn((path) => ({
          data: { publicUrl: \`https://test.supabase.co/storage/v1/object/public/\${bucket}/\${path}\` }
        })),
        createSignedUrl: jest.fn(() => Promise.resolve({
          data: { signedUrl: 'https://test-signed-url' },
          error: null
        })),
      })),
    },
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn((callback) => {
        if (callback) callback('subscribed');
        return { unsubscribe: jest.fn() };
      }),
    })),
    removeChannel: jest.fn(),
  },
}));`,

  expo: `jest.mock('expo-notifications', () => ({
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getExpoPushTokenAsync: jest.fn(() => Promise.resolve({ data: 'ExpoToken' })),
  setNotificationHandler: jest.fn(),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve('notification-id')),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getCurrentPositionAsync: jest.fn(() => Promise.resolve({
    coords: { latitude: 0, longitude: 0 }
  })),
}));`,

  stripe: `jest.mock('@stripe/stripe-react-native', () => ({
  initStripe: jest.fn(() => Promise.resolve()),
  createPaymentMethod: jest.fn(() => Promise.resolve({
    paymentMethod: { id: 'pm_test' },
    error: null,
  })),
  confirmPayment: jest.fn(() => Promise.resolve({
    paymentIntent: { id: 'pi_test', status: 'succeeded' },
    error: null,
  })),
  presentPaymentSheet: jest.fn(() => Promise.resolve({
    error: null,
  })),
  createTokenWithCard: jest.fn(() => Promise.resolve({
    token: { id: 'tok_test' },
    error: null,
  })),
}));`,
};

logger.info('📋 Processing service tests...\n');

allServiceTests.forEach(testFile => {
  const fileName = path.basename(testFile);
  const serviceName = fileName.replace('.test.ts', '').replace('.simple', '').replace('.comprehensive', '');

  let content = fs.readFileSync(testFile, 'utf8');
  const original = content;
  let modified = false;

  // Determine correct supabase mock path based on file location
  let supabaseMock = commonMocks.supabase;
  if (testFile.includes('src/services/') && testFile.includes('__tests__')) {
    supabaseMock = supabaseMock.replace('../../config/supabase', '../../../config/supabase');
  }

  // Fix 1: Add AsyncStorage mock if not present
  if (!content.includes("jest.mock('@react-native-async-storage/async-storage'")) {
    content = commonMocks.asyncStorage + '\n\n' + content;
    modified = true;
    fixes.asyncStorage++;
  }

  // Fix 2: Add Supabase mock if service uses it
  if ((content.includes('supabase') || serviceName.includes('Service')) &&
      !content.includes("jest.mock(") &&
      !content.includes("config/supabase")) {
    content = supabaseMock + '\n\n' + content;
    modified = true;
    fixes.supabase++;
  }

  // Fix 3: Add Expo mocks for notification/location services
  if ((serviceName.includes('Notification') || serviceName.includes('Location')) &&
      !content.includes("jest.mock('expo-")) {
    content = commonMocks.expo + '\n\n' + content;
    modified = true;
    fixes.mocks++;
  }

  // Fix 4: Add Stripe mock for payment services
  if (serviceName.includes('Payment') && !content.includes("jest.mock('@stripe/")) {
    content = commonMocks.stripe + '\n\n' + content;
    modified = true;
    fixes.mocks++;
  }

  // Fix 5: Fix import paths
  // Fix service imports
  const serviceImportPattern = new RegExp(`from ['"][^'"]*${serviceName}['"]`, 'g');
  if (content.match(serviceImportPattern)) {
    let correctPath = `../../services/${serviceName}`;
    if (testFile.includes('src/services/') && testFile.includes('__tests__')) {
      correctPath = `../${serviceName}`;
    }
    content = content.replace(serviceImportPattern, `from '${correctPath}'`);
    modified = true;
    fixes.imports++;
  }

  // Fix 6: Add missing service mock if the service itself isn't mocked
  if (!content.includes(`jest.mock('`) || !content.includes(serviceName)) {
    let mockPath = `../../services/${serviceName}`;
    if (testFile.includes('src/services/') && testFile.includes('__tests__')) {
      mockPath = `../${serviceName}`;
    }

    const serviceMock = `
jest.mock('${mockPath}', () => {
  const actual = jest.requireActual('${mockPath}');
  return {
    ...actual,
    ${serviceName}: {
      ...actual.${serviceName},
      initialize: jest.fn(() => Promise.resolve()),
      cleanup: jest.fn(() => Promise.resolve()),
    }
  };
});`;

    const firstImport = content.indexOf('import');
    if (firstImport >= 0) {
      content = content.slice(0, firstImport) + serviceMock + '\n' + content.slice(firstImport);
      modified = true;
      fixes.mocks++;
    }
  }

  // Fix 7: Handle specific service issues
  if (serviceName === 'OfflineManager' && !content.includes('NetInfo')) {
    const netInfoMock = `jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
}));

`;
    content = netInfoMock + content;
    modified = true;
    fixes.mocks++;
  }

  // Save if modified
  if (modified && content !== original) {
    fs.writeFileSync(testFile, content, 'utf8');
    fixedCount++;
    logger.info(`  ✅ Fixed ${fileName}`);
  }
});

logger.info('\n📊 Summary:');
logger.info(`  Service tests fixed: ${fixedCount}/${allServiceTests.length}`);
logger.info(`  AsyncStorage mocks added: ${fixes.asyncStorage}`);
logger.info(`  Supabase mocks added: ${fixes.supabase}`);
logger.info(`  Import paths fixed: ${fixes.imports}`);
logger.info(`  Other mocks added: ${fixes.mocks}`);
logger.info('\n✨ Service test recovery complete!');