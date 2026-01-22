
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  multiSet: jest.fn(() => Promise.resolve()),
  multiGet: jest.fn(() => Promise.resolve([])),
}));

import React from 'react';
import FindContractorsScreen from '../../../screens/FindContractorsScreen';

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: jest.fn(() => ({ user: { id: 'user-1' } })),
}));

jest.mock('../../../hooks/useAdvancedSearch', () => ({
  useAdvancedSearch: jest.fn(() => ({
    searchState: {
      results: [],
      loading: false,
      query: '',
      suggestions: [],
      total: 0,
      filters: {
        location: { radius: 25, unit: 'miles', coordinates: null },
      },
    },
    search: jest.fn(),
    applyFilters: jest.fn(),
    clearSearch: jest.fn(),
    loadMore: jest.fn(),
    updateFilter: jest.fn(),
    getSuggestions: jest.fn(),
  })),
}));

jest.mock('../../../services/ContractorService', () => ({
  ContractorService: {
    getUnmatchedContractors: jest.fn(() => Promise.resolve([])),
  },
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getCurrentPositionAsync: jest.fn(() => Promise.resolve({
    coords: { latitude: 1, longitude: 2 },
  })),
}));

describe('Job Search - Critical Path', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exports the contractor search screen', () => {
    expect(FindContractorsScreen).toBeDefined();
  });
});
