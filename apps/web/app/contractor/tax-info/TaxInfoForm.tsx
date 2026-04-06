'use client';

import React, { useState, useCallback, useRef } from 'react';
import { FileText, Loader2, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { ContractorPageWrapper } from '@/app/contractor/components/ContractorPageWrapper';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { getCsrfHeaders } from '@/lib/csrf-client';

import type { FormData, FormErrors } from './TaxInfoForm/types';
import { fadeIn } from './TaxInfoForm/types';
import { isValidZip } from './TaxInfoForm/helpers';
import { fieldErrorRenderer, inputClassRenderer } from './TaxInfoForm/FieldHelpers';
import { IdentitySection } from './TaxInfoForm/IdentitySection';
import { TinSection } from './TaxInfoForm/TinSection';
import { AddressSection } from './TaxInfoForm/AddressSection';
import { W9UploadSection } from './TaxInfoForm/W9UploadSection';
import { CertificationSection } from './TaxInfoForm/CertificationSection';

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

  // ── Helpers bound to current errors ──────────────────────────────

  const fieldError = fieldErrorRenderer(errors);
  const inputClass = inputClassRenderer(errors);

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
          <IdentitySection
            formData={formData}
            errors={errors}
            updateField={updateField}
            fieldError={fieldError}
            inputClass={inputClass}
          />

          <TinSection
            formData={formData}
            errors={errors}
            updateField={updateField}
            fieldError={fieldError}
            inputClass={inputClass}
            tinFocused={tinFocused}
            setTinFocused={setTinFocused}
          />

          <AddressSection
            formData={formData}
            errors={errors}
            updateField={updateField}
            fieldError={fieldError}
            inputClass={inputClass}
          />

          <W9UploadSection
            w9File={w9File}
            errors={errors}
            fileInputRef={fileInputRef}
            handleFileChange={handleFileChange}
            removeFile={removeFile}
            fieldError={fieldError}
          />

          <CertificationSection
            formData={formData}
            errors={errors}
            updateField={updateField}
            fieldError={fieldError}
          />

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
            <a href="mailto:support@mintenance.co.uk" className="text-teal-600 hover:underline">
              support@mintenance.co.uk
            </a>
            .
          </p>
        </form>
      </div>
    </ContractorPageWrapper>
  );
}
