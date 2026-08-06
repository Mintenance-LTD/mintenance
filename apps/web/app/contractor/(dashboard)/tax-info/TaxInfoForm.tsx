'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { FileText, Loader2, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { ContractorPageWrapper } from '@/app/contractor/components/ContractorPageWrapper';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { getCsrfHeaders } from '@/lib/csrf-client';

import type { FormData, FormErrors } from './TaxInfoForm/types';
import { fadeIn } from './TaxInfoForm/types';
import {
  isValidUtr,
  isValidNino,
  isValidVatNumber,
  isValidCompanyNumber,
  isValidPostcode,
  isValidDateOfBirth,
} from './TaxInfoForm/helpers';
import {
  fieldErrorRenderer,
  inputClassRenderer,
} from './TaxInfoForm/FieldHelpers';
import { IdentitySection } from './TaxInfoForm/IdentitySection';
import { TaxIdentifiersSection } from './TaxInfoForm/TaxIdentifiersSection';
import { AddressSection } from './TaxInfoForm/AddressSection';
import { CertificationSection } from './TaxInfoForm/CertificationSection';

// ── Component ──────────────────────────────────────────────────────────

export function TaxInfoForm() {
  // Hydration-safe theme detection — Phase-4 contractor port pattern.
  const [isMintEditorial, setIsMintEditorial] = useState(false);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    setIsMintEditorial(
      document.documentElement.dataset.theme === 'mint-editorial'
    );
  }, []);
  const [formData, setFormData] = useState<FormData>({
    legalName: '',
    tradingName: '',
    dateOfBirth: '',
    utr: '',
    nino: '',
    vatRegistered: false,
    vatNumber: '',
    companyNumber: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    county: '',
    postcode: '',
    certificationAccepted: false,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // ── Field update helper ──────────────────────────────────────────

  const updateField = useCallback(
    <K extends keyof FormData>(field: K, value: FormData[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      // Clear error for the field on change
      if (errors[field as keyof FormErrors]) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[field as keyof FormErrors];
          return next;
        });
      }
    },
    [errors]
  );

  // ── Validation ───────────────────────────────────────────────────

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (formData.legalName.trim().length < 2) {
      newErrors.legalName = 'Legal name must be at least 2 characters.';
    }

    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = 'Date of birth is required.';
    } else if (!isValidDateOfBirth(formData.dateOfBirth)) {
      newErrors.dateOfBirth =
        'Enter a valid date of birth (you must be 16 or older).';
    }

    const utr = formData.utr.trim();
    const nino = formData.nino.trim();
    if (!utr && !nino) {
      newErrors.utr = 'Provide a UTR or a National Insurance number.';
    } else {
      if (utr && !isValidUtr(utr)) {
        newErrors.utr = 'UTR must be 10 digits.';
      }
      if (nino && !isValidNino(nino)) {
        newErrors.nino = 'Enter a valid National Insurance number.';
      }
    }

    if (
      formData.companyNumber.trim() &&
      !isValidCompanyNumber(formData.companyNumber)
    ) {
      newErrors.companyNumber = 'Enter a valid Companies House number.';
    }

    if (formData.vatRegistered) {
      if (!formData.vatNumber.trim()) {
        newErrors.vatNumber = 'A VAT number is required when VAT-registered.';
      } else if (!isValidVatNumber(formData.vatNumber)) {
        newErrors.vatNumber = 'Enter a valid UK VAT number.';
      }
    }

    if (!formData.addressLine1.trim()) {
      newErrors.addressLine1 = 'Address line 1 is required.';
    }

    if (!formData.city.trim()) {
      newErrors.city = 'Town or city is required.';
    }

    if (!formData.postcode.trim()) {
      newErrors.postcode = 'Postcode is required.';
    } else if (!isValidPostcode(formData.postcode)) {
      newErrors.postcode = 'Enter a valid UK postcode (e.g. SW1A 1AA).';
    }

    if (!formData.certificationAccepted) {
      newErrors.certificationAccepted =
        'You must confirm that the information is correct.';
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

      const payload: Record<string, unknown> = {
        legalName: formData.legalName.trim(),
        dateOfBirth: formData.dateOfBirth,
        vatRegistered: formData.vatRegistered,
        addressLine1: formData.addressLine1.trim(),
        city: formData.city.trim(),
        postcode: formData.postcode.trim().toUpperCase(),
        certification: true,
      };

      if (formData.tradingName.trim()) {
        payload.tradingName = formData.tradingName.trim();
      }
      if (formData.utr.trim()) {
        payload.utr = formData.utr.replace(/\s+/g, '');
      }
      if (formData.nino.trim()) {
        payload.nino = formData.nino.trim();
      }
      if (formData.companyNumber.trim()) {
        payload.companyNumber = formData.companyNumber.trim();
      }
      if (formData.vatRegistered && formData.vatNumber.trim()) {
        payload.vatNumber = formData.vatNumber.trim();
      }
      if (formData.addressLine2.trim()) {
        payload.addressLine2 = formData.addressLine2.trim();
      }
      if (formData.county.trim()) {
        payload.county = formData.county.trim();
      }

      const res = await fetch('/api/contractor/tax-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res
          .json()
          .catch(() => ({ error: 'Submission failed' }));
        throw new Error(
          data.error || data.message || 'Failed to submit tax information'
        );
      }

      setSubmitted(true);
      toast.success('Tax information submitted successfully.');
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to submit tax information'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success state ────────────────────────────────────────────────

  if (submitted) {
    return (
      <ContractorPageWrapper>
        <MotionDiv
          initial='hidden'
          animate='visible'
          variants={fadeIn}
          className='bg-white border border-gray-200 rounded-xl p-12 text-center max-w-xl mx-auto mt-8'
        >
          <CheckCircle className='w-16 h-16 text-teal-600 mx-auto mb-4' />
          <h1 className='text-2xl font-bold text-gray-900 mb-2'>
            Tax Information Submitted
          </h1>
          <p className='text-gray-600 mb-6'>
            Your tax information has been received. You will be notified if any
            additional information is needed.
          </p>
          <button
            onClick={() => setSubmitted(false)}
            className='px-6 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors'
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
      {isMintEditorial ? (
        <div
          className='row'
          style={{ gap: 14, alignItems: 'center', marginBottom: 24 }}
        >
          <span
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: 'var(--me-brand-soft)',
              color: 'var(--me-brand)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <FileText size={24} strokeWidth={1.5} />
          </span>
          <div className='col' style={{ gap: 4 }}>
            <h1 id='tax-info-heading' className='t-h1'>
              Tax information
            </h1>
            <p className='t-body'>
              Provide your tax details for HMRC reporting. All fields marked
              with * are required.
            </p>
          </div>
        </div>
      ) : (
        <MotionDiv
          initial='hidden'
          animate='visible'
          variants={fadeIn}
          className='bg-white border-b border-gray-200'
        >
          <div className='max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
            <div className='flex items-center gap-4'>
              <div className='w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center flex-shrink-0'>
                <FileText className='w-7 h-7 text-teal-600' />
              </div>
              <div>
                <h1
                  id='tax-info-heading'
                  className='text-3xl font-bold text-gray-900'
                >
                  Tax Information
                </h1>
                <p className='text-gray-600 mt-1'>
                  Provide your tax details for HMRC reporting. All fields marked
                  with * are required.
                </p>
              </div>
            </div>
          </div>
        </MotionDiv>
      )}

      {/* Form */}
      <div className='max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <form
          onSubmit={handleSubmit}
          noValidate
          aria-labelledby='tax-info-heading'
        >
          <IdentitySection
            formData={formData}
            errors={errors}
            updateField={updateField}
            fieldError={fieldError}
            inputClass={inputClass}
          />

          <TaxIdentifiersSection
            formData={formData}
            errors={errors}
            updateField={updateField}
            fieldError={fieldError}
            inputClass={inputClass}
          />

          <AddressSection
            formData={formData}
            errors={errors}
            updateField={updateField}
            fieldError={fieldError}
            inputClass={inputClass}
          />

          <CertificationSection
            formData={formData}
            errors={errors}
            updateField={updateField}
            fieldError={fieldError}
          />

          {/* Submit */}
          <div className='flex flex-col sm:flex-row gap-3 justify-end'>
            <button
              type='submit'
              disabled={submitting}
              className='px-8 py-3 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'
            >
              {submitting && <Loader2 className='w-5 h-5 animate-spin' />}
              {submitting ? 'Submitting...' : 'Submit Tax Information'}
            </button>
          </div>

          {/* Disclaimer */}
          <p className='mt-6 text-xs text-gray-500 text-center'>
            Your tax information is transmitted securely and encrypted at rest.
            We use it solely for HMRC reporting and to produce your annual
            earnings statements. For questions, contact{' '}
            <a
              href='mailto:support@mintenance.co.uk'
              className='text-teal-600 hover:underline'
            >
              support@mintenance.co.uk
            </a>
            .
          </p>
        </form>
      </div>
    </ContractorPageWrapper>
  );
}
