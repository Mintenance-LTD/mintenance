import { describe, expect, it } from 'vitest';
import { paymentRecordHtml } from '@/lib/payments/payment-record';

describe('downloadable payment record', () => {
  const record = {
    id: 'synthetic',
    amount: 10,
    status: 'held',
    created_at: '2026-09-24',
  };
  it('uses actual amount and status without inventing fees or tax', () => {
    const html = paymentRecordHtml(record);
    expect(html).toContain('£10.00');
    expect(html).toContain('held');
    expect(html).toContain('not a VAT invoice');
    expect(html).not.toMatch(/5%|2%|20%|Service Cost/);
  });
  it('escapes user-controlled document text', () => {
    const html = paymentRecordHtml({
      ...record,
      job_title: '<script>alert(1)</script>',
      contractor_name: '<img src=x onerror=alert(1)>',
    });
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain("default-src 'none'");
  });
  it('records both sides of a completed split settlement', () => {
    const html = paymentRecordHtml({
      ...record,
      amount: 120,
      remainingAmount: 60,
      status: 'released',
    });
    expect(html).toContain('<th>Recorded amount (GBP)</th><td>£120.00</td>');
    expect(html).toContain('<th>Refunded (GBP)</th><td>£60.00</td>');
    expect(html).toContain(
      '<th>Amount after refunds (GBP)</th><td>£60.00</td>'
    );
  });
  it('rejects invalid recorded amounts', () => {
    expect(() => paymentRecordHtml({ ...record, amount: NaN })).toThrow(
      'Invalid payment amount'
    );
  });
});
