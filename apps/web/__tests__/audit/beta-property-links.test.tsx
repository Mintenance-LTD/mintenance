import { deriveSavedTrades } from '@/app/properties/[id]/components/MintEditorialPropertyAccess';
import {
  initialFormDataFromParams,
  formDataPatchFromParams,
} from '@/app/jobs/create/utils/url-prefill';
import { JOB_CATEGORIES } from '@/app/jobs/create/constants';
it('keeps same-name contractors separate and messages the most recent job', () => {
  const base = {
    title: 'Repair',
    status: 'completed',
    contractor: 'Alex Smith',
    amount: 100,
    category: 'plumbing',
  };
  const trades = deriveSavedTrades([
    { ...base, id: 'old', contractorId: 'one', date: '2026-01-01' },
    { ...base, id: 'other', contractorId: 'two', date: '2026-11-01' },
    { ...base, id: 'recent', contractorId: 'one', date: '2026-11-14' },
  ]);
  expect(trades).toHaveLength(2);
  expect(trades.find((t) => t.id === 'one')).toMatchObject({
    jobId: 'recent',
    jobs: 2,
  });
  expect(trades.find((t) => t.id === 'two')).toMatchObject({
    jobId: 'other',
    jobs: 1,
  });
});
it('prefills tenant reports as rental work with an available damp category', () => {
  const params = new URLSearchParams({
    property_id: 'property',
    category: 'damp_mould',
    is_rental_property: 'true',
  });
  for (const form of [
    initialFormDataFromParams(params),
    formDataPatchFromParams(params),
  ])
    expect(form).toMatchObject({
      property_id: 'property',
      category: 'damp',
      is_rental_property: true,
    });
  expect(JOB_CATEGORIES.some((c) => c.value === 'damp')).toBe(true);
});

it('selects Gardening from the tenant report category on load and soft navigation', () => {
  const params = new URLSearchParams({
    property_id: 'property',
    category: 'garden_exterior',
    is_rental_property: 'true',
  });
  expect(initialFormDataFromParams(params)).toMatchObject({
    category: 'gardening',
    property_id: 'property',
    is_rental_property: true,
  });
  expect(formDataPatchFromParams(params)?.category).toBe('gardening');
});
