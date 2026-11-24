import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { complianceSummary } from '@/app/properties/compliance/components/compliance-summary';
import { applicabilitySchema } from '@/app/api/properties/[id]/compliance/applicability/schema';
import { ApplicabilityForm } from '@/app/properties/compliance/components/ApplicabilityForm';
import { ComplianceDashboardClient } from '@/app/properties/compliance/components/ComplianceDashboardClient';
const m = vi.hoisted(() => ({ csrf: vi.fn(), fetch: vi.fn() }));
vi.mock('@/lib/csrf-client', () => ({ getCsrfHeaders: m.csrf }));
const property = { id: 'property', property_name: 'Home', address: 'Street' };
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', m.fetch);
  m.csrf.mockResolvedValue({ 'x-csrf-token': 'fresh' });
});
afterEach(() => vi.unstubAllGlobals());
it('distinguishes unassessed categories from known missing applicable records', () => {
  const result = complianceSummary(
    [property],
    [],
    [
      {
        property_id: 'property',
        cert_type: 'gas_safety',
        decision: 'not_applicable',
        reason: 'No gas supply',
      },
      {
        property_id: 'property',
        cert_type: 'epc',
        decision: 'applicable',
        reason: '',
      },
    ]
  );
  expect(result.summary).toMatchObject({ missingCount: 1, unassessedCount: 3 });
  expect(result.propertiesWithCompliance[0].overallStatus).toBe('amber');
});
it('requires a reason for not applicable and rejects arbitrary categories', () => {
  expect(
    applicabilitySchema.safeParse({
      cert_type: 'gas_safety',
      decision: 'not_applicable',
    }).success
  ).toBe(false);
  expect(
    applicabilitySchema.safeParse({
      cert_type: 'invented',
      decision: 'unknown',
    }).success
  ).toBe(false);
  expect(
    applicabilitySchema.safeParse({
      cert_type: 'gas_safety',
      decision: 'not_applicable',
      reason: 'No gas supply',
    }).success
  ).toBe(true);
});
it('opens unassessed checks from the headline without mixing in known missing checks', () => {
  const snapshot = complianceSummary(
    [property],
    [],
    [
      {
        property_id: property.id,
        cert_type: 'epc',
        decision: 'applicable',
        reason: '',
      },
    ]
  );
  render(
    <ComplianceDashboardClient
      properties={snapshot.propertiesWithCompliance}
      summary={snapshot.summary}
    />
  );
  const tile = screen.getByRole('button', { name: /Not assessed 4/ });
  expect(screen.getByText('Recorded expired or missing')).toBeInTheDocument();
  fireEvent.click(tile);
  expect(tile).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByText('Showing unassessed checks')).toBeInTheDocument();
  expect(screen.getByText('Gas Safety (CP12)')).toBeInTheDocument();
  expect(screen.queryByText('EPC', { exact: true })).not.toBeInTheDocument();
  fireEvent.click(tile);
  expect(screen.getByText('EPC', { exact: true })).toBeInTheDocument();
});
it('retains the assessment after a failed save and retries with CSRF', async () => {
  m.fetch
    .mockResolvedValueOnce({ ok: false })
    .mockResolvedValueOnce({ ok: true });
  render(
    <ApplicabilityForm
      propertyId='property'
      certType='gas_safety'
      label='Gas'
    />
  );
  fireEvent.change(
    screen.getByRole('combobox', { name: 'Applicability — Gas' }),
    { target: { value: 'not_applicable' } }
  );
  fireEvent.change(
    screen.getByRole('textbox', { name: 'Reason / assessment notes' }),
    { target: { value: 'No gas supply' } }
  );
  fireEvent.click(screen.getByRole('button', { name: 'Save applicability' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not save');
  expect(screen.getByRole('textbox')).toHaveValue('No gas supply');
  fireEvent.click(screen.getByRole('button', { name: 'Save applicability' }));
  await waitFor(() =>
    expect(screen.getByRole('status')).toHaveTextContent('Applicability saved')
  );
  expect(m.fetch).toHaveBeenLastCalledWith(
    '/api/properties/property/compliance/applicability',
    expect.objectContaining({
      headers: expect.objectContaining({ 'x-csrf-token': 'fresh' }),
      body: JSON.stringify({
        cert_type: 'gas_safety',
        decision: 'not_applicable',
        reason: 'No gas supply',
      }),
    })
  );
});
