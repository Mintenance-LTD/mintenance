import React from 'react';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { TAX_CLASSIFICATIONS } from './constants';
import type { FormData, FormErrors, TaxClassification } from './types';
import { fadeIn } from './types';

interface Props {
  formData: FormData;
  errors: FormErrors;
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void;
  fieldError: (field: keyof FormErrors) => React.ReactNode;
  inputClass: (field: keyof FormErrors) => string;
}

export function IdentitySection({ formData, errors, updateField, fieldError, inputClass }: Props) {
  return (
    <MotionDiv
      initial="hidden"
      animate="visible"
      variants={fadeIn}
      className="bg-white rounded-xl border border-gray-200 p-6 mb-6"
    >
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Taxpayer Identity</h2>

      <div className="space-y-5">
        {/* Legal Name */}
        <div id="field-legalName">
          <label htmlFor="legalName" className="block text-sm font-medium text-gray-700 mb-1">
            Legal Name <span className="text-red-500">*</span>
          </label>
          <input
            id="legalName"
            type="text"
            value={formData.legalName}
            onChange={e => updateField('legalName', e.target.value)}
            className={inputClass('legalName')}
            placeholder="As shown on your income tax return"
            aria-required="true"
            aria-invalid={!!errors.legalName}
            aria-describedby={errors.legalName ? 'legalName-error' : undefined}
            autoComplete="name"
          />
          {fieldError('legalName')}
        </div>

        {/* Business Name / DBA */}
        <div>
          <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 mb-1">
            Business Name / DBA
          </label>
          <input
            id="businessName"
            type="text"
            value={formData.businessName}
            onChange={e => updateField('businessName', e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            placeholder="If different from legal name"
            autoComplete="organization"
          />
        </div>

        {/* Tax Classification */}
        <div id="field-taxClassification">
          <label htmlFor="taxClassification" className="block text-sm font-medium text-gray-700 mb-1">
            Federal Tax Classification <span className="text-red-500">*</span>
          </label>
          <select
            id="taxClassification"
            value={formData.taxClassification}
            onChange={e => updateField('taxClassification', e.target.value as TaxClassification)}
            className={inputClass('taxClassification')}
            aria-required="true"
            aria-invalid={!!errors.taxClassification}
            aria-describedby={errors.taxClassification ? 'taxClassification-error' : undefined}
          >
            {TAX_CLASSIFICATIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {fieldError('taxClassification')}
        </div>
      </div>
    </MotionDiv>
  );
}
