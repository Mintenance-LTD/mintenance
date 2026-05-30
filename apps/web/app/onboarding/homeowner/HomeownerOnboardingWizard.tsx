'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { fetchWithCsrf } from '@/lib/csrf-client';
import { PropertyTypeStep } from './steps/PropertyTypeStep';
import { ConcernsStep } from './steps/ConcernsStep';
import { WelcomeStep } from './steps/WelcomeStep';

/**
 * Single-route, three-step homeowner onboarding wizard.
 *
 * 2026-05-25 audit-P0-2 — mirrors the mobile HomeownerSetupModal +
 * WelcomeFirstJobModal flow so web sign-ups capture the same
 * property_type + concern_tags + flip onboarding_completed. Skipping
 * does NOT flip the flag (parity with mobile's AsyncStorage-only
 * dismissal). The /onboarding/homeowner server page redirects already
 * onboarded users to /dashboard so refreshes here are idempotent.
 */

export type PropertyType =
  | 'house'
  | 'flat'
  | 'bungalow'
  | 'maisonette'
  | 'other';

interface Props {
  firstName: string | null;
}

export function HomeownerOnboardingWizard({ firstName }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [propertyType, setPropertyType] = useState<PropertyType | null>(null);
  const [concerns, setConcerns] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  function handleSkip() {
    // Mobile parity: skip does NOT flip onboarding_completed.
    // The user can be re-prompted by a future dashboard banner if we
    // ever add one — for now, the wizard just gets out of their way.
    router.push('/dashboard');
  }

  async function handleFinish() {
    setSaving(true);
    try {
      const res = await fetchWithCsrf('/api/homeowner/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyType,
          concernTags: concerns,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? 'Save failed');
      }

      toast.success("You're all set up.");
      setStep(3);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Could not save your answers — please try again.'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className='me-root mx-auto min-h-screen max-w-2xl px-4 py-10 sm:px-6 sm:py-16'>
      {step === 1 && (
        <PropertyTypeStep
          value={propertyType}
          onChange={setPropertyType}
          onNext={() => setStep(2)}
          onSkip={handleSkip}
        />
      )}

      {step === 2 && (
        <ConcernsStep
          value={concerns}
          onChange={setConcerns}
          onBack={() => setStep(1)}
          onFinish={handleFinish}
          onSkip={handleSkip}
          saving={saving}
        />
      )}

      {step === 3 && <WelcomeStep firstName={firstName} />}
    </main>
  );
}
