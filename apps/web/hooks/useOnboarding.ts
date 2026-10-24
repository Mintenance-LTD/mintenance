'use client';
import { useJourneyProgress } from './useJourneyProgress';
import { getFlowByUserType } from '@/lib/onboarding/flows';
import { guidesForPersona } from '@mintenance/shared';

export function useOnboarding({
  userId,
  userType = 'homeowner',
  autoStart = false,
  audience,
}: {
  userId: string;
  userType?: 'homeowner' | 'contractor';
  autoStart?: boolean;
  audience?: 'contractor' | 'team-member';
}) {
  const flow = getFlowByUserType(userType);
  if (audience === 'team-member')
    flow.steps = guidesForPersona('team-member')
      .filter((g) =>
        [
          'team-member',
          'calendar',
          'trade-messages',
          'evidence',
          'time',
        ].includes(g.id)
      )
      .map((g) => ({
        id: g.id,
        title: g.title,
        description: g.steps.join(' '),
        href: g.href,
        skippable: true,
      }));
  const journey = useJourneyProgress(userId, `intro-${audience ?? userType}`);
  const index = Math.min(journey.progress?.step ?? 0, flow.steps.length - 1);
  const active =
    journey.loaded &&
    (journey.progress?.status === 'in_progress' ||
      (!journey.progress && autoStart));
  return {
    ...journey,
    flow,
    isActive: active,
    currentStep: flow.steps[index],
    currentStepIndex: index,
    totalSteps: flow.steps.length,
    isFirstStep: index === 0,
    isLastStep: index === flow.steps.length - 1,
    completeStep: () =>
      journey.save({
        status: index === flow.steps.length - 1 ? 'completed' : 'in_progress',
        step: Math.min(index + 1, flow.steps.length - 1),
      }),
    previousStep: () =>
      journey.save({ status: 'in_progress', step: Math.max(0, index - 1) }),
    skip: () => journey.save({ status: 'skipped', step: index }),
    startOnboarding: () => journey.save({ status: 'in_progress', step: 0 }),
  };
}
