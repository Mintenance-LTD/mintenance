/* eslint-disable import/first --
 * jest.mock factories are hoisted above imports, so mocked bindings
 * must be imported after them.
 */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

jest.mock('../../../utils/mobileApiClient', () => ({
  mobileApiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

import { mobileApiClient } from '../../../utils/mobileApiClient';
import { PhoneVerificationModal } from '../PhoneVerificationModal';

const mockGet = mobileApiClient.get as jest.Mock;
const mockPost = mobileApiClient.post as jest.Mock;

/**
 * Covers the full recovery flow the job-posting 403 hands off to:
 * prefill → send ({action:'send'} with a normalized +44 number) →
 * code entry → verify ({action:'verify'}) → onVerified. Plus the
 * failure branches (send error, bad code) and the "Not now" escape.
 */

describe('PhoneVerificationModal', () => {
  const onClose = jest.fn();
  const onVerified = jest.fn();
  const baseProps = { visible: true, onClose, onVerified };

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: profile has no saved phone; individual tests override.
    mockGet.mockResolvedValue({ profile: { phone: null } });
    mockPost.mockResolvedValue({ message: 'ok' });
  });

  it('renders the phone step when visible', async () => {
    const { getByText, getByTestId } = render(
      <PhoneVerificationModal {...baseProps} />
    );
    expect(getByText('Verify your phone number')).toBeTruthy();
    expect(getByTestId('phone-verification-phone-input')).toBeTruthy();
    await waitFor(() =>
      expect(mockGet).toHaveBeenCalledWith('/api/users/profile')
    );
  });

  it('prefills the number from the profile', async () => {
    mockGet.mockResolvedValue({ profile: { phone: '+447984596545' } });
    const { getByTestId } = render(<PhoneVerificationModal {...baseProps} />);
    await waitFor(() =>
      expect(getByTestId('phone-verification-phone-input').props.value).toBe(
        '+447984596545'
      )
    );
  });

  it('sends a normalized +44 number and advances to the code step', async () => {
    const { getByTestId, getByText } = render(
      <PhoneVerificationModal {...baseProps} />
    );
    fireEvent.changeText(
      getByTestId('phone-verification-phone-input'),
      '07984 596545'
    );
    fireEvent.press(getByTestId('phone-verification-primary-button'));

    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith('/api/auth/verify-phone', {
        action: 'send',
        phoneNumber: '+447984596545',
      })
    );
    await waitFor(() => expect(getByText('Enter the code')).toBeTruthy());
  });

  it('rejects an implausible number client-side without calling the API', async () => {
    const { getByTestId, getByText } = render(
      <PhoneVerificationModal {...baseProps} />
    );
    fireEvent.changeText(getByTestId('phone-verification-phone-input'), '123');
    fireEvent.press(getByTestId('phone-verification-primary-button'));

    await waitFor(() => expect(getByText(/valid phone number/i)).toBeTruthy());
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('surfaces the server error when sending fails (e.g. rate limited)', async () => {
    mockPost.mockRejectedValueOnce(
      new Error('Too many send attempts. Please try again later.')
    );
    const { getByTestId, getByText } = render(
      <PhoneVerificationModal {...baseProps} />
    );
    fireEvent.changeText(
      getByTestId('phone-verification-phone-input'),
      '07984 596545'
    );
    fireEvent.press(getByTestId('phone-verification-primary-button'));

    await waitFor(() =>
      expect(getByText(/Too many send attempts/)).toBeTruthy()
    );
  });

  const advanceToCodeStep = async (utils: {
    getByTestId: (id: string) => any;
    getByText: (text: string | RegExp) => any;
  }) => {
    fireEvent.changeText(
      utils.getByTestId('phone-verification-phone-input'),
      '07984 596545'
    );
    fireEvent.press(utils.getByTestId('phone-verification-primary-button'));
    await waitFor(() => expect(utils.getByText('Enter the code')).toBeTruthy());
  };

  it('verifies a 6-digit code and calls onVerified', async () => {
    const utils = render(<PhoneVerificationModal {...baseProps} />);
    await advanceToCodeStep(utils);

    fireEvent.changeText(
      utils.getByTestId('phone-verification-code-input'),
      '123456'
    );
    fireEvent.press(utils.getByTestId('phone-verification-primary-button'));

    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith('/api/auth/verify-phone', {
        action: 'verify',
        code: '123456',
      })
    );
    await waitFor(() => expect(onVerified).toHaveBeenCalledTimes(1));
  });

  it('shows the server message when the code is wrong and does not call onVerified', async () => {
    const utils = render(<PhoneVerificationModal {...baseProps} />);
    await advanceToCodeStep(utils);

    mockPost.mockRejectedValueOnce(
      new Error(
        'Invalid or expired verification code. Please request a new code.'
      )
    );
    fireEvent.changeText(
      utils.getByTestId('phone-verification-code-input'),
      '000000'
    );
    fireEvent.press(utils.getByTestId('phone-verification-primary-button'));

    await waitFor(() =>
      expect(utils.getByText(/Invalid or expired/)).toBeTruthy()
    );
    expect(onVerified).not.toHaveBeenCalled();
  });

  it('strips non-digits from the code input', async () => {
    const utils = render(<PhoneVerificationModal {...baseProps} />);
    await advanceToCodeStep(utils);

    fireEvent.changeText(
      utils.getByTestId('phone-verification-code-input'),
      '12ab-34'
    );
    expect(utils.getByTestId('phone-verification-code-input').props.value).toBe(
      '1234'
    );
  });

  it('"Not now" dismisses via onClose without verifying', async () => {
    const { getByText } = render(<PhoneVerificationModal {...baseProps} />);
    fireEvent.press(getByText('Not now'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onVerified).not.toHaveBeenCalled();
  });

  it('survives a failed profile prefill (user can still type)', async () => {
    mockGet.mockRejectedValueOnce(new Error('403'));
    const { getByTestId } = render(<PhoneVerificationModal {...baseProps} />);
    fireEvent.changeText(
      getByTestId('phone-verification-phone-input'),
      '07984 596545'
    );
    fireEvent.press(getByTestId('phone-verification-primary-button'));
    await waitFor(() => expect(mockPost).toHaveBeenCalled());
  });
});
