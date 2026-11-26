import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { StaffFollowup } from '@/app/maintenance/reports/StaffFollowup';
import { ReportExtras } from '@/app/maintenance/reports/ReportExtras';
import { ReportAccess } from '@/app/maintenance/report-access/ReportAccess';
import { isPublicRoute } from '@/middleware/public-routes';
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState(null, '', '/');
});
const reportId = '00000000-0000-4000-8000-000000000001';
it('never sends an email until explicitly requested and retains a saved report on email failure', async () => {
  const fetcher = vi.fn().mockRejectedValue(new Error('offline'));
  vi.stubGlobal('fetch', fetcher);
  render(<ReportExtras reportId={reportId} receipt={'a'.repeat(64)} />);
  expect(fetcher).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText('Email me a verification link'));
  expect(await screen.findByText(/Your report is saved/)).toBeInTheDocument();
  expect(fetcher.mock.calls[0][1].headers['x-report-receipt']).toBe(
    'a'.repeat(64)
  );
});
it('uses the photo multipart field and a fixed retry slot', async () => {
  const fetcher = vi.fn().mockResolvedValue({ ok: true });
  vi.stubGlobal('fetch', fetcher);
  const refresh = vi.fn();
  render(
    <ReportExtras
      reportId={reportId}
      receipt={'b'.repeat(64)}
      refresh={refresh}
    />
  );
  const file = new File(['test'], 'photo.jpg', { type: 'image/jpeg' });
  fireEvent.change(screen.getByLabelText('Choose photo'), {
    target: { files: [file] },
  });
  expect(await screen.findByText('Photo saved.')).toBeInTheDocument();
  expect(fetcher.mock.calls[0][0]).toContain('slot=1');
  expect(fetcher.mock.calls[0][1].body.get('photo')).toBe(file);
  expect(refresh).toHaveBeenCalledOnce();
});
it('does not consume an email verification token merely by opening the page', async () => {
  window.history.replaceState(
    null,
    '',
    `/maintenance/report-access#${reportId}:${'c'.repeat(64)}`
  );
  const fetcher = vi.fn().mockResolvedValue({
    ok: false,
    json: async () => ({ error: 'Expired link' }),
  });
  vi.stubGlobal('fetch', fetcher);
  render(<ReportAccess />);
  const button = await screen.findByRole('button', {
    name: 'Confirm email and open report',
  });
  expect(fetcher).not.toHaveBeenCalled();
  fireEvent.click(button);
  expect(await screen.findByText('Expired link')).toBeInTheDocument();
});
it('only exposes the intended public endpoints', () => {
  expect(isPublicRoute('/api/report-access')).toBe(true);
  expect(isPublicRoute('/api/report-photos')).toBe(true);
  expect(isPublicRoute('/api/report-access/admin')).toBe(false);
  expect(isPublicRoute('/maintenance/report-access')).toBe(true);
  expect(isPublicRoute('/maintenance/report-access/admin')).toBe(false);
});

vi.mock('@/lib/csrf-client', () => ({
  getCsrfHeaders: async () => ({ 'X-CSRF-Token': 'test' }),
}));
const staff = {
  propertyId: 'test-house',
  canManage: false,
  assigneeName: 'You',
  needsReassignment: false,
};
it('only submits on request and preserves the private handover note on a failed response', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce({ ok: false, status: 503 })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ submitted: true }),
    });
  vi.stubGlobal('fetch', fetcher);
  const onSaved = vi.fn();
  render(
    <StaffFollowup
      reportId={reportId}
      followup={{ ...staff, completionRevision: 4 }}
      onSaved={onSaved}
    />
  );
  const note = screen.getByLabelText('What work was completed?');
  const button = screen.getByRole('button', {
    name: 'Submit for owner review',
  });
  expect(button).toBeDisabled();
  fireEvent.change(note, { target: { value: 'Washer replaced' } });
  expect(fetcher).not.toHaveBeenCalled();
  fireEvent.click(button);
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Your note is still here'
  );
  expect(note).toHaveValue('Washer replaced');
  expect(onSaved).not.toHaveBeenCalled();
  fireEvent.click(button);
  await screen.findByRole('button', { name: 'Submit for owner review' });
  expect(fetcher.mock.calls[1][0]).toBe('/api/properties/test-house/followups');
  expect(JSON.parse(fetcher.mock.calls[1][1].body)).toEqual({
    reportId,
    revision: 4,
    note: 'Washer replaced',
  });
  expect(onSaved).toHaveBeenCalledWith(expect.stringContaining('still open'));
});
it('lets the owner review the attributed note while preserving the exact report destination', () => {
  render(
    <StaffFollowup
      reportId={reportId}
      followup={{
        ...staff,
        canManage: true,
        completion: {
          note: 'Washer replaced',
          awaitingReview: true,
          submittedBy: 'Test Manager',
          submittedAt: '2026-11-26T10:00:00Z',
        },
      }}
      onSaved={vi.fn()}
    />
  );
  expect(screen.getByText('Ready for owner review')).toBeInTheDocument();
  expect(screen.getByText(/Test Manager/)).toBeInTheDocument();
  expect(screen.getByText('Washer replaced')).toBeInTheDocument();
  expect(
    screen.getByRole('link', { name: 'Open report to review and close' })
  ).toHaveAttribute('href', '/landlord/reports?reportId=' + reportId);
  expect(
    screen.queryByRole('button', { name: 'Submit for owner review' })
  ).not.toBeInTheDocument();
});
