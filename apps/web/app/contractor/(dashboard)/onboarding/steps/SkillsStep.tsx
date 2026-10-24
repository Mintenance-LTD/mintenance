'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { JOB_CATEGORIES } from '@/app/jobs/create/constants';

export interface SkillsData {
  selectedSkills: string[];
  licenseNumber: string;
  insuranceProvider: string;
}

interface Props {
  data: SkillsData;
  onNext: (data: SkillsData) => void;
  onBack: () => void;
  saving: boolean;
  isMintEditorial?: boolean;
}

export function SkillsStep({
  data,
  onNext,
  onBack,
  saving,
  isMintEditorial = false,
}: Props) {
  const [form, setForm] = useState<SkillsData>(data);
  const [errors, setErrors] = useState<
    Partial<Record<keyof SkillsData, string>>
  >({});

  function toggleSkill(value: string) {
    setForm((prev) => ({
      ...prev,
      selectedSkills: prev.selectedSkills.includes(value)
        ? prev.selectedSkills.filter((s) => s !== value)
        : [...prev.selectedSkills, value],
    }));
  }

  function validate(): boolean {
    const next: Partial<Record<keyof SkillsData, string>> = {};
    if (form.selectedSkills.length === 0)
      next.selectedSkills = 'Select at least one skill.';
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
          isMintEditorial
            ? 't-h3'
            : 'text-xl font-semibold text-[var(--me-ink)] mb-1'
        }
      >
        Skills &amp; Qualifications
      </h2>
      <p
        className={
          isMintEditorial ? 't-meta' : 'text-sm text-[var(--me-ink-2)] mb-6'
        }
        style={isMintEditorial ? { marginBottom: 20 } : undefined}
      >
        Select the services you offer. This helps match you with the right jobs.
      </p>

      <div className='mb-5'>
        <p className='text-sm font-medium text-[var(--me-ink-2)] mb-2'>
          Services Offered <span className='text-[var(--me-err-fg)]'>*</span>
        </p>
        <div className='grid grid-cols-2 sm:grid-cols-3 gap-2'>
          {JOB_CATEGORIES.map((cat) => {
            const selected = form.selectedSkills.includes(cat.value);
            return (
              <button
                key={cat.value}
                type='button'
                onClick={() => toggleSkill(cat.value)}
                className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                  selected
                    ? 'border-[var(--me-brand)] bg-[var(--me-brand-soft)] text-[var(--me-ink)]'
                    : 'border-[var(--me-line)] bg-[var(--me-surface)] text-[var(--me-ink-2)] hover:border-[var(--me-line)]'
                }`}
              >
                <span>{cat.label}</span>
                {selected && <Check className='w-3.5 h-3.5 shrink-0' />}
              </button>
            );
          })}
        </div>
        {errors.selectedSkills && (
          <p className='text-xs text-[var(--me-err-fg)] mt-2'>
            {errors.selectedSkills}
          </p>
        )}
      </div>

      <div className='space-y-4'>
        <div>
          <label
            className='block text-sm font-medium text-[var(--me-ink-2)] mb-1'
            htmlFor='licenseNumber'
          >
            Trade License / Registration Number
          </label>
          <input
            id='licenseNumber'
            type='text'
            value={form.licenseNumber}
            onChange={(e) =>
              setForm({ ...form, licenseNumber: e.target.value })
            }
            placeholder='e.g. Gas Safe: 123456'
            className='w-full px-3 py-2 border border-[var(--me-line)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--me-brand)]'
          />
          <p className='text-xs text-[var(--me-ink-2)] mt-1'>
            Optional — increases trust with homeowners
          </p>
        </div>

        <div>
          <label
            className='block text-sm font-medium text-[var(--me-ink-2)] mb-1'
            htmlFor='insuranceProvider'
          >
            Insurance Provider
          </label>
          <input
            id='insuranceProvider'
            type='text'
            value={form.insuranceProvider}
            onChange={(e) =>
              setForm({ ...form, insuranceProvider: e.target.value })
            }
            placeholder='e.g. AXA Business Insurance'
            className='w-full px-3 py-2 border border-[var(--me-line)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--me-brand)]'
          />
          <p className='text-xs text-[var(--me-ink-2)] mt-1'>
            Optional — shows homeowners you&apos;re covered
          </p>
        </div>
      </div>

      <div className='mt-6 flex justify-between'>
        <button
          type='button'
          onClick={onBack}
          className={
            isMintEditorial
              ? 'btn-secondary'
              : 'flex items-center gap-2 text-[var(--me-ink-2)] hover:text-[var(--me-ink-2)] px-4 py-2.5 rounded-lg border border-[var(--me-line)] hover:border-[var(--me-line)] text-sm font-medium transition-colors'
          }
        >
          <ArrowLeft className='w-4 h-4' />
          Back
        </button>
        <button
          type='submit'
          disabled={saving}
          className={
            isMintEditorial
              ? 'btn-primary'
              : 'flex items-center gap-2 bg-[var(--me-brand)] hover:bg-[var(--me-brand)] disabled:bg-[var(--me-brand)] text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors'
          }
        >
          {saving ? 'Saving…' : 'Next'}
          {!saving && <ArrowRight className='w-4 h-4' />}
        </button>
      </div>
    </form>
  );
}
