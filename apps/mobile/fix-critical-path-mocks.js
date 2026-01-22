#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const glob = require('glob');

console.log('🔧 Adding mocks to critical path tests...\n');

// Find all critical path test files
const testFiles = glob.sync('src/__tests__/critical-paths/**/*.test.{ts,tsx}', {
  cwd: __dirname,
  absolute: true,
});

let totalFixes = 0;

// Common mock setup for React Native components
const reactNativeMocks = `
// Mock React Native modules
jest.mock('react-native', () => ({
  Platform: { OS: 'ios', select: jest.fn(obj => obj.ios) },
  Alert: { alert: jest.fn() },
  ActivityIndicator: 'ActivityIndicator',
  View: 'View',
  Text: 'Text',
  TextInput: 'TextInput',
  TouchableOpacity: 'TouchableOpacity',
  ScrollView: 'ScrollView',
  KeyboardAvoidingView: 'KeyboardAvoidingView',
  StyleSheet: { create: (styles) => styles },
  Dimensions: { get: () => ({ width: 375, height: 812 }) },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  multiSet: jest.fn(() => Promise.resolve()),
  multiGet: jest.fn(() => Promise.resolve([])),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
`;

// Service mocks for each type of test
const serviceMocks = {
  auth: `
jest.mock('../../../services/AuthService', () => ({
  AuthService: {
    signIn: jest.fn(() => Promise.resolve({
      user: { id: '1', email: 'test@example.com' },
      session: { access_token: 'token' }
    })),
    signUp: jest.fn(() => Promise.resolve({
      user: { id: '1', email: 'test@example.com' },
      session: { access_token: 'token' }
    })),
    signOut: jest.fn(() => Promise.resolve()),
    getCurrentSession: jest.fn(() => Promise.resolve({ access_token: 'token' })),
    getCurrentUser: jest.fn(() => Promise.resolve({ id: '1', email: 'test@example.com' })),
    resetPassword: jest.fn(() => Promise.resolve()),
    verifyEmail: jest.fn(() => Promise.resolve()),
    updateProfile: jest.fn(() => Promise.resolve()),
    onAuthStateChange: jest.fn((callback) => {
      callback('SIGNED_IN', { access_token: 'token' });
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    }),
  }
}));

jest.mock('../../../services/BiometricService', () => ({
  BiometricService: {
    isAvailable: jest.fn(() => Promise.resolve(true)),
    authenticate: jest.fn(() => Promise.resolve(true)),
    hasEnrolledBiometrics: jest.fn(() => Promise.resolve(true)),
    getAuthenticationTypes: jest.fn(() => Promise.resolve(['FaceID', 'TouchID'])),
  }
}));
`,
  payment: `
jest.mock('../../../services/PaymentService', () => ({
  PaymentService: {
    createPaymentIntent: jest.fn(() => Promise.resolve({
      clientSecret: 'pi_test_secret',
      amount: 10000,
      currency: 'usd'
    })),
    confirmPayment: jest.fn(() => Promise.resolve({
      status: 'succeeded',
      id: 'pi_test'
    })),
    getPaymentMethods: jest.fn(() => Promise.resolve([
      { id: 'pm_1', type: 'card', card: { last4: '4242', brand: 'visa' } }
    ])),
    addPaymentMethod: jest.fn(() => Promise.resolve({
      id: 'pm_2',
      type: 'card',
      card: { last4: '5555', brand: 'mastercard' }
    })),
    removePaymentMethod: jest.fn(() => Promise.resolve()),
    setDefaultPaymentMethod: jest.fn(() => Promise.resolve()),
    processRefund: jest.fn(() => Promise.resolve({
      id: 'rf_test',
      status: 'succeeded',
      amount: 5000
    })),
    createCheckoutSession: jest.fn(() => Promise.resolve({
      sessionId: 'cs_test',
      url: 'https://checkout.stripe.com/test'
    })),
    retrievePayment: jest.fn(() => Promise.resolve({
      id: 'pi_test',
      status: 'succeeded',
      amount: 10000
    })),
  }
}));
`,
  job: `
jest.mock('../../../services/JobService', () => ({
  JobService: {
    createJob: jest.fn(() => Promise.resolve({
      id: '1',
      title: 'Test Job',
      description: 'Test Description',
      status: 'open',
      budget: 1000
    })),
    getJobs: jest.fn(() => Promise.resolve([
      { id: '1', title: 'Job 1', status: 'open' },
      { id: '2', title: 'Job 2', status: 'in_progress' }
    ])),
    getJobById: jest.fn(() => Promise.resolve({
      id: '1',
      title: 'Test Job',
      description: 'Description',
      status: 'open'
    })),
    updateJobStatus: jest.fn(() => Promise.resolve()),
    submitBid: jest.fn(() => Promise.resolve({
      id: 'bid_1',
      amount: 800,
      message: 'I can do this job'
    })),
    acceptBid: jest.fn(() => Promise.resolve()),
    searchJobs: jest.fn(() => Promise.resolve({
      results: [
        { id: '1', title: 'Matching Job', score: 0.9 }
      ],
      totalCount: 1
    })),
    getJobsByStatus: jest.fn(() => Promise.resolve([])),
    getBidsByJob: jest.fn(() => Promise.resolve([])),
    startJob: jest.fn(() => Promise.resolve()),
    completeJob: jest.fn(() => Promise.resolve()),
  }
}));

jest.mock('../../../services/ContractorService', () => ({
  ContractorService: {
    getContractors: jest.fn(() => Promise.resolve([])),
    getContractorById: jest.fn(() => Promise.resolve(null)),
    searchContractors: jest.fn(() => Promise.resolve([])),
    getContractorReviews: jest.fn(() => Promise.resolve([])),
  }
}));
`
};

testFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;
  const fileName = path.basename(file);
  let modified = false;

  // Add React Native mocks if not present
  if (fileName.endsWith('.tsx') && !content.includes("jest.mock('react-native'")) {
    const firstImport = content.indexOf('import');
    if (firstImport !== -1) {
      content = content.slice(0, firstImport) + reactNativeMocks + '\n' + content.slice(firstImport);
      modified = true;
    }
  }

  // Add appropriate service mocks based on test type
  if (file.includes('/auth/') && !content.includes("jest.mock('../../../services/AuthService'")) {
    const lastImport = content.lastIndexOf('import');
    const nextLine = content.indexOf('\n', lastImport);
    if (nextLine !== -1) {
      content = content.slice(0, nextLine + 1) + serviceMocks.auth + content.slice(nextLine + 1);
      modified = true;
    }
  }

  if (file.includes('/payment/') && !content.includes("jest.mock('../../../services/PaymentService'")) {
    const lastImport = content.lastIndexOf('import');
    const nextLine = content.indexOf('\n', lastImport);
    if (nextLine !== -1) {
      content = content.slice(0, nextLine + 1) + serviceMocks.payment + content.slice(nextLine + 1);
      modified = true;
    }
  }

  if (file.includes('/job/') && !content.includes("jest.mock('../../../services/JobService'")) {
    const lastImport = content.lastIndexOf('import');
    const nextLine = content.indexOf('\n', lastImport);
    if (nextLine !== -1) {
      content = content.slice(0, nextLine + 1) + serviceMocks.job + content.slice(nextLine + 1);
      modified = true;
    }
  }

  // Remove duplicate mocks
  const mockPattern = /jest\.mock\('([^']+)',[\s\S]*?\}\)\);/g;
  const mocks = {};
  let match;
  while ((match = mockPattern.exec(content)) !== null) {
    const modulePath = match[1];
    if (!mocks[modulePath]) {
      mocks[modulePath] = match[0];
    } else if (match[0] !== mocks[modulePath]) {
      // Duplicate mock, remove it
      content = content.replace(match[0], '');
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
console.log('\n✨ Critical path mock fixes complete!');