'use client';

import React from 'react';
import { User, Shield } from 'lucide-react';
import type { Contract } from './useContractData';

interface ContractPartiesProps {
  contractorName: string;
  homeownerName: string;
  contractorLicenseType: string | null;
  contractorLicenseRegistration: string | null;
  hasInsurance: boolean;
  insuranceProvider: string | undefined;
  insurancePolicyNumber: string | undefined;
}

export function ContractParties({
  contractorName,
  homeownerName,
  contractorLicenseType,
  contractorLicenseRegistration,
  hasInsurance,
  insuranceProvider,
  insurancePolicyNumber,
}: ContractPartiesProps) {
  return (
    <div>
      <div className='flex items-center gap-2 mb-3'>
        <User className='w-4 h-4 text-teal-600' />
        <h4 className='text-xs font-semibold uppercase tracking-wider text-gray-400'>
          Parties
        </h4>
      </div>
      <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
        <div className='border border-gray-100 rounded-xl p-4'>
          <p className='text-[10px] font-semibold uppercase tracking-wider text-teal-600 mb-1.5'>
            Contractor
          </p>
          <p className='font-semibold text-gray-900 text-sm'>
            {contractorName}
          </p>
          {contractorLicenseType && (
            <p className='text-xs text-gray-500 mt-1'>
              {contractorLicenseType}
            </p>
          )}
          {contractorLicenseRegistration && (
            <p className='text-xs text-gray-400'>
              License: {contractorLicenseRegistration}
            </p>
          )}
          {hasInsurance && (
            <div className='flex items-center gap-1 mt-2 bg-emerald-50 rounded-md px-2 py-1 w-fit'>
              <Shield className='w-3 h-3 text-emerald-600' />
              <span className='text-[10px] text-emerald-700 font-medium'>
                Insured{insuranceProvider ? ` — ${insuranceProvider}` : ''}
              </span>
            </div>
          )}
          {insurancePolicyNumber && (
            <p className='text-[10px] text-gray-400 mt-1'>
              Policy: {insurancePolicyNumber}
            </p>
          )}
        </div>
        <div className='border border-gray-100 rounded-xl p-4'>
          <p className='text-[10px] font-semibold uppercase tracking-wider text-teal-600 mb-1.5'>
            Homeowner
          </p>
          <p className='font-semibold text-gray-900 text-sm'>{homeownerName}</p>
        </div>
      </div>
    </div>
  );
}
