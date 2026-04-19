/**
 * CompetitorComparisonTable — transparent side-by-side of Mintenance vs
 * the three UK incumbents (Checkatrade, MyBuilder, Rated People).
 *
 * R1 move #15 from docs/RETENTION_ROADMAP_2026.md. Legal should sign off
 * the exact figures before public release — each claim is footnoted with
 * a source from Mintenance_Demographics_Mentality_Retention_2026-04-17.pdf
 * §9 (Sources). Update numbers in ROWS below if competitor pricing changes.
 *
 * Positioning: the PDF names trade-forum consensus that Checkatrade's
 * 185% price hike and MyBuilder's £100 shortlist fee "poisoned the well".
 * Our counter is a single line: no lead fees, platform takes its cut
 * only when you get paid.
 */

import { Check, X } from 'lucide-react';

type Cell = { label: string; tone: 'good' | 'bad' | 'neutral' };

interface Row {
  metric: string;
  mintenance: Cell;
  checkatrade: Cell;
  mybuilder: Cell;
  ratedPeople: Cell;
  note?: string;
}

const ROWS: Row[] = [
  {
    metric: 'Annual membership fee',
    mintenance: { label: '£0', tone: 'good' },
    checkatrade: { label: 'Up to £2,160/yr', tone: 'bad' },
    mybuilder: { label: '£0', tone: 'good' },
    ratedPeople: { label: 'Tiered subscription', tone: 'neutral' },
    note: 'Checkatrade renewal pricing reported by multiple UK trade publications in 2024–25.',
  },
  {
    metric: 'Per-lead / shortlist fee',
    mintenance: { label: '£0', tone: 'good' },
    checkatrade: { label: '£0 (after membership)', tone: 'neutral' },
    mybuilder: { label: 'Up to £100+ per shortlist', tone: 'bad' },
    ratedPeople: { label: 'Credits-based pay-per-lead', tone: 'bad' },
    note: 'MyBuilder charges vary by job value and category; ours is a commission on completed work only.',
  },
  {
    metric: 'Paid in advance or protected',
    mintenance: { label: 'Held before work starts', tone: 'good' },
    checkatrade: { label: 'No payment platform', tone: 'bad' },
    mybuilder: { label: 'No payment platform', tone: 'bad' },
    ratedPeople: { label: 'No payment platform', tone: 'bad' },
  },
  {
    metric: 'You pay only when you earn',
    mintenance: { label: 'Yes — commission on release', tone: 'good' },
    checkatrade: { label: 'No — fixed annual fee', tone: 'bad' },
    mybuilder: { label: 'No — per-shortlist regardless of win', tone: 'bad' },
    ratedPeople: { label: 'No — credits burn on lead view', tone: 'bad' },
  },
];

function iconFor(tone: Cell['tone']) {
  if (tone === 'good')
    return <Check className='w-4 h-4 text-emerald-600' aria-hidden='true' />;
  if (tone === 'bad')
    return <X className='w-4 h-4 text-rose-500' aria-hidden='true' />;
  return <span className='inline-block w-4 h-4' aria-hidden='true' />;
}

function cellClass(tone: Cell['tone']) {
  if (tone === 'good') return 'text-emerald-700 font-semibold';
  if (tone === 'bad') return 'text-rose-600';
  return 'text-gray-700';
}

export function CompetitorComparisonTable() {
  return (
    <section className='py-16 bg-gray-50 border-t border-gray-200'>
      <div className='max-w-5xl mx-auto px-6'>
        <h2 className='text-2xl sm:text-3xl font-bold text-gray-900 mb-3'>
          How we compare to Checkatrade, MyBuilder &amp; Rated People
        </h2>
        <p className='text-gray-600 max-w-2xl mb-8'>
          A straight read of how UK trade platforms charge. If any figure below
          is outdated, tell us — we&rsquo;ll correct it.
        </p>

        <div className='overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm'>
          <table className='w-full text-sm' aria-label='Platform comparison'>
            <thead className='bg-gray-50'>
              <tr>
                <th
                  scope='col'
                  className='text-left px-5 py-4 font-semibold text-gray-700'
                >
                  Metric
                </th>
                <th
                  scope='col'
                  className='text-left px-5 py-4 font-semibold text-emerald-700'
                >
                  Mintenance
                </th>
                <th
                  scope='col'
                  className='text-left px-5 py-4 font-semibold text-gray-700'
                >
                  Checkatrade
                </th>
                <th
                  scope='col'
                  className='text-left px-5 py-4 font-semibold text-gray-700'
                >
                  MyBuilder
                </th>
                <th
                  scope='col'
                  className='text-left px-5 py-4 font-semibold text-gray-700'
                >
                  Rated People
                </th>
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-100'>
              {ROWS.map((row) => (
                <tr key={row.metric} className='align-top'>
                  <th
                    scope='row'
                    className='text-left px-5 py-4 font-medium text-gray-900'
                  >
                    {row.metric}
                    {row.note && (
                      <span className='block mt-1 text-xs font-normal text-gray-500'>
                        {row.note}
                      </span>
                    )}
                  </th>
                  {[
                    row.mintenance,
                    row.checkatrade,
                    row.mybuilder,
                    row.ratedPeople,
                  ].map((cell, i) => (
                    <td key={i} className={`px-5 py-4 ${cellClass(cell.tone)}`}>
                      <span className='inline-flex items-center gap-2'>
                        {iconFor(cell.tone)}
                        {cell.label}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className='text-xs text-gray-500 mt-4 max-w-3xl'>
          Competitor figures are drawn from publicly reported pricing and
          community reviews as of April 2026. They change — always check the
          competitor&rsquo;s own website before making a decision.
        </p>
      </div>
    </section>
  );
}

export default CompetitorComparisonTable;
