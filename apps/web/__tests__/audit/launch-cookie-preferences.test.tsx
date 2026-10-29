import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import CookieConsent from '@/components/CookieConsent';
import { CookiePreferencesButton } from '@/components/CookiePreferencesButton';
import {
  COOKIE_CONSENT_KEY,
  observeAnalyticsConsent,
} from '@/lib/analytics-consent';

beforeEach(() => localStorage.clear());
afterEach(cleanup);

it('reopens saved consent and withdraws analytics through the visible controls', () => {
  localStorage.setItem(
    COOKIE_CONSENT_KEY,
    JSON.stringify({
      version: '2.0',
      preferences: {
        essential: true,
        analytics: true,
        functional: true,
        marketing: false,
      },
    })
  );
  const apply = vi.fn();
  const dispose = observeAnalyticsConsent(apply);
  const view = render(
    <>
      <CookieConsent />
      <CookiePreferencesButton />
    </>
  );
  try {
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(
      screen.getByRole('button', { name: 'Manage cookie preferences' })
    );
    const analytics = screen.getByRole('checkbox', {
      name: 'Analytics cookies',
    });
    expect(analytics).toBeChecked();
    fireEvent.click(analytics);
    fireEvent.click(screen.getByRole('button', { name: 'Save Preferences' }));
    expect(apply).toHaveBeenLastCalledWith(false);
    expect(
      JSON.parse(localStorage.getItem(COOKIE_CONSENT_KEY)!).preferences
    ).toMatchObject({
      essential: true,
      analytics: false,
      functional: true,
      marketing: false,
    });
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(
      screen.getByRole('button', { name: 'Manage cookie preferences' })
    );
    expect(
      screen.getByRole('checkbox', { name: 'Analytics cookies' })
    ).not.toBeChecked();
  } finally {
    dispose();
    view.unmount();
  }
});
