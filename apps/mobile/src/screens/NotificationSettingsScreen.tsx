/**
 * NotificationSettingsScreen — LEGACY surface.
 *
 * Audit step 9 (2026-04-29): unhooked from `SettingsHubScreen`,
 * `HomeNavigationCoordinator`, and `AvailabilitySection`. The
 * canonical user-facing surface is now `NotificationPreferences`
 * (in `screens/settings/NotificationPreferencesScreen.tsx`) which
 * is backed by the dedicated `user_notification_preferences` table.
 *
 * This screen is kept registered in the nav stack for two reasons:
 *   1. Deep links from older mobile builds + emails may still hit it.
 *   2. Its SMS / per-category granular toggles aren't yet
 *      represented in the canonical screen (the
 *      `user_notification_preferences` table doesn't have an SMS
 *      column). Once the canonical screen + table are extended
 *      with SMS, delete this file and the plural API route
 *      (`/api/users/notification-preferences`).
 *
 * Don't add new entry points here — wire them to
 * `NotificationPreferences` instead.
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../components/ui/Button';
import { mobileApiClient } from '../utils/mobileApiClient';
// supabase import removed — notification prefs now use /api/users/notification-preferences
import { useAuth } from '../contexts/AuthContext';
import { theme } from '../theme';
import {
  NotificationSettings,
  DEFAULT_SETTINGS,
  PushNotificationsSection,
  EmailNotificationsSection,
  SoundVibrationSection,
  MarketingSection,
  QuietHoursSection,
  QuickActionsSection,
} from './notification-settings';

const NotificationSettingsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>({
    ...DEFAULT_SETTINGS,
  });

  useEffect(() => {
    if (user?.id) {
      void loadSettings();
    }
  }, [user?.id]);

  const loadSettings = async () => {
    if (!user?.id) return;
    try {
      const res = await mobileApiClient.get<{
        preferences?: Record<string, unknown>;
      }>('/api/users/notification-preferences');
      if (res.preferences) {
        setSettings((prev) => ({ ...prev, ...res.preferences }));
      }
    } catch {
      // Use defaults if no saved preferences
    }
  };

  const updateSetting = (key: keyof NotificationSettings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleTimeChange = (
    key: 'quietHoursStart' | 'quietHoursEnd',
    value: string
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleEnableAll = () => {
    setSettings((prev) => ({
      ...prev,
      pushEnabled: true,
      newJobs: true,
      newBids: true,
      newMessages: true,
      jobUpdates: true,
      paymentUpdates: true,
      emailEnabled: true,
      weeklyDigest: true,
      securityAlerts: true,
      soundEnabled: true,
      vibrationEnabled: true,
      productUpdates: true,
    }));
  };

  const handleDisableAll = () => {
    setSettings((prev) => ({
      ...prev,
      pushEnabled: false,
      newJobs: false,
      newBids: false,
      newMessages: false,
      jobUpdates: false,
      paymentUpdates: false,
      emailEnabled: false,
      weeklyDigest: false,
      promotionalEmails: false,
      securityAlerts: false,
      soundEnabled: false,
      vibrationEnabled: false,
      marketingEmails: false,
      productUpdates: false,
    }));
  };

  const handleResetToDefaults = () => {
    Alert.alert(
      'Reset to Defaults',
      'This will restore all notification settings to their default values.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', onPress: () => setSettings({ ...DEFAULT_SETTINGS }) },
      ]
    );
  };

  const handleSave = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'You must be logged in to save settings');
      return;
    }
    setSaving(true);
    try {
      await mobileApiClient.patch(
        '/api/users/notification-preferences',
        settings
      );
      Alert.alert('Success', 'Notification settings updated!');
      navigation.goBack();
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error
          ? err.message
          : 'Failed to save notification settings. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle='dark-content'
        backgroundColor={theme.colors.surface}
      />
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityRole='button'
          accessibilityLabel='Go back'
        >
          <Ionicons
            name='arrow-back'
            size={24}
            color={theme.colors.textPrimary}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notification Settings</Text>
        <Button
          variant='secondary'
          title={saving ? 'Saving...' : 'Save'}
          onPress={handleSave}
          disabled={saving}
          style={{ paddingHorizontal: 16, borderRadius: 20 }}
        />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <PushNotificationsSection
          settings={settings}
          onToggle={updateSetting}
        />
        <EmailNotificationsSection
          settings={settings}
          onToggle={updateSetting}
        />
        <SoundVibrationSection settings={settings} onToggle={updateSetting} />
        <MarketingSection settings={settings} onToggle={updateSetting} />
        <QuietHoursSection
          settings={settings}
          onToggle={updateSetting}
          onTimeChange={handleTimeChange}
        />
        <QuickActionsSection
          onEnableAll={handleEnableAll}
          onDisableAll={handleDisableAll}
          onResetToDefaults={handleResetToDefaults}
        />
        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  header: {
    backgroundColor: theme.colors.surface,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  content: {
    flex: 1,
  },
  bottomPadding: {
    height: 32,
  },
});

export default NotificationSettingsScreen;
