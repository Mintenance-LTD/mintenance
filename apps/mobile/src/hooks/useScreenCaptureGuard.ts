import { useEffect } from 'react';
import * as ScreenCapture from 'expo-screen-capture';
import { logger } from '../utils/logger';

/**
 * Prevent screenshots, screen recording, and Android screen-share of
 * the mounting component.
 *
 * WHY:
 *   The 2026-04-21 audit flagged that the login / MFA / payment /
 *   reset-password flows had no screen-capture protection. On Android
 *   this means any malicious screen-recording app (accessibility
 *   services, legit-looking "screen recorder" apps with recording
 *   permission) can capture TOTP codes, password-reset links, Stripe
 *   PaymentSheet fields, and cross-user DM content. iOS screenshots
 *   end up in iCloud Photos and AirDrop.
 *
 *   `preventScreenCaptureAsync` sets `FLAG_SECURE` on Android (blocks
 *   screenshots, hides the app in recents, disables recording and
 *   Cast) and obscures the preview on iOS app-switcher. The effect is
 *   global while at least one caller has an active prevention — we
 *   pair every allow with the matching prevent so screens outside the
 *   sensitive flows keep working normally.
 *
 * USAGE:
 *   Inside any 'use client' / React component:
 *     useScreenCaptureGuard();                 // always on
 *     useScreenCaptureGuard(isPaymentOpen);    // conditional
 */
export function useScreenCaptureGuard(enabled = true): void {
  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    (async () => {
      try {
        await ScreenCapture.preventScreenCaptureAsync();
      } catch (error) {
        // Non-fatal — the UX degradation of a missed guard is small
        // compared to crashing the screen. Log so Sentry surfaces it.
        logger.warn(
          '[screen-capture-guard] preventScreenCaptureAsync failed',
          error instanceof Error ? { message: error.message } : { error }
        );
      }
    })();

    return () => {
      if (cancelled) return;
      cancelled = true;
      (async () => {
        try {
          await ScreenCapture.allowScreenCaptureAsync();
        } catch (error) {
          logger.warn(
            '[screen-capture-guard] allowScreenCaptureAsync failed',
            error instanceof Error ? { message: error.message } : { error }
          );
        }
      })();
    };
  }, [enabled]);
}
