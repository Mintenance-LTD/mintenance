import { workStartRestriction } from '@/lib/services/contracts/work-start';
import {
  hasExplicitObligations,
  prepareExplicitObligations,
} from '@/lib/services/contracts/explicit-obligations';
import {
  ukDateTimeInput,
  ukDateTimeToISO,
} from '@/lib/scheduling/uk-date-time';
import { determineStage } from '@/app/contractor/(dashboard)/jobs/[id]/stage-helpers';

describe('contract waiting period and displayed work stage', () => {
  const now = Date.parse('2026-11-14T12:00:00Z');
  const contract = {
    status: 'accepted',
    cancellation_deadline: '2026-11-28T23:59:59Z',
  };
  it('keeps funded assigned work waiting without an explicit early-start request', () => {
    const restriction = workStartRestriction(contract, false, now);
    expect(restriction).toContain('28 November 2026');
    expect(restriction).toContain('homeowner records an early-start request');
    expect(
      determineStage('assigned', 'accepted', true, restriction === null)
    ).toBe('waiting_to_start');
  });
  it('permits the agreed early start or an expired waiting period', () => {
    expect(workStartRestriction(contract, true, now)).toBeNull();
    expect(
      workStartRestriction(contract, false, Date.parse('2026-11-29T00:00:00Z'))
    ).toBeNull();
    expect(determineStage('assigned', 'accepted', true, true)).toBe(
      'ready_to_start'
    );
  });
  it.each([undefined, null, '', 'invalid'])(
    'fails closed for an unknown deadline: %s',
    (deadline) => {
      expect(
        workStartRestriction(
          { ...contract, cancellation_deadline: deadline },
          true,
          now
        )
      ).toContain('review');
    }
  );
  it('requires review of a cancellation even after the waiting period', () => {
    expect(
      workStartRestriction(
        { ...contract, cancellation_requested_at: '2026-11-14T11:00:00Z' },
        true,
        now
      )
    ).toContain('support review');
  });
});

describe('explicit job obligations', () => {
  it.each([
    undefined,
    {},
    { materials_included: true, warranty_months: 12 },
    { materials_terms: ' ', warranty_terms: 'None' },
  ])('rejects absent or inherited promises', (terms) => {
    expect(hasExplicitObligations(terms)).toBe(false);
  });
  it('keeps explicitly chosen terms, removes inherited defaults and leaves the source untouched', () => {
    const source = {
      materials_included: true,
      warranty_months: 12,
      materials_terms: ' No materials required. ',
      warranty_terms: 'No additional warranty offered.',
      source: 'accepted_bid',
    };
    expect(prepareExplicitObligations(source)).toEqual({
      materials_terms: 'No materials required.',
      warranty_terms: 'No additional warranty offered.',
      source: 'accepted_bid',
    });
    expect(source.warranty_months).toBe(12);
  });
});

describe('UK appointment times', () => {
  it.each([
    ['2026-11-14T09:00', '2026-11-14T09:00:00.000Z'],
    ['2026-07-14T09:00', '2026-07-14T08:00:00.000Z'],
  ])('round trips %s without using the machine time zone', (input, iso) => {
    expect(ukDateTimeToISO(input)).toBe(iso);
    expect(ukDateTimeInput(iso)).toBe(input);
  });
  it.each([
    '2026-03-29T01:30',
    '2026-10-25T01:30',
    '2026-02-31T09:00',
    'invalid',
  ])('rejects impossible or ambiguous time %s', (input) => {
    expect(() => ukDateTimeToISO(input)).toThrow();
  });
});
