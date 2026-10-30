import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { PropertyViewSwitcher } from '../PropertyViewSwitcher';
import RoomPhotoGallery from '@/app/properties/[id]/components/RoomPhotoGallery';
import { useNavSections } from '@/components/layouts/sidebar/sidebarNavConfig';
const state = vi.hoisted(() => ({
  view: 'home',
  enabled: true,
  ready: true,
  saved: true,
  setView: vi.fn(),
}));
vi.mock('@/hooks/usePropertyView', () => ({ usePropertyView: () => state }));
vi.mock('next/image', () => ({
  default: ({
    fill: _fill,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean }) => (
    <img {...props} />
  ),
}));
vi.mock('@/lib/csrf-client', () => ({ getCsrfHeaders: async () => ({}) }));
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
beforeEach(() => {
  state.view = 'home';
  state.enabled = true;
  state.ready = true;
  state.saved = true;
  state.setView.mockClear();
});
function Navigation({
  role = 'homeowner',
}: {
  role?: 'homeowner' | 'contractor' | 'admin';
}) {
  return (
    <>
      {useNavSections(role).flatMap((section) =>
        section.items.map((item) => (
          <a key={item.href} href={item.href}>
            {item.label}
          </a>
        ))
      )}
    </>
  );
}
describe('property view controls', () => {
  it('selects a presentation preference without checkout or permission writes', () => {
    render(<PropertyViewSwitcher />);
    fireEvent.click(screen.getByRole('button', { name: 'Agency' }));
    expect(state.setView).toHaveBeenCalledWith('agency');
    expect(
      screen.getByRole('link', { name: 'Plan & features' }).getAttribute('href')
    ).toBe('/homeowner/subscription');
    expect(
      screen.getByText(/Your plan and property permissions still apply/)
    ).toBeTruthy();
  });
  it('does not expose the preference before identity loads', () => {
    state.enabled = false;
    const { container } = render(<PropertyViewSwitcher />);
    expect(container.textContent).toBe('');
  });
  it('hides rental tools in My home and team analytics until Agency, preserving core tasks', () => {
    const view = render(<Navigation />);
    expect(screen.queryByText('Tenant Reports')).toBeNull();
    expect(screen.getByText('Properties')).toBeTruthy();
    expect(screen.getByText('Payments')).toBeTruthy();
    state.view = 'rentals';
    view.rerender(<Navigation />);
    expect(screen.getByText('Tenant Reports')).toBeTruthy();
    expect(screen.queryByText('Year-over-Year')).toBeNull();
    state.view = 'agency';
    view.rerender(<Navigation />);
    expect(screen.getByText('Year-over-Year')).toBeTruthy();
    view.rerender(<Navigation role='contractor' />);
    expect(screen.getByText('Discover')).toBeTruthy();
    view.rerender(<Navigation role='admin' />);
    expect(screen.getByText('Audit Logs')).toBeTruthy();
  });
});
const rows = [
  {
    id: 'one',
    room_type: 'kitchen',
    file_name: 'first.png',
    photo_url: '/first.png',
    created_at: '2026-10-30T10:00:00Z',
  },
  {
    id: 'two',
    room_type: 'kitchen',
    file_name: 'second.png',
    photo_url: '/second.png',
    created_at: '2026-09-01T10:00:00Z',
  },
  {
    id: 'three',
    room_type: 'bathroom',
    file_name: 'bath.png',
    photo_url: '/bath.png',
    created_at: '2026-10-30T10:00:00Z',
  },
];
describe('web dated room albums', () => {
  it('filters dates within a room and resets the date when changing rooms', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue({ ok: true, json: async () => ({ photos: rows }) })
    );
    render(<RoomPhotoGallery propertyId='property-one' />);
    await screen.findByText('3 photos');
    fireEvent.click(screen.getByRole('button', { name: 'Kitchen (2)' }));
    expect(screen.getAllByRole('img')).toHaveLength(2);
    fireEvent.change(screen.getByLabelText('Upload date (UTC)'), {
      target: { value: '2026-09-01' },
    });
    expect(screen.getAllByRole('img')).toHaveLength(1);
    expect(screen.getByAltText('second.png')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Bathroom (1)' }));
    expect(screen.getByAltText('bath.png')).toBeTruthy();
    expect(
      screen.getByText(/When a photo was taken is not recorded/)
    ).toBeTruthy();
  });
  it('shows a retry error rather than a successful empty album', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ photos: rows }),
      });
    vi.stubGlobal('fetch', fetcher);
    render(<RoomPhotoGallery propertyId='property-one' />);
    await screen.findByRole('alert');
    expect(screen.queryByText(/No photos in/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Retry photos' }));
    await screen.findByText('3 photos');
    expect(screen.queryByRole('alert')).toBeNull();
  });
  it('ignores a late response for the previous property', async () => {
    let resolve!: (value: unknown) => void;
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockImplementationOnce(
          () =>
            new Promise((done) => {
              resolve = done;
            })
        )
        .mockResolvedValue({ ok: true, json: async () => ({ photos: [] }) })
    );
    const result = render(<RoomPhotoGallery propertyId='property-one' />);
    result.rerender(<RoomPhotoGallery propertyId='property-two' />);
    await screen.findByText('0 photos');
    resolve({ ok: true, json: async () => ({ photos: rows }) });
    await waitFor(() => expect(screen.getByText('0 photos')).toBeTruthy());
    expect(screen.queryByText('3 photos')).toBeNull();
  });
});
