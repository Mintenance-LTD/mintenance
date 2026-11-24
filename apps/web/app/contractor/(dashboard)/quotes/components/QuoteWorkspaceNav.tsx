import Link from 'next/link';

export function QuoteWorkspaceNav({ current }: { current: 'quotes' | 'bids' }) {
  return (
    <nav
      aria-label='Quotes and marketplace bids'
      className='mb-5 flex flex-wrap gap-2 border-b border-slate-200 pb-2'
    >
      <Link
        href='/contractor/quotes'
        aria-current={current === 'quotes' ? 'page' : undefined}
        className='rounded-lg px-4 py-2 font-medium aria-[current=page]:bg-teal-50 aria-[current=page]:font-semibold'
      >
        Quotes
      </Link>
      <Link
        href='/contractor/bid'
        aria-current={current === 'bids' ? 'page' : undefined}
        className='rounded-lg px-4 py-2 font-medium aria-[current=page]:bg-teal-50 aria-[current=page]:font-semibold'
      >
        Marketplace bids
      </Link>
    </nav>
  );
}
