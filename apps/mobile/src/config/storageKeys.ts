/**
 * Canonical AsyncStorage key catalog.
 *
 * Audit P2 (2026-05-10): mobile previously had 15 distinct AsyncStorage
 * keys spread across hooks/components/services with mixed conventions
 * (lowercase string literals, SCREAMING_SNAKE locals, `@mintenance_*`
 * prefixes, plain camelCase like `'sessionId'`). This file is the
 * single catalog — every new caller imports from here.
 *
 * Naming convention going forward:
 *   - All keys live on the `MOBILE_STORAGE_KEYS` const.
 *   - Key VALUES are `snake_case` strings, prefixed `mintenance_` for
 *     globally-namespaced safety on the user's device (Expo apps share
 *     the same iOS/Android storage scope per package).
 *   - Names on the const use `SCREAMING_SNAKE` so a missing key fails at
 *     compile time, not runtime.
 *
 * Migration plan (incremental):
 *   1. New code imports `MOBILE_STORAGE_KEYS.X` exclusively (this file).
 *   2. Existing callers may keep their local `STORAGE_KEY` consts until
 *      a future PR replaces them — the values must NOT change at that
 *      point or installed clients will lose their state. The string
 *      values below are pinned to the actual values currently written
 *      to user devices.
 *
 * Don't add inline string literals. If you need a new key, add it here
 * first.
 */

export const MOBILE_STORAGE_KEYS = {
  // -- Auth + session ----------------------------------------------------
  /** AES-GCM encrypted session bundle (set by auth-session-manager). */
  SESSION: 'mintenance_session',
  /** Session expiry timestamp ISO string. */
  SESSION_EXPIRY: 'mintenance_session_expiry',
  /** Anonymous analytics session id. */
  ANALYTICS_SESSION_ID: 'sessionId',
  /** Login form "remember email" toggle. */
  REMEMBER_EMAIL_FLAG: 'remember_email_flag',
  /** Login form "remember email" stored email value. */
  REMEMBER_EMAIL_VALUE: 'remember_email_value',

  // -- Biometric --------------------------------------------------------
  BIOMETRIC_ENABLED: 'biometric_enabled',
  BIOMETRIC_CREDENTIALS: 'biometric_credentials',

  // -- Theme + i18n + haptics -------------------------------------------
  THEME_MODE: '@mintenance_theme_mode',
  LANGUAGE: 'user_language_preference',
  HAPTIC_PREFS: '@mintenance_haptic_preferences',

  // -- Onboarding gate dismissals (each keyed by its own ISO timestamp)
  ONBOARDING_DISMISSED: 'onboarding_dismissed',
  FIRST_PROPERTY_PROMPT_DISMISSED: 'first_property_prompt_dismissed_at',
  LOCATION_SOFT_ASK_DISMISSED: 'location_soft_ask_dismissed_at',
  ALWAYS_LOCATION_SOFT_ASK_DISMISSED: 'always_location_soft_ask_dismissed_at',
  SERVICE_AREA_PROMPT_DISMISSED: 'service_area_prompt_dismissed_at',
  IDENTITY_SETUP_PROMPT_DISMISSED: 'identity_setup_prompt_dismissed_at',
  BACKGROUND_CHECK_PROMPT_DISMISSED: 'background_check_prompt_dismissed_at',
  SELFIE_CAPTURE_PROMPT_DISMISSED: 'selfie_capture_prompt_dismissed_at',
  STRIPE_CONNECT_PROMPT_DISMISSED: 'stripe_connect_prompt_dismissed_at',
  PUSH_SOFT_ASK_DISMISSED: 'push_soft_ask_dismissed_at',
  PUSH_RECOVERY_BANNER_DISMISSED: 'push_recovery_banner_dismissed_at',

  // -- Notifications ----------------------------------------------------
  /** Last seen notification id (used for badge dedup on cold start). */
  LAST_NOTIFICATION_ID: 'last_notification_id',
  /** Offline-queued notifications waiting to be re-played online. */
  NOTIFICATION_QUEUE: 'notification_queue',

  // -- App data caches --------------------------------------------------
  /** React-Query persisted-cache root. */
  QUERY_CACHE: 'QUERY_CACHE',
  /** Saved-jobs list (contractor "watch this job"). */
  SAVED_JOBS: 'saved_jobs',
  /** Building-assessment ids submitted from this device (offline draft tracking). */
  ASSESSMENT_IDS: 'assessment_ids',
  /** Sustainability video uploads deferred while offline. */
  VIDEO_UPLOAD_QUEUE: 'video_upload_queue',
} as const;

export type MobileStorageKey =
  (typeof MOBILE_STORAGE_KEYS)[keyof typeof MOBILE_STORAGE_KEYS];
