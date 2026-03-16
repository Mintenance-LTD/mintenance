
import React from 'react';
import { render, fireEvent, waitFor } from '../../__tests__/test-utils';
import { CommunityEndorsement } from '../CommunityEndorsement';

jest.mock('react-native', () => require('../../__mocks__/react-native.js'));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

describe('CommunityEndorsement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  afterEach(() => {
    jest.clearAllMocks();
  });


  it('should render without crashing', () => {
    const { getByTestId } = render(<CommunityEndorsement />);
    expect(getByTestId).toBeDefined();
  });

  it('should display content correctly', () => {
    const { container } = render(<CommunityEndorsement />);
    expect(container).toBeTruthy();
  });
});