'use client';

import { useEffect } from 'react';

/**
 * Hook to show subscription expired reminder when user tries to perform actions
 * This should be used in components where users can perform actions that require subscription
 */
export function useSubscriptionExpiredReminder(
  isExpired: boolean,
  onActionAttempt?: () => void
) {
  useEffect(() => {
    if (!isExpired) return;

    const handleUserAction = (event: MouseEvent | KeyboardEvent) => {
      const target = event.target as HTMLElement;
      
      // Check if user clicked on an interactive element (button, link, form input, etc.)
      const isInteractiveElement = 
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.closest('button') ||
        target.closest('a') ||
        target.closest('form');

      // Don't trigger on dismiss/subscribe buttons
      const isSubscriptionAction = 
        target.closest('[href*="/contractor/subscription"]') ||
        target.closest('[data-dismiss-reminder]');

      if (isInteractiveElement && !isSubscriptionAction) {
        // Check if reminder should be shown
        const today = new Date().toDateString();
        const lastShownDate = localStorage.getItem('subscription_expired_reminder_date');
        const wasShown = localStorage.getItem('subscription_expired_reminder_shown') === 'true';

        // Only trigger if not shown today
        if (!wasShown || lastShownDate !== today) {
          onActionAttempt?.();
          
          // Dispatch custom event to show reminder
          window.dispatchEvent(new CustomEvent('show-subscription-reminder'));
        }
      }
    };

    // Add event listeners
    document.addEventListener('click', handleUserAction);
    document.addEventListener('keydown', handleUserAction);

    return () => {
      document.removeEventListener('click', handleUserAction);
      document.removeEventListener('keydown', handleUserAction);
    };
  }, [isExpired, onActionAttempt]);
}

