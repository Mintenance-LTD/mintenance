'use client';

import React from 'react';
import { TutorialTooltip } from './TutorialTooltip';
import { useOnboardingTooltips, type TooltipConfig } from '@/hooks/useOnboardingTooltips';

interface TooltipManagerProps {
  tooltips: TooltipConfig[];
  enabled: boolean;
  onComplete?: () => void;
}

export function TooltipManager({ tooltips, enabled, onComplete }: TooltipManagerProps) {
  const { currentTooltip, isActive, nextTooltip, dismissTooltip } = useOnboardingTooltips(
    tooltips,
    enabled
  );

  React.useEffect(() => {
    if (!isActive && onComplete) {
      onComplete();
    }
  }, [isActive, onComplete]);

  if (!currentTooltip || !isActive) {
    return null;
  }

  const currentIndex = tooltips.findIndex(t => t.id === currentTooltip.id);

  return (
    <TutorialTooltip
      targetId={currentTooltip.targetId}
      title={currentTooltip.title}
      description={currentTooltip.description}
      position={currentTooltip.position || 'bottom'}
      isVisible={true}
      onNext={nextTooltip}
      onDismiss={dismissTooltip}
      stepNumber={currentIndex + 1}
      totalSteps={tooltips.length}
    />
  );
}

