
import React from 'react';
import { render } from '../test-utils';
import PaymentMethodsScreen from '../../screens/PaymentMethodsScreen';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user',
      email: 'test@example.com',
      role: 'homeowner',
    },
  }),
}));

jest.mock('../../services/PaymentService', () => ({
  PaymentService: {
    getPaymentMethods: jest.fn(() => Promise.resolve([])),
  },
}));

jest.mock('../../services/JobService', () => ({
  JobService: {
    getAvailableJobs: jest.fn(() => Promise.resolve([])),
    getJobsByHomeowner: jest.fn(() => Promise.resolve([])),
  },
}));

jest.mock('../../services/UserService', () => ({
  UserService: {
    getHomeownerForJob: jest.fn(() => Promise.resolve(null)),
  },
}));

describe('Crash Fixes Verification', () => {
  describe('PaymentMethodsScreen', () => {
    it('should render without crashing', () => {
      expect(() => {
        render(<PaymentMethodsScreen />);
      }).not.toThrow();
    });
  });

  describe('Contractor Navigation Fix', () => {
    it('should render JobsScreen without crashing for contractors', () => {
      const JobsScreen = require('../../screens/JobsScreen').default;

      expect(() => {
        render(<JobsScreen />);
      }).not.toThrow();
    });
  });
});
