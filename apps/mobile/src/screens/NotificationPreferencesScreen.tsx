/**
 * NotificationPreferencesScreen Component
 * 
 * Allows users to manage their notification preferences and quiet hours.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Switch,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { ScreenHeader, LoadingSpinner, ErrorView } from '../../components/shared';
import { NotificationService, NotificationPreferences } from '../../services/NotificationService';
import { useAuth } from '../../contexts/AuthContext';

export const NotificationPreferencesScreen: React.FC = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  const loadPreferences = async () => {
    if (!user) return;

    try {
      const prefs = await NotificationService.getNotificationPreferences(user.id);
      setPreferences(prefs);
      setError(null);
    } catch (err) {
      setError('Failed to load preferences');
      logger.error('Failed to load notification preferences', err);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async (newPreferences: NotificationPreferences) => {
    if (!user) return;

    setSaving(true);
    try {
      await NotificationService.updateNotificationPreferences(user.id, newPreferences);
      setPreferences(newPreferences);
      Alert.alert('Success', 'Notification preferences updated successfully');
    } catch (err) {
      Alert.alert('Error', 'Failed to update preferences. Please try again.');
      logger.error('Failed to save notification preferences', err);
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = (key: keyof NotificationPreferences, value: any) => {
    if (!preferences) return;

    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);
    savePreferences(newPreferences);
  };

  const updateQuietHours = (key: 'enabled' | 'start' | 'end', value: any) => {
    if (!preferences) return;

    const newPreferences = {
      ...preferences,
      quietHours: { ...preferences.quietHours, [key]: value },
    };
    setPreferences(newPreferences);
    savePreferences(newPreferences);
  };

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date;
  };

  const formatTimeString = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  useEffect(() => {
    loadPreferences();
  }, [user]);

  if (loading) {
    return <LoadingSpinner message="Loading preferences..." />;
  }

  if (error || !preferences) {
    return <ErrorView message={error || 'Failed to load preferences'} onRetry={loadPreferences} />;
  }

  const PreferenceItem: React.FC<{
    title: string;
    description: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
    icon: string;
  }> = ({ title, description, value, onValueChange, icon }) => (
    <View style={styles.preferenceItem}>
      <View style={styles.preferenceContent}>
        <View style={styles.preferenceHeader}>
          <Ionicons name={icon as any} size={24} color={theme.colors.primary} />
          <View style={styles.preferenceText}>
            <Text style={styles.preferenceTitle}>{title}</Text>
            <Text style={styles.preferenceDescription}>{description}</Text>
          </View>
        </View>
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: theme.colors.border, true: theme.colors.secondary }}
          thumbColor={value ? theme.colors.textInverse : theme.colors.textSecondary}
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Notification Preferences" />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Types</Text>
          
          <PreferenceItem
            title="Job Updates"
            description="Get notified when job status changes"
            value={preferences.jobUpdates}
            onValueChange={(value) => updatePreference('jobUpdates', value)}
            icon="briefcase-outline"
          />

          <PreferenceItem
            title="Bid Notifications"
            description="Get notified about new bids and bid updates"
            value={preferences.bidNotifications}
            onValueChange={(value) => updatePreference('bidNotifications', value)}
            icon="cash-outline"
          />

          <PreferenceItem
            title="Meeting Reminders"
            description="Get reminded about upcoming meetings"
            value={preferences.meetingReminders}
            onValueChange={(value) => updatePreference('meetingReminders', value)}
            icon="calendar-outline"
          />

          <PreferenceItem
            title="Payment Alerts"
            description="Get notified about payment updates"
            value={preferences.paymentAlerts}
            onValueChange={(value) => updatePreference('paymentAlerts', value)}
            icon="card-outline"
          />

          <PreferenceItem
            title="Messages"
            description="Get notified about new messages"
            value={preferences.messages}
            onValueChange={(value) => updatePreference('messages', value)}
            icon="chatbubble-outline"
          />

          <PreferenceItem
            title="Quotes"
            description="Get notified about quote updates"
            value={preferences.quotes}
            onValueChange={(value) => updatePreference('quotes', value)}
            icon="document-text-outline"
          />

          <PreferenceItem
            title="System Announcements"
            description="Get notified about app updates and announcements"
            value={preferences.systemAnnouncements}
            onValueChange={(value) => updatePreference('systemAnnouncements', value)}
            icon="information-circle-outline"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quiet Hours</Text>
          
          <View style={styles.preferenceItem}>
            <View style={styles.preferenceContent}>
              <View style={styles.preferenceHeader}>
                <Ionicons name="moon-outline" size={24} color={theme.colors.primary} />
                <View style={styles.preferenceText}>
                  <Text style={styles.preferenceTitle}>Enable Quiet Hours</Text>
                  <Text style={styles.preferenceDescription}>
                    Pause notifications during specified hours
                  </Text>
                </View>
              </View>
              <Switch
                value={preferences.quietHours.enabled}
                onValueChange={(value) => updateQuietHours('enabled', value)}
                trackColor={{ false: theme.colors.border, true: theme.colors.secondary }}
                thumbColor={preferences.quietHours.enabled ? theme.colors.textInverse : theme.colors.textSecondary}
              />
            </View>
          </View>

          {preferences.quietHours.enabled && (
            <>
              <TouchableOpacity
                style={styles.timePickerItem}
                onPress={() => setShowStartTimePicker(true)}
              >
                <View style={styles.timePickerContent}>
                  <Ionicons name="time-outline" size={20} color={theme.colors.textSecondary} />
                  <Text style={styles.timePickerLabel}>Start Time</Text>
                  <Text style={styles.timePickerValue}>
                    {formatTimeString(formatTime(preferences.quietHours.start))}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.timePickerItem}
                onPress={() => setShowEndTimePicker(true)}
              >
                <View style={styles.timePickerContent}>
                  <Ionicons name="time-outline" size={20} color={theme.colors.textSecondary} />
                  <Text style={styles.timePickerLabel}>End Time</Text>
                  <Text style={styles.timePickerValue}>
                    {formatTimeString(formatTime(preferences.quietHours.end))}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>

      {showStartTimePicker && (
        <DateTimePicker
          value={formatTime(preferences.quietHours.start)}
          mode="time"
          is24Hour={true}
          display="default"
          onChange={(event, selectedTime) => {
            setShowStartTimePicker(false);
            if (selectedTime) {
              const timeString = formatTimeString(selectedTime);
              updateQuietHours('start', timeString);
            }
          }}
        />
      )}

      {showEndTimePicker && (
        <DateTimePicker
          value={formatTime(preferences.quietHours.end)}
          mode="time"
          is24Hour={true}
          display="default"
          onChange={(event, selectedTime) => {
            setShowEndTimePicker(false);
            if (selectedTime) {
              const timeString = formatTimeString(selectedTime);
              updateQuietHours('end', timeString);
            }
          }}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.lg,
  },
  preferenceItem: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  preferenceContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  preferenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  preferenceText: {
    marginLeft: theme.spacing.md,
    flex: 1,
  },
  preferenceTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  preferenceDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  timePickerItem: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...theme.shadows.sm,
  },
  timePickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  timePickerLabel: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textPrimary,
    marginLeft: theme.spacing.md,
    flex: 1,
  },
  timePickerValue: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.primary,
  },
});
