'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight, MapPin } from 'lucide-react';

export interface ServiceAreaData {
  radiusMiles: string;
  postcode: string;
}

interface Props {
  data: ServiceAreaData;
  onNext: (data: ServiceAreaData) => void;
  onBack: () => void;
  saving: boolean;
}

const RADIUS_OPTIONS = [
  { value: '5', label: '5 miles' },
  { value: '10', label: '10 miles' },
  { value: '15', label: '15 miles' },
  { value: '25', label: '25 miles' },
  { value: '50', label: '50 miles' },
];

// Basic UK postcode pattern (outward code only is sufficient for area matching)
const UK_POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;

export function ServiceAreaStep({ data, onNext, onBack, saving }: Props) {
  const [form, setForm] = useState<ServiceAreaData>(data);
  const [errors, setErrors] = useState<Partial<Record<keyof ServiceAreaData, string>>>({});

  function validate(): boolean {
    const next: Partial<Record<keyof ServiceAreaData, string>> = {};
    if (!form.postcode.trim()) {
      next.postcode = 'Postcode is required.';
    } else if (!UK_POSTCODE_RE.test(form.postcode.trim())) {
      next.postcode = 'Enter a valid UK postcode (e.g. SW1A 1AA).';
    }
    if (!form.radiusMiles) next.radiusMiles = 'Select a service radius.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (validate()) onNext(form);
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <h2 className="text-xl font-semibold text-gray-900 mb-1">Service Area</h2>
      <p className="text-sm text-gray-500 mb-6">
        Define where you work. Only jobs within your radius will be shown to you.
      </p>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="postcode">
            Base Postcode <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              id="postcode"
              type="text"
              value={form.postcode}
              onChange={(e) => setForm({ ...form, postcode: e.target.value.toUpperCase() })}
              placeholder="e.g. SW1A 1AA"
              maxLength={8}
              className={`w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${errors.postcode ? 'border-red-400' : 'border-gray-300'}`}
            />
          </div>
          {errors.postcode && <p className="text-xs text-red-500 mt-1">{errors.postcode}</p>}
          <p className="text-xs text-gray-400 mt-1">Your home base — used to calculate travel distance to jobs</p>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">
            How far will you travel? <span className="text-red-500">*</span>
          </p>
          <div className="grid grid-cols-5 gap-2">
            {RADIUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setForm({ ...form, radiusMiles: opt.value })}
                className={`py-2 rounded-lg border text-sm font-medium transition-colors ${
                  form.radiusMiles === opt.value
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {errors.radiusMiles && <p className="text-xs text-red-500 mt-1">{errors.radiusMiles}</p>}
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
          <p className="text-xs text-blue-700">
            <strong>Tip:</strong> A larger radius means more job opportunities, but consider travel time and costs. You can update this at any time from your profile.
          </p>
        </div>
      </div>

      <div className="mt-6 flex justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 px-4 py-2.5 rounded-lg border border-gray-200 hover:border-gray-300 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          {saving ? 'Saving…' : 'Next'}
          {!saving && <ArrowRight className="w-4 h-4" />}
        </button>
      </div>
    </form>
  );
}
