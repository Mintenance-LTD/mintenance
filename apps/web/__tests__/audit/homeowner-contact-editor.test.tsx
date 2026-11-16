import React from 'react';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MintEditorialContacts } from '@/app/landlord/contacts/MintEditorialContacts';
import { ContactsClient } from '@/app/landlord/contacts/ContactsClient';
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: toast }));
vi.mock('@/lib/csrf-client', () => ({
  getCsrfHeaders: async () => ({ 'x-csrf-token': 'test' }),
}));
const contact = {
  id: 'contact',
  property_id: 'property',
  name: 'QA contact',
  email: null,
  phone: null,
  contact_role: 'emergency_contact',
  unit_label: null,
  move_in_date: null,
  lease_end_date: null,
  notes: null,
  is_active: true,
};
const properties = [
  { id: 'property', property_name: 'QA property', address: 'Test address' },
];
const request = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', request);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe.each([
  ['editorial', MintEditorialContacts],
  ['legacy', ContactsClient],
] as const)('%s contact management', (_theme, Component) => {
  it('labels fields, flags old incomplete contacts, blocks empty emergency details and saves a correction', async () => {
    request.mockResolvedValue({
      ok: true,
      json: async () => ({ contact: { ...contact, phone: '07000000000' } }),
    });
    render(<Component properties={properties} contacts={[contact]} />);
    expect(screen.getByText('Incomplete — no phone or email')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Edit QA contact' }));
    expect(screen.getByRole('heading', { name: 'Edit contact' })).toBeVisible();
    expect(screen.getByLabelText('Full name')).toHaveValue('QA contact');
    expect(screen.getByLabelText('Email')).toBeVisible();
    expect(screen.getByLabelText('Phone')).toBeVisible();
    expect(screen.getByLabelText('Unit / flat')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Add a phone number or email'
    );
    expect(request).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Phone'), {
      target: { value: '07000000000' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Contact updated')
    );
    expect(request).toHaveBeenCalledWith(
      '/api/landlord/contacts/contact',
      expect.objectContaining({
        method: 'PATCH',
        headers: expect.objectContaining({ 'x-csrf-token': 'test' }),
      })
    );
    expect(screen.queryByText('Incomplete — no phone or email')).toBeNull();
  });
  it('archives without deleting the record and keeps a failed restore visible', async () => {
    request.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ contact: { ...contact, is_active: false } }),
    });
    render(<Component properties={properties} contacts={[contact]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Archive QA contact' }));
    await screen.findByText('Archived');
    expect(screen.getByText('QA contact')).toBeVisible();
    request.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Add contact details before restoring.' }),
    });
    fireEvent.click(screen.getByRole('button', { name: 'Restore QA contact' }));
    await screen.findByRole('alert');
    expect(screen.getByText('Archived')).toBeVisible();
    expect(
      request.mock.calls.every(([, options]) => options.method === 'PATCH')
    ).toBe(true);
  });
});
