import React from 'react';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { US_STATES } from './constants';
import type { FormData, FormErrors } from './types';
import { fadeIn } from './types';

interface Props {
  formData: FormData;
  errors: FormErrors;
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void;
  fieldError: (field: keyof FormErrors) => React.ReactNode;
  inputClass: (field: keyof FormErrors) => string;
}

export function AddressSection({ formData, errors, updateField, fieldError, inputClass }: Props) {
  return (
    <MotionDiv
      initial="hidden"
      animate="visible"
      variants={fadeIn}
      className="bg-white rounded-xl border border-gray-200 p-6 mb-6"
    >
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Address</h2>

      <div className="space-y-5">
        {/* Address Line 1 */}
        <div id="field-addressLine1">
          <label htmlFor="addressLine1" className="block text-sm font-medium text-gray-700 mb-1">
            Street Address <span className="text-red-500">*</span>
          </label>
          <input
            id="addressLine1"
            type="text"
            value={formData.addressLine1}
            onChange={e => updateField('addressLine1', e.target.value)}
            className={inputClass('addressLine1')}
            placeholder="123 Main Street"
            aria-required="true"
            aria-invalid={!!errors.addressLine1}
            aria-describedby={errors.addressLine1 ? 'addressLine1-error' : undefined}
            autoComplete="address-line1"
          />
          {fieldError('addressLine1')}
        </div>

        {/* Address Line 2 */}
        <div>
          <label htmlFor="addressLine2" className="block text-sm font-medium text-gray-700 mb-1">
            Apt, Suite, Unit (optional)
          </label>
          <input
            id="addressLine2"
            type="text"
            value={formData.addressLine2}
            onChange={e => updateField('addressLine2', e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            placeholder="Suite 100"
            autoComplete="address-line2"
          />
        </div>

        {/* City / State / ZIP */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div id="field-city">
            <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
              City <span className="text-red-500">*</span>
            </label>
            <input
              id="city"
              type="text"
              value={formData.city}
              onChange={e => updateField('city', e.target.value)}
              className={inputClass('city')}
              placeholder="City"
              aria-required="true"
              aria-invalid={!!errors.city}
              aria-describedby={errors.city ? 'city-error' : undefined}
              autoComplete="address-level2"
            />
            {fieldError('city')}
          </div>

          <div id="field-state">
            <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
              State <span className="text-red-500">*</span>
            </label>
            <select
              id="state"
              value={formData.state}
              onChange={e => updateField('state', e.target.value)}
              className={inputClass('state')}
              aria-required="true"
              aria-invalid={!!errors.state}
              aria-describedby={errors.state ? 'state-error' : undefined}
              autoComplete="address-level1"
            >
              {US_STATES.map(s => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            {fieldError('state')}
          </div>

          <div id="field-zip">
            <label htmlFor="zip" className="block text-sm font-medium text-gray-700 mb-1">
              ZIP Code <span className="text-red-500">*</span>
            </label>
            <input
              id="zip"
              type="text"
              inputMode="numeric"
              value={formData.zip}
              onChange={e => updateField('zip', e.target.value)}
              className={inputClass('zip')}
              placeholder="12345"
              maxLength={10}
              aria-required="true"
              aria-invalid={!!errors.zip}
              aria-describedby={errors.zip ? 'zip-error' : undefined}
              autoComplete="postal-code"
            />
            {fieldError('zip')}
          </div>
        </div>
      </div>
    </MotionDiv>
  );
}
