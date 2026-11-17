import React from 'react';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { EditAppointmentDialog } from '@/app/contractor/(dashboard)/scheduling/components/Scheduling/EditAppointmentDialog';
import { PropertyDocumentActions } from '@/app/properties/[id]/components/PropertyDocumentActions';
import type { Appointment } from '@/app/contractor/(dashboard)/scheduling/components/Scheduling/types';
const mock = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock('@/lib/csrf-client', () => ({ fetchWithCsrf: mock.fetch }));
const apt = {
  id: 'visit',
  title: 'Synthetic QA visit',
  client: 'Synthetic Owner',
  date: '2099-12-01',
  time: '09:00:00',
  endTime: '10:30:00',
  status: 'confirmed',
} as Appointment;
const doc = {
  id: 'file',
  name: 'QA.pdf',
  kind: 'lease',
  updated_at: '2026-11-17T00:00:00.000Z',
  archived_at: null,
};
beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);
it('keeps a failed reschedule open and retries the exact original version', async () => {
  const saved = vi.fn();
  mock.fetch
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({ error: 'This visit overlaps another appointment' }),
        { status: 409 }
      )
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ appointment: { id: 'visit' } }))
    );
  render(
    <EditAppointmentDialog
      appointment={apt}
      onClose={vi.fn()}
      onSaved={saved}
    />
  );
  fireEvent.change(screen.getByLabelText('Visit date'), {
    target: { value: '2099-12-02' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save new visit time' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('overlaps');
  expect(saved).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Save new visit time' }));
  await waitFor(() => expect(saved).toHaveBeenCalledOnce());
  expect(JSON.parse(mock.fetch.mock.calls[1][1].body)).toMatchObject({
    startTime: '09:00',
    endTime: '10:30',
    expected: { date: apt.date, start: apt.time, end: apt.endTime },
  });
});
it('does not expose time editing after a visit has ended', () => {
  render(
    <EditAppointmentDialog
      appointment={{ ...apt, status: 'completed' }}
      onClose={vi.fn()}
      onSaved={vi.fn()}
    />
  );
  expect(screen.getByLabelText('Visit date')).toBeDisabled();
  expect(
    screen.queryByRole('button', { name: 'Save new visit time' })
  ).toBeNull();
});
it('requires archive confirmation and retains the file after an error', async () => {
  const saved = vi.fn();
  mock.fetch.mockResolvedValue(
    new Response(JSON.stringify({ error: 'Document changed' }), { status: 409 })
  );
  render(
    <PropertyDocumentActions
      propertyId='property'
      document={doc}
      onSaved={saved}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: 'Archive file' }));
  expect(mock.fetch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Confirm archive' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Document changed'
  );
  expect(saved).not.toHaveBeenCalled();
  expect(JSON.parse(mock.fetch.mock.calls[0][1].body)).toMatchObject({
    action: 'archive',
    archived: true,
    documentId: 'file',
    expectedUpdatedAt: doc.updated_at,
  });
});
it('saves a renamed file through labelled fields and exact response confirmation', async () => {
  const saved = vi.fn();
  mock.fetch.mockResolvedValue(
    new Response(JSON.stringify({ document: { id: 'file' } }))
  );
  render(
    <PropertyDocumentActions
      propertyId='property'
      document={doc}
      onSaved={saved}
    />
  );
  fireEvent.click(
    screen.getByRole('button', { name: 'Rename or change type' })
  );
  fireEvent.change(screen.getByLabelText('Document name'), {
    target: { value: 'QA corrected.pdf' },
  });
  fireEvent.click(
    screen.getByRole('button', { name: 'Save document details' })
  );
  await waitFor(() => expect(saved).toHaveBeenCalledOnce());
  expect(JSON.parse(mock.fetch.mock.calls[0][1].body)).toMatchObject({
    action: 'edit',
    name: 'QA corrected.pdf',
    kind: 'lease',
  });
});
