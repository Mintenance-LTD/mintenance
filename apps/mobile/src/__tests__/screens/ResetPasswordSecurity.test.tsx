import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ResetPasswordScreen from '../../screens/auth/ResetPasswordScreen';
import { supabase } from '../../config/supabase';
import { mobileApiClient } from '../../utils/mobileApiClient';

jest.mock('../../utils/mobileApiClient');
jest.mock('../../config/supabase', () => ({
  supabase: { auth: { updateUser: jest.fn() } },
}));
jest.mock('../../hooks/useScreenCaptureGuard', () => ({
  useScreenCaptureGuard: jest.fn(),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../../components/ui/Input', () => ({
  Input: (props: object) =>
    require('react').createElement(require('react-native').TextInput, props),
}));
jest.mock('../../components/ui/Button', () => ({
  Button: ({
    title,
    onPress,
    disabled,
  }: {
    title: string;
    onPress: () => void;
    disabled: boolean;
  }) =>
    require('react').createElement(
      require('react-native').TouchableOpacity,
      { onPress, disabled },
      require('react').createElement(require('react-native').Text, null, title)
    ),
}));
jest.mock('../../components/ui/Banner', () => ({
  Banner: ({ message }: { message: string }) =>
    require('react').createElement(require('react-native').Text, null, message),
}));

const post = mobileApiClient.post as jest.Mock;
const update = supabase.auth.updateUser as jest.Mock;
beforeEach(() => {
  jest.clearAllMocks();
  update.mockResolvedValue({ error: null });
});
function submit() {
  const screen = render(
    <ResetPasswordScreen
      navigation={{ navigate: jest.fn(), goBack: jest.fn() } as never}
      route={{ params: {} } as never}
    />
  );
  fireEvent.changeText(
    screen.getByPlaceholderText('New Password'),
    'SyntheticFresh9!'
  );
  fireEvent.changeText(
    screen.getByPlaceholderText('Confirm Password'),
    'SyntheticFresh9!'
  );
  fireEvent.press(screen.getByText('Reset Password'));
  return screen;
}
it('updates the password only after a completed clean lookup', async () => {
  post.mockResolvedValue({ checked: true, isBreached: false });
  const screen = submit();
  await waitFor(() =>
    expect(screen.getByText('Password Updated!')).toBeTruthy()
  );
  expect(post).toHaveBeenCalledWith('/api/auth/check-password-breach', {
    password: 'SyntheticFresh9!',
  });
  expect(update).toHaveBeenCalledWith({ password: 'SyntheticFresh9!' });
});
it.each([
  { checked: true, isBreached: true },
  { checked: false, isBreached: false },
  { isBreached: false },
])('blocks reset for a breached or unchecked password: %j', async (result) => {
  post.mockResolvedValue(result);
  const screen = submit();
  await waitFor(() =>
    expect(screen.getByText(/Please (choose|try)/)).toBeTruthy()
  );
  expect(update).not.toHaveBeenCalled();
});
it('keeps the existing password when the lookup fails', async () => {
  post.mockRejectedValue(new Error('offline'));
  const screen = submit();
  await waitFor(() =>
    expect(screen.getByText(/Please try again shortly/)).toBeTruthy()
  );
  expect(update).not.toHaveBeenCalled();
});
