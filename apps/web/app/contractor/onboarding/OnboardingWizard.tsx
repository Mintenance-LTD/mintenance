'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  BusinessInfoStep,
  type BusinessInfoData,
} from './steps/BusinessInfoStep';
import { SkillsStep, type SkillsData } from './steps/SkillsStep';
import { ServiceAreaStep, type ServiceAreaData } from './steps/ServiceAreaStep';
import { PaymentSetupStep } from './steps/PaymentSetupStep';

const STEPS = [
  { number: 1, label: 'Business Info' },
  { number: 2, label: 'Skills' },
  { number: 3, label: 'Service Area' },
  { number: 4, label: 'Get Paid' },
];

interface OnboardingFormData {
  business: BusinessInfoData;
  skills: SkillsData;
  serviceArea: ServiceAreaData;
}

const INITIAL_DATA: OnboardingFormData = {
  business: { businessName: '', phoneNumber: '', yearsExperience: '', bio: '' },
  skills: { selectedSkills: [], licenseNumber: '', insuranceProvider: '' },
  serviceArea: { radiusMiles: '10', postcode: '' },
};

export function OnboardingWizard() {
  const router = useRouter();
  const { user } = useCurrentUser();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<OnboardingFormData>(INITIAL_DATA);
  const [saving, setSaving] = useState(false);

  // 2026-05-13 polish pass: hydration-safe theme detection. Under Mint
  // Editorial the wizard chrome (page background, header, step
  // indicator, card shell, skip link, submit button on each step)
  // swaps to canonical .t-h1 / .card / .btn-primary / brand-soft
  // active states. Step bodies (form-field layouts) inherit colour
  // mapping from the shell; rewriting the inputs themselves is a P2
  // alongside the wider form-control consolidation.
  const [isMintEditorial, setIsMintEditorial] = useState(false);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    setIsMintEditorial(
      document.documentElement.dataset.theme === 'mint-editorial'
    );
  }, []);

  async function saveStep(patch: Partial<OnboardingFormData>) {
    const merged = { ...formData, ...patch };
    setFormData(merged);

    setSaving(true);
    try {
      const body = buildProfilePatch(merged, step);
      const res = await fetch('/api/profiles/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Save failed');
    } catch {
      toast.error('Could not save progress — please try again.');
      setSaving(false);
      return false;
    }
    setSaving(false);
    return true;
  }

  function buildProfilePatch(data: OnboardingFormData, currentStep: number) {
    if (currentStep === 1) {
      return {
        business_name: data.business.businessName,
        phone: data.business.phoneNumber,
        years_experience: data.business.yearsExperience
          ? parseInt(data.business.yearsExperience, 10)
          : null,
        bio: data.business.bio,
      };
    }
    if (currentStep === 2) {
      return {
        skills: data.skills.selectedSkills,
        license_number: data.skills.licenseNumber,
        insurance_provider: data.skills.insuranceProvider,
      };
    }
    if (currentStep === 3) {
      return {
        service_radius_miles: data.serviceArea.radiusMiles
          ? parseInt(data.serviceArea.radiusMiles, 10)
          : 10,
        service_postcode: data.serviceArea.postcode,
      };
    }
    return {};
  }

  async function handleNext(patch: Partial<OnboardingFormData>) {
    const ok = await saveStep(patch);
    if (!ok) return;
    setStep((s) => s + 1);
  }

  function handleBack() {
    setStep((s) => s - 1);
  }

  async function handleFinish(patch: Partial<OnboardingFormData>) {
    const ok = await saveStep(patch);
    if (!ok) return;
    toast.success('Profile set up! Welcome to Mintenance.');
    router.push('/contractor/dashboard-enhanced');
  }

  return (
    <div
      className={
        isMintEditorial
          ? 'min-h-screen flex flex-col items-center justify-start py-10 px-4'
          : 'min-h-screen bg-gray-50 flex flex-col items-center justify-start py-10 px-4'
      }
      style={isMintEditorial ? { background: 'var(--me-bg)' } : undefined}
    >
      <div className='w-full max-w-2xl'>
        {/* Header */}
        <div className='text-center mb-8'>
          <h1
            className={
              isMintEditorial ? 't-h1' : 'text-3xl font-bold text-gray-900'
            }
          >
            Set up your account
          </h1>
          <p
            className={isMintEditorial ? 't-body' : 'text-gray-500 mt-2'}
            style={isMintEditorial ? { marginTop: 8 } : undefined}
          >
            Complete these steps to start receiving job opportunities.
          </p>
        </div>

        {/* Step indicator */}
        <div className='flex items-center justify-center mb-8 gap-0'>
          {STEPS.map((s, i) => {
            const isDone = step > s.number;
            const isCurrent = step === s.number;
            return (
              <React.Fragment key={s.number}>
                <div className='flex flex-col items-center'>
                  <div
                    className={
                      isMintEditorial
                        ? 'w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors'
                        : `w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors ${
                            isDone
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : isCurrent
                                ? 'bg-white border-emerald-600 text-emerald-600'
                                : 'bg-white border-gray-300 text-gray-400'
                          }`
                    }
                    style={
                      isMintEditorial
                        ? {
                            background: isDone
                              ? 'var(--me-brand)'
                              : isCurrent
                                ? 'var(--me-brand-soft)'
                                : 'var(--me-surface)',
                            borderColor: isDone
                              ? 'var(--me-brand)'
                              : isCurrent
                                ? 'var(--me-brand)'
                                : 'var(--me-line)',
                            color: isDone
                              ? 'var(--me-on-brand)'
                              : isCurrent
                                ? 'var(--me-brand)'
                                : 'var(--me-ink-3)',
                          }
                        : undefined
                    }
                  >
                    {isDone ? (
                      <Check className='w-5 h-5' strokeWidth={2.25} />
                    ) : (
                      s.number
                    )}
                  </div>
                  <span
                    className={
                      isMintEditorial
                        ? 'text-xs mt-1 font-medium'
                        : `text-xs mt-1 font-medium ${
                            step >= s.number
                              ? 'text-emerald-600'
                              : 'text-gray-400'
                          }`
                    }
                    style={
                      isMintEditorial
                        ? {
                            color:
                              step >= s.number
                                ? 'var(--me-brand)'
                                : 'var(--me-ink-3)',
                          }
                        : undefined
                    }
                  >
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={
                      isMintEditorial
                        ? 'h-0.5 w-16 mb-5 transition-colors'
                        : `h-0.5 w-16 mb-5 transition-colors ${isDone ? 'bg-emerald-600' : 'bg-gray-200'}`
                    }
                    style={
                      isMintEditorial
                        ? {
                            background: isDone
                              ? 'var(--me-brand)'
                              : 'var(--me-line)',
                          }
                        : undefined
                    }
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Step content */}
        <div
          className={
            isMintEditorial
              ? 'card card-pad'
              : 'bg-white rounded-2xl shadow-sm border border-gray-200 p-8'
          }
        >
          {step === 1 && (
            <BusinessInfoStep
              data={formData.business}
              onNext={(data) => handleNext({ business: data })}
              saving={saving}
              isMintEditorial={isMintEditorial}
            />
          )}
          {step === 2 && (
            <SkillsStep
              data={formData.skills}
              onNext={(data) => handleNext({ skills: data })}
              onBack={handleBack}
              saving={saving}
              isMintEditorial={isMintEditorial}
            />
          )}
          {step === 3 && (
            <ServiceAreaStep
              data={formData.serviceArea}
              onNext={(data) => handleNext({ serviceArea: data })}
              onBack={handleBack}
              saving={saving}
              isMintEditorial={isMintEditorial}
            />
          )}
          {step === 4 && (
            <PaymentSetupStep
              onFinish={() => handleFinish({})}
              onBack={handleBack}
              userId={user?.id ?? ''}
              saving={saving}
              isMintEditorial={isMintEditorial}
            />
          )}
        </div>

        {/* Skip link */}
        <p
          className={
            isMintEditorial
              ? 'text-center text-sm mt-6'
              : 'text-center text-sm text-gray-400 mt-6'
          }
          style={isMintEditorial ? { color: 'var(--me-ink-3)' } : undefined}
        >
          <button
            onClick={() => router.push('/contractor/dashboard-enhanced')}
            className='underline hover:text-gray-600 transition-colors'
            style={isMintEditorial ? { color: 'var(--me-ink-2)' } : undefined}
          >
            Skip for now — I&apos;ll complete this later
          </button>
        </p>
      </div>
    </div>
  );
}
