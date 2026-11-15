import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { useJobDraft } from '@/app/jobs/create/hooks/useJobDraft';
import { initialFormDataFromParams } from '@/app/jobs/create/utils/url-prefill';
import { createJobOnce } from '@/lib/services/jobs/create-job-once';
const m = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/lib/api/supabaseServer', () => ({ serverSupabase: { rpc: m.rpc } }));
beforeEach(() => {
  sessionStorage.clear();
  vi.useFakeTimers();
  m.rpc.mockReset();
});
afterEach(() => vi.useRealTimers());
function useDraft(user: string) {
  const [form, setForm] = useState(initialFormDataFromParams(null));
  return { form, setForm, draft: useJobDraft(user, '', form, setForm) };
}
it('restores the same account draft and retry ID after reload without leaking into another account', () => {
  const first = renderHook(() => useDraft('homeowner'));
  act(() =>
    first.result.current.setForm((previous) => ({
      ...previous,
      title: 'Fix kitchen tap',
    }))
  );
  let id = '';
  act(() => {
    id = first.result.current.draft.submissionId();
  });
  expect(first.result.current.draft.submissionId()).toBe(id);
  first.unmount();
  const second = renderHook(({ user }) => useDraft(user), {
    initialProps: { user: 'homeowner' },
  });
  expect(second.result.current.form.title).toBe('Fix kitchen tap');
  expect(second.result.current.draft.restored).toBe(true);
  expect(second.result.current.draft.submissionId()).toBe(id);
  second.rerender({ user: 'another-user' });
  act(() => vi.advanceTimersByTime(301));
  expect(second.result.current.form.title).toBe('');
  expect(second.result.current.draft.submissionId()).not.toBe(id);
  expect(
    sessionStorage.getItem('mintenance-job-draft:another-user:')
  ).not.toContain('Fix kitchen tap');
});
it('does not resurrect a successfully submitted draft from a pending autosave', () => {
  const { result } = renderHook(() => useDraft('homeowner'));
  act(() =>
    result.current.setForm((previous) => ({
      ...previous,
      title: 'Repair door',
    }))
  );
  act(() => {
    result.current.draft.submissionId();
    result.current.draft.complete();
    vi.advanceTimersByTime(500);
  });
  expect(sessionStorage.getItem('mintenance-job-draft:homeowner:')).toBeNull();
});
it('ignores malformed stored form data', () => {
  sessionStorage.setItem(
    'mintenance-job-draft:homeowner:',
    JSON.stringify({
      form: { title: 'Broken', description: '', requiredSkills: null },
    })
  );
  const { result } = renderHook(() => useDraft('homeowner'));
  expect(result.current.form.title).toBe('');
  expect(result.current.form.requiredSkills).toEqual([]);
});
it('returns the existing durable result and fails closed on a missing result', async () => {
  m.rpc.mockResolvedValueOnce({
    data: { job: { id: 'original' }, created: false },
    error: null,
  });
  expect(
    await createJobOnce('owner', 'request', 'hash', { title: 'Repair' }, [])
  ).toEqual({ job: { id: 'original' }, created: false });
  m.rpc.mockResolvedValueOnce({ data: null, error: { code: 'network' } });
  await expect(
    createJobOnce('owner', 'request', 'hash', {}, [])
  ).rejects.toThrow('Retry this submission');
  m.rpc.mockResolvedValueOnce({ data: null, error: { code: '22023' } });
  await expect(
    createJobOnce('owner', 'request', 'hash', {}, [])
  ).rejects.toThrow('Check your jobs');
});
