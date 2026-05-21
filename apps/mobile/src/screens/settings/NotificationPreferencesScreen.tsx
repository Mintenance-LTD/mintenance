/**
 * NotificationPreferencesScreen — settings UI for
 * `user_notification_preferences`, backed by
 * `/api/user/notification-preferences`.
 *
 * Reference: redesign-v2 homeowner-deck screen 04 "Notification
 * preferences" + R2 retention roadmap.
 *
 * Design choices that diverge from the old per-event grid:
 *  - Events are grouped by *purpose* (Bids, Messages, Payment &
 *    escrow, Job updates, Discovery & tips) so a homeowner can mute
 *    "marketing-ish" stuff without losing critical alerts.
 *  - An always-on banner makes it explicit that payment confirmations,
 *    escrow holds, and contractor "I'm on the way" pings will *always*
 *    reach the user — they are not opt-outable. This avoids the
 *    confusion that follows from "I turned everything off, why did
 *    Mint just text me?"
 *  - Quiet hours moved inline. We previously punted to "edit on web"
 *    which was a polite way of saying "we never finished this".
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Switch,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { mobileApiClient } from '../../utils/mobileApiClient';
import { me } from '../../design-system/mint-editorial';
import { logger } from '../../utils/logger';
import { styles } from './notificationPreferencesStyles';

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

interface EventDef {
  type: string;
  label: string;
  sub?: string;
}
interface PurposeGroup {
  key: string;
  title: string;
  icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
  tint: string;
  fg: string;
  events: EventDef[];
}

// Purpose grouping matches the homeowner-deck design and the audience's
// mental model (Bids vs Payments vs Reminders). Event keys must match
// the canonical NotificationService event names — these are the ones
// that `user_notification_preferences.disabled_types` filters.
const GROUPS: readonly PurposeGroup[] = [
  {
    key: 'bids',
    title: 'Bids on your jobs',
    icon: 'briefcase',
    tint: me.brandSoft,
    fg: me.brand,
    events: [
      { type: 'bid_received', label: 'When a contractor bids' },
      { type: 'bid_accepted', label: 'When your bid is accepted' },
    ],
  },
  {
    key: 'messages',
    title: 'Messages',
    icon: 'chatbubbles',
    tint: me.infoBg,
    fg: me.infoFg,
    events: [
      { type: 'message_received', label: 'New messages from contractors' },
    ],
  },
  {
    key: 'payments',
    title: 'Payment & escrow',
    icon: 'card',
    tint: me.brandSoft,
    fg: me.brand,
    events: [
      { type: 'payment', label: 'Payment confirmations' },
      { type: 'escrow_released', label: 'Money released to the contractor' },
      { type: 'escrow_auto_released', label: '7-day auto-release reminder' },
    ],
  },
  {
    key: 'jobs',
    title: 'Job updates',
    icon: 'hammer',
    tint: me.warnBg,
    fg: me.warnFg,
    events: [
      { type: 'contract_signed', label: 'Contract signed' },
      { type: 'job_completed', label: 'Job marked complete by contractor' },
      { type: 'changes_requested', label: 'Changes requested on your work' },
    ],
  },
  {
    key: 'discovery',
    title: 'Discovery & tips',
    icon: 'sparkles',
    tint: me.bg3,
    fg: me.ink2,
    events: [
      { type: 'job_nearby', label: 'New jobs near you (contractors)' },
      { type: 'cashflow_digest', label: 'Friday cash-flow digest' },
    ],
  },
];

// HH:MM validator. Permissive — accepts "9:00" as well as "09:00".
const HHMM = /^([0-1]?\d|2[0-3]):[0-5]\d$/;

export const NotificationPreferencesScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [quietStartDraft, setQuietStartDraft] = useState<string>('');
  const [quietEndDraft, setQuietEndDraft] = useState<string>('');

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
        const merged = {
          ...DEFAULTS,
          ...body,
          disabled_types: Array.isArray(body.disabled_types)
            ? body.disabled_types
            : [],
        };
        setPrefs(merged);
        setQuietStartDraft(merged.quiet_hours_start ?? '');
        setQuietEndDraft(merged.quiet_hours_end ?? '');
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

  const toggleAllInGroup = (g: PurposeGroup, allMuted: boolean) => {
    setPrefs((prev) => {
      const next = new Set(prev.disabled_types);
      g.events.forEach((e) => {
        if (allMuted) next.delete(e.type);
        else next.add(e.type);
      });
      return { ...prev, disabled_types: Array.from(next) };
    });
  };

  const clearQuietHours = () => {
    setQuietStartDraft('');
    setQuietEndDraft('');
  };

  const save = async () => {
    if (quietStartDraft && !HHMM.test(quietStartDraft)) {
      Alert.alert('Quiet hours', 'Use 24-hour time, e.g. 22:00');
      return;
    }
    if (quietEndDraft && !HHMM.test(quietEndDraft)) {
      Alert.alert('Quiet hours', 'Use 24-hour time, e.g. 07:00');
      return;
    }
    setSaving(true);
    try {
      await mobileApiClient.patch('/api/user/notification-preferences', {
        push_enabled: prefs.push_enabled,
        email_enabled: prefs.email_enabled,
        sms_enabled: prefs.sms_enabled,
        in_app_enabled: prefs.in_app_enabled,
        disabled_types: prefs.disabled_types,
        quiet_hours_start: quietStartDraft || null,
        quiet_hours_end: quietEndDraft || null,
        timezone: prefs.timezone || 'UTC',
      });
      setPrefs((p) => ({
        ...p,
        quiet_hours_start: quietStartDraft || null,
        quiet_hours_end: quietEndDraft || null,
      }));
      Alert.alert('Saved', 'Notification preferences updated.');
    } catch (err) {
      Alert.alert(
        'Save failed',
        err instanceof Error ? err.message : 'Please try again.'
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
    <View style={styles.container}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerWrap}>
          <Text style={styles.headline}>Notifications</Text>
          <Text style={styles.sub}>
            Tell us what's worth a buzz. Less is more — only the things you
            actually want to know about.
          </Text>
        </View>

        <View style={styles.urgentBanner}>
          <View style={styles.urgentBannerIconWrap}>
            <Ionicons name='shield-checkmark' size={16} color={me.onBrand} />
          </View>
          <Text style={styles.urgentBannerText}>
            <Text style={styles.urgentBannerStrong}>Always on:</Text> payment
            confirmations, escrow holds, and your contractor's "I'm on the way"
            messages reach you even in quiet hours. Mute the rest — these stay.
          </Text>
        </View>

        {GROUPS.map((g) => {
          const allMuted = g.events.every((e) => disabledSet.has(e.type));
          return (
            <View key={g.key} style={styles.group}>
              <View style={styles.groupHeaderRow}>
                <View
                  style={[styles.groupIconWrap, { backgroundColor: g.tint }]}
                >
                  <Ionicons name={g.icon} size={16} color={g.fg} />
                </View>
                <Text style={styles.groupTitle}>{g.title}</Text>
                <TouchableOpacity
                  onPress={() => toggleAllInGroup(g, allMuted)}
                  accessibilityRole='button'
                  accessibilityLabel={
                    allMuted
                      ? `Unmute all ${g.title.toLowerCase()}`
                      : `Mute all ${g.title.toLowerCase()}`
                  }
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.groupAllMuted}>
                    {allMuted ? 'Unmute all' : 'Mute all'}
                  </Text>
                </TouchableOpacity>
              </View>

              {g.events.map((e, idx) => {
                const enabled = !disabledSet.has(e.type);
                return (
                  <View
                    key={e.type}
                    style={
                      idx === g.events.length - 1 ? styles.rowBare : styles.row
                    }
                  >
                    <View style={styles.rowFlex}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowLabel}>{e.label}</Text>
                        {e.sub ? (
                          <Text style={styles.rowSub}>{e.sub}</Text>
                        ) : null}
                      </View>
                      <Switch
                        value={enabled}
                        onValueChange={() => toggleType(e.type)}
                        trackColor={{ false: me.line, true: me.brand }}
                        thumbColor={me.onBrand}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          );
        })}

        <View style={styles.quietCard}>
          <Text style={styles.quietTitle}>Quiet hours</Text>
          <Text style={styles.quietDesc}>
            We won't push during these hours. Use 24-hour time, e.g. 22:00 to
            07:00. Critical alerts (above) still come through.
          </Text>
          <View style={styles.quietRow}>
            <View style={styles.quietInputBlock}>
              <Text style={styles.quietInputLabel}>Start</Text>
              <TextInput
                value={quietStartDraft}
                onChangeText={setQuietStartDraft}
                placeholder='22:00'
                placeholderTextColor={me.ink3}
                style={styles.quietInput}
                keyboardType='numbers-and-punctuation'
                maxLength={5}
                autoCapitalize='none'
                accessibilityLabel='Quiet hours start time'
              />
            </View>
            <View style={styles.quietArrow}>
              <Ionicons name='arrow-forward' size={16} color={me.ink3} />
            </View>
            <View style={styles.quietInputBlock}>
              <Text style={styles.quietInputLabel}>End</Text>
              <TextInput
                value={quietEndDraft}
                onChangeText={setQuietEndDraft}
                placeholder='07:00'
                placeholderTextColor={me.ink3}
                style={styles.quietInput}
                keyboardType='numbers-and-punctuation'
                maxLength={5}
                autoCapitalize='none'
                accessibilityLabel='Quiet hours end time'
              />
            </View>
          </View>
          {(quietStartDraft || quietEndDraft) && (
            <TouchableOpacity
              style={styles.quietToggleBtn}
              onPress={clearQuietHours}
              accessibilityRole='button'
              accessibilityLabel='Turn off quiet hours'
            >
              <Text style={styles.quietToggleBtnText}>Turn off</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.quietTimezone}>
            Timezone: {prefs.timezone || 'UTC'}
          </Text>
        </View>
      </ScrollView>

      <View
        style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) }]}
      >
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={save}
          disabled={saving}
          accessibilityRole='button'
          accessibilityLabel='Save notification preferences'
        >
          {saving ? (
            <ActivityIndicator color={me.onBrand} />
          ) : (
            <>
              <Ionicons name='checkmark-circle' size={18} color={me.onBrand} />
              <Text style={styles.saveButtonText}>Save preferences</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default NotificationPreferencesScreen;
