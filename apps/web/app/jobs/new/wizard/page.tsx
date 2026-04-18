'use client';

/**
 * /jobs/new/wizard — three-step job-posting wizard.
 *
 * R3 #5b of docs/RETENTION_ROADMAP_2026.md — the Silver-mode-friendly
 * posting flow. Existing single-form /jobs/create stays for users who
 * prefer it.
 *
 * Steps:
 *  1. What — title + category
 *  2. Where — location (postcode/address)
 *  3. When — budget + "contractor takes before-photos on arrival" opt-in
 *
 * Submits to the existing POST /api/jobs. No new server code.
 */

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useSilverMode, silverFontSize } from '@/lib/hooks/useSilverMode';

const CATEGORIES = [
  { value: 'handyman', label: 'Handyman' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'painting', label: 'Painting & Decorating' },
  { value: 'carpentry', label: 'Carpentry' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'gardening', label: 'Gardening' },
  { value: 'roofing', label: 'Roofing' },
  { value: 'heating', label: 'Heating & Gas' },
  { value: 'flooring', label: 'Flooring' },
];

export default function PostJobWizardPage() {
  const router = useRouter();
  const { silverMode } = useSilverMode();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('handyman');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [budget, setBudget] = useState('');
  const [contractorBeforePhotos, setContractorBeforePhotos] = useState(false);

  const body = silverFontSize(16, silverMode);
  const h1 = silverFontSize(26, silverMode);

  const canNext =
    (step === 0 && title.trim().length >= 5) ||
    (step === 1 && location.trim().length >= 3) ||
    (step === 2 && /^\d+(\.\d+)?$/.test(budget));

  const submit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          category,
          description,
          location,
          budget: Number(budget),
          requirements: {
            contractor_before_photos: contractorBeforePhotos,
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `status ${res.status}`);
      toast.success('Job posted — contractors in your area will see it now.');
      router.push(data.job?.id ? `/jobs/${data.job.id}` : '/dashboard');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Post failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className='max-w-xl mx-auto px-6 py-10'>
      <header className='mb-6'>
        <h1 className='font-bold text-gray-900' style={{ fontSize: h1 }}>
          Post a new job
        </h1>
        <p className='text-sm text-gray-500 mt-1'>Step {step + 1} of 3</p>
      </header>

      <div
        className='bg-white border border-gray-200 rounded-2xl p-6'
        style={{ fontSize: body }}
      >
        {step === 0 && (
          <div className='space-y-5'>
            <label className='block'>
              <span className='font-semibold text-gray-900'>
                What needs doing?
              </span>
              <input
                type='text'
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder='e.g. Fix a leaking kitchen tap'
                className='mt-2 w-full border border-gray-300 rounded-lg px-4 py-3'
                style={{ minHeight: silverMode ? 56 : 44 }}
              />
            </label>
            <label className='block'>
              <span className='font-semibold text-gray-900'>Category</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className='mt-2 w-full border border-gray-300 rounded-lg px-4 py-3'
                style={{ minHeight: silverMode ? 56 : 44 }}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className='block'>
              <span className='font-semibold text-gray-900'>
                Details (optional)
              </span>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder='Add any details that help contractors quote accurately.'
                className='mt-2 w-full border border-gray-300 rounded-lg px-4 py-3'
              />
            </label>
          </div>
        )}

        {step === 1 && (
          <div className='space-y-5'>
            <label className='block'>
              <span className='font-semibold text-gray-900'>
                Where is the job?
              </span>
              <input
                type='text'
                autoFocus
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder='Postcode or address'
                className='mt-2 w-full border border-gray-300 rounded-lg px-4 py-3'
                style={{ minHeight: silverMode ? 56 : 44 }}
              />
            </label>
            <p className='text-sm text-gray-500'>
              Your exact address is only shared with the contractor after you
              accept their bid.
            </p>
          </div>
        )}

        {step === 2 && (
          <div className='space-y-5'>
            <label className='block'>
              <span className='font-semibold text-gray-900'>Budget (£)</span>
              <input
                type='number'
                autoFocus
                inputMode='decimal'
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder='e.g. 150'
                className='mt-2 w-full border border-gray-300 rounded-lg px-4 py-3'
                style={{ minHeight: silverMode ? 56 : 44 }}
              />
              <p className='text-xs text-gray-500 mt-2'>
                Contractors can bid higher or lower. You choose which to accept.
              </p>
            </label>
            <label className='flex items-start gap-3 p-4 rounded-xl bg-teal-50 border border-teal-200 cursor-pointer'>
              <input
                type='checkbox'
                checked={contractorBeforePhotos}
                onChange={(e) => setContractorBeforePhotos(e.target.checked)}
                className='mt-1 w-5 h-5 accent-teal-600'
              />
              <div>
                <div className='font-semibold text-teal-900'>
                  Let the contractor take before-photos on arrival
                </div>
                <p className='text-sm text-teal-900/80 mt-1'>
                  Skip the photo upload on your end. The contractor captures
                  before-photos with GPS verification when they arrive.
                </p>
              </div>
            </label>
          </div>
        )}
      </div>

      <div className='mt-6 flex justify-between'>
        {step > 0 ? (
          <button
            onClick={() => setStep(step - 1)}
            className='inline-flex items-center gap-1 px-5 py-3 text-gray-700 rounded-xl hover:bg-gray-100'
          >
            <ArrowLeft className='w-4 h-4' />
            Back
          </button>
        ) : (
          <span />
        )}

        {step < 2 ? (
          <button
            disabled={!canNext}
            onClick={() => setStep(step + 1)}
            className='inline-flex items-center gap-1 px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 disabled:opacity-50'
          >
            Next
            <ArrowRight className='w-4 h-4' />
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={!canNext || submitting}
            className='inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 disabled:opacity-50'
          >
            {submitting ? 'Posting…' : 'Post job'}
            <CheckCircle2 className='w-4 h-4' />
          </button>
        )}
      </div>
    </div>
  );
}
