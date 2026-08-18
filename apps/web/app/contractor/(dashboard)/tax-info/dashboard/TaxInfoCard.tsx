import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import type { TaxProfile } from './tax-helpers';
import { getTaxDetailsDisplay } from './tax-helpers';

interface TaxInfoCardProps {
  profile: TaxProfile | null | undefined;
}

export function TaxInfoCard({ profile }: TaxInfoCardProps) {
  const display = getTaxDetailsDisplay(profile);

  return (
    <div className='bg-white rounded-xl border border-gray-200 p-6'>
      <div className='flex items-start justify-between'>
        <div className='flex items-start gap-4'>
          <div className='mt-0.5'>{display.icon}</div>
          <div>
            <h2 className='text-xl font-semibold text-gray-900 mb-1'>
              Tax Information
            </h2>
            <div className='flex items-center gap-3 mb-2'>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${display.badgeClass}`}
              >
                {display.label}
              </span>
            </div>
            <p className='text-sm text-gray-600'>{display.description}</p>

            {profile && (
              <div className='mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm'>
                <div>
                  <span className='text-gray-500'>Legal Name:</span>{' '}
                  <span className='font-medium text-gray-900'>
                    {profile.legalName}
                  </span>
                </div>
                {profile.tradingName && (
                  <div>
                    <span className='text-gray-500'>Trading as:</span>{' '}
                    <span className='font-medium text-gray-900'>
                      {profile.tradingName}
                    </span>
                  </div>
                )}
                <div>
                  <span className='text-gray-500'>Tax reference:</span>{' '}
                  <span className='font-medium text-gray-900'>
                    {profile.hasUtr
                      ? 'UTR on file'
                      : profile.hasNino
                        ? 'NI number on file'
                        : 'Not provided'}
                  </span>
                </div>
                <div>
                  <span className='text-gray-500'>VAT:</span>{' '}
                  <span className='font-medium text-gray-900'>
                    {profile.vatRegistered
                      ? (profile.vatNumber ?? 'Registered')
                      : 'Not registered'}
                  </span>
                </div>
                {profile.companyNumber && (
                  <div>
                    <span className='text-gray-500'>Company number:</span>{' '}
                    <span className='font-medium text-gray-900'>
                      {profile.companyNumber}
                    </span>
                  </div>
                )}
                {profile.updatedAt && (
                  <div>
                    <span className='text-gray-500'>Last updated:</span>{' '}
                    <span className='font-medium text-gray-900'>
                      {new Date(profile.updatedAt).toLocaleDateString('en-GB', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <Link
          href='/contractor/tax-info'
          className='flex-shrink-0 px-4 py-2 text-sm font-medium text-teal-700 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors flex items-center gap-1.5'
          aria-label='Update tax information'
        >
          {profile ? 'Update' : 'Submit tax info'}
          <ExternalLink className='w-3.5 h-3.5' aria-hidden='true' />
        </Link>
      </div>
    </div>
  );
}
