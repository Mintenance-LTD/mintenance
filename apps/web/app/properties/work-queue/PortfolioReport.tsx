'use client';
import { useEffect, useState } from 'react';
interface Row {
  id: string;
  property_name: string;
  open_jobs: number;
  overdue_jobs: number;
  completed_jobs: number;
  average_completion_days: number | null;
  timed_completions: number;
  released_payments: { currency: string; released_escrow: number }[] | null;
  repeated_categories: { category: string; jobs: number }[];
  contractor_activity: { contractor_id: string; completed_jobs: number }[];
}
export function PortfolioReport() {
  const [offset, setOffset] = useState(0),
    [retry, setRetry] = useState(0),
    [rows, setRows] = useState<Row[] | null>(null),
    [more, setMore] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setRows(null);
    setError('');
    fetch(`/api/portfolio/report?offset=${offset}`, {
      signal: controller.signal,
      cache: 'no-store',
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load reporting.');
        return response.json();
      })
      .then((data) => {
        setRows(data.properties);
        setMore(data.hasMore);
      })
      .catch((reason) => {
        if (!controller.signal.aborted) setError(reason.message);
      });
    return () => controller.abort();
  }, [offset, retry]);
  function exportPage() {
    if (!rows) return;
    const escape = (value: unknown) => {
      let text = String(value ?? '');
      if (/^[=+@\-\t\r]/.test(text)) text = "'" + text;
      return '"' + text.replace(/"/g, '""') + '"';
    };
    const csv = [
      [
        'Property',
        'Open jobs',
        'Overdue jobs',
        'Completed jobs',
        'Average completion days',
        'Timed completions',
        'Released escrow by currency',
        'Repeated completed categories',
        'Contractor activity',
      ],
      ...rows.map((row) => [
        row.property_name,
        row.open_jobs,
        row.overdue_jobs,
        row.completed_jobs,
        row.average_completion_days,
        row.timed_completions,
        JSON.stringify(row.released_payments),
        JSON.stringify(row.repeated_categories),
        JSON.stringify(row.contractor_activity),
      ]),
    ]
      .map((row) => row.map(escape).join(','))
      .join('\r\n');
    const url = URL.createObjectURL(
      new Blob([csv], { type: 'text/csv;charset=utf-8' })
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `portfolio-page-${offset / 25 + 1}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section className='space-y-4 rounded-xl border bg-white p-5'>
      <h2 className='text-xl font-semibold'>Portfolio report</h2>
      <p>
        All-time recorded activity. Completion times use recorded completion
        dates and include time before a contractor starts. Released escrow is
        shown by currency for owned properties; it is not a tax or accounting
        statement.
      </p>
      {error ? (
        <p role='alert'>
          {error}
          <button onClick={() => setRetry((value) => value + 1)}>Retry</button>
        </p>
      ) : !rows ? (
        <p>Loading report…</p>
      ) : (
        <>
          <button className='btn btn-secondary' onClick={exportPage}>
            Export this page as CSV
          </button>
          {rows.map((row) => (
            <article key={row.id} className='border-t py-3'>
              <h3 className='font-semibold'>{row.property_name}</h3>
              <p>
                {row.open_jobs} open · {row.overdue_jobs} overdue ·{' '}
                {row.completed_jobs} completed
              </p>
              <p>
                Average completion:{' '}
                {row.average_completion_days ?? 'Not recorded'} days (
                {row.timed_completions} dated completions)
              </p>
              {row.released_payments?.map((payment) => (
                <p key={payment.currency}>
                  Released escrow: {payment.currency}{' '}
                  {Number(payment.released_escrow).toFixed(2)}
                </p>
              ))}
              {row.repeated_categories.map((item) => (
                <p key={item.category}>
                  Repeated category: {item.category} · {item.jobs} completed
                  jobs
                </p>
              ))}
            </article>
          ))}
          <div className='flex gap-4'>
            <button
              disabled={offset === 0}
              onClick={() => setOffset(offset - 25)}
            >
              Previous properties
            </button>
            <button disabled={!more} onClick={() => setOffset(offset + 25)}>
              Next properties
            </button>
          </div>
        </>
      )}
    </section>
  );
}
