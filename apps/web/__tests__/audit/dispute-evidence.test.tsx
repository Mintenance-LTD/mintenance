import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  disputeEvidencePath,
  readDisputeEvidence,
} from '@/lib/services/disputes/evidence';
import { DisputeEvidenceLinks } from '@/components/disputes/DisputeEvidenceLinks';
const mocks = vi.hoisted(() => ({ sign: vi.fn() }));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    storage: { from: () => ({ createSignedUrl: mocks.sign }) },
  },
}));
beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://storage.example.test');
  mocks.sign.mockReset().mockResolvedValue({
    data: { signedUrl: 'https://storage.example.test/fresh' },
    error: null,
  });
});
describe('durable private dispute evidence', () => {
  it('keeps evidence visible when the retained claimant is missing without signing it', async () => {
    expect(
      await readDisputeEvidence(
        'Claim\n\nEvidence:\n1. job-attachments:job/disputes/claimant/photo.jpg',
        'job',
        null
      )
    ).toEqual([{ label: 'Evidence 1', url: null }]);
    expect(mocks.sign).not.toHaveBeenCalled();
  });
  it('preserves ordered unavailable entries alongside valid evidence without exposing raw references', async () => {
    expect(
      await readDisputeEvidence(
        'Claim\n\nEvidence:\n1. old-private-reference\n2. job-attachments:job/disputes/claimant/photo.jpg\n3. old-private-reference\n',
        'job',
        'claimant'
      )
    ).toEqual([
      { label: 'Evidence 1', url: null },
      { label: 'Evidence 2', url: 'https://storage.example.test/fresh' },
    ]);
    expect(mocks.sign).toHaveBeenCalledExactlyOnceWith(
      'job/disputes/claimant/photo.jpg',
      600
    );
  });
  it('does not invent evidence for descriptions without attachment entries', async () => {
    expect(await readDisputeEvidence('Claim', 'job', null)).toEqual([]);
    expect(
      await readDisputeEvidence('Claim\n\nEvidence:\n\n', 'job', 'claimant')
    ).toEqual([]);
    expect(mocks.sign).not.toHaveBeenCalled();
  });
  it('renews an expired legacy URL and a stable reference without fetching the supplied URL', async () => {
    const path = 'job/disputes/claimant/photo.jpg';
    const url = `https://storage.example.test/storage/v1/object/sign/job-attachments/${path}?token=expired`;
    expect(disputeEvidencePath(url, 'job', 'claimant')).toBe(path);
    const result = await readDisputeEvidence(
      `Claim\n\nEvidence:\n1. ${url}\n2. job-attachments:${path}`,
      'job',
      'claimant'
    );
    expect(mocks.sign).toHaveBeenCalledExactlyOnceWith(path, 600);
    expect(result).toEqual([
      { label: 'Evidence 1', url: 'https://storage.example.test/fresh' },
    ]);
  });
  it.each([
    'job-attachments:other-job/disputes/claimant/photo.jpg',
    'job-attachments:job/disputes/other-user/photo.jpg',
    'job-attachments:job/disputes/claimant/../secret.jpg',
    'job-attachments:job/disputes/claimant/%2e%2e',
    'https://storage.example.test.attacker.test/storage/v1/object/sign/job-attachments/job/disputes/claimant/photo.jpg',
    'https://user:pass@storage.example.test/storage/v1/object/sign/job-attachments/job/disputes/claimant/photo.jpg',
    'https://storage.example.test/storage/v1/object/sign/job-attachments/job/disputes/claimant/%252e%252e',
  ])(
    'does not sign an untrusted or out-of-scope reference: %s',
    async (value) => {
      expect(disputeEvidencePath(value, 'job', 'claimant')).toBeNull();
      expect(
        await readDisputeEvidence(
          `Claim\n\nEvidence:\n1. ${value}`,
          'job',
          'claimant'
        )
      ).toEqual([{ label: 'Evidence 1', url: null }]);
      expect(mocks.sign).not.toHaveBeenCalled();
    }
  );
  it('shows an unavailable record when storage fails, rather than losing the evidence entry', async () => {
    mocks.sign.mockRejectedValue(new Error('offline'));
    const items = await readDisputeEvidence(
      'Claim\n\nEvidence:\n1. job-attachments:job/disputes/claimant/photo.jpg',
      'job',
      'claimant'
    );
    render(<DisputeEvidenceLinks items={items} />);
    expect(screen.getByText(/Evidence 1 is unavailable/)).toBeDefined();
    expect(screen.queryByRole('link')).toBeNull();
  });
});
