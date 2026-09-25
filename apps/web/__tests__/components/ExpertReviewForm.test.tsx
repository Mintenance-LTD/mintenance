import React from 'react';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { ExpertReviewForm } from '@/app/admin/building-assessments/components/ExpertReviewForm';
import { ExpertEvaluationPanel } from '@/app/admin/building-assessments/components/ExpertEvaluationPanel';

vi.mock('@/components/ui/Button', () => ({
  Button: ({
    children,
    variant: _variant,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) => (
    <button {...props}>{children}</button>
  ),
}));
vi.mock('@/lib/csrf-client', () => ({
  getCsrfHeaders: vi.fn(async () => ({ 'x-csrf-token': 'test' })),
}));
const source = {
  sourceFingerprint: 'a'.repeat(64),
  images: [
    {
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      imageIndex: 0,
      url: 'https://example.com/photo.jpg',
    },
  ],
  reviews: [],
};
let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn(async () => ({ ok: true, json: async () => source }));
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function fillReview() {
  await screen.findByText('Inspected photo 1');
  fireEvent.click(screen.getByLabelText(/Inspected photo 1/));
  fireEvent.change(screen.getByLabelText('Primary defect category'), {
    target: { value: 'water_damage' },
  });
  fireEvent.change(screen.getByLabelText('Severity'), {
    target: { value: 'developing' },
  });
  fireEvent.change(screen.getByLabelText('Urgency'), {
    target: { value: 'soon' },
  });
  fireEvent.change(screen.getByLabelText('Critical hazard visible?'), {
    target: { value: 'false' },
  });
  fireEvent.change(
    screen.getByLabelText('Your relevant qualification or experience'),
    { target: { value: 'Building surveyor' } }
  );
  fireEvent.change(screen.getByLabelText('Evidence and reasoning'), {
    target: { value: 'Visible water staining on the wall.' },
  });
  fireEvent.click(screen.getByLabelText(/I inspected the selected photos/));
}
describe('expert review interface', () => {
  it('submits deliberate labels and selected evidence with CSRF protection', async () => {
    render(<ExpertReviewForm assessmentId='test-id' />);
    await fillReview();
    fireEvent.click(screen.getByRole('button', { name: 'Save expert review' }));
    await screen.findByText(/Review saved/);
    const [, options] = fetchMock.mock.calls.find(
      (call) =>
        (call as unknown[])[1] &&
        ((call as unknown[])[1] as RequestInit).method === 'POST'
    ) as unknown as [string, RequestInit];
    expect(JSON.parse(options.body as string)).toMatchObject({
      sourceFingerprint: source.sourceFingerprint,
      evidenceImageIds: [source.images[0].id],
      labels: { criticalHazard: false, severity: 'developing' },
    });
    expect(options.headers).toMatchObject({ 'x-csrf-token': 'test' });
  });
  it('clears diagnostic labels when evidence is insufficient', async () => {
    render(<ExpertReviewForm assessmentId='test-id' />);
    await fillReview();
    fireEvent.change(screen.getByLabelText('Evidence quality'), {
      target: { value: 'insufficient' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save expert review' }));
    await screen.findByText(/Review saved/);
    const call = fetchMock.mock.calls.find(
      (call) => ((call as unknown[])[1] as RequestInit)?.method === 'POST'
    ) as unknown as [string, RequestInit];
    expect(JSON.parse(call[1].body as string).labels).toEqual({
      evidence: 'insufficient',
      damageType: null,
      severity: null,
      urgency: null,
      criticalHazard: null,
    });
  });
  it('keeps a stale-source review unsaved and explains recovery', async () => {
    render(<ExpertReviewForm assessmentId='test-id' />);
    await fillReview();
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({}),
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save expert review' }));
    await screen.findByText(/The source changed/);
    expect(screen.queryByText(/Review saved/)).toBeNull();
  });
  it('does not offer review submission without source images', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ ...source, images: [] }),
    });
    render(<ExpertReviewForm assessmentId='test-id' />);
    await screen.findByText(/No source photos/);
    expect(
      screen.queryByRole('button', { name: 'Save expert review' })
    ).toBeNull();
  });
  it('shows an honest empty evaluation state', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        reviewCount: 0,
        scored: 0,
        conflicts: 0,
        insufficientEvidence: 0,
        groups: [],
      }),
    });
    render(<ExpertEvaluationPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Refresh evaluation' }));
    await waitFor(() =>
      expect(screen.getByText(/No scoreable expert reviews yet/)).toBeTruthy()
    );
  });
});
