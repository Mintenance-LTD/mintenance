import React from 'react';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { maskTin, sanitizeTin } from './helpers';
import type { FormData, FormErrors } from './types';
import { fadeIn } from './types';

interface Props {
  formData: FormData;
  errors: FormErrors;
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void;
  fieldError: (field: keyof FormErrors) => React.ReactNode;
  inputClass: (field: keyof FormErrors) => string;
  tinFocused: boolean;
  setTinFocused: (v: boolean) => void;
}

export function TinSection({
  formData,
  errors,
  updateField,
  fieldError,
  inputClass,
  tinFocused,
  setTinFocused,
}: Props) {
  return (
    <MotionDiv
      initial="hidden"
      animate="visible"
      variants={fadeIn}
      className="bg-white rounded-xl border border-gray-200 p-6 mb-6"
    >
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Taxpayer Identification Number (TIN)</h2>

      <div className="space-y-5">
        {/* TIN Type Toggle */}
        <fieldset>
          <legend className="block text-sm font-medium text-gray-700 mb-2">
            TIN Type <span className="text-red-500">*</span>
          </legend>
          <div className="flex gap-4" role="radiogroup" aria-label="TIN type selection">
            <label
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 cursor-pointer transition-colors ${
                formData.tinType === 'ssn'
                  ? 'border-teal-600 bg-teal-50 text-teal-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="tinType"
                value="ssn"
                checked={formData.tinType === 'ssn'}
                onChange={() => updateField('tinType', 'ssn')}
                className="sr-only"
              />
              <span className="font-medium">SSN</span>
              <span className="text-xs text-gray-500">(Social Security Number)</span>
            </label>
            <label
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 cursor-pointer transition-colors ${
                formData.tinType === 'ein'
                  ? 'border-teal-600 bg-teal-50 text-teal-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="tinType"
                value="ein"
                checked={formData.tinType === 'ein'}
                onChange={() => updateField('tinType', 'ein')}
                className="sr-only"
              />
              <span className="font-medium">EIN</span>
              <span className="text-xs text-gray-500">(Employer Identification Number)</span>
            </label>
          </div>
        </fieldset>

        {/* TIN Input */}
        <div id="field-tin">
          <label htmlFor="tin" className="block text-sm font-medium text-gray-700 mb-1">
            {formData.tinType === 'ssn' ? 'Social Security Number' : 'Employer Identification Number'}{' '}
            <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              id="tin"
              type={tinFocused ? 'text' : 'password'}
              inputMode="numeric"
              value={tinFocused ? formData.tin : maskTin(formData.tin, formData.tinType)}
              onChange={e => updateField('tin', sanitizeTin(e.target.value))}
              onFocus={() => setTinFocused(true)}
              onBlur={() => setTinFocused(false)}
              className={inputClass('tin')}
              placeholder={formData.tinType === 'ssn' ? 'XXX-XX-XXXX' : 'XX-XXXXXXX'}
              maxLength={11}
              aria-required="true"
              aria-invalid={!!errors.tin}
              aria-describedby={errors.tin ? 'tin-error tin-hint' : 'tin-hint'}
              autoComplete="off"
            />
          </div>
          <p id="tin-hint" className="mt-1 text-xs text-gray-500">
            Your TIN is encrypted and only the last 4 digits are displayed after entry.
          </p>
          {fieldError('tin')}
        </div>
      </div>
    </MotionDiv>
  );
}
