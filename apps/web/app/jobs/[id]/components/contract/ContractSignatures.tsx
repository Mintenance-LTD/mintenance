'use client';

import React from 'react';
import { PenTool, CheckCircle2, Circle } from 'lucide-react';
import { formatDateTime } from './contractHelpers';

interface ContractSignaturesProps {
  contractorName: string;
  homeownerName: string;
  contractorSignedAt: string | null;
  homeownerSignedAt: string | null;
}

export function ContractSignatures({
  contractorName,
  homeownerName,
  contractorSignedAt,
  homeownerSignedAt,
}: ContractSignaturesProps) {
  const signatures = [
    {
      label: 'Contractor',
      name: contractorName,
      signedAt: contractorSignedAt,
    },
    {
      label: 'Homeowner',
      name: homeownerName,
      signedAt: homeownerSignedAt,
    },
  ];

  return (
    <div className='border-t border-gray-100 pt-6'>
      <div className='flex items-center gap-2 mb-4'>
        <PenTool className='w-4 h-4 text-teal-600' />
        <h4 className='text-xs font-semibold uppercase tracking-wider text-gray-400'>
          Signatures
        </h4>
      </div>
      <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
        {signatures.map(({ label, name, signedAt }) => (
          <div
            key={label}
            className={`rounded-xl p-4 border ${signedAt ? 'bg-emerald-50/50 border-emerald-100' : 'bg-gray-50/50 border-gray-100'}`}
          >
            <div className='flex items-center justify-between mb-2'>
              <span className='text-[10px] font-semibold uppercase tracking-wider text-gray-400'>
                {label}
              </span>
              {signedAt ? (
                <CheckCircle2 className='w-4 h-4 text-emerald-500' />
              ) : (
                <Circle className='w-4 h-4 text-gray-300' />
              )}
            </div>
            <p className='text-sm font-medium text-gray-900'>{name}</p>
            {signedAt ? (
              <p className='text-xs text-emerald-600 mt-1'>
                Signed {formatDateTime(signedAt)}
              </p>
            ) : (
              <p className='text-xs text-gray-400 mt-1'>Awaiting signature</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
