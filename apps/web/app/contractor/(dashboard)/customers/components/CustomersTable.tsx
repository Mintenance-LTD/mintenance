'use client';

import React, { useEffect, useState } from 'react';
import { StandardCard } from '@/components/ui/StandardCard';
import { CustomerRow } from './CustomerRow';
import { Users } from 'lucide-react';

interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  profile_image_url: string | null;
}

interface CustomersTableProps {
  customers: Customer[];
}

export function CustomersTable({ customers }: CustomersTableProps) {
  // 2026-05-13 polish pass: hydration-safe theme detection. Under Mint
  // Editorial the StandardCard shell + gray-50 table header + uppercase
  // labels swap to canonical .card + .t-meta header row matching the
  // rest of the Phase-4 surfaces.
  const [isMintEditorial, setIsMintEditorial] = useState(false);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    setIsMintEditorial(
      document.documentElement.dataset.theme === 'mint-editorial'
    );
  }, []);

  if (customers.length === 0) {
    if (isMintEditorial) {
      return (
        <div
          className='card'
          style={{
            padding: 48,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'var(--me-bg-2)',
              color: 'var(--me-ink-3)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <Users size={26} strokeWidth={1.5} />
          </div>
          <p className='t-h3' style={{ margin: 0, marginBottom: 6 }}>
            No customers yet
          </p>
          <p className='t-meta' style={{ margin: 0 }}>
            Your customers will appear here once you start working with them.
          </p>
        </div>
      );
    }
    return (
      <StandardCard>
        <div className='p-12 text-center'>
          <div className='w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4'>
            <svg
              className='w-8 h-8 text-gray-400'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z'
              />
            </svg>
          </div>
          <p className='text-base font-semibold text-gray-900 mb-2'>
            No customers yet
          </p>
          <p className='text-sm text-gray-500'>
            Your customers will appear here once you start working with them
          </p>
        </div>
      </StandardCard>
    );
  }

  if (isMintEditorial) {
    return (
      <div className='card' style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
            }}
          >
            <thead
              style={{
                background: 'var(--me-bg-2)',
                borderBottom: '1px solid var(--me-line)',
              }}
            >
              <tr>
                {['Name', 'Status', 'Date'].map((label) => (
                  <th
                    key={label}
                    className='t-meta'
                    style={{
                      textAlign: 'left',
                      padding: '14px 20px',
                      fontWeight: 600,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      fontSize: 11,
                      color: 'var(--me-ink-3)',
                    }}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <CustomerRow key={customer.id} customer={customer} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <StandardCard padding='none'>
      <div className='overflow-x-auto'>
        <table className='w-full'>
          <thead className='bg-gray-50 border-b border-gray-200'>
            <tr>
              <th className='text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider'>
                Name
              </th>
              <th className='text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider'>
                Status
              </th>
              <th className='text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider'>
                Date
              </th>
            </tr>
          </thead>
          <tbody className='divide-y divide-gray-200'>
            {customers.map((customer) => (
              <CustomerRow key={customer.id} customer={customer} />
            ))}
          </tbody>
        </table>
      </div>
    </StandardCard>
  );
}
