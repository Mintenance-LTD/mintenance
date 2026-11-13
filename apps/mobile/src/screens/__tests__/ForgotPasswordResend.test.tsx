import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import ForgotPasswordScreen from '../ForgotPasswordScreen';
import { AuthService } from '../../services/AuthService';

jest.mock('../../services/AuthService', () => ({
  AuthService: { resetPassword: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock('../../hooks/useScreenCaptureGuard', () => ({
  useScreenCaptureGuard: jest.fn(),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../../components/ui/Input', () => {
  const React = require('react');
  const { TextInput } = require('react-native');
  return { Input: (props: object) => React.createElement(TextInput, props) };
});
jest.mock('../../components/ui/Button', () => {
  const React = require('react');
  const { TouchableOpacity, Text } = require('react-native');
  return {
    Button: (props: { title: string }) =>
      React.createElement(
        TouchableOpacity,
        props,
        React.createElement(Text, null, props.title)
      ),
  };
});

afterEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
});
it('restarts and advances the cooldown after resending without leaving the success screen', async () => {
  jest.useFakeTimers();
  const navigation = { goBack: jest.fn() } as unknown as React.ComponentProps<
    typeof ForgotPasswordScreen
  >['navigation'];
  const view = render(<ForgotPasswordScreen navigation={navigation} />);
  fireEvent.changeText(
    view.getByPlaceholderText('Email Address'),
    'test@example.test'
  );
  await act(async () => {
    fireEvent.press(view.getByLabelText('Send reset email'));
  });
  expect(view.getByText('Email Sent!')).toBeTruthy();
  for (let i = 0; i < 30; i++)
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
  await act(async () => {
    fireEvent.press(view.getByLabelText('Resend password reset email'));
  });
  expect(AuthService.resetPassword).toHaveBeenCalledTimes(2);
  expect(view.getByText('Email Sent!')).toBeTruthy();
  expect(view.getByLabelText('Resend available in 30 seconds')).toBeTruthy();
  await act(async () => {
    jest.advanceTimersByTime(1000);
  });
  expect(view.getByLabelText('Resend available in 29 seconds')).toBeTruthy();
  expect(view.queryByLabelText('Resend password reset email')).toBeNull();
});
