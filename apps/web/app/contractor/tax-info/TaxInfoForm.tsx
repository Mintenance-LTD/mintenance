'use client';

import React, { useState, useCallback, useRef } from 'react';
import { FileText, Upload, Loader2, CheckCircle, AlertCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { ContractorPageWrapper } from '@/app/contractor/components/ContractorPageWrapper';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { getCsrfHeaders } from '@/lib/csrf-client';

// ── Types ──────────────────────────────────────────────────────────────

type TaxClassification =
  | ''
  | 'individual'
  | 'llc_single'
  | 'llc_c'
  | 'llc_s'
  | 'c_corp'
  | 's_corp'
  | 'partnership'
  | 'trust';

type TinType = 'ssn' | 'ein';

interface FormData {
  legalName: string;
  businessName: string;
  taxClassification: TaxClassification;
  tinType: TinType;
  tin: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zip: string;
  certificationAccepted: boolean;
}

interface FormErrors {
  legalName?: string;
  taxClassification?: string;
  tin?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  zip?: string;
  certificationAccepted?: string;
  w9File?: string;
}

// ── Constants ──────────────────────────────────────────────────────────

const TAX_CLASSIFICATIONS: { value: TaxClassification; label: string }[] = [
  { value: '', label: 'Select classification...' },
  { value: 'individual', label: 'Individual / Sole Proprietor' },
  { value: 'llc_single', label: 'LLC - Single Member (disregarded entity)' },
  { value: 'llc_c', label: 'LLC - C Corporation' },
  { value: 'llc_s', label: 'LLC - S Corporation' },
  { value: 'c_corp', label: 'C Corporation' },
  { value: 's_corp', label: 'S Corporation' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'trust', label: 'Trust / Estate' },
];

const US_STATES: { value: string; label: string }[] = [
  { value: '', label: 'Select state...' },
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
  { value: 'DC', label: 'District of Columbia' },
];

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// ── Helpers ────────────────────────────────────────────────────────────

/** Format a raw TIN string into XXX-XX-XXXX (SSN) or XX-XXXXXXX (EIN) for display, masking all but last 4. */
function maskTin(raw: string, type: TinType): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 0) return '';
  if (type === 'ssn') {
    // Show ***-**-XXXX
    if (digits.length <= 5) return '*'.repeat(digits.length);
    return `***-**-${digits.slice(5, 9)}`;
  }
  // EIN: **-***XXXX
  if (digits.length <= 5) return '*'.repeat(digits.length);
  return `**-***${digits.slice(5, 9)}`;
}

/** Strip non-digits from a TIN input and cap at 9 digits. */
function sanitizeTin(value: string): string {
  return value.replace(/\D/g, '').slice(0, 9);
}

/** Validate US ZIP code (5 digits or 5+4). */
function isValidZip(zip: string): boolean {
  return /^\d{5}(-\d{4})?$/.test(zip);
}

// ── Component ──────────────────────────────────────────────────────────

export function TaxInfoForm() {
  const [formData, setFormData] = useState<FormData>({
    legalName: '',
    businessName: '',
    taxClassification: '',
    tinType: 'ssn',
    tin: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    zip: '',
    certificationAccepted: false,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [w9File, setW9File] = useState<File | null>(null);
  const [tinFocused, setTinFocused] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Field update helper ──────────────────────────────────────────

  const updateField = useCallback(<K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for the field on change
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field as keyof FormErrors];
        return next;
      });
    }
  }, [errors]);

  // ── Validation ───────────────────────────────────────────────────

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.legalName.trim()) {
      newErrors.legalName = 'Legal name is required.';
    }

    if (!formData.taxClassification) {
      newErrors.taxClassification = 'Tax classification is required.';
    }

    const tinDigits = formData.tin.replace(/\D/g, '');
    if (!tinDigits) {
      newErrors.tin = 'Taxpayer Identification Number is required.';
    } else if (tinDigits.length !== 9) {
      newErrors.tin = 'TIN must be exactly 9 digits.';
    }

    if (!formData.addressLine1.trim()) {
      newErrors.addressLine1 = 'Street address is required.';
    }

    if (!formData.city.trim()) {
      newErrors.city = 'City is required.';
    }

    if (!formData.state) {
      newErrors.state = 'State is required.';
    }

    if (!formData.zip.trim()) {
      newErrors.zip = 'ZIP code is required.';
    } else if (!isValidZip(formData.zip.trim())) {
      newErrors.zip = 'Enter a valid ZIP code (e.g. 12345 or 12345-6789).';
    }

    if (!formData.certificationAccepted) {
      newErrors.certificationAccepted = 'You must certify that the information is correct.';
    }

    if (w9File && w9File.size > 10 * 1024 * 1024) {
      newErrors.w9File = 'W-9 file must be under 10 MB.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Submit handler ───────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      // Scroll to the first error
      const firstErrorKey = Object.keys(errors)[0];
      if (firstErrorKey) {
        const el = document.getElementById(`field-${firstErrorKey}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setSubmitting(true);

    try {
      const csrfHeaders = await getCsrfHeaders();

      const body = new FormData();
      body.append('legalName', formData.legalName.trim());
      if (formData.businessName.trim()) {
        body.append('businessName', formData.businessName.trim());
      }
      body.append('taxClassification', formData.taxClassification);
      body.append('tinType', formData.tinType);
      body.append('tin', formData.tin.replace(/\D/g, ''));
      body.append('addressLine1', formData.addressLine1.trim());
      if (formData.addressLine2.trim()) {
        body.append('addressLine2', formData.addressLine2.trim());
      }
      body.append('city', formData.city.trim());
      body.append('state', formData.state);
      body.append('zip', formData.zip.trim());
      body.append('certificationAccepted', 'true');

      if (w9File) {
        body.append('w9Document', w9File);
      }

      const res = await fetch('/api/contractor/tax-info', {
        method: 'POST',
        headers: { ...csrfHeaders },
        credentials: 'include',
        body,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Submission failed' }));
        throw new Error(data.error || 'Failed to submit tax information');
      }

      setSubmitted(true);
      toast.success('Tax information submitted successfully.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit tax information');
    } finally {
      setSubmitting(false);
    }
  };

  // ── File upload handler ──────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file) {
      const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
      if (!allowed.includes(file.type)) {
        toast.error('Please upload a PDF, JPG, or PNG file.');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File must be under 10 MB.');
        return;
      }
    }
    setW9File(file);
    if (errors.w9File) {
      setErrors(prev => {
        const next = { ...prev };
        delete next.w9File;
        return next;
      });
    }
  };

  const removeFile = () => {
    setW9File(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // ── Success state ────────────────────────────────────────────────

  if (submitted) {
    return (
      <ContractorPageWrapper>
        <MotionDiv
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          className="bg-white border border-gray-200 rounded-xl p-12 text-center max-w-xl mx-auto mt-8"
        >
          <CheckCircle className="w-16 h-16 text-teal-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Tax Information Submitted</h1>
          <p className="text-gray-600 mb-6">
            Your W-9 tax information has been received and is being processed.
            You will be notified if any additional information is needed.
          </p>
          <button
            onClick={() => setSubmitted(false)}
            className="px-6 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors"
          >
            Update Information
          </button>
        </MotionDiv>
      </ContractorPageWrapper>
    );
  }

  // ── Helper: renders an inline error message ──────────────────────

  const fieldError = (field: keyof FormErrors) => {
    if (!errors[field]) return null;
    return (
      <p id={`${field}-error`} className="mt-1 text-sm text-red-600 flex items-center gap-1" role="alert">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        {errors[field]}
      </p>
    );
  };

  // ── Input class helper ───────────────────────────────────────────

  const inputClass = (field: keyof FormErrors) =>
    `w-full px-3 py-2.5 border rounded-lg transition-colors focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
      errors[field]
        ? 'border-red-300 bg-red-50 focus:ring-red-500'
        : 'border-gray-300 bg-white'
    }`;

  // ── Render ───────────────────────────────────────────────────────

  return (
    <ContractorPageWrapper>
      {/* Header */}
      <MotionDiv initial="hidden" animate="visible" variants={fadeIn} className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center flex-shrink-0">
              <FileText className="w-7 h-7 text-teal-600" />
            </div>
            <div>
              <h1 id="tax-info-heading" className="text-3xl font-bold text-gray-900">Tax Information (W-9)</h1>
              <p className="text-gray-600 mt-1">
                Provide your taxpayer information for 1099-NEC reporting. All fields marked with * are required.
              </p>
            </div>
          </div>
        </div>
      </MotionDiv>

      {/* Form */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} noValidate aria-labelledby="tax-info-heading">
          {/* Section 1: Identity */}
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

          {/* Section 2: TIN */}
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

          {/* Section 3: Address */}
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

          {/* Section 4: W-9 PDF Upload */}
          <MotionDiv
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            className="bg-white rounded-xl border border-gray-200 p-6 mb-6"
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-2">W-9 Document Upload</h2>
            <p className="text-sm text-gray-600 mb-4">
              Optionally upload a signed W-9 PDF. Accepted formats: PDF, JPG, PNG (max 10 MB).
            </p>

            {w9File ? (
              <div className="flex items-center gap-3 bg-teal-50 border border-teal-200 rounded-lg px-4 py-3">
                <FileText className="w-5 h-5 text-teal-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{w9File.name}</p>
                  <p className="text-xs text-gray-500">{(w9File.size / 1024).toFixed(0)} KB</p>
                </div>
                <button
                  type="button"
                  onClick={removeFile}
                  className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  aria-label={`Remove file ${w9File.name}`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div>
                <input
                  ref={fileInputRef}
                  id="w9Upload"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  className="hidden"
                  aria-describedby={errors.w9File ? 'w9File-error' : undefined}
                />
                <label
                  htmlFor="w9Upload"
                  className="flex items-center justify-center gap-2 px-6 py-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-teal-400 hover:bg-teal-50/50 transition-colors"
                >
                  <Upload className="w-5 h-5 text-gray-400" />
                  <span className="text-sm font-medium text-gray-600">Click to upload W-9 document</span>
                </label>
              </div>
            )}
            {fieldError('w9File')}
          </MotionDiv>

          {/* Section 5: Certification */}
          <MotionDiv
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            className="bg-white rounded-xl border border-gray-200 p-6 mb-6"
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Certification</h2>

            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 mb-4">
              <p className="text-sm text-gray-700 leading-relaxed">
                Under penalties of perjury, I certify that:
              </p>
              <ol className="list-decimal list-inside text-sm text-gray-700 mt-2 space-y-1">
                <li>
                  The number shown on this form is my correct taxpayer identification number (or I am waiting for a
                  number to be issued to me).
                </li>
                <li>
                  I am not subject to backup withholding because: (a) I am exempt from backup withholding, or (b) I
                  have not been notified by the Internal Revenue Service (IRS) that I am subject to backup withholding
                  as a result of a failure to report all interest or dividends, or (c) the IRS has notified me that I
                  am no longer subject to backup withholding.
                </li>
                <li>I am a U.S. citizen or other U.S. person.</li>
                <li>
                  The FATCA code(s) entered on this form (if any) indicating that I am exempt from FATCA reporting
                  is correct.
                </li>
              </ol>
            </div>

            <div id="field-certificationAccepted" className="flex items-start gap-3">
              <input
                id="certificationAccepted"
                type="checkbox"
                checked={formData.certificationAccepted}
                onChange={e => updateField('certificationAccepted', e.target.checked)}
                className="mt-0.5 w-5 h-5 text-teal-600 border-gray-300 rounded focus:ring-teal-500 cursor-pointer"
                aria-required="true"
                aria-invalid={!!errors.certificationAccepted}
                aria-describedby={errors.certificationAccepted ? 'certificationAccepted-error' : undefined}
              />
              <label htmlFor="certificationAccepted" className="text-sm text-gray-700 cursor-pointer">
                I certify, under penalties of perjury, that the information provided above is true, correct, and
                complete.
                <span className="text-red-500"> *</span>
              </label>
            </div>
            {fieldError('certificationAccepted')}
          </MotionDiv>

          {/* Submit */}
          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-3 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
              {submitting ? 'Submitting...' : 'Submit Tax Information'}
            </button>
          </div>

          {/* Disclaimer */}
          <p className="mt-6 text-xs text-gray-500 text-center">
            Your tax information is transmitted securely and encrypted at rest. We use it solely for
            1099-NEC tax reporting as required by the IRS. For questions, contact{' '}
            <a href="mailto:support@mintenance.com" className="text-teal-600 hover:underline">
              support@mintenance.com
            </a>
            .
          </p>
        </form>
      </div>
    </ContractorPageWrapper>
  );
}
