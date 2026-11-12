'use client';

import { Download } from 'lucide-react';
import type { Quote } from './useQuotesData';

// Quote/customer text is untrusted: prevent spreadsheet formula execution.
export function quotesCsv(quotes: Quote[]): string {
  const cell = (value: string | number) => {
    const text = String(value);
    const safe = /^[\s]*[=+@-]/.test(text) ? `'${text}` : text;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  return [
    ['Title', 'Customer', 'Status', 'Amount GBP', 'Created', 'Expires'],
    ...quotes.map(q => [q.jobTitle, q.customerName, q.status, q.amount.toFixed(2), q.createdDate, q.expiryDate ?? '']),
  ].map(row => row.map(cell).join(',')).join('\r\n');
}

export function QuoteExport({ quotes, loading = false }: { quotes: Quote[]; loading?: boolean }) {
  function download() {
    const url = URL.createObjectURL(new Blob(['\uFEFF', quotesCsv(quotes)], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'mintenance-quotes.csv';
    link.click();
    // Allow the browser to begin reading the blob before releasing it.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <button type='button' className='btn btn-secondary btn-sm' aria-label='Export filtered quotes' disabled={loading || quotes.length === 0} onClick={download}>
    <Download size={14} /> Export CSV
  </button>;
}
