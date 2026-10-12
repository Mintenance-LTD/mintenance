import { beforeEach, afterEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ sign: vi.fn(), assessment: vi.fn() }));
vi.mock('@/lib/api/supabaseServer', () => ({ serverSupabase: {
  storage: { from: () => ({ createSignedUrl: mocks.sign }) },
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.assessment }) }) }),
} }));
import { extractAssessmentPath, resignAssessmentUrls } from '@/lib/api/assessment-storage';
beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://storage.example.test');
  mocks.sign.mockReset().mockResolvedValue({ data: { signedUrl: 'https://fresh.test/photo' }, error: null });
  mocks.assessment.mockReset().mockResolvedValue({ data: { user_id: 'owner', property_id: 'property', job_id: null }, error: null });
});
afterEach(() => vi.unstubAllEnvs());
it.each([
  'https://storage.example.test.attacker.test/storage/v1/object/sign/assessment-photos/assessments/one/photo.jpg',
  'https://user:pass@storage.example.test/storage/v1/object/sign/assessment-photos/assessments/one/photo.jpg',
  'https://storage.example.test/storage/v1/object/sign/assessment-photos/assessments/one/%252e%252e/photo.jpg',
  'assessments/one/../two/photo.jpg', 'assessments/one/%2e%2e/photo.jpg',
  'javascript:alert(1)', 'https://storage.example.test/storage/v1/object/sign/assessment-photos/%invalid',
])('rejects unsafe photo reference %s', value => expect(extractAssessmentPath(value)).toBeNull());
it('renews an owned legacy link without trusting the old token', async () => {
  const result = await resignAssessmentUrls(['https://storage.example.test/storage/v1/object/sign/assessment-photos/assessments/one/photo.jpg?token=expired'], 3600, 'one');
  expect(result).toEqual(['https://fresh.test/photo']);
  expect(mocks.sign).toHaveBeenCalledWith('assessments/one/photo.jpg', 3600);
});
it('never signs another assessment file even with a valid storage URL', async () => {
  expect(await resignAssessmentUrls(['assessments/two/photo.jpg'], 3600, 'one')).toEqual([]);
  expect(mocks.sign).not.toHaveBeenCalled();
});
it('does not return the old URL after signing fails', async () => {
  mocks.sign.mockResolvedValue({ data: null, error: { message: 'Object not found' } });
  expect(await resignAssessmentUrls(['assessments/one/photo.jpg'], 3600, 'one')).toEqual([]);
});
it.each(['quick-ai/owner/photo.jpg', 'quick-ai/property-123456/photo.jpg'])(
  'preserves linked legacy walkthrough photo %s', async path => {
    expect(await resignAssessmentUrls([path], 3600, 'one')).toEqual(['https://fresh.test/photo']);
  },
);
it.each(['quick-ai/stranger/photo.jpg', 'quick-ai/property-other/photo.jpg'])(
  'does not sign unrelated legacy folder %s', async path => {
    expect(await resignAssessmentUrls([path], 3600, 'one')).toEqual([]);
    expect(mocks.sign).not.toHaveBeenCalled();
  },
);
