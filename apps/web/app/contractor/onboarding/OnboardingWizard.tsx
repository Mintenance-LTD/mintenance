'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle } from 'lucide-react';
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
    <div className='min-h-screen bg-gray-50 flex flex-col items-center justify-start py-10 px-4'>
      <div className='w-full max-w-2xl'>
        {/* Header */}
        <div className='text-center mb-8'>
          <h1 className='text-3xl font-bold text-gray-900'>
            Set Up Your Account
          </h1>
          <p className='text-gray-500 mt-2'>
            Complete these steps to start receiving job opportunities.
          </p>
        </div>

        {/* Step indicator */}
        <div className='flex items-center justify-center mb-8 gap-0'>
          {STEPS.map((s, i) => (
            <React.Fragment key={s.number}>
              <div className='flex flex-col items-center'>
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors ${
                    step > s.number
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : step === s.number
                        ? 'bg-white border-emerald-600 text-emerald-600'
                        : 'bg-white border-gray-300 text-gray-400'
                  }`}
                >
                  {step > s.number ? (
                    <CheckCircle className='w-5 h-5' />
                  ) : (
                    s.number
                  )}
                </div>
                <span
                  className={`text-xs mt-1 font-medium ${step >= s.number ? 'text-emerald-600' : 'text-gray-400'}`}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`h-0.5 w-16 mb-5 transition-colors ${step > s.number ? 'bg-emerald-600' : 'bg-gray-200'}`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step content */}
        <div className='bg-white rounded-2xl shadow-sm border border-gray-200 p-8'>
          {step === 1 && (
            <BusinessInfoStep
              data={formData.business}
              onNext={(data) => handleNext({ business: data })}
              saving={saving}
            />
          )}
          {step === 2 && (
            <SkillsStep
              data={formData.skills}
              onNext={(data) => handleNext({ skills: data })}
              onBack={handleBack}
              saving={saving}
            />
          )}
          {step === 3 && (
            <ServiceAreaStep
              data={formData.serviceArea}
              onNext={(data) => handleNext({ serviceArea: data })}
              onBack={handleBack}
              saving={saving}
            />
          )}
          {step === 4 && (
            <PaymentSetupStep
              onFinish={() => handleFinish({})}
              onBack={handleBack}
              userId={user?.id ?? ''}
              saving={saving}
            />
          )}
        </div>

        {/* Skip link */}
        <p className='text-center text-sm text-gray-400 mt-6'>
          <button
            onClick={() => router.push('/contractor/dashboard-enhanced')}
            className='underline hover:text-gray-600 transition-colors'
          >
            Skip for now — I&apos;ll complete this later
          </button>
        </p>
      </div>
    </div>
  );
}
