// @vitest-environment node
import { readFile } from 'node:fs/promises';
import { NextRequest } from 'next/server';
import { beforeEach, expect, it, vi } from 'vitest';
import sharp from 'sharp';
import {
  isPublicRoute,
  isRetiredContractorDirectoryPath,
} from '@/middleware/public-routes';
import {
  CONTRACTOR_PLAN_FEES,
  MINTENANCE_PUBLIC_ORIGIN,
  publicShareCard,
} from '@/lib/marketing/public-journey';
import { getContractorPlans } from '@/app/pricing/components/pricing-plans';

const mocks = vi.hoisted(() => ({
  sendEmail: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  single: vi.fn(),
  is: vi.fn(),
  order: vi.fn(),
  limit: vi.fn(),
}));
vi.mock('@/lib/email-service', () => ({ EmailService: mocks }));
vi.mock('@/lib/api/supabaseServer', () => ({ serverSupabase: mocks }));
vi.mock('@/lib/rate-limiter', () => ({
  checkApiRateLimit: async () => ({ allowed: true }),
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_options: unknown, handler: unknown) => handler,
}));
import { POST } from '@/app/api/contact/route';
import sitemap from '@/app/sitemap';

function submit(category: string, propertyCount?: number) {
  return POST(
    new NextRequest('https://www.mintenance.co.uk/api/contact', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Agency',
        email: 'enquiries@example.invalid',
        subject: 'Repair portfolio demo',
        message: 'Please show us the tenant report workflow.',
        consent: true,
        category,
        propertyCount,
      }),
    }),
    {} as never
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.from.mockReturnValue(mocks);
  mocks.select.mockReturnValue(mocks);
  mocks.eq.mockReturnValue(mocks);
  mocks.is.mockReturnValue(mocks);
  mocks.order.mockReturnValue(mocks);
  mocks.limit.mockResolvedValue({ data: [] });
  mocks.single.mockResolvedValue({
    data: { setting_value: 'support@example.invalid' },
  });
  mocks.sendEmail.mockResolvedValue(true);
});

it('requires a portfolio size and routes the agency enquiry to the named sales owner', async () => {
  expect((await submit('agency-demo')).status).toBe(400);
  expect(mocks.sendEmail).not.toHaveBeenCalled();
  expect((await submit('agency-demo', 25)).status).toBe(200);
  expect(mocks.sendEmail).toHaveBeenCalledWith(
    expect.objectContaining({
      to: 'Liam@mintenance.co.uk',
      text: expect.stringContaining('Properties managed: 25'),
    })
  );
});

it('keeps regular contact enquiries on the existing inbox', async () => {
  expect((await submit('billing')).status).toBe(200);
  expect(mocks.sendEmail).toHaveBeenCalledWith(
    expect.objectContaining({
      to: 'support@example.invalid',
    })
  );
});

it('lists the public audience pages and omits unimplemented directories and help stubs', async () => {
  const paths = (await sitemap()).map(({ url }) => new URL(url).pathname);
  expect(paths).toEqual(
    expect.arrayContaining([
      '/for-homeowners',
      '/for-contractors',
      '/for-letting-agents',
    ])
  );
  for (const path of [
    '/contractors/in/manchester',
    '/contractors/plumber',
    '/help/homeowner-guide',
    '/help/payments',
  ])
    expect(paths).not.toContain(path);
  expect(isPublicRoute('/for-letting-agents')).toBe(true);
  expect(isPublicRoute('/opengraph-image')).toBe(true);
  expect(isPublicRoute('/api/landlord/reports/job-draft')).toBe(false);
  expect(isRetiredContractorDirectoryPath('/contractors/plumber')).toBe(true);
  expect(
    isRetiredContractorDirectoryPath(
      '/contractors/00000000-0000-4000-8000-000000000016'
    )
  ).toBe(false);
});

it.each(['home', 'homeowners', 'tradespeople', 'letting-agents'] as const)(
  'serves a static share image with 1200 × 630 artwork for %s',
  async (name) => {
    const image = publicShareCard(name, 'Mintenance demo');
    const path = new URL(image.url).pathname;
    expect(image.url).toBe(`${MINTENANCE_PUBLIC_ORIGIN}${path}`);
    const asset = await readFile(`public${path}`);
    expect(await sharp(asset).metadata()).toMatchObject({
      format: 'png',
      width: 1200,
      height: 630,
    });
  }
);

it('uses the same rates in pricing and the public FAQ', () => {
  const plans = getContractorPlans(false);
  for (const [index, rate] of ['12%', '8%', '5%'].entries()) {
    expect(plans[index].features).toContain(`${rate} platform fee`);
    expect(CONTRACTOR_PLAN_FEES).toContain(`${rate} on ${plans[index].name}`);
  }
});
