/**
 * usePhoneVerificationGate — turns the job-posting 403 dead-end into a
 * recoverable flow.
 *
 * Each posting surface calls `intercept(error, retry)` inside its
 * failure path. When the error is the homeowner phone-verification
 * 403, the gate stashes the retry callback, opens
 * PhoneVerificationModal (the screen renders it off `visible`), and
 * returns true so the caller skips its generic error alert. Once the
 * modal reports success, `handleVerified` closes it and re-runs the
 * stashed submission — the user's drafted job is still in component
 * state, so the post completes without re-entry.
 */

import { useCallback, useRef, useState } from 'react';
import { isPhoneVerificationError } from '../components/verification/phoneVerification';

export interface PhoneVerificationGate {
  /** Whether PhoneVerificationModal should be shown. */
  visible: boolean;
  /**
   * Returns true (and opens the modal) when `error` is the
   * phone-verification 403; the caller should stop its own error
   * handling in that case. `retry` re-runs after successful verify.
   */
  intercept: (error: unknown, retry?: () => void) => boolean;
  /** User dismissed the modal without verifying. */
  close: () => void;
  /** Modal verified the phone — close and re-run the submission. */
  handleVerified: () => void;
}

export function usePhoneVerificationGate(): PhoneVerificationGate {
  const [visible, setVisible] = useState(false);
  const retryRef = useRef<(() => void) | null>(null);

  const intercept = useCallback((error: unknown, retry?: () => void) => {
    if (!isPhoneVerificationError(error)) return false;
    retryRef.current = retry ?? null;
    setVisible(true);
    return true;
  }, []);

  const close = useCallback(() => {
    retryRef.current = null;
    setVisible(false);
  }, []);

  const handleVerified = useCallback(() => {
    setVisible(false);
    const retry = retryRef.current;
    retryRef.current = null;
    retry?.();
  }, []);

  return { visible, intercept, close, handleVerified };
}
