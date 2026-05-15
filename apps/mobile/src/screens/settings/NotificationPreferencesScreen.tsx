/**
 * NotificationPreferencesScreen — mobile settings for
 * user_notification_preferences. Backed by /api/user/notification-preferences.
 *
 * R2 of docs/RETENTION_ROADMAP_2026.md.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { mobileApiClient } from '../../utils/mobileApiClient';
import { me } from '../../design-system/mint-editorial';
import { logger } from '../../utils/logger';

interface Prefs {
  push_enabled: boolean;
  email_enabled: boolean;
  sms_enabled: boolean;
  in_app_enabled: boolean;
  disabled_types: string[];
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  timezone: string;
}

// Defaults match the live DB defaults on `user_notification_preferences`:
// every channel is on, no types muted, quiet hours off. Adding sms_enabled
// closes AUDIT_PUNCH_LIST P2 #40 — the column landed in migration
// `20260508093711_user_notification_prefs_sms_column` and the canonical
// `/api/user/notification-preferences` route already validates it.
const DEFAULTS: Prefs = {
  push_enabled: true,
  email_enabled: true,
  sms_enabled: true,
  in_app_enabled: true,
  disabled_types: [],
  quiet_hours_start: null,
  quiet_hours_end: null,
  timezone: 'UTC',
};

const KNOWN_TYPES: Array<{ type: string; label: string }> = [
  { type: 'job_nearby', label: 'New jobs near you' },
  { type: 'bid_received', label: 'New bids received' },
  { type: 'bid_accepted', label: 'Your bid accepted' },
  { type: 'contract_signed', label: 'Contract signed' },
  { type: 'payment', label: 'Payment updates' },
  { type: 'escrow_released', label: 'Payment released' },
  { type: 'escrow_auto_released', label: '7-day auto-release' },
  { type: 'job_completed', label: 'Job completed' },
  { type: 'changes_requested', label: 'Changes requested' },
  { type: 'message_received', label: 'New messages' },
  { type: 'cashflow_digest', label: 'Friday cash-flow digest' },
];

export const NotificationPreferencesScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const disabledSet = useMemo(
    () => new Set(prefs.disabled_types),
    [prefs.disabled_types]
  );

  useEffect(() => {
    (async () => {
      try {
        const body = await mobileApiClient.get<Prefs>(
          '/api/user/notification-preferences'
        );
        setPrefs({
          ...DEFAULTS,
          ...body,
          disabled_types: Array.isArray(body.disabled_types)
            ? body.disabled_types
            : [],
        });
      } catch (err) {
        logger.warn('Failed to load notification preferences', { err });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggleType = (type: string) => {
    setPrefs((prev) => {
      const next = new Set(prev.disabled_types);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return { ...prev, disabled_types: Array.from(next) };
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      await mobileApiClient.patch('/api/user/notification-preferences', {
        push_enabled: prefs.push_enabled,
        email_enabled: prefs.email_enabled,
        sms_enabled: prefs.sms_enabled,
        in_app_enabled: prefs.in_app_enabled,
        disabled_types: prefs.disabled_types,
        quiet_hours_start: prefs.quiet_hours_start,
        quiet_hours_end: prefs.quiet_hours_end,
        timezone: prefs.timezone || 'UTC',
      });
      Alert.alert('Saved', 'Notification preferences updated');
    } catch (err) {
      Alert.alert(
        'Save failed',
        err instanceof Error ? err.message : 'Please try again'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={me.brand} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
    >
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Channels</Text>
        {(
          [
            ['push_enabled', 'Push notifications'],
            ['email_enabled', 'Email'],
            ['sms_enabled', 'SMS'],
            ['in_app_enabled', 'In-app'],
          ] as const
        ).map(([key, label]) => (
          <View key={key} style={styles.row}>
            <Text style={styles.rowLabel}>{label}</Text>
            <Switch
              value={prefs[key]}
              onValueChange={(v) => setPrefs((p) => ({ ...p, [key]: v }))}
              trackColor={{
                false: me.line,
                true: me.brand,
              }}
            />
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Per-event mute</Text>
        <Text style={styles.sectionDesc}>
          Turn off specific notification types without disabling all channels.
        </Text>
        {KNOWN_TYPES.map((t) => {
          const enabled = !disabledSet.has(t.type);
          return (
            <View key={t.type} style={styles.row}>
              <Text style={styles.rowLabel}>{t.label}</Text>
              <Switch
                value={enabled}
                onValueChange={() => toggleType(t.type)}
                trackColor={{
                  false: me.line,
                  true: me.brand,
                }}
              />
            </View>
          );
        })}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quiet hours</Text>
        <Text style={styles.sectionDesc}>
          During these hours push is silenced. Set both to blank to disable.
          Enter as HH:MM (e.g. 22:00 to 07:00).
        </Text>
        <Text style={styles.helpText}>
          Current: {prefs.quiet_hours_start || 'off'} –{' '}
          {prefs.quiet_hours_end || 'off'} ({prefs.timezone})
        </Text>
        <Text style={styles.helpText}>
          (Edit quiet hours on the web for now.)
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={save}
        disabled={saving}
      >
        <Ionicons name='checkmark-circle' size={18} color={me.surface} />
        <Text style={styles.saveButtonText}>
          {saving ? 'Saving…' : 'Save preferences'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: me.bg2,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    backgroundColor: me.surface,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    ...me.shadow.card,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: me.ink,
    marginBottom: 4,
  },
  sectionDesc: {
    fontSize: 12,
    color: me.ink2,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: me.line,
  },
  rowLabel: {
    fontSize: 14,
    color: me.ink,
    flex: 1,
    marginRight: 12,
  },
  helpText: {
    fontSize: 12,
    color: me.ink2,
    marginTop: 4,
  },
  saveButton: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: me.brand,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: me.onBrand,
    fontSize: 15,
    fontWeight: '700',
  },
});

export default NotificationPreferencesScreen;
