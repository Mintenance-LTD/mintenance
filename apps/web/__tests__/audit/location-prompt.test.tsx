import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
vi.mock('@/lib/csrf-client', () => ({
  getCsrfHeaders: async () => ({ 'x-csrf-token': 'synthetic' }),
}));
import { LocationPromptModal } from '@/app/contractor/(dashboard)/discover/components/LocationPromptModal';
const success = vi.fn();
const close = vi.fn();
const fetcher = vi.fn();
const originalGeo = Object.getOwnPropertyDescriptor(navigator, 'geolocation');
const originalPermissions = Object.getOwnPropertyDescriptor(
  navigator,
  'permissions'
);
const show = () =>
  render(
    <LocationPromptModal
      isOpen
      contractorId='10000000-0000-4000-8000-000000000001'
      onLocationSet={success}
      onClose={close}
    />
  );
const manual = () => {
  fireEvent.click(screen.getByText('Enter Address Manually'));
  fireEvent.change(screen.getByLabelText('Enter your address or postcode'), {
    target: { value: 'Synthetic address' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save Location' }));
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', fetcher);
  Object.defineProperty(navigator, 'permissions', {
    configurable: true,
    value: { query: async () => ({ state: 'prompt' }) },
  });
  fetcher.mockImplementation(async (url: string, options: RequestInit) => {
    const authorized =
      (options.headers as Record<string, string>)['x-csrf-token'] ===
      'synthetic';
    return {
      ok: authorized,
      json: async () =>
        url === '/api/geocode-proxy'
          ? {
              latitude: 51.5,
              longitude: -0.1,
              formatted_address: 'Synthetic address, London',
            }
          : { success: true },
    };
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  if (originalGeo) Object.defineProperty(navigator, 'geolocation', originalGeo);
  else Reflect.deleteProperty(navigator, 'geolocation');
  if (originalPermissions)
    Object.defineProperty(navigator, 'permissions', originalPermissions);
  else Reflect.deleteProperty(navigator, 'permissions');
});
it('sends CSRF on manual geocoding and announces success only after saving', async () => {
  show();
  manual();
  await waitFor(() =>
    expect(success).toHaveBeenCalledWith(
      expect.objectContaining({ latitude: 51.5, longitude: -0.1 })
    )
  );
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(close).toHaveBeenCalledTimes(1);
});
it('preserves manual input and shows failure when saving fails', async () => {
  fetcher
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        latitude: 51.5,
        longitude: -0.1,
        formatted_address: 'Synthetic address',
      }),
    })
    .mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Synthetic unavailable service' }),
    });
  show();
  manual();
  await screen.findByText('Failed to save location. Please try again.');
  expect(screen.getByLabelText('Enter your address or postcode')).toHaveValue(
    'Synthetic address'
  );
  expect(success).not.toHaveBeenCalled();
  expect(close).not.toHaveBeenCalled();
});
it('accepts valid zero coordinates returned by geocoding', async () => {
  fetcher
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        latitude: 0,
        longitude: 0,
        formatted_address: 'Synthetic zero-coordinate fixture',
      }),
    })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) });
  show();
  manual();
  await waitFor(() =>
    expect(success).toHaveBeenCalledWith(
      expect.objectContaining({ latitude: 0, longitude: 0 })
    )
  );
});
it.each(['denied', 'unavailable'])(
  'retains manual fallback when browser location is %s',
  async (state) => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value:
        state === 'unavailable' ? undefined : { getCurrentPosition: vi.fn() },
    });
    Object.defineProperty(navigator, 'permissions', {
      configurable: true,
      value: { query: async () => ({ state: 'denied' }) },
    });
    show();
    fireEvent.click(screen.getByText('Use My Current Location'));
    await screen.findByText(
      state === 'denied'
        ? /Location permission denied/
        : /not supported by your browser/
    );
    expect(fetcher).not.toHaveBeenCalled();
    manual();
    await waitFor(() => expect(success).toHaveBeenCalled());
  }
);
it('uses the same protected geocoding request after browser permission is granted', async () => {
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition: (callback: PositionCallback) =>
        callback({
          coords: { latitude: 51.5, longitude: -0.1 },
        } as GeolocationPosition),
    },
  });
  show();
  fireEvent.click(screen.getByText('Use My Current Location'));
  await waitFor(() => expect(success).toHaveBeenCalled());
  expect(fetcher.mock.calls[0][1].headers).toMatchObject({
    'x-csrf-token': 'synthetic',
  });
});
