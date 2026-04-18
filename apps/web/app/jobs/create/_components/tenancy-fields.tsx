/**
 * TenancyFields — R6 #19 of docs/RETENTION_ROADMAP_2026.md.
 *
 * Inline block shown at the bottom of the Details step. Two questions:
 *   1. Is this a rental property?  (yes / no)
 *   2. Who pays?                    (me / someone else — email)
 *
 * Both are optional. When not set, behaviour is identical to today's
 * flow (no tenancy_metadata, homeowner = payer).
 */

import React from 'react';
import type { JobFormData } from './types';

interface Props {
  formData: JobFormData;
  setFormData: React.Dispatch<React.SetStateAction<JobFormData>>;
}

export function TenancyFields({ formData, setFormData }: Props) {
  const isRental = formData.is_rental_property === true;
  const whoPays = formData.who_pays ?? 'me';

  return (
    <div className='border border-gray-200 rounded-xl p-5 bg-gray-50/60'>
      <h3 className='text-base font-semibold text-gray-900 mb-1'>
        About this property
      </h3>
      <p className='text-sm text-gray-600 mb-4'>
        Optional — helps us contact the right people about scheduling and
        paperwork.
      </p>

      <label className='flex items-start gap-3 mb-4 cursor-pointer'>
        <input
          type='checkbox'
          checked={isRental}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              is_rental_property: e.target.checked,
            }))
          }
          className='mt-1 w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500'
        />
        <div>
          <span className='block text-sm font-medium text-gray-900'>
            This is a rental property
          </span>
          <span className='block text-xs text-gray-500'>
            We&apos;ll route tenant-facing messages accordingly.
          </span>
        </div>
      </label>

      <fieldset className='space-y-2'>
        <legend className='text-sm font-medium text-gray-900 mb-1'>
          Who pays for this job?
        </legend>
        <label className='flex items-center gap-3 cursor-pointer'>
          <input
            type='radio'
            name='who_pays'
            value='me'
            checked={whoPays === 'me'}
            onChange={() =>
              setFormData((prev) => ({ ...prev, who_pays: 'me' }))
            }
            className='w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500'
          />
          <span className='text-sm text-gray-800'>I&apos;ll pay</span>
        </label>
        <label className='flex items-center gap-3 cursor-pointer'>
          <input
            type='radio'
            name='who_pays'
            value='someone_else'
            checked={whoPays === 'someone_else'}
            onChange={() =>
              setFormData((prev) => ({
                ...prev,
                who_pays: 'someone_else',
              }))
            }
            className='w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500'
          />
          <span className='text-sm text-gray-800'>
            Someone else pays (landlord / agent)
          </span>
        </label>
      </fieldset>

      {whoPays === 'someone_else' && (
        <div className='mt-3'>
          <label className='block text-sm font-medium text-gray-700 mb-1'>
            Payer&apos;s email
          </label>
          <input
            type='email'
            value={formData.payer_email || ''}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                payer_email: e.target.value,
              }))
            }
            placeholder='landlord@example.co.uk'
            className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm'
          />
          <p className='text-xs text-gray-500 mt-1'>
            We&apos;ll invite them to fund the job in escrow before work starts.
          </p>
        </div>
      )}
    </div>
  );
}
