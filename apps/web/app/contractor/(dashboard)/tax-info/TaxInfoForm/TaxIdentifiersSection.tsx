import React from 'react';
import { MotionDiv } from '@/components/ui/MotionDiv';
import type { FormData, FormErrors } from './types';
import { fadeIn } from './types';

interface Props {
  formData: FormData;
  errors: FormErrors;
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void;
  fieldError: (field: keyof FormErrors) => React.ReactNode;
  inputClass: (field: keyof FormErrors) => string;
}

export function TaxIdentifiersSection({
  formData,
  errors,
  updateField,
  fieldError,
  inputClass,
}: Props) {
  return (
    <MotionDiv
      initial='hidden'
      animate='visible'
      variants={fadeIn}
      className='bg-white rounded-xl border border-gray-200 p-6 mb-6'
    >
      <h2 className='text-xl font-semibold text-gray-900 mb-2'>
        Tax reference numbers
      </h2>
      <p className='text-sm text-gray-600 mb-6'>
        Provide your Unique Taxpayer Reference (UTR) or National Insurance
        number &mdash; at least one is required for HMRC reporting.
      </p>

      <div className='space-y-5'>
        {/* UTR */}
        <div id='field-utr'>
          <label
            htmlFor='utr'
            className='block text-sm font-medium text-gray-700 mb-1'
          >
            Unique Taxpayer Reference (UTR)
          </label>
          <input
            id='utr'
            type='text'
            inputMode='numeric'
            value={formData.utr}
            onChange={(e) => updateField('utr', e.target.value)}
            className={inputClass('utr')}
            placeholder='10 digits, e.g. 1234567890'
            maxLength={13}
            aria-invalid={!!errors.utr}
            aria-describedby={errors.utr ? 'utr-error' : undefined}
            autoComplete='off'
          />
          {fieldError('utr')}
        </div>

        {/* National Insurance number */}
        <div id='field-nino'>
          <label
            htmlFor='nino'
            className='block text-sm font-medium text-gray-700 mb-1'
          >
            National Insurance number
          </label>
          <input
            id='nino'
            type='text'
            value={formData.nino}
            onChange={(e) => updateField('nino', e.target.value.toUpperCase())}
            className={inputClass('nino')}
            placeholder='e.g. QQ123456C'
            maxLength={13}
            aria-invalid={!!errors.nino}
            aria-describedby={errors.nino ? 'nino-error' : undefined}
            autoComplete='off'
          />
          {fieldError('nino')}
        </div>

        {/* Companies House number */}
        <div id='field-companyNumber'>
          <label
            htmlFor='companyNumber'
            className='block text-sm font-medium text-gray-700 mb-1'
          >
            Companies House number (optional)
          </label>
          <input
            id='companyNumber'
            type='text'
            value={formData.companyNumber}
            onChange={(e) =>
              updateField('companyNumber', e.target.value.toUpperCase())
            }
            className={inputClass('companyNumber')}
            placeholder='8 digits, or 2 letters + 6 digits'
            maxLength={8}
            aria-invalid={!!errors.companyNumber}
            aria-describedby={
              errors.companyNumber ? 'companyNumber-error' : undefined
            }
            autoComplete='off'
          />
          {fieldError('companyNumber')}
        </div>

        {/* VAT registration */}
        <div className='pt-2 border-t border-gray-100'>
          <label className='flex items-start gap-3 cursor-pointer'>
            <input
              type='checkbox'
              checked={formData.vatRegistered}
              onChange={(e) => updateField('vatRegistered', e.target.checked)}
              className='mt-0.5 w-5 h-5 text-teal-600 border-gray-300 rounded focus:ring-teal-500 cursor-pointer'
            />
            <span className='text-sm text-gray-700'>
              I am VAT-registered
              <span className='block text-xs text-gray-500'>
                Tick this if you charge VAT and hold a UK VAT number.
              </span>
            </span>
          </label>
        </div>

        {/* VAT number (conditional) */}
        {formData.vatRegistered && (
          <div id='field-vatNumber'>
            <label
              htmlFor='vatNumber'
              className='block text-sm font-medium text-gray-700 mb-1'
            >
              VAT number <span className='text-red-500'>*</span>
            </label>
            <input
              id='vatNumber'
              type='text'
              value={formData.vatNumber}
              onChange={(e) =>
                updateField('vatNumber', e.target.value.toUpperCase())
              }
              className={inputClass('vatNumber')}
              placeholder='e.g. GB123456789'
              maxLength={14}
              aria-required='true'
              aria-invalid={!!errors.vatNumber}
              aria-describedby={
                errors.vatNumber ? 'vatNumber-error' : undefined
              }
              autoComplete='off'
            />
            {fieldError('vatNumber')}
          </div>
        )}
      </div>
    </MotionDiv>
  );
}
