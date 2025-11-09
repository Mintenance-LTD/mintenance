'use client';

import { useState, useEffect, useCallback } from 'react';

export interface TooltipConfig {
  id: string;
  targetId: string;
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export interface TooltipState {
  currentTooltipIndex: number;
  dismissedTooltips: Set<string>;
  isActive: boolean;
}

export function useOnboardingTooltips(
  tooltips: TooltipConfig[],
  enabled: boolean
) {
  const [state, setState] = useState<TooltipState>({
    currentTooltipIndex: 0,
    dismissedTooltips: new Set(),
    isActive: false,
  });

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    if (enabled && tooltips.length > 0) {
      // Load dismissed tooltips from localStorage
      try {
        const stored = localStorage.getItem('onboarding_tooltips_dismissed');
        const dismissed = stored ? new Set<string>(JSON.parse(stored)) : new Set<string>();
        
        setState({
          currentTooltipIndex: 0,
          dismissedTooltips: dismissed,
          isActive: true,
        });
      } catch (error) {
        // If localStorage fails, start fresh
        setState({
          currentTooltipIndex: 0,
          dismissedTooltips: new Set(),
          isActive: true,
        });
      }
    } else {
      setState(prev => ({ ...prev, isActive: false }));
    }
  }, [enabled, tooltips.length]);

  const getCurrentTooltip = useCallback((): TooltipConfig | null => {
    if (!state.isActive || tooltips.length === 0) return null;
    
    // Find first tooltip that hasn't been dismissed
    const availableTooltips = tooltips.filter(t => !state.dismissedTooltips.has(t.id));
    if (availableTooltips.length === 0) return null;
    
    return availableTooltips[0];
  }, [state, tooltips]);

  const nextTooltip = useCallback(() => {
    setState(prev => {
      const current = getCurrentTooltip();
      if (!current) {
        return { ...prev, isActive: false };
      }

      const newDismissed = new Set(prev.dismissedTooltips);
      newDismissed.add(current.id);
      
      // Save to localStorage (only on client)
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('onboarding_tooltips_dismissed', JSON.stringify([...newDismissed]));
        } catch (error) {
          // Ignore localStorage errors
        }
      }

      // Check if there are more tooltips
      const remaining = tooltips.filter(t => !newDismissed.has(t.id));
      if (remaining.length === 0) {
        return {
          currentTooltipIndex: 0,
          dismissedTooltips: newDismissed,
          isActive: false,
        };
      }

      return {
        currentTooltipIndex: prev.currentTooltipIndex + 1,
        dismissedTooltips: newDismissed,
        isActive: true,
      };
    });
  }, [tooltips, getCurrentTooltip]);

  const dismissTooltip = useCallback(() => {
    nextTooltip();
  }, [nextTooltip]);

  const dismissAll = useCallback(() => {
    const allIds = tooltips.map(t => t.id);
    const newDismissed = new Set(allIds);
    
    // Save to localStorage (only on client)
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('onboarding_tooltips_dismissed', JSON.stringify([...newDismissed]));
      } catch (error) {
        // Ignore localStorage errors
      }
    }
    
    setState({
      currentTooltipIndex: 0,
      dismissedTooltips: newDismissed,
      isActive: false,
    });
  }, [tooltips]);

  return {
    currentTooltip: getCurrentTooltip(),
    isActive: state.isActive,
    nextTooltip,
    dismissTooltip,
    dismissAll,
  };
}

