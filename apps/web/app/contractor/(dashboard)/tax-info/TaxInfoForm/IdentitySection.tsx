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

export function IdentitySection({
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
      <h2 className='text-xl font-semibold text-gray-900 mb-6'>Your details</h2>

      <div className='space-y-5'>
        {/* Legal Name */}
        <div id='field-legalName'>
          <label
            htmlFor='legalName'
            className='block text-sm font-medium text-gray-700 mb-1'
          >
            Full legal name <span className='text-red-500'>*</span>
          </label>
          <input
            id='legalName'
            type='text'
            value={formData.legalName}
            onChange={(e) => updateField('legalName', e.target.value)}
            className={inputClass('legalName')}
            placeholder='As it appears on official documents'
            aria-required='true'
            aria-invalid={!!errors.legalName}
            aria-describedby={errors.legalName ? 'legalName-error' : undefined}
            autoComplete='name'
          />
          {fieldError('legalName')}
        </div>

        {/* Trading Name */}
        <div>
          <label
            htmlFor='tradingName'
            className='block text-sm font-medium text-gray-700 mb-1'
          >
            Trading name (optional)
          </label>
          <input
            id='tradingName'
            type='text'
            value={formData.tradingName}
            onChange={(e) => updateField('tradingName', e.target.value)}
            className='w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent'
            placeholder='If your business trades under a different name'
            autoComplete='organization'
          />
        </div>

        {/* Date of Birth */}
        <div id='field-dateOfBirth'>
          <label
            htmlFor='dateOfBirth'
            className='block text-sm font-medium text-gray-700 mb-1'
          >
            Date of birth <span className='text-red-500'>*</span>
          </label>
          <input
            id='dateOfBirth'
            type='date'
            value={formData.dateOfBirth}
            onChange={(e) => updateField('dateOfBirth', e.target.value)}
            className={inputClass('dateOfBirth')}
            max={new Date().toISOString().slice(0, 10)}
            aria-required='true'
            aria-invalid={!!errors.dateOfBirth}
            aria-describedby={
              errors.dateOfBirth ? 'dateOfBirth-error dob-hint' : 'dob-hint'
            }
            autoComplete='bday'
          />
          <p id='dob-hint' className='mt-1 text-xs text-gray-500'>
            Used for HMRC reporting and identity checks. You must be 16 or
            older.
          </p>
          {fieldError('dateOfBirth')}
        </div>
      </div>
    </MotionDiv>
  );
}
