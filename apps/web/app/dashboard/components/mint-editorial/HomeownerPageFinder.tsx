'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
const pages = [
  ['Jobs', '/jobs'],
  ['Properties', '/properties'],
  ['Contractors', '/contractors'],
  ['Payments', '/payments'],
  ['Documents', '/documents'],
  ['Messages', '/messages'],
  ['Schedule', '/scheduling'],
  ['Settings', '/settings'],
  ['Help', '/help'],
];
export function HomeownerPageFinder() {
  const [query, setQuery] = useState('');
  const matches = pages.filter(([label]) =>
    label.toLowerCase().includes(query.trim().toLowerCase())
  );
  return (
    <details
      style={{ position: 'relative' }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.currentTarget.removeAttribute('open');
          event.currentTarget.querySelector('summary')?.focus();
        }
      }}
    >
      <summary className='search-pill' style={{ cursor: 'pointer' }}>
        <Search size={15} /> Find a page
      </summary>
      <div
        style={{
          position: 'absolute',
          zIndex: 50,
          background: 'var(--me-surface, white)',
          padding: 16,
          minWidth: 230,
          border: '1px solid var(--me-line)',
        }}
      >
        <input
          aria-label='Search homeowner pages'
          type='search'
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder='Jobs, properties, payments…'
        />
        <nav aria-label='Matching pages'>
          {matches.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              style={{ display: 'block', padding: '10px 0' }}
              onClick={(event) => {
                event.currentTarget.closest('details')?.removeAttribute('open');
                setQuery('');
              }}
            >
              {label}
            </Link>
          ))}
        </nav>
        {!matches.length && (
          <p role='status'>No matching pages. Try another name.</p>
        )}
      </div>
    </details>
  );
}
