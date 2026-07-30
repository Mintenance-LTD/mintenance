'use client';

import { useState } from 'react';
import { ArrowRight } from 'lucide-react';

export interface BusinessInfoData {
  businessName: string;
  phoneNumber: string;
  yearsExperience: string;
  bio: string;
}

interface Props {
  data: BusinessInfoData;
  onNext: (data: BusinessInfoData) => void;
  saving: boolean;
  /** Wizard-level theme flag — only changes the section header + submit
   *  button class. Input chrome stays legacy in v1 (see wizard comment). */
  isMintEditorial?: boolean;
}

export function BusinessInfoStep({
  data,
  onNext,
  saving,
  isMintEditorial = false,
}: Props) {
  const [form, setForm] = useState<BusinessInfoData>(data);
  const [errors, setErrors] = useState<
    Partial<Record<keyof BusinessInfoData, string>>
  >({});

  function validate(): boolean {
    const next: Partial<Record<keyof BusinessInfoData, string>> = {};
    if (!form.businessName.trim())
      next.businessName = 'Business name is required.';
    if (!form.phoneNumber.trim())
      next.phoneNumber = 'Phone number is required.';
    else if (!/^[\d\s+\-()]{7,20}$/.test(form.phoneNumber.trim()))
      next.phoneNumber = 'Enter a valid phone number.';
    if (form.yearsExperience && isNaN(Number(form.yearsExperience))) {
      next.yearsExperience = 'Must be a number.';
    }
    if (form.bio.trim().length > 0 && form.bio.trim().length < 20) {
      next.bio = 'Bio must be at least 20 characters.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (validate()) onNext(form);
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <h2
        className={
          isMintEditorial ? 't-h3' : 'text-xl font-semibold text-gray-900 mb-1'
        }
      >
        Business Information
      </h2>
      <p
        className={isMintEditorial ? 't-meta' : 'text-sm text-gray-500 mb-6'}
        style={isMintEditorial ? { marginBottom: 20 } : undefined}
      >
        Tell homeowners about your business.
      </p>

      <div className='space-y-4'>
        <div>
          <label
            className='block text-sm font-medium text-gray-700 mb-1'
            htmlFor='businessName'
          >
            Business Name <span className='text-red-500'>*</span>
          </label>
          <input
            id='businessName'
            type='text'
            value={form.businessName}
            onChange={(e) => setForm({ ...form, businessName: e.target.value })}
            placeholder='e.g. Smith Plumbing Ltd'
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${errors.businessName ? 'border-red-400' : 'border-gray-300'}`}
          />
          {errors.businessName && (
            <p className='text-xs text-red-500 mt-1'>{errors.businessName}</p>
          )}
        </div>

        <div>
          <label
            className='block text-sm font-medium text-gray-700 mb-1'
            htmlFor='phoneNumber'
          >
            Phone Number <span className='text-red-500'>*</span>
          </label>
          <input
            id='phoneNumber'
            type='tel'
            value={form.phoneNumber}
            onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
            placeholder='e.g. 07700 900000'
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${errors.phoneNumber ? 'border-red-400' : 'border-gray-300'}`}
          />
          {errors.phoneNumber && (
            <p className='text-xs text-red-500 mt-1'>{errors.phoneNumber}</p>
          )}
        </div>

        <div>
          <label
            className='block text-sm font-medium text-gray-700 mb-1'
            htmlFor='yearsExperience'
          >
            Years of Experience
          </label>
          <input
            id='yearsExperience'
            type='number'
            min='0'
            max='60'
            value={form.yearsExperience}
            onChange={(e) =>
              setForm({ ...form, yearsExperience: e.target.value })
            }
            placeholder='e.g. 5'
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${errors.yearsExperience ? 'border-red-400' : 'border-gray-300'}`}
          />
          {errors.yearsExperience && (
            <p className='text-xs text-red-500 mt-1'>
              {errors.yearsExperience}
            </p>
          )}
        </div>

        <div>
          <label
            className='block text-sm font-medium text-gray-700 mb-1'
            htmlFor='bio'
          >
            About Your Business
          </label>
          <textarea
            id='bio'
            rows={4}
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            placeholder='Briefly describe your services, specialties, and why homeowners should choose you...'
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none ${errors.bio ? 'border-red-400' : 'border-gray-300'}`}
          />
          <p className='text-xs text-gray-400 mt-1'>
            {form.bio.length}/500 characters
          </p>
          {errors.bio && (
            <p className='text-xs text-red-500 mt-1'>{errors.bio}</p>
          )}
        </div>
      </div>

      <div className='mt-6 flex justify-end'>
        <button
          type='submit'
          disabled={saving}
          className={
            isMintEditorial
              ? 'btn-primary'
              : 'flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors'
          }
        >
          {saving ? 'Saving…' : 'Next'}
          {!saving && <ArrowRight className='w-4 h-4' />}
        </button>
      </div>
    </form>
  );
}
