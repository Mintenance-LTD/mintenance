/**
 * ThemeToggle — renders icon/button/switch variants and toggles the theme on
 * press. ThemeModeSelector is unexported (not covered here).
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

const mockToggle = jest.fn();
const mockUseTheme = jest.fn();
jest.mock('../../../../design-system/theme', () => ({
  __esModule: true,
  useTheme: () => mockUseTheme(),
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

import { ThemeToggle } from '../ThemeToggle';

beforeEach(() => {
  jest.clearAllMocks();
  mockUseTheme.mockReturnValue({
    colorScheme: 'light',
    toggleTheme: mockToggle,
  });
});

describe('ThemeToggle', () => {
  it('renders the default icon variant and toggles on press', () => {
    const { getByTestId } = render(<ThemeToggle testID='tt' />);
    fireEvent.press(getByTestId('tt'));
    expect(mockToggle).toHaveBeenCalled();
  });

  it('renders the button variant with a label', () => {
    const { toJSON } = render(
      <ThemeToggle variant='button' showLabel size='sm' testID='tt' />
    );
    expect(toJSON()).toBeTruthy();
  });

  it('renders the switch variant', () => {
    const { toJSON } = render(
      <ThemeToggle variant='switch' size='lg' testID='tt' />
    );
    expect(toJSON()).toBeTruthy();
  });

  it('renders correctly in dark mode', () => {
    mockUseTheme.mockReturnValue({
      colorScheme: 'dark',
      toggleTheme: mockToggle,
    });
    const { getByTestId } = render(
      <ThemeToggle variant='button' showLabel testID='tt' />
    );
    fireEvent.press(getByTestId('tt'));
    expect(mockToggle).toHaveBeenCalled();
  });
});
