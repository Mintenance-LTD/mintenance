'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Building2 } from 'lucide-react';
import type { StatusConfig } from './contractHelpers';
import { formatDate } from './contractHelpers';

interface ContractHeaderProps {
  logoUrl: string | null | undefined;
  contractId: string;
  createdAt: string;
  statusConfig: StatusConfig;
}

export function ContractHeader({
  logoUrl,
  contractId,
  createdAt,
  statusConfig,
}: ContractHeaderProps) {
  const StatusIcon = statusConfig.icon;
  // Hydration-safe theme detection — solid brand band on editorial.
  const [isMintEditorial, setIsMintEditorial] = useState(false);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    setIsMintEditorial(
      document.documentElement.dataset.theme === 'mint-editorial'
    );
  }, []);

  return (
    <div
      className={
        isMintEditorial
          ? 'px-6 py-6'
          : 'bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 px-6 py-6'
      }
      style={isMintEditorial ? { background: 'var(--me-brand)' } : undefined}
    >
      <div className='flex items-start justify-between'>
        <div className='flex items-center gap-4'>
          {logoUrl ? (
            <div className='relative w-12 h-12 rounded-xl overflow-hidden bg-white/20 flex-shrink-0 ring-2 ring-white/20'>
              <Image
                src={logoUrl}
                alt='Company logo'
                fill
                className='object-contain p-1'
              />
            </div>
          ) : (
            <div className='w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0 ring-2 ring-white/20'>
              <Building2 className='w-6 h-6 text-white/70' />
            </div>
          )}
          <div>
            <h3 className='text-white font-bold text-lg tracking-tight'>
              Contract Agreement
            </h3>
            <p className='text-teal-100/70 text-xs mt-0.5'>
              Ref: {contractId.slice(0, 8).toUpperCase()} &middot;{' '}
              {formatDate(createdAt)}
            </p>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${statusConfig.bg} ${statusConfig.text} border ${statusConfig.border}`}
          >
            <StatusIcon className='w-3.5 h-3.5' />
            {statusConfig.label}
          </div>
        </div>
      </div>
    </div>
  );
}
