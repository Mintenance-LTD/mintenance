'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { theme } from '@/lib/theme';
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, X } from 'lucide-react';

interface SubscriptionExpiredReminderProps {
  daysRemaining: number;
  trialEndsAt: Date | null;
}

const STORAGE_KEY = 'subscription_expired_reminder_shown';
const STORAGE_KEY_DATE = 'subscription_expired_reminder_date';

export function SubscriptionExpiredReminder({ daysRemaining, trialEndsAt }: SubscriptionExpiredReminderProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Check if subscription is expired
  const isExpired = daysRemaining <= 0;

  useEffect(() => {
    if (!isExpired) {
      return;
    }

    // Check if reminder was shown today
    const checkIfShownToday = () => {
      if (typeof window === 'undefined') return false;

      const today = new Date().toDateString();
      const lastShownDate = localStorage.getItem(STORAGE_KEY_DATE);
      const wasShown = localStorage.getItem(STORAGE_KEY) === 'true';

      // If shown today, don't show again
      if (wasShown && lastShownDate === today) {
        return false;
      }

      // If it's a new day, reset the flag
      if (lastShownDate !== today) {
        localStorage.removeItem(STORAGE_KEY);
        return true;
      }

      return !wasShown;
    };

    // Listen for user actions (clicks, form submissions, etc.)
    const handleUserAction = (event: MouseEvent | KeyboardEvent) => {
      const target = event.target as HTMLElement;

      // Check if user clicked on an interactive element
      const isInteractiveElement =
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.closest('button') ||
        target.closest('a') ||
        target.closest('form') ||
        target.closest('[role="button"]');

      // Don't trigger on dismiss/subscribe buttons or links
      const isSubscriptionAction =
        target.closest('[href*="/contractor/subscription"]') ||
        target.closest('[data-dismiss-reminder]') ||
        target.closest('[data-subscription-action]');

      // Don't trigger on the reminder itself
      const isReminderElement = target.closest('[data-subscription-reminder]');

      if (isInteractiveElement && !isSubscriptionAction && !isReminderElement) {
        // Only show if not shown today
        if (checkIfShownToday() && !isVisible && !isDismissed) {
          setIsVisible(true);
        }
      }
    };

    // Add event listeners for user actions
    document.addEventListener('click', handleUserAction, true);
    document.addEventListener('keydown', (e) => {
      // Trigger on Enter key in forms
      if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') {
        handleUserAction(e);
      }
    }, true);

    return () => {
      document.removeEventListener('click', handleUserAction, true);
      document.removeEventListener('keydown', handleUserAction, true);
    };
  }, [isExpired, isVisible, isDismissed]);

  const handleDismiss = () => {
    setIsDismissed(true);
    setIsVisible(false);

    // Mark as shown today
    if (typeof window !== 'undefined') {
      const today = new Date().toDateString();
      localStorage.setItem(STORAGE_KEY, 'true');
      localStorage.setItem(STORAGE_KEY_DATE, today);
    }
  };

  const handleSubscribeClick = () => {
    // Mark as shown when user clicks subscribe
    handleDismiss();
  };

  // Don't render if not expired or not visible
  if (!isExpired || !isVisible || isDismissed) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div
        data-subscription-reminder
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          zIndex: 9998,
          animation: 'fadeIn 0.2s ease-in-out',
        }}
        onClick={handleDismiss}
      />

      {/* Floating Reminder */}
      <div
        data-subscription-reminder
        style={{
          position: 'fixed',
          bottom: theme.spacing[6],
          right: theme.spacing[6],
          left: 'auto',
          zIndex: 9999,
          maxWidth: '400px',
          width: 'calc(100% - 48px)',
          animation: 'slideUp 0.3s ease-out',
        }}
      >
        <div
          data-subscription-reminder
          style={{
            padding: theme.spacing[4],
            borderRadius: theme.borderRadius.xl,
            border: `2px solid ${theme.colors.error}`,
            backgroundColor: 'rgba(255, 59, 48, 0.082)',
            boxShadow: theme.shadows.xl,
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing[3],
            position: 'relative',
          }}
        >
          {/* Close Button */}
          <Button
            data-dismiss-reminder
            onClick={handleDismiss}
            aria-label="Dismiss reminder"
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 w-8 h-8 p-0 rounded-full hover:bg-red-100"
          >
            <X className="h-4 w-4 text-red-600" />
          </Button>

          {/* Content */}
          <Alert variant="destructive" className="border-2">
            <AlertTriangle className="h-5 w-5" />
            <AlertDescription className="flex flex-col gap-3">
              <div>
                <p className="font-semibold mb-1">Your trial has expired</p>
                <p className="text-sm">
                  Please subscribe to continue using the platform.
                </p>
              </div>
              <Link
                data-subscription-action
                href="/contractor/subscription"
                onClick={handleSubscribeClick}
              >
                <Button variant="destructive" size="sm" fullWidth>
                  Subscribe Now
                </Button>
              </Link>
            </AlertDescription>
          </Alert>
        </div>
      </div>

      {/* Animations */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }
          
          @keyframes slideUp {
            from {
              transform: translateY(20px);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }
          
          @media (max-width: 640px) {
            [data-subscription-reminder] {
              bottom: ${theme.spacing[4]}px !important;
              right: ${theme.spacing[4]}px !important;
              left: ${theme.spacing[4]}px !important;
              width: calc(100% - ${parseInt(String(theme.spacing[4])) * 2}px) !important;
              max-width: 100% !important;
            }
          }
        `
      }} />
    </>
  );
}

