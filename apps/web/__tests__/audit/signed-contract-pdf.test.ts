// @vitest-environment node
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/contracts/[id]/pdf/route';

const contractId = '11111111-1111-4111-8111-111111111111';
const { from } = vi.hoisted(() => ({ from: vi.fn() }));

vi.mock('@/lib/api/supabaseServer', () => ({ serverSupabase: { from } }));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler:
    (_options: unknown, handler: Function) => (request: NextRequest) =>
      handler(request, {
        user: { id: 'contractor' },
        params: { id: contractId },
      }),
}));

it('downloads the exact signed agreement with its terms and signature evidence', async () => {
  const timestamp = '2026-11-20T10:00:00Z';
  const contract = {
    id: contractId,
    job_id: 'job',
    contractor_id: 'contractor',
    homeowner_id: 'homeowner',
    title: 'Synthetic garden agreement',
    status: 'accepted',
    description: 'Trim the hedge and clear all clippings.',
    terms: { warranty_terms: 'Twelve months on supplied parts.' },
    amount: 42.5,
    created_at: timestamp,
    contractor: { company_name: 'Fixture Garden Company' },
    homeowner: { first_name: 'Example', last_name: 'Resident' },
    contractor_signed_at: timestamp,
    homeowner_signed_at: timestamp,
  };
  const signatures = ['contractor', 'homeowner'].map((role, i) => ({
    signer_role: role,
    signer_id: role,
    signature_format: 'svg',
    signature_image: `<svg viewBox="0 0 80 20"><path d="M 2 12 L 25 ${6 + i * 9} L 74 8"/></svg>`,
  }));
  const contractEq = vi.fn().mockReturnValue({
    single: async () => ({ data: contract, error: null }),
  });
  const signatureEq = vi
    .fn()
    .mockResolvedValue({ data: signatures, error: null });
  from.mockImplementation((table: string) => ({
    select: () => ({
      eq: table === 'contracts' ? contractEq : signatureEq,
    }),
  }));

  const response = await GET(
    new NextRequest(`http://localhost/api/contracts/${contractId}/pdf`),
    {} as never
  );
  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toBe('application/pdf');
  expect(response.headers.get('content-disposition')).toBe(
    'attachment; filename="Contract-11111111.pdf"'
  );
  expect(contractEq).toHaveBeenCalledWith('id', contractId);
  expect(signatureEq).toHaveBeenCalledWith('contract_id', contractId);
  const pdf = Buffer.from(await response.arrayBuffer()).toString('latin1');
  expect(pdf).toMatch(/^%PDF-/);
  expect(pdf).toContain('Trim the hedge and clear all clippings.');
  expect(pdf).toContain('Twelve months on supplied parts.');
  expect(pdf).toContain('Signed by Fixture Garden Company');
  expect(pdf).toContain('Signed by Example Resident');
  expect(pdf.match(/\/I\d+ Do/g)).toHaveLength(2);
});
