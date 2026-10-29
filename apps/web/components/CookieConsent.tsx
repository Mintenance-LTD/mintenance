'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { logger } from '@/lib/logger';
import Link from 'next/link';
import {
  COOKIE_CONSENT_KEY,
  COOKIE_CONSENT_EVENT,
  COOKIE_PREFERENCES_EVENT,
} from '@/lib/analytics-consent';

interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  functional: boolean;
  marketing: boolean;
}

const STORAGE_KEY = COOKIE_CONSENT_KEY;
const CONSENT_VERSION = '2.0';

/**
 * GDPR-compliant cookie consent banner.
 *
 * - Shows on first visit (checks localStorage).
 * - Categories: Essential (always on), Analytics, Functional, Marketing.
 * - Persists choice to localStorage with timestamp and version.
 * - Accessible: role="dialog", aria-label, focus trap, keyboard navigable.
 * - Fixed to bottom of viewport; backdrop does not block scrolling.
 */
export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true,
    analytics: false,
    functional: false,
    marketing: false,
  });

  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);
  const lastFocusableRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const openPreferences = () => {
      let saved: Partial<CookiePreferences> = {};
      try {
        const record = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
        if (record?.version === CONSENT_VERSION)
          saved = record.preferences || {};
      } catch {
        // Missing or unreadable consent always defaults to optional categories off.
      }
      setPreferences({
        essential: true,
        analytics: saved.analytics === true,
        functional: saved.functional === true,
        marketing: saved.marketing === true,
      });
      setShowSettings(true);
      setShowBanner(true);
    };
    window.addEventListener(COOKIE_PREFERENCES_EVENT, openPreferences);
    return () =>
      window.removeEventListener(COOKIE_PREFERENCES_EVENT, openPreferences);
  }, []);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        const timer = setTimeout(() => {
          setShowBanner(true);
        }, 1000);
        return () => clearTimeout(timer);
      }
      // Check if stored consent version matches current
      try {
        const parsed = JSON.parse(stored);
        if (parsed.version !== CONSENT_VERSION) {
          const timer = setTimeout(() => {
            setShowBanner(true);
          }, 1000);
          return () => clearTimeout(timer);
        }
      } catch {
        // Corrupted data - show banner again
        const timer = setTimeout(() => {
          setShowBanner(true);
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  // Focus the dialog when it appears and trap focus within it
  useEffect(() => {
    if (!showBanner || !dialogRef.current) return;

    // Store the previously focused element to restore focus later
    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Focus the first focusable element in the dialog
    const timer = setTimeout(() => {
      firstFocusableRef.current?.focus();
    }, 100);

    return () => {
      clearTimeout(timer);
      // Restore focus when banner closes
      previouslyFocused?.focus?.();
    };
  }, [showBanner, showSettings]);

  // Focus trap: keep Tab/Shift+Tab within the dialog
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Escape does NOT dismiss the banner - GDPR requires explicit choice
        // But if the settings panel is open, close it to return to the main view
        if (showSettings) {
          setShowSettings(false);
        }
        return;
      }

      if (e.key !== 'Tab') return;

      const focusableElements =
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
        );
      if (!focusableElements || focusableElements.length === 0) return;

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [showSettings]
  );

  if (!mounted) return null;

  const savePreferences = (prefs: CookiePreferences) => {
    if (typeof window === 'undefined') return;

    const consentData = {
      preferences: prefs,
      timestamp: new Date().toISOString(),
      version: CONSENT_VERSION,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(consentData));
    window.dispatchEvent(new Event(COOKIE_CONSENT_EVENT));

    if (prefs.analytics) {
      logger.info('Analytics cookies enabled');
    }
    if (prefs.functional) {
      logger.info('Functional cookies enabled');
    }
    if (prefs.marketing) {
      logger.info('Marketing cookies enabled');
    }

    setShowBanner(false);
    setShowSettings(false);
  };

  const acceptAll = () => {
    savePreferences({
      essential: true,
      analytics: true,
      functional: true,
      marketing: true,
    });
  };

  const rejectNonEssential = () => {
    savePreferences({
      essential: true,
      analytics: false,
      functional: false,
      marketing: false,
    });
  };

  const saveCustomPreferences = () => {
    savePreferences(preferences);
  };

  if (!showBanner) return null;

  return (
    <>
      {/* Backdrop - does not block scrolling, purely visual */}
      <div className='fixed inset-0 bg-black/20 z-40' aria-hidden='true' />

      {/* Cookie Consent Dialog */}
      <div
        ref={dialogRef}
        role='dialog'
        aria-label='Cookie consent'
        aria-modal='true'
        aria-describedby='cookie-consent-description'
        className='fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-gray-200 shadow-2xl'
        onKeyDown={handleKeyDown}
      >
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
          {!showSettings ? (
            /* ---- Simple Banner View ---- */
            <div className='flex flex-col md:flex-row items-start md:items-center justify-between gap-4'>
              <div className='flex-1'>
                <h2 className='text-lg font-semibold text-primary-900 mb-2'>
                  We Use Cookies
                </h2>
                <p
                  id='cookie-consent-description'
                  className='text-sm text-gray-600'
                >
                  We use cookies to improve your experience on our site, analyse
                  traffic, and personalise content. Essential cookies are always
                  enabled. You can customise your preferences or accept all
                  cookies.{' '}
                  <Link
                    href='/cookies'
                    className='text-emerald-800 hover:underline font-medium'
                  >
                    Learn more in our Cookie Policy
                  </Link>
                </p>
              </div>
              <div className='flex flex-col sm:flex-row gap-3 w-full md:w-auto'>
                <button
                  ref={firstFocusableRef}
                  onClick={() => setShowSettings(true)}
                  className='px-6 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-emerald-800 focus:ring-offset-2'
                >
                  Manage Preferences
                </button>
                <button
                  onClick={rejectNonEssential}
                  className='px-6 py-2 border-2 border-emerald-800 text-emerald-800 rounded-lg font-medium hover:bg-emerald-800 hover:text-white transition-colors whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-emerald-800 focus:ring-offset-2'
                >
                  Reject Non-Essential
                </button>
                <button
                  ref={lastFocusableRef}
                  onClick={acceptAll}
                  className='px-6 py-2 bg-emerald-800 text-white rounded-lg font-medium hover:bg-emerald-900 transition-colors whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-emerald-800 focus:ring-offset-2'
                >
                  Accept All
                </button>
              </div>
            </div>
          ) : (
            /* ---- Detailed Settings View ---- */
            <div>
              <div className='flex items-center justify-between mb-6'>
                <h2 className='text-xl font-semibold text-primary-900'>
                  Cookie Preferences
                </h2>
                <button
                  ref={firstFocusableRef}
                  onClick={() => setShowSettings(false)}
                  className='text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-800 focus:ring-offset-2 rounded-lg p-1'
                  aria-label='Close preferences and return to cookie banner'
                >
                  <svg
                    className='w-6 h-6'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M6 18L18 6M6 6l12 12'
                    />
                  </svg>
                </button>
              </div>

              <div className='space-y-4 mb-6 max-h-[50vh] overflow-y-auto'>
                {/* Essential Cookies */}
                <fieldset className='bg-gray-50 rounded-lg p-4 border border-gray-200'>
                  <div className='flex items-start justify-between'>
                    <div className='flex-1'>
                      <legend className='font-semibold text-primary-900 mb-1'>
                        Essential Cookies
                      </legend>
                      <p className='text-sm text-gray-600'>
                        These cookies are necessary for the website to function
                        properly. They enable core functionality such as
                        security, network management, and accessibility. You
                        cannot opt out of these cookies.
                      </p>
                      <p className='text-xs text-gray-500 mt-2'>
                        Examples: Session management, authentication, security
                        features
                      </p>
                    </div>
                    <div className='ml-4 flex-shrink-0'>
                      <div className='flex items-center h-6'>
                        <input
                          id='cookie-essential'
                          type='checkbox'
                          checked={true}
                          disabled
                          aria-label='Essential cookies (always active)'
                          className='w-5 h-5 text-emerald-800 bg-gray-100 border-gray-300 rounded opacity-50 cursor-not-allowed'
                        />
                        <label
                          htmlFor='cookie-essential'
                          className='ml-2 text-sm font-medium text-gray-500'
                        >
                          Always Active
                        </label>
                      </div>
                    </div>
                  </div>
                </fieldset>

                {/* Analytics Cookies */}
                <fieldset className='bg-gray-50 rounded-lg p-4 border border-gray-200'>
                  <div className='flex items-start justify-between'>
                    <div className='flex-1'>
                      <legend className='font-semibold text-primary-900 mb-1'>
                        Analytics Cookies
                      </legend>
                      <p className='text-sm text-gray-600'>
                        Optional analytics help us understand how visitors use
                        the site. This includes Sentry session replay when
                        configured, with text and media masked. You can withdraw
                        this choice at any time in the cookie preferences.
                      </p>
                      <p className='text-xs text-gray-500 mt-2'>
                        Examples: Session replay and feature usage statistics
                      </p>
                    </div>
                    <div className='ml-4 flex-shrink-0'>
                      <div className='flex items-center h-6'>
                        <input
                          id='cookie-analytics'
                          type='checkbox'
                          checked={preferences.analytics}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setPreferences({
                              ...preferences,
                              analytics: e.target.checked,
                            })
                          }
                          aria-label='Analytics cookies'
                          className='w-5 h-5 text-emerald-800 bg-gray-100 border-gray-300 rounded focus:ring-emerald-800 cursor-pointer'
                        />
                        <label htmlFor='cookie-analytics' className='sr-only'>
                          Enable analytics cookies
                        </label>
                      </div>
                    </div>
                  </div>
                </fieldset>

                {/* Functional Cookies */}
                <fieldset className='bg-gray-50 rounded-lg p-4 border border-gray-200'>
                  <div className='flex items-start justify-between'>
                    <div className='flex-1'>
                      <legend className='font-semibold text-primary-900 mb-1'>
                        Functional Cookies
                      </legend>
                      <p className='text-sm text-gray-600'>
                        These cookies enable enhanced functionality and
                        personalisation, such as remembering your language
                        preferences, region, or display settings. They may be
                        set by us or by third-party providers.
                      </p>
                      <p className='text-xs text-gray-500 mt-2'>
                        Examples: Language preferences, theme settings, saved
                        form data
                      </p>
                    </div>
                    <div className='ml-4 flex-shrink-0'>
                      <div className='flex items-center h-6'>
                        <input
                          id='cookie-functional'
                          type='checkbox'
                          checked={preferences.functional}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setPreferences({
                              ...preferences,
                              functional: e.target.checked,
                            })
                          }
                          aria-label='Functional cookies'
                          className='w-5 h-5 text-emerald-800 bg-gray-100 border-gray-300 rounded focus:ring-emerald-800 cursor-pointer'
                        />
                        <label htmlFor='cookie-functional' className='sr-only'>
                          Enable functional cookies
                        </label>
                      </div>
                    </div>
                  </div>
                </fieldset>

                {/* Marketing Cookies */}
                <fieldset className='bg-gray-50 rounded-lg p-4 border border-gray-200'>
                  <div className='flex items-start justify-between'>
                    <div className='flex-1'>
                      <legend className='font-semibold text-primary-900 mb-1'>
                        Marketing Cookies
                      </legend>
                      <p className='text-sm text-gray-600'>
                        These cookies are used to track visitors across websites
                        and display relevant advertisements. They help us
                        measure the effectiveness of our marketing campaigns and
                        show you personalised content.
                      </p>
                      <p className='text-xs text-gray-500 mt-2'>
                        Examples: Advertising platforms, social media
                        integration, remarketing
                      </p>
                    </div>
                    <div className='ml-4 flex-shrink-0'>
                      <div className='flex items-center h-6'>
                        <input
                          id='cookie-marketing'
                          type='checkbox'
                          checked={preferences.marketing}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setPreferences({
                              ...preferences,
                              marketing: e.target.checked,
                            })
                          }
                          aria-label='Marketing cookies'
                          className='w-5 h-5 text-emerald-800 bg-gray-100 border-gray-300 rounded focus:ring-emerald-800 cursor-pointer'
                        />
                        <label htmlFor='cookie-marketing' className='sr-only'>
                          Enable marketing cookies
                        </label>
                      </div>
                    </div>
                  </div>
                </fieldset>
              </div>

              <div className='flex flex-col sm:flex-row gap-3 justify-end'>
                <button
                  onClick={rejectNonEssential}
                  className='px-6 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-800 focus:ring-offset-2'
                >
                  Reject All Non-Essential
                </button>
                <button
                  ref={lastFocusableRef}
                  onClick={saveCustomPreferences}
                  className='px-6 py-2 bg-emerald-800 text-white rounded-lg font-medium hover:bg-emerald-900 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-800 focus:ring-offset-2'
                >
                  Save Preferences
                </button>
              </div>

              <div className='mt-4 pt-4 border-t border-gray-200'>
                <p className='text-xs text-gray-500 text-center'>
                  You can change your preferences at any time by accessing the
                  cookie settings in our{' '}
                  <Link
                    href='/privacy'
                    className='text-emerald-800 hover:underline'
                  >
                    Privacy Policy
                  </Link>
                  . For more information about how we use cookies, please review
                  our{' '}
                  <Link
                    href='/cookies'
                    className='text-emerald-800 hover:underline'
                  >
                    Cookie Policy
                  </Link>
                  .
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
