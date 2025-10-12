'use client';

import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import Link from 'next/link';

interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
}

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true, // Always true, cannot be disabled
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    // Check if user has already made a choice
    const cookieConsent = localStorage.getItem('mintenance_cookie_consent');
    if (!cookieConsent) {
      // Show banner after a short delay for better UX
      setTimeout(() => setShowBanner(true), 1000);
    }
  }, []);

  const savePreferences = (prefs: CookiePreferences) => {
    const consentData = {
      preferences: prefs,
      timestamp: new Date().toISOString(),
      version: '1.0',
    };
    localStorage.setItem('mintenance_cookie_consent', JSON.stringify(consentData));

    // Set cookies based on preferences
    if (prefs.analytics) {
      // Enable analytics tracking (e.g., Google Analytics)
      logger.info('Analytics cookies enabled');
    }
    if (prefs.marketing) {
      // Enable marketing cookies
      logger.info('Marketing cookies enabled');
    }

    setShowBanner(false);
    setShowSettings(false);
  };

  const acceptAll = () => {
    savePreferences({
      essential: true,
      analytics: true,
      marketing: true,
    });
  };

  const acceptEssentialOnly = () => {
    savePreferences({
      essential: true,
      analytics: false,
      marketing: false,
    });
  };

  const saveCustomPreferences = () => {
    savePreferences(preferences);
  };

  if (!showBanner) return null;

  return (
    <>
      {/* Cookie Banner */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-gray-200 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {!showSettings ? (
            // Simple Banner View
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-[#0F172A] mb-2">
                  🍪 We Use Cookies
                </h3>
                <p className="text-sm text-gray-600">
                  We use cookies to improve your experience on our site, analyse traffic, and personalise content.
                  Essential cookies are always enabled. You can customise your preferences or accept all cookies.{' '}
                  <Link href="/privacy" className="text-[#10B981] hover:underline font-medium">
                    Learn more in our Privacy Policy
                  </Link>
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <button
                  onClick={() => setShowSettings(true)}
                  className="px-6 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors whitespace-nowrap"
                >
                  Customise Preferences
                </button>
                <button
                  onClick={acceptEssentialOnly}
                  className="px-6 py-2 border-2 border-[#10B981] text-[#10B981] rounded-lg font-medium hover:bg-[#10B981] hover:text-white transition-colors whitespace-nowrap"
                >
                  Essential Only
                </button>
                <button
                  onClick={acceptAll}
                  className="px-6 py-2 bg-[#10B981] text-white rounded-lg font-medium hover:bg-[#059669] transition-colors whitespace-nowrap"
                >
                  Accept All
                </button>
              </div>
            </div>
          ) : (
            // Detailed Settings View
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-[#0F172A]">
                  Cookie Preferences
                </h3>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-gray-500 hover:text-gray-700"
                  aria-label="Close settings"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4 mb-6">
                {/* Essential Cookies */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-[#0F172A] mb-1">
                        Essential Cookies
                      </h4>
                      <p className="text-sm text-gray-600">
                        These cookies are necessary for the website to function properly. They enable core functionality such as security,
                        network management, and accessibility. You cannot opt-out of these cookies.
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        Examples: Session management, authentication, security features
                      </p>
                    </div>
                    <div className="ml-4">
                      <div className="flex items-center h-6">
                        <input
                          type="checkbox"
                          checked={true}
                          disabled
                          className="w-5 h-5 text-[#10B981] bg-gray-100 border-gray-300 rounded opacity-50 cursor-not-allowed"
                        />
                        <span className="ml-2 text-sm font-medium text-gray-500">Always Active</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Analytics Cookies */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-[#0F172A] mb-1">
                        Analytics Cookies
                      </h4>
                      <p className="text-sm text-gray-600">
                        These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously.
                        This helps us improve the user experience and site performance.
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        Examples: Google Analytics, page visit tracking, feature usage statistics
                      </p>
                    </div>
                    <div className="ml-4">
                      <div className="flex items-center h-6">
                        <input
                          type="checkbox"
                          checked={preferences.analytics}
                          onChange={(e) => setPreferences({ ...preferences, analytics: e.target.checked })}
                          className="w-5 h-5 text-[#10B981] bg-gray-100 border-gray-300 rounded focus:ring-[#10B981] cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Marketing Cookies */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-[#0F172A] mb-1">
                        Marketing Cookies
                      </h4>
                      <p className="text-sm text-gray-600">
                        These cookies are used to track visitors across websites and display relevant advertisements.
                        They help us measure the effectiveness of our marketing campaigns and show you personalised content.
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        Examples: Advertising platforms, social media integration, remarketing
                      </p>
                    </div>
                    <div className="ml-4">
                      <div className="flex items-center h-6">
                        <input
                          type="checkbox"
                          checked={preferences.marketing}
                          onChange={(e) => setPreferences({ ...preferences, marketing: e.target.checked })}
                          className="w-5 h-5 text-[#10B981] bg-gray-100 border-gray-300 rounded focus:ring-[#10B981] cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-end">
                <button
                  onClick={acceptEssentialOnly}
                  className="px-6 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Reject All Non-Essential
                </button>
                <button
                  onClick={saveCustomPreferences}
                  className="px-6 py-2 bg-[#10B981] text-white rounded-lg font-medium hover:bg-[#059669] transition-colors"
                >
                  Save Preferences
                </button>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500 text-center">
                  You can change your preferences at any time by accessing the cookie settings in our{' '}
                  <Link href="/privacy" className="text-[#10B981] hover:underline">
                    Privacy Policy
                  </Link>
                  . For more information about how we use cookies, please review our{' '}
                  <Link href="/privacy" className="text-[#10B981] hover:underline">
                    Cookie Policy
                  </Link>
                  .
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Backdrop */}
      {showBanner && (
        <div className="fixed inset-0 bg-black/20 z-40" aria-hidden="true" />
      )}
    </>
  );
}
