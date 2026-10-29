'use client';
import React, { createContext, useContext } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, Play, X } from 'lucide-react';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { EarlyAccessSummary } from './EarlyAccessSummary';
import { TutorialSpotlight } from './TutorialSpotlight';
import styles from './Onboarding.module.css';

interface Props {
  children: React.ReactNode;
  userId?: string;
  userType?: 'homeowner' | 'contractor';
  autoStart?: boolean;
  audience?: 'contractor' | 'team-member';
}
const OnboardingContext = createContext<{
  tour: ReturnType<typeof useOnboarding>;
  userId: string;
  userType: 'homeowner' | 'contractor';
  audience?: Props['audience'];
} | null>(null);

export function OnboardingWrapper(props: Props) {
  // Server-rendered dashboards already know the user; avoid a second auth request.
  if (props.userId)
    return (
      <AccountOnboarding
        key={`${props.userId}:${props.audience ?? props.userType}`}
        {...props}
        userId={props.userId}
      />
    );
  return <CurrentAccountOnboarding {...props} />;
}
function CurrentAccountOnboarding(props: Props) {
  const { user } = useCurrentUser();
  return user ? (
    <AccountOnboarding
      key={`${user.id}:${props.audience ?? props.userType}`}
      {...props}
      userId={user.id}
    />
  ) : (
    <>{props.children}</>
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
    <OnboardingContext.Provider value={{ tour, userId, userType, audience }}>
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
    </OnboardingContext.Provider>
  );
}

/** Render inside the dashboard content, never ahead of its navigation shell. */
export function DashboardOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) return null;
  const { tour, userId, userType, audience } = context;
  const showIntroduction =
    tour.loaded &&
    tour.progress?.status !== 'completed' &&
    tour.progress?.status !== 'skipped';
  const guideHref =
    audience === 'team-member'
      ? '/getting-started?persona=team-member'
      : '/getting-started';
  return (
    <aside
      data-theme='mint-editorial'
      className={styles.panel}
      aria-label='Getting started'
    >
      {showIntroduction && (
        <>
          <div className={styles.guideRow}>
            <button
              type='button'
              className={styles.dismiss}
              aria-label='Dismiss getting started'
              onClick={() => void tour.skip()}
            >
              <X size={16} aria-hidden='true' />
            </button>
            <span className={styles.icon}>
              <BookOpen size={20} aria-hidden='true' />
            </span>
            <div className={styles.copy}>
              <h2 className={styles.panelTitle}>
                {audience === 'team-member'
                  ? 'Get to know your workspace'
                  : userType === 'contractor'
                    ? 'Build your business with Mintenance'
                    : 'Make yourself at home'}
              </h2>
              <p className={styles.caption}>
                {audience === 'team-member'
                  ? 'Your guide to jobs, schedules and working with your team.'
                  : userType === 'contractor'
                    ? 'Get set up, find work and manage your business.'
                    : 'A little guidance for your next home project.'}
              </p>
            </div>
            <div className={styles.actions}>
              <button
                type='button'
                className={styles.secondary}
                onClick={() => void tour.startOnboarding()}
              >
                <Play size={14} aria-hidden='true' /> Quick tour
              </button>
              <Link className={styles.primary} href={guideHref}>
                Getting started <ArrowRight size={15} aria-hidden='true' />
              </Link>
            </div>
          </div>
          {userType === 'contractor' && audience === 'contractor' && (
            <Link className={styles.setupLink} href='/contractor/onboarding'>
              Finish business setup <ArrowRight size={14} aria-hidden='true' />
            </Link>
          )}
          {tour.error && (
            <details className={styles.syncDetails}>
              <summary>Account progress unavailable</summary>
              <div role='status'>
                {tour.error}{' '}
                <button
                  type='button'
                  className={styles.textButton}
                  onClick={() => void tour.retry()}
                >
                  Retry sync
                </button>
              </div>
            </details>
          )}
        </>
      )}
      <EarlyAccessSummary userId={userId} role={userType} compact />
    </aside>
  );
}
