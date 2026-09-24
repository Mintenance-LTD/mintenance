export interface PaymentRecord {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  job_title?: string;
  contractor_name?: string;
}

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[char]!
  );

/** A snapshot of the authorised payment record, not a contractor tax invoice. */
export function paymentRecordHtml(record: PaymentRecord): string {
  if (!Number.isFinite(record.amount) || record.amount < 0)
    throw new Error('Invalid payment amount');
  const rows = [
    ['Reference', record.id],
    ['Date', record.created_at],
    ['Status', record.status.replace(/_/g, ' ')],
    ['Job', record.job_title ?? 'Not recorded'],
    ['Contractor', record.contractor_name ?? 'Not recorded'],
    ['Recorded amount (GBP)', `£${record.amount.toFixed(2)}`],
  ];
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><title>Mintenance payment record</title><style>body{font:16px sans-serif;max-width:720px;margin:40px auto;padding:20px}th,td{text-align:left;padding:12px;border-bottom:1px solid #ddd}table{width:100%}</style></head><body><h1>Mintenance payment record</h1><table>${rows.map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`).join('')}</table><p>This records the payment status at download time. Pending payments are not proof of payment. This is not a VAT invoice; request any tax invoice from the contractor.</p></body></html>`;
}

export function downloadPaymentRecord(record: PaymentRecord): void {
  const url = URL.createObjectURL(
    new Blob([paymentRecordHtml(record)], { type: 'text/html;charset=utf-8' })
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = `mintenance-payment-${record.id.replace(/[^a-zA-Z0-9-]/g, '')}.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
