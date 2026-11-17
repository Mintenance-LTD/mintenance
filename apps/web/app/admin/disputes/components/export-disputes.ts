import type { Dispute } from './DisputesTable';

/** Quote cells and neutralize spreadsheet formulas, including leading whitespace. */
export function disputePageCsv(rows: Dispute[]): string {
  const cell = (value: unknown) => {
    const text = String(value ?? '');
    return (
      '"' +
      (/^[\s]*[=+@-]/.test(text) ? "'" + text : text).replace(/"/g, '""') +
      '"'
    );
  };
  const records = [
    [
      'Payment reference',
      'Job',
      'Homeowner',
      'Contractor',
      'Amount GBP',
      'Payment status',
      'Review status',
      'Reason',
      'Assigned admin',
      'Updated UK',
    ],
    ...rows.map((r) => [
      r.id,
      r.jobTitle,
      r.homeownerName,
      r.contractorName,
      r.amount.toFixed(2),
      r.escrowStatus,
      r.adminHoldStatus,
      r.holdReason,
      r.assignedAdmin,
      new Date(r.updatedAt).toLocaleString('en-GB', {
        timeZone: 'Europe/London',
      }),
    ]),
  ];
  return '\ufeff' + records.map((row) => row.map(cell).join(',')).join('\r\n');
}
