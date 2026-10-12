import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PasswordRecoveryRedirect } from '../../app/components/PasswordRecoveryRedirect';

afterEach(() => vi.unstubAllGlobals());
describe('landing page password recovery', () => {
  it('preserves recovery credentials only in a same-origin fragment', () => {
    const replace = vi.fn();
    const hash = '#type=recovery&access_token=test-access&refresh_token=test-refresh';
    vi.stubGlobal('window', { location: { hash, replace } });
    render(<PasswordRecoveryRedirect />);
    expect(replace).toHaveBeenCalledWith(`/reset-password${hash}`);
  });
  it.each(['', '#type=signup&access_token=a&refresh_token=b', '#type=recovery&access_token=a'])('ignores non-recovery or incomplete links: %s', hash => {
    const replace = vi.fn();
    vi.stubGlobal('window', { location: { hash, replace } });
    render(<PasswordRecoveryRedirect />);
    expect(replace).not.toHaveBeenCalled();
  });
});
