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

export function AddressSection({
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
      <h2 className='text-xl font-semibold text-gray-900 mb-6'>Address</h2>

      <div className='space-y-5'>
        {/* Address Line 1 */}
        <div id='field-addressLine1'>
          <label
            htmlFor='addressLine1'
            className='block text-sm font-medium text-gray-700 mb-1'
          >
            Address line 1 <span className='text-red-500'>*</span>
          </label>
          <input
            id='addressLine1'
            type='text'
            value={formData.addressLine1}
            onChange={(e) => updateField('addressLine1', e.target.value)}
            className={inputClass('addressLine1')}
            placeholder='House number and street'
            aria-required='true'
            aria-invalid={!!errors.addressLine1}
            aria-describedby={
              errors.addressLine1 ? 'addressLine1-error' : undefined
            }
            autoComplete='address-line1'
          />
          {fieldError('addressLine1')}
        </div>

        {/* Address Line 2 */}
        <div>
          <label
            htmlFor='addressLine2'
            className='block text-sm font-medium text-gray-700 mb-1'
          >
            Address line 2 (optional)
          </label>
          <input
            id='addressLine2'
            type='text'
            value={formData.addressLine2}
            onChange={(e) => updateField('addressLine2', e.target.value)}
            className='w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent'
            placeholder='Flat, building, etc.'
            autoComplete='address-line2'
          />
        </div>

        {/* Town/City / County / Postcode */}
        <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
          <div id='field-city'>
            <label
              htmlFor='city'
              className='block text-sm font-medium text-gray-700 mb-1'
            >
              Town / City <span className='text-red-500'>*</span>
            </label>
            <input
              id='city'
              type='text'
              value={formData.city}
              onChange={(e) => updateField('city', e.target.value)}
              className={inputClass('city')}
              placeholder='Town or city'
              aria-required='true'
              aria-invalid={!!errors.city}
              aria-describedby={errors.city ? 'city-error' : undefined}
              autoComplete='address-level2'
            />
            {fieldError('city')}
          </div>

          <div>
            <label
              htmlFor='county'
              className='block text-sm font-medium text-gray-700 mb-1'
            >
              County (optional)
            </label>
            <input
              id='county'
              type='text'
              value={formData.county}
              onChange={(e) => updateField('county', e.target.value)}
              className='w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent'
              placeholder='County'
              autoComplete='address-level1'
            />
          </div>

          <div id='field-postcode'>
            <label
              htmlFor='postcode'
              className='block text-sm font-medium text-gray-700 mb-1'
            >
              Postcode <span className='text-red-500'>*</span>
            </label>
            <input
              id='postcode'
              type='text'
              value={formData.postcode}
              onChange={(e) =>
                updateField('postcode', e.target.value.toUpperCase())
              }
              className={inputClass('postcode')}
              placeholder='e.g. SW1A 1AA'
              maxLength={8}
              aria-required='true'
              aria-invalid={!!errors.postcode}
              aria-describedby={errors.postcode ? 'postcode-error' : undefined}
              autoComplete='postal-code'
            />
            {fieldError('postcode')}
          </div>
        </div>
      </div>
    </MotionDiv>
  );
}
