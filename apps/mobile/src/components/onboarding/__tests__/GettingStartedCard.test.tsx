import React from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '../../../design-system/theme';
import { GettingStartedCard } from '../GettingStartedCard';

const mockNavigate = jest.fn();
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Appearance: {
    getColorScheme: jest.fn(() => 'light'),
    addChangeListener: jest.fn(() => ({ remove: jest.fn() })),
  },
}));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

describe('GettingStartedCard with the app theme provider', () => {
  afterEach(() => jest.restoreAllMocks());

  it.each(['light', 'dark'] as const)(
    'renders in %s mode and opens the nested profile guide',
    async (mode) => {
      jest.spyOn(Appearance, 'getColorScheme').mockReturnValue(mode);
      jest.mocked(AsyncStorage.getItem).mockResolvedValue(null);
      const { getByText } = render(
        <ThemeProvider>
          <GettingStartedCard />
        </ThemeProvider>
      );

      await waitFor(() => expect(AsyncStorage.getItem).toHaveBeenCalled());
      expect(getByText('Getting started')).toBeTruthy();
      fireEvent.press(getByText('Getting started'));
      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('ProfileTab', {
        screen: 'GettingStarted',
      });
    }
  );
});
