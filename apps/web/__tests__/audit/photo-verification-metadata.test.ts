import { GeoVerification } from '@/lib/services/escrow/photo-verification/GeoVerification';
import { VerificationRules } from '@/lib/services/escrow/photo-verification/VerificationRules';
const mocks = vi.hoisted(() => ({ eq: vi.fn(), single: vi.fn() }));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: () => ({ select: () => ({ eq: mocks.eq }) }) },
}));
beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://audit.supabase.co');
  vi.stubEnv('OPENAI_API_KEY', '');
  mocks.eq.mockReturnValue({ single: mocks.single });
  mocks.single.mockResolvedValue({ data: null, error: null });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

it('finds metadata by stable object path after a signing token changes', async () => {
  mocks.single.mockResolvedValue({
    data: {
      geolocation: { lat: 0, lng: 0 },
      timestamp: '2026-09-16T00:00:00Z',
    },
    error: null,
  });
  const result = await GeoVerification.getPhotoMetadata(
    'https://audit.supabase.co/storage/v1/object/sign/Job-storage/job-photos/example.png?token=new'
  );
  expect(mocks.eq).toHaveBeenCalledWith(
    'storage_path',
    'job-photos/example.png'
  );
  expect(result.geolocation).toEqual({ lat: 0, lng: 0 });
});

it.each([undefined, 'invalid'])(
  'does not invent a current timestamp for missing or invalid metadata (%s)',
  async (timestamp) => {
    mocks.single.mockResolvedValue({ data: { timestamp }, error: null });
    expect(
      (await GeoVerification.verifyTimestamp('https://example.invalid/photo'))
        .verified
    ).toBe(false);
  }
);

it('cannot pass comparison when AI is unavailable even with matching geolocation', async () => {
  mocks.single.mockResolvedValue({
    data: { geolocation: { lat: 0, lng: 0 } },
    error: null,
  });
  const result = await VerificationRules.compareBeforeAfter(
    ['https://example.invalid/before'],
    ['https://example.invalid/after'],
    { lat: 0, lng: 0 }
  );
  expect(result.matches).toBe(false);
  expect(result.differences).toContain('AI comparison unavailable');
});
