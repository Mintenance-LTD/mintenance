'use client';

import React, { useEffect, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { MintEditorialEmptyState } from '@/components/mint-editorial/MintEditorialEmptyState';

export function MessagesEmptyState() {
  // Hydration-safe theme check — when Mint Editorial is active, render
  // the canonical empty-state primitive (88×88 brand-soft tile + .t-h2
  // + .t-body + .btn-primary). Legacy theme keeps the existing
  // teal-100 circle layout.
  const [isMintEditorial, setIsMintEditorial] = useState(false);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    setIsMintEditorial(
      document.documentElement.dataset.theme === 'mint-editorial'
    );
  }, []);

  if (isMintEditorial) {
    return (
      <MintEditorialEmptyState
        icon={MessageSquare}
        title='Select a conversation'
        body='Choose a conversation from the left to start messaging with contractors.'
      />
    );
  }

  return (
    <div className='flex flex-col items-center justify-center h-full text-center px-8'>
      <div className='w-24 h-24 bg-teal-100 rounded-full flex items-center justify-center mb-4'>
        <svg
          className='w-12 h-12 text-teal-600'
          fill='none'
          viewBox='0 0 24 24'
          stroke='currentColor'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z'
          />
        </svg>
      </div>
      <h2 className='text-xl font-semibold text-gray-900 mb-2'>
        Select a conversation
      </h2>
      <p className='text-gray-600 max-w-md'>
        Choose a conversation from the left to start messaging with contractors
      </p>
    </div>
  );
}
