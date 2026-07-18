import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
import { JobsBulkActionsSection } from '@/app/jobs/components/JobsBulkActionsSection';
import { updateJobSchema } from '@/app/api/jobs/[id]/_handlers/shared';

// mockReset: true clears mock impls between tests — hoist stable refs.
const { mockGetCsrfHeaders, mockFetch } = vi.hoisted(() => ({
  mockGetCsrfHeaders: vi.fn(),
  mockFetch: vi.fn(),
}));

vi.mock('@/lib/csrf-client', () => ({
  getCsrfHeaders: mockGetCsrfHeaders,
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

// Surface the bar's callbacks as plain buttons so the test can drive
// the archive flow without the bar's own animation/layout concerns.
vi.mock('@/app/jobs/components/BulkActionsBar', () => ({
  BulkActionsBar: ({ onArchive }: { onArchive: () => void }) => (
    <button onClick={onArchive}>archive-selected</button>
  ),
}));

vi.mock('@/app/jobs/components/ConfirmationModal', () => ({
  ConfirmationModal: () => null,
}));

/**
 * Regression: this component used to PATCH { status: 'archived' } —
 * a value updateJobSchema rejects — so bulk archive 400'd for every
 * job. It must send the dedicated { archived: true } payload, and
 * that payload must stay parseable by the live server schema.
 */
describe('JobsBulkActionsSection — bulk archive payload', () => {
  beforeEach(() => {
    mockGetCsrfHeaders.mockResolvedValue({ 'x-csrf-token': 'test-token' });
    mockFetch.mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', mockFetch);
    vi.stubGlobal('alert', vi.fn());
    // happy-dom lets us stub reload; the component reloads on success.
    window.location.reload = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const renderSection = () =>
    render(
      <JobsBulkActionsSection
        selectionMode={true}
        selectedJobs={new Set(['job-1', 'job-2'])}
        filteredJobs={[]}
        onCancelSelection={vi.fn()}
      />
    );

  it('PATCHes each selected job with { archived: true }', async () => {
    renderSection();
    fireEvent.click(screen.getByText('archive-selected'));

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));

    const urls = mockFetch.mock.calls.map((c) => c[0]).sort();
    expect(urls).toEqual(['/api/jobs/job-1', '/api/jobs/job-2']);

    for (const [, init] of mockFetch.mock.calls) {
      expect(init.method).toBe('PATCH');
      expect(JSON.parse(init.body)).toEqual({ archived: true });
    }
  });

  it("never sends the legacy { status: 'archived' } payload", async () => {
    renderSection();
    fireEvent.click(screen.getByText('archive-selected'));

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());

    for (const [, init] of mockFetch.mock.calls) {
      expect(JSON.parse(init.body).status).toBeUndefined();
    }
  });

  it('sends a payload the live updateJobSchema accepts (caller-drift guard)', async () => {
    renderSection();
    fireEvent.click(screen.getByText('archive-selected'));

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(updateJobSchema.safeParse(body).success).toBe(true);
  });
});
