import React from 'react';
import { render } from '@testing-library/react-native';
import FindContractorsScreen from '../../screens/FindContractorsScreen';
import PaymentMethodsScreen from '../../screens/PaymentMethodsScreen';

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user',
      email: 'test@example.com',
      role: 'homeowner'
    }
  })
}));

jest.mock('../../services/ContractorService', () => ({
  ContractorService: {
    getUnmatchedContractors: jest.fn(() => Promise.resolve([])),
    recordContractorMatch: jest.fn(() => Promise.resolve())
  }
}));

jest.mock('../../services/PaymentService', () => ({
  PaymentService: {
    getPaymentMethods: jest.fn(() => Promise.resolve([]))
  }
}));

jest.mock('../../services/JobService', () => ({
  JobService: {
    getAvailableJobs: jest.fn(() => Promise.resolve([])),
    getJobsByHomeowner: jest.fn(() => Promise.resolve([]))
  }
}));

jest.mock('../../services/UserService', () => ({
  UserService: {
    getHomeownerForJob: jest.fn(() => Promise.resolve(null))
  }
}));

describe('Crash Fixes Verification', () => {
  describe('FindContractorsScreen', () => {
    it('should render without crashing', () => {
      expect(() => {
        render(<FindContractorsScreen />);
      }).not.toThrow();
    });
  });

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