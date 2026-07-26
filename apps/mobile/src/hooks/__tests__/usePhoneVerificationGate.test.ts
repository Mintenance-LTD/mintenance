import { renderHook, act } from '@testing-library/react-native';
import { usePhoneVerificationGate } from '../usePhoneVerificationGate';

/**
 * The gate is the glue between a posting screen's failure path and
 * PhoneVerificationModal: it must only open for the phone-verification
 * 403, must replay the stashed retry exactly once on success, and must
 * drop the retry when the user dismisses without verifying.
 */

const PHONE_403 = new Error(
  'Phone verification required. Please verify your phone number before posting jobs'
);

describe('usePhoneVerificationGate', () => {
  it('starts hidden', () => {
    const { result } = renderHook(() => usePhoneVerificationGate());
    expect(result.current.visible).toBe(false);
  });

  it('intercepts the phone-verification error and opens the modal', () => {
    const { result } = renderHook(() => usePhoneVerificationGate());
    let intercepted = false;
    act(() => {
      intercepted = result.current.intercept(PHONE_403, jest.fn());
    });
    expect(intercepted).toBe(true);
    expect(result.current.visible).toBe(true);
  });

  it('ignores unrelated errors and stays hidden', () => {
    const { result } = renderHook(() => usePhoneVerificationGate());
    let intercepted = true;
    act(() => {
      intercepted = result.current.intercept(new Error('Network down'));
    });
    expect(intercepted).toBe(false);
    expect(result.current.visible).toBe(false);
  });

  it('runs the retry once on handleVerified, then clears it', () => {
    const { result } = renderHook(() => usePhoneVerificationGate());
    const retry = jest.fn();
    act(() => {
      result.current.intercept(PHONE_403, retry);
    });
    act(() => {
      result.current.handleVerified();
    });
    expect(retry).toHaveBeenCalledTimes(1);
    expect(result.current.visible).toBe(false);

    // A second handleVerified (e.g. stray callback) must not re-fire.
    act(() => {
      result.current.handleVerified();
    });
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('drops the retry when the user closes without verifying', () => {
    const { result } = renderHook(() => usePhoneVerificationGate());
    const retry = jest.fn();
    act(() => {
      result.current.intercept(PHONE_403, retry);
    });
    act(() => {
      result.current.close();
    });
    expect(result.current.visible).toBe(false);

    act(() => {
      result.current.handleVerified();
    });
    expect(retry).not.toHaveBeenCalled();
  });

  it('works without a retry callback (intercept still opens the modal)', () => {
    const { result } = renderHook(() => usePhoneVerificationGate());
    act(() => {
      result.current.intercept('phone verification required');
    });
    expect(result.current.visible).toBe(true);
    act(() => {
      result.current.handleVerified();
    });
    expect(result.current.visible).toBe(false);
  });
});
