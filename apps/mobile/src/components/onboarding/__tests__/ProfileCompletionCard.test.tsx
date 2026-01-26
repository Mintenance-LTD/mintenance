
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

import React from 'react';
import { render, fireEvent } from '../../test-utils';
import { ProfileCompletionCard } from '../ProfileCompletionCard';

describe('ProfileCompletionCard', () => {
  const defaultProps = {
    items: [
      { id: 'item-1', label: 'Add photo', weight: 50, completed: false, action: 'photo' },
      { id: 'item-2', label: 'Verify email', weight: 50, completed: true, action: 'email' },
    ],
    completion: 50,
    onItemClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });
  afterEach(() => {
    jest.clearAllMocks();
  });


  it('should render without crashing', () => {
    const { getByText } = render(<ProfileCompletionCard {...defaultProps} />);
    expect(getByText('Complete Your Profile')).toBeTruthy();
  });

  it('should handle user interactions', async () => {
    const { getByText } = render(<ProfileCompletionCard {...defaultProps} />);
    fireEvent.press(getByText('Add photo'));
    expect(defaultProps.onItemClick).toHaveBeenCalledWith(defaultProps.items[0]);
  });

  it('should display correct data', () => {
    const { getByText } = render(<ProfileCompletionCard {...defaultProps} />);
    expect(getByText('1 of 2 completed')).toBeTruthy();
  });

  it('should handle edge cases', () => {
    const { getByText } = render(
      <ProfileCompletionCard items={defaultProps.items} completion={100} compact />
    );
    expect(getByText('🏆 Profile Complete!')).toBeTruthy();
  });
});
