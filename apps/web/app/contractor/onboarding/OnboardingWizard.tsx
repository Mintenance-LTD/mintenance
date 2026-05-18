'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Check, Lightbulb } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  BusinessInfoStep,
  type BusinessInfoData,
} from './steps/BusinessInfoStep';
import { SkillsStep, type SkillsData } from './steps/SkillsStep';
import { ServiceAreaStep, type ServiceAreaData } from './steps/ServiceAreaStep';
import { PaymentSetupStep } from './steps/PaymentSetupStep';

/**
 * Contractor onboarding wizard — Direction A · Mint Editorial.
 *
 * 2026-05-13 design-system rebuild. Source of truth:
 * `mintenance-design-system/project/redesign-v2/auth.html`
 * (WebOnboarding). Converted from the old centred single-column
 * wizard to the spec's left-rail layout: a numbered step list +
 * "why we ask" card on the left, the active step in the centre.
 *
 * Renders unconditionally under `data-theme="mint-editorial"` +
 * `.me-root` — Mint Editorial is the default now, no cookie gate.
 * The step components still receive `isMintEditorial` (always true)
 * until their own legacy branches are collapsed in a later pass.
 */

interface StepDef {
  number: number;
  label: string;
  title: string;
  blurb: string;
}

const STEPS: StepDef[] = [
  {
    number: 1,
    label: 'Business info',
    title: 'Tell us about your business',
    blurb: 'The basics homeowners see when they compare contractors.',
  },
  {
    number: 2,
    label: 'Skills',
    title: 'What can you take on?',
    blurb:
      'Pick your trades — we match jobs from here. Add a licence and insurer to build trust.',
  },
  {
    number: 3,
    label: 'Service area',
    title: 'Where do you work?',
    blurb: 'Set the area you cover so we only send you reachable jobs.',
  },
  {
    number: 4,
    label: 'Get paid',
    title: 'Set up payments',
    blurb: 'Connect a payout account so released escrow reaches you fast.',
  },
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

/** Brand leaf mark — the real Mintenance logo (public/assets/logo-mark.png). */
function LeafMark({ size = 22 }: { size?: number }) {
  return (
    <Image
      src='/assets/logo-mark.png'
      alt='Mintenance'
      width={size}
      height={size}
      priority
      style={{ display: 'block', objectFit: 'contain' }}
    />
  );
}

export function OnboardingWizard() {
  const router = useRouter();
  const { user } = useCurrentUser();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<OnboardingFormData>(INITIAL_DATA);
  const [saving, setSaving] = useState(false);

  /**
   * 2026-05-13 onboarding audit fix: the wizard previously POSTed to
   * `/api/profiles/update`, which never existed — every save returned
   * 404 and the catch block silently swallowed it, so the contractor
   * advanced through the wizard but nothing persisted. Now points at
   * the dedicated step-aware endpoint that routes per-step writes to
   * profiles + contractor_skills.
   */
  async function saveStep(patch: Partial<OnboardingFormData>) {
    const merged = { ...formData, ...patch };
    setFormData(merged);

    const body = buildProfilePatch(merged, step);
    if (!body) {
      // No-op step (e.g. step 4 has no direct payload — handleFinish
      // sends its own `step=finish` request).
      return true;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/contractor/onboarding/save', {
        method: 'POST',
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

  function buildProfilePatch(
    data: OnboardingFormData,
    currentStep: number
  ): Record<string, unknown> | null {
    if (currentStep === 1) {
      const parsed = parseInt(data.business.yearsExperience, 10);
      return {
        step: 'business',
        business_name: data.business.businessName,
        phone: data.business.phoneNumber,
        years_experience: Number.isFinite(parsed) ? parsed : null,
        bio: data.business.bio,
      };
    }
    if (currentStep === 2) {
      return {
        step: 'skills',
        skills: data.skills.selectedSkills,
        license_number: data.skills.licenseNumber,
        insurance_provider: data.skills.insuranceProvider,
      };
    }
    if (currentStep === 3) {
      const radius = parseInt(data.serviceArea.radiusMiles, 10);
      return {
        step: 'serviceArea',
        service_radius_miles: Number.isFinite(radius) ? radius : 10,
        service_postcode: data.serviceArea.postcode,
      };
    }
    return null;
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
    // Step 4 (Get Paid) has no direct payload — Stripe Connect onboarding
    // happens inside PaymentSetupStep against its own endpoint. Once
    // the contractor lands here, we just need to mark onboarding
    // complete so the welcome banners + onboarding gates disappear.
    const ok = await saveStep(patch);
    if (!ok) return;

    setSaving(true);
    try {
      const res = await fetch('/api/contractor/onboarding/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 'finish' }),
      });
      if (!res.ok) throw new Error('Finish failed');
    } catch {
      toast.error(
        'Could not finalise onboarding — please retry, or skip to the dashboard.'
      );
      setSaving(false);
      return;
    }
    setSaving(false);
    toast.success('Profile set up! Welcome to Mintenance.');
    router.push('/contractor/dashboard-enhanced');
  }

  const current = STEPS[step - 1];

  return (
    <div
      data-theme='mint-editorial'
      className='me-root'
      style={{ display: 'flex', minHeight: '100vh' }}
    >
      {/* ── Left rail — step list ───────────────────────────────── */}
      <aside
        className='onboarding-rail'
        style={{
          width: 320,
          flexShrink: 0,
          background: 'var(--me-bg-2)',
          borderRight: '1px solid var(--me-line)',
          padding: '40px 32px',
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 36,
          }}
        >
          <span
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'var(--me-surface)',
              border: '1px solid var(--me-line)',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <LeafMark />
          </span>
          <span
            style={{
              fontFamily: 'var(--me-font-display)',
              fontSize: 22,
              letterSpacing: '-0.01em',
              color: 'var(--me-ink)',
            }}
          >
            Mintenance
          </span>
        </div>

        <div className='t-eyebrow' style={{ marginBottom: 18 }}>
          Setup · {step} of {STEPS.length}
        </div>

        {STEPS.map((s) => {
          const isDone = step > s.number;
          const isActive = step === s.number;
          return (
            <div
              key={s.number}
              style={{
                display: 'flex',
                gap: 12,
                padding: '12px 0',
                borderTop: s.number === 1 ? 0 : '1px solid var(--me-line-2)',
              }}
            >
              <span
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 9999,
                  flexShrink: 0,
                  display: 'grid',
                  placeItems: 'center',
                  fontWeight: 600,
                  fontSize: 12,
                  background: isDone
                    ? 'var(--me-brand)'
                    : isActive
                      ? 'var(--me-ink)'
                      : 'var(--me-bg-3)',
                  color:
                    isDone || isActive
                      ? 'var(--me-on-brand)'
                      : 'var(--me-ink-3)',
                }}
              >
                {isDone ? (
                  <Check className='w-3.5 h-3.5' strokeWidth={2.5} />
                ) : (
                  s.number
                )}
              </span>
              <div>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 14,
                    color: isActive ? 'var(--me-ink)' : 'var(--me-ink-2)',
                  }}
                >
                  {s.label}
                </div>
                <div style={{ fontSize: 12, color: 'var(--me-ink-3)' }}>
                  {isDone ? 'Complete' : isActive ? 'In progress' : 'Pending'}
                </div>
              </div>
            </div>
          );
        })}

        {/* Why we ask */}
        <div className='card' style={{ marginTop: 32, padding: 14 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              marginBottom: 4,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Lightbulb size={13} color='var(--me-brand)' aria-hidden='true' />
            Why we ask
          </div>
          <div
            style={{
              fontSize: 12,
              color: 'var(--me-ink-2)',
              lineHeight: 1.5,
            }}
          >
            Contractors with a complete profile — trades, licence and service
            area — get noticeably more job invites in their first month.
          </div>
        </div>
      </aside>

      {/* ── Centre — active step ────────────────────────────────── */}
      <main
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '56px 48px',
          background: 'var(--me-bg)',
        }}
      >
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          {/* Mobile progress — the rail is hidden below 1024px */}
          <div
            className='onboarding-mobile-progress'
            style={{ display: 'none', marginBottom: 24 }}
          >
            <div className='t-eyebrow' style={{ marginBottom: 8 }}>
              Step {step} of {STEPS.length}
            </div>
            <div
              style={{
                height: 4,
                borderRadius: 9999,
                background: 'var(--me-bg-3)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${(step / STEPS.length) * 100}%`,
                  background: 'var(--me-brand)',
                  transition: 'width .2s ease',
                }}
              />
            </div>
          </div>

          <h1 className='t-h1' style={{ marginBottom: 6 }}>
            {current.title}
          </h1>
          <p
            className='t-body'
            style={{ marginBottom: 28, color: 'var(--me-ink-2)' }}
          >
            {current.blurb}
          </p>

          <div className='card card-pad'>
            {step === 1 && (
              <BusinessInfoStep
                data={formData.business}
                onNext={(data) => handleNext({ business: data })}
                saving={saving}
                isMintEditorial
              />
            )}
            {step === 2 && (
              <SkillsStep
                data={formData.skills}
                onNext={(data) => handleNext({ skills: data })}
                onBack={handleBack}
                saving={saving}
                isMintEditorial
              />
            )}
            {step === 3 && (
              <ServiceAreaStep
                data={formData.serviceArea}
                onNext={(data) => handleNext({ serviceArea: data })}
                onBack={handleBack}
                saving={saving}
                isMintEditorial
              />
            )}
            {step === 4 && (
              <PaymentSetupStep
                onFinish={() => handleFinish({})}
                onBack={handleBack}
                userId={user?.id ?? ''}
                saving={saving}
                isMintEditorial
              />
            )}
          </div>

          {/* Skip link */}
          <p
            style={{
              textAlign: 'center',
              fontSize: 13,
              marginTop: 24,
              color: 'var(--me-ink-3)',
            }}
          >
            <button
              type='button'
              onClick={() => router.push('/contractor/dashboard-enhanced')}
              style={{
                background: 'transparent',
                border: 0,
                cursor: 'pointer',
                color: 'var(--me-ink-2)',
                textDecoration: 'underline',
                font: 'inherit',
              }}
            >
              Skip for now — I&apos;ll complete this later
            </button>
          </p>
        </div>
      </main>

      {/* Responsive: hide the rail on small screens, show the inline
          progress bar instead. Scoped to the onboarding-only classes. */}
      <style>{`
        @media (max-width: 1023px) {
          .onboarding-rail { display: none !important; }
          .onboarding-mobile-progress { display: block !important; }
        }
      `}</style>
    </div>
  );
}
