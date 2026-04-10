'use client';

import React from 'react';
import Image from 'next/image';
import { Building2, PenTool, CheckCircle2, Circle } from 'lucide-react';
import type { StatusConfig } from './contractHelpers';
import { formatCurrency } from './contractHelpers';
import type { Contract } from './useContractData';

interface ContractCompactCardProps {
  contract: Contract;
  logoUrl: string | null | undefined;
  statusConfig: StatusConfig;
  canSign: boolean | null | undefined;
  isDraft: boolean;
  onOpenDetail: () => void;
}

export function ContractCompactCard({
  contract,
  logoUrl,
  statusConfig,
  canSign,
  isDraft,
  onOpenDetail,
}: ContractCompactCardProps) {
  const StatusIcon = statusConfig.icon;

  return (
    <div
      className='bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden cursor-pointer hover:border-teal-200 hover:shadow-md transition-all'
      onClick={onOpenDetail}
      role='button'
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onOpenDetail();
      }}
    >
      <div className='bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 px-5 py-4'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            {logoUrl ? (
              <div className='relative w-10 h-10 rounded-lg overflow-hidden bg-white/20 flex-shrink-0 ring-2 ring-white/20'>
                <Image
                  src={logoUrl}
                  alt='Company logo'
                  fill
                  className='object-contain p-1'
                />
              </div>
            ) : (
              <div className='w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0 ring-2 ring-white/20'>
                <Building2 className='w-5 h-5 text-white/70' />
              </div>
            )}
            <div>
              <h3 className='text-white font-bold text-base tracking-tight'>
                Contract Agreement
              </h3>
              <p className='text-teal-100/70 text-xs'>
                Ref: {contract.id.slice(0, 8).toUpperCase()}
              </p>
            </div>
          </div>
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${statusConfig.bg} ${statusConfig.text} border ${statusConfig.border}`}
          >
            <StatusIcon className='w-3.5 h-3.5' />
            {statusConfig.label}
          </div>
        </div>
      </div>

      <div className='px-5 py-4'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-4'>
            <div>
              <p className='text-[10px] font-semibold uppercase tracking-wider text-gray-400'>
                Amount
              </p>
              <p className='text-xl font-bold text-gray-900'>
                {formatCurrency(contract.amount)}
              </p>
            </div>
            {contract.title && (
              <div className='border-l border-gray-200 pl-4'>
                <p className='text-[10px] font-semibold uppercase tracking-wider text-gray-400'>
                  Scope
                </p>
                <p className='text-sm text-gray-700 font-medium truncate max-w-[200px]'>
                  {contract.title}
                </p>
              </div>
            )}
          </div>
          <div className='flex items-center gap-2'>
            <div className='flex -space-x-1'>
              {contract.contractor_signed_at ? (
                <CheckCircle2 className='w-5 h-5 text-emerald-500' />
              ) : (
                <Circle className='w-5 h-5 text-gray-300' />
              )}
              {contract.homeowner_signed_at ? (
                <CheckCircle2 className='w-5 h-5 text-emerald-500' />
              ) : (
                <Circle className='w-5 h-5 text-gray-300' />
              )}
            </div>
            <span className='text-xs text-gray-400'>
              {contract.contractor_signed_at && contract.homeowner_signed_at
                ? 'Both signed'
                : contract.contractor_signed_at || contract.homeowner_signed_at
                  ? '1 of 2 signed'
                  : 'Awaiting signatures'}
            </span>
          </div>
        </div>

        {canSign && !isDraft && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetail();
            }}
            className='w-full mt-4 py-2.5 px-4 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-semibold rounded-xl transition-all shadow-sm hover:shadow flex items-center justify-center gap-2 text-sm'
            type='button'
          >
            <PenTool className='w-4 h-4' />
            Review & Sign Contract
          </button>
        )}

        {!canSign && !isDraft && (
          <p className='text-xs text-teal-600 font-medium mt-3 text-center'>
            Click to view full contract details
          </p>
        )}
      </div>
    </div>
  );
}
