'use client';
import React from 'react';
import Link from 'next/link';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { EarlyAccessSummary } from './EarlyAccessSummary';
import { TutorialSpotlight } from './TutorialSpotlight';

interface Props {
  children: React.ReactNode;
  userId?: string;
  userType?: 'homeowner' | 'contractor';
  autoStart?: boolean;
  audience?: 'contractor' | 'team-member';
}
export function OnboardingWrapper(props: Props) {
  const { user } = useCurrentUser();
  const userId = props.userId ?? user?.id;
  if (!userId) return <>{props.children}</>;
  return (
    <AccountOnboarding
      key={`${userId}:${props.audience ?? props.userType}`}
      {...props}
      userId={userId}
    />
  );
}
function AccountOnboarding({
  children,
  userId,
  userType = 'homeowner',
  autoStart = false,
  audience,
}: Props & { userId: string }) {
  const tour = useOnboarding({ userId, userType, autoStart, audience });
  return (
    <>
      <div
        data-theme='mint-editorial'
        className='me-root flex flex-wrap items-center gap-3 px-4 py-3 text-sm'
      >
        <Link
          className='underline'
          href={
            audience === 'team-member'
              ? '/getting-started?persona=team-member'
              : '/getting-started'
          }
        >
          Getting started — all feature guides
        </Link>
        <button
          type='button'
          className='underline'
          onClick={() => void tour.startOnboarding()}
        >
          Replay quick tour
        </button>
        {userType === 'contractor' && audience !== 'team-member' && (
          <Link className='underline' href='/contractor/onboarding'>
            Finish business setup
          </Link>
        )}
        {tour.error && (
          <span role='status'>
            {tour.error}{' '}
            <button
              type='button'
              className='underline'
              onClick={() => void tour.retry()}
            >
              Retry
            </button>
          </span>
        )}
      </div>
      <div data-theme='mint-editorial' className='me-root'>
        <EarlyAccessSummary userId={userId} role={userType} />
      </div>
      {children}
      {tour.isActive && (
        <TutorialSpotlight
          step={tour.currentStep}
          stepIndex={tour.currentStepIndex}
          totalSteps={tour.totalSteps}
          isFirstStep={tour.isFirstStep}
          isLastStep={tour.isLastStep}
          onNext={() => void tour.completeStep()}
          onComplete={() => void tour.completeStep()}
          onPrevious={() => void tour.previousStep()}
          onSkip={() => void tour.skip()}
        />
      )}
    </>
  );
}
