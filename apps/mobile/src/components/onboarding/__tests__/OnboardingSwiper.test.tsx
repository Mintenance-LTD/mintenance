
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

import React from 'react';
import { render, fireEvent } from '../../test-utils';
import OnboardingSwiper from '../OnboardingSwiper';

jest.mock('react-native-swiper', () => {
  const React = require('react');
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children);
});

describe('OnboardingSwiper', () => {
  const defaultProps = {
    slides: [
      { id: 'slide-1', title: 'Welcome', description: 'Intro' },
      { id: 'slide-2', title: 'Get Started', description: 'Details' },
    ],
    onComplete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });
  afterEach(() => {
    jest.clearAllMocks();
  });


  it('should render without crashing', () => {
    const { getByText } = render(<OnboardingSwiper {...defaultProps} />);
    expect(getByText('Welcome')).toBeTruthy();
  });

  it('should handle user interactions', async () => {
    const { getByText } = render(<OnboardingSwiper {...defaultProps} />);
    fireEvent.press(getByText('Skip'));
    expect(defaultProps.onComplete).toHaveBeenCalled();
  });

  it('should display correct data', () => {
    const { getByText } = render(<OnboardingSwiper {...defaultProps} />);
    expect(getByText('Get Started')).toBeTruthy();
  });

  it('should handle edge cases', () => {
    const { getByText } = render(
      <OnboardingSwiper slides={[defaultProps.slides[0]]} onComplete={jest.fn()} />
    );
    expect(getByText('Get Started')).toBeTruthy();
  });
});
