import { describe, expect, it } from 'vitest';
import {
  amountLabel,
  parsePounds,
  workOrderDraft,
  workOrderInput,
} from '../../app/portfolio/work-order-model';

describe('private work-order cost inputs', () => {
  it('records quoted, approved, invoiced and paid amounts separately', () => {
    const draft = workOrderDraft(null);
    Object.assign(draft, {
      contractorName: ' Test Plumbing Ltd ',
      quotedPence: '240',
      approvedPence: '240.00',
      approvalReference: ' Owner email ',
      invoicedPence: '240.50',
      invoiceReference: 'Invoice QA-42',
    });
    expect(workOrderInput(draft)).toMatchObject({
      revision: 0,
      contractorName: 'Test Plumbing Ltd',
      quotedPence: 24000,
      approvedPence: 24000,
      approvalReference: 'Owner email',
      invoicedPence: 24050,
      paidPence: null,
      paymentReference: null,
    });
    expect(amountLabel(null)).toBe('Not recorded');
    expect(amountLabel(0)).toBe('£0.00');
  });

  it('stores whole pence without rounding or accepting ambiguous numbers', () => {
    expect(parsePounds(' 1.2 ', 'Quoted')).toBe(120);
    expect(parsePounds('0.01', 'Quoted')).toBe(1);
    expect(parsePounds('', 'Quoted')).toBeNull();
    for (const value of ['-1', '12.345', '12,34', '1e2', '£2', '12345678']) {
      expect(() => parsePounds(value, 'Quoted')).toThrow();
    }
  });

  it('requires a payment reference and does not mark an overpayment', () => {
    const draft = {
      ...workOrderDraft(null),
      contractorName: 'Test Plumbing',
      invoicedPence: '240',
      invoiceReference: 'QA-42',
      paidPence: '120',
    };
    expect(() => workOrderInput(draft)).toThrow('payment reference');
    expect(() =>
      workOrderInput({
        ...draft,
        paidPence: '241',
        paymentReference: 'Receipt',
      })
    ).toThrow('no higher');
    expect(
      workOrderInput({ ...draft, paymentReference: 'Receipt' }).paidPence
    ).toBe(12000);
  });

  it('requires a contractor', () => {
    expect(() => workOrderInput(workOrderDraft(null))).toThrow('contractor');
  });
});
