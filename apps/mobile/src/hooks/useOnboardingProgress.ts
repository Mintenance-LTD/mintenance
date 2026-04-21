/**
 * useOnboardingProgress — aggregates profile-completion state for
 * the "Finish Setup" dashboard card (Phase 1.3 of the 2026-04-19
 * mobile-onboarding-audit remediation plan).
 *
 * Why this exists
 * ----------------
 * The onboarding swiper (Phase 0) introduces the product, the
 * push soft-ask (Phase 1.1) captures notifications, and the
 * email-verification pending screen (Phase 1.2) handles post-
 * signup comms. But once the user lands on the dashboard they
 * have NO visible signal about what else they should finish
 * before the app is useful to them — add a photo, add a
 * property (homeowner), verify their business (contractor),
 * set up payouts (contractor), etc.
 *
 * This hook returns a role-specific progress object the
 * FinishSetupCard can render. Each step includes an `onPress`
 * handler that navigates to the relevant screen so the card
 * is a one-tap starting point.
 *
 * Non-forced: the card self-hides when every step is done,
 * so it's a nudge, not a gate. Users can always ignore it.
 *
 * Performance: one supabase query per mount (profile fields we
 * don't already have on `user`, plus property/verification
 * state). The permission check is a cheap system call. All
 * results cached in local state; no polling.
 */

import { useCallback, useEffect, useState } from 'react';
import type { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';

export type IoniconName = keyof typeof Ionicons.glyphMap;

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: IoniconName;
  complete: boolean;
  /**
   * Caller-supplied action. The hook doesn't navigate directly
   * because it has no access to the typed navigation tree — the
   * FinishSetupCard (which lives inside a screen with a hook-
   * scoped navigation prop) wires this up.
   */
  actionKey: OnboardingActionKey;
}

/**
 * Keys the FinishSetupCard maps to navigation calls. Using a
 * discriminated union here instead of a plain string keeps the
 * card → dashboard wiring type-safe: adding a new key without
 * a matching handler would fail type-check.
 */
export type OnboardingActionKey =
  | 'verify_email'
  | 'add_photo'
  | 'add_property'
  | 'verify_business'
  | 'setup_payouts'
  | 'enable_push';

export interface OnboardingProgress {
  steps: OnboardingStep[];
  completed: number;
  total: number;
  /** 0..1 fraction for the progress bar. */
  fraction: number;
  /**
   * True when there's still at least one incomplete step AND
   * the underlying checks have resolved. The card should read
   * this rather than computing it on the fly.
   */
  shouldShow: boolean;
  /** True while initial checks are in-flight (first mount only). */
  loading: boolean;
  /** Re-run the profile + push probe; used by pull-to-refresh. */
  refresh: () => Promise<void>;
}

interface ProfileBits {
  profile_image_url: string | null;
  avatar_url: string | null;
  company_name: string | null;
  verification_status: string | null;
  stripe_connect_account_id: string | null;
  propertyCount: number;
  emailConfirmed: boolean;
}

const EMPTY_BITS: ProfileBits = {
  profile_image_url: null,
  avatar_url: null,
  company_name: null,
  verification_status: null,
  stripe_connect_account_id: null,
  propertyCount: 0,
  emailConfirmed: false,
};

async function fetchProfileBits(
  userId: string,
  role: 'homeowner' | 'contractor' | 'admin'
): Promise<ProfileBits> {
  const bits = { ...EMPTY_BITS };

  // Email-confirmed state comes from Supabase auth, not profiles.
  // `getUser()` is cheap — uses the in-memory JWT.
  try {
    const { data } = await supabase.auth.getUser();
    bits.emailConfirmed = !!data.user?.email_confirmed_at;
  } catch (err) {
    logger.warn('useOnboardingProgress: getUser failed', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Contractor-extra columns are included unconditionally; the
  // homeowner case just ignores them. One round trip either way.
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select(
        'profile_image_url, avatar_url, company_name, verification_status, stripe_connect_account_id'
      )
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      logger.warn('useOnboardingProgress: profile fetch failed', {
        error: error.message,
      });
    } else if (profile) {
      const p = profile as Record<string, string | null>;
      bits.profile_image_url = p.profile_image_url ?? null;
      bits.avatar_url = p.avatar_url ?? null;
      bits.company_name = p.company_name ?? null;
      bits.verification_status = p.verification_status ?? null;
      bits.stripe_connect_account_id = p.stripe_connect_account_id ?? null;
    }
  } catch (err) {
    logger.warn('useOnboardingProgress: profile query threw', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Homeowners only — the primary-property check drives the "add
  // property" step. We skip this for contractors to avoid a
  // wasted round trip.
  if (role === 'homeowner') {
    try {
      const { count, error } = await supabase
        .from('properties')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', userId);
      if (error) {
        logger.warn('useOnboardingProgress: property count failed', {
          error: error.message,
        });
      } else {
        bits.propertyCount = count ?? 0;
      }
    } catch (err) {
      logger.warn('useOnboardingProgress: property query threw', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return bits;
}

async function getPushPermissionGranted(): Promise<boolean> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

function buildSteps(
  role: 'homeowner' | 'contractor' | 'admin',
  bits: ProfileBits,
  pushGranted: boolean
): OnboardingStep[] {
  const hasPhoto = !!(bits.profile_image_url || bits.avatar_url);
  const commonStart: OnboardingStep[] = [
    {
      id: 'verify_email',
      title: 'Verify your email',
      description: 'Confirm the address we sent you',
      icon: 'mail-outline',
      complete: bits.emailConfirmed,
      actionKey: 'verify_email',
    },
    {
      id: 'add_photo',
      title: 'Add a profile photo',
      description: 'Helps people recognise you',
      icon: 'camera-outline',
      complete: hasPhoto,
      actionKey: 'add_photo',
    },
  ];

  const commonEnd: OnboardingStep[] = [
    {
      id: 'enable_push',
      title: 'Turn on notifications',
      description: 'Never miss a bid, message or update',
      icon: 'notifications-outline',
      complete: pushGranted,
      actionKey: 'enable_push',
    },
  ];

  if (role === 'contractor') {
    // Business verification is "complete" for our purposes once
    // the contractor has submitted it — even pending review —
    // because the next step is waiting on admin, not on them.
    const verificationComplete =
      bits.verification_status === 'verified' ||
      bits.verification_status === 'pending';
    const payoutsComplete = !!bits.stripe_connect_account_id;

    return [
      ...commonStart,
      {
        id: 'verify_business',
        title: 'Verify your business',
        description: 'Add company name, licence and address',
        icon: 'shield-checkmark-outline',
        complete: verificationComplete,
        actionKey: 'verify_business',
      },
      {
        id: 'setup_payouts',
        title: 'Set up payouts',
        description: 'Connect Stripe to get paid',
        icon: 'card-outline',
        complete: payoutsComplete,
        actionKey: 'setup_payouts',
      },
      ...commonEnd,
    ];
  }

  // Homeowner (default / fallback for admin).
  return [
    ...commonStart,
    {
      id: 'add_property',
      title: 'Add your first property',
      description: 'So contractors know where to go',
      icon: 'home-outline',
      complete: bits.propertyCount > 0,
      actionKey: 'add_property',
    },
    ...commonEnd,
  ];
}

export function useOnboardingProgress(): OnboardingProgress {
  const { user } = useAuth();
  const [bits, setBits] = useState<ProfileBits>(EMPTY_BITS);
  const [pushGranted, setPushGranted] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [nextBits, nextPush] = await Promise.all([
        fetchProfileBits(user.id, user.role),
        getPushPermissionGranted(),
      ]);
      setBits(nextBits);
      setPushGranted(nextPush);
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.role]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await refresh();
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  if (!user) {
    return {
      steps: [],
      completed: 0,
      total: 0,
      fraction: 0,
      shouldShow: false,
      loading: false,
      refresh,
    };
  }

  const steps = buildSteps(user.role, bits, pushGranted);
  const completed = steps.filter((s) => s.complete).length;
  const total = steps.length;
  const fraction = total === 0 ? 0 : completed / total;
  const shouldShow = !loading && completed < total;

  return {
    steps,
    completed,
    total,
    fraction,
    shouldShow,
    loading,
    refresh,
  };
}
