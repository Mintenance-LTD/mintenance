/**
 * PushPermissionRecoveryBanner — reach back to the cohort whose iOS one-shot
 * dialog was already burned (usually because they installed the app before
 * 2026-04-19, when the silent push-token-init path triggered the system
 * dialog without rationale and the user tapped Don't Allow).
 *
 * Audit P1 (2026-05-10): the soft-ask modal (`PushSoftAskModal`) DOES handle
 * the 'denied' state via its "Open Settings" branch, but only re-fires every
 * 24 hours and only when the user lands on the home tab right as the gate
 * decides. A persistent (but dismissible) banner gives that cohort a
 * second, lower-friction recovery surface — one tap to system settings,
 * one tap to dismiss locally for 30 days.
 *
 * Mount this near the top of the homeowner / contractor dashboards. It
 * self-hides when:
 *   - user is signed-out
 *   - permission is 'granted' or 'undetermined' (soft-ask owns the
 *     undetermined case; granted = nothing to recover)
 *   - the user has dismissed it within the last 30 days
 *
 * Independent of the 24h soft-ask cooldown — this banner uses its own
 * `push_recovery_banner_dismissed_at` AsyncStorage key.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { usePushSoftAskGate } from '../../hooks/usePushSoftAskGate';
import { MOBILE_STORAGE_KEYS } from '../../config/storageKeys';
import { theme } from '../../theme';
import { logger } from '../../utils/logger';

const STORAGE_KEY = MOBILE_STORAGE_KEYS.PUSH_RECOVERY_BANNER_DISMISSED;
const COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export const PushPermissionRecoveryBanner: React.FC = () => {
  const { user } = useAuth();
  const { permissionStatus, openSystemSettings } = usePushSoftAskGate();
  const [dismissedRecently, setDismissedRecently] = useState<boolean | null>(
    null
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (cancelled) return;
        if (!raw) {
          setDismissedRecently(false);
          return;
        }
        const ts = Date.parse(raw);
        if (!Number.isFinite(ts)) {
          setDismissedRecently(false);
          return;
        }
        setDismissedRecently(Date.now() - ts < COOLDOWN_MS);
      } catch (err) {
        // If AsyncStorage is unavailable for any reason, default to
        // hidden — better to under-prompt than render an undismissable
        // banner.
        logger.warn('PushPermissionRecoveryBanner: read failed', {
          error: err instanceof Error ? err.message : String(err),
        });
        if (!cancelled) setDismissedRecently(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDismiss = useCallback(async () => {
    setDismissedRecently(true);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, new Date().toISOString());
    } catch (err) {
      logger.warn('PushPermissionRecoveryBanner: dismiss persist failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }, []);

  // Render nothing in any of the no-show cases; the early returns also
  // mean the banner never flashes on first paint while AsyncStorage
  // resolves (we stay null until `dismissedRecently` is known).
  if (!user) return null;
  if (permissionStatus !== 'denied') return null;
  if (dismissedRecently !== false) return null;

  return (
    <View style={styles.container} accessibilityRole='alert'>
      <View style={styles.iconWrap}>
        <Ionicons
          name='notifications-outline'
          size={18}
          color={theme.colors.textPrimary}
        />
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>Notifications are off</Text>
        <Text style={styles.subtitle}>
          Turn them on to hear when a contractor responds or your job moves.
        </Text>
      </View>
      <TouchableOpacity
        style={styles.openButton}
        onPress={openSystemSettings}
        accessibilityRole='button'
        accessibilityLabel='Open notification settings'
      >
        <Text style={styles.openButtonText}>Open</Text>
        <Ionicons
          name='chevron-forward'
          size={14}
          color={theme.colors.textInverse}
        />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.dismissButton}
        onPress={handleDismiss}
        accessibilityRole='button'
        accessibilityLabel='Dismiss banner'
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name='close' size={14} color={theme.colors.textTertiary} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  subtitle: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  openButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: theme.colors.textPrimary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  openButtonText: {
    color: theme.colors.textInverse,
    fontSize: 12,
    fontWeight: '600',
  },
  dismissButton: {
    padding: 2,
  },
});
