import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
const m = vi.hoisted(() => ({ send: vi.fn(), create: vi.fn() }));
vi.mock('@/lib/csrf-client', () => ({
  fetchWithCsrf: (...args: unknown[]) => m.send(...args),
}));
vi.mock('@/components/auth/MfaStepUpDialog', () => ({
  MfaStepUpDialog: ({ onSuccess }: { onSuccess: () => void }) => (
    <button onClick={onSuccess}>Verify MFA</button>
  ),
}));
import Page from '@/app/admin/evidence-retention/export/AccountEvidenceExport';
const subjectId = '11111111-1111-4111-8111-111111111111';
const archivedAt = '2026-01-01T00:00:00Z';
const manifest = {
  subjectId,
  fingerprint: 'same',
  generatedAt: archivedAt,
  records: [{ kind: 'contract', recordId: subjectId, archivedAt }],
};
const packet = {
  record: { contract_id: subjectId, archived_at: archivedAt },
  external_files_complete: true,
};
beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: m.create.mockReturnValue('blob:synthetic'),
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: vi.fn(),
  });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});
function start() {
  render(<Page />);
  fireEvent.change(screen.getByLabelText('Account to export'), {
    target: { value: subjectId },
  });
  fireEvent.change(screen.getByLabelText('Account export case reference'), {
    target: { value: 'CASE-TEST' },
  });
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByText('Download all retained records'));
}
function replies(final = manifest, record = packet) {
  m.send.mockResolvedValueOnce({ ok: true, json: async () => manifest });
  m.send.mockResolvedValueOnce({
    ok: true,
    text: async () => JSON.stringify(record),
  });
  m.send.mockResolvedValueOnce({ ok: true, json: async () => final });
}
it('downloads only after all records and the second inventory succeed', async () => {
  replies();
  start();
  await screen.findByText(/1 retained record\(s\) downloaded/);
  expect(m.create).toHaveBeenCalledTimes(1);
  expect(m.send).toHaveBeenCalledTimes(3);
});
it('does not download when the inventory changes during collection', async () => {
  replies({ ...manifest, fingerprint: 'changed' });
  start();
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'inventory changed'
  );
  expect(m.create).not.toHaveBeenCalled();
});
it('does not download a record that does not match the manifest', async () => {
  replies(manifest, {
    ...packet,
    record: { ...packet.record, contract_id: 'wrong' },
  });
  start();
  expect(await screen.findByRole('alert')).toHaveTextContent('record changed');
  expect(m.create).not.toHaveBeenCalled();
});
it('preserves the subject through MFA and reports missing files without downloading', async () => {
  m.send.mockResolvedValueOnce({
    ok: false,
    status: 403,
    json: async () => ({ requiresStepUp: true }),
  });
  m.send.mockResolvedValueOnce({ ok: true, json: async () => manifest });
  m.send.mockResolvedValueOnce({
    ok: false,
    status: 503,
    json: async () => ({ error: 'File unavailable' }),
  });
  start();
  fireEvent.click(await screen.findByText('Verify MFA'));
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'File unavailable'
  );
  expect(m.send.mock.calls[0][1].body).toBe(m.send.mock.calls[1][1].body);
  expect(m.create).not.toHaveBeenCalled();
});
it('clearly reports external reconciliation instead of claiming all files are complete', async () => {
  replies(manifest, { ...packet, external_files_complete: false });
  start();
  await screen.findByText(/Some external files still need reconciliation/);
});
