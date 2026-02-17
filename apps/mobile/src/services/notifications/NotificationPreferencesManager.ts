import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';
import * as sentry from '../../config/sentry';
import type { NotificationData, NotificationPreferences } from './types';

function addBreadcrumb(
  message: string,
  level: 'info' | 'warning' | 'error' | 'debug',
  data?: Record<string, unknown>
): void {
  const breadcrumbData = data ? { ...data, level } : { level };
  sentry.addBreadcrumb(message, 'notification', breadcrumbData);
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  jobUpdates: true,
  bidNotifications: true,
  meetingReminders: true,
  paymentAlerts: true,
  messages: true,
  quotes: true,
  systemAnnouncements: true,
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00',
  },
};

function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  try {
    const { data, error } = await supabase
      .from('user_notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (!data) {
      addBreadcrumb('Fetched notification preferences', 'debug', { userId, preferences: DEFAULT_PREFERENCES });
      return DEFAULT_PREFERENCES;
    }

    const preferences =
      (data as { preferences?: NotificationPreferences; notification_settings?: NotificationPreferences })
        .preferences ||
      (data as { notification_settings?: NotificationPreferences }).notification_settings ||
      DEFAULT_PREFERENCES;

    addBreadcrumb('Fetched notification preferences', 'debug', { userId, preferences });
    return preferences as NotificationPreferences;
  } catch (error) {
    logger.error('Failed to get notification preferences', error);
    throw error;
  }
}

export async function updateNotificationPreferences(
  userId: string,
  preferences: Partial<NotificationPreferences>
): Promise<void> {
  try {
    const { error } = await supabase
      .from('user_notification_preferences')
      .upsert({
        user_id: userId,
        preferences,
        updated_at: new Date().toISOString(),
      });

    if (error) throw error;
    logger.info('Notification preferences updated', { userId });
    addBreadcrumb('Updated notification preferences', 'info', {
      userId,
      quietHoursEnabled: Boolean(preferences.quietHours?.enabled),
    });
  } catch (error) {
    logger.error('Failed to update notification preferences', error);
    throw error;
  }
}

export function shouldSendNotification(
  preferences: NotificationPreferences,
  type: NotificationData['type']
): boolean {
  const safePreferences: NotificationPreferences = {
    jobUpdates: preferences?.jobUpdates ?? true,
    bidNotifications: preferences?.bidNotifications ?? true,
    meetingReminders: preferences?.meetingReminders ?? true,
    paymentAlerts: preferences?.paymentAlerts ?? true,
    messages: preferences?.messages ?? true,
    quotes: preferences?.quotes ?? true,
    systemAnnouncements: preferences?.systemAnnouncements ?? true,
    quietHours: {
      enabled: preferences?.quietHours?.enabled ?? false,
      start: preferences?.quietHours?.start || '22:00',
      end: preferences?.quietHours?.end || '08:00',
    },
  };

  // Check quiet hours
  if (safePreferences.quietHours.enabled) {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const startTime = parseTime(safePreferences.quietHours.start);
    const endTime = parseTime(safePreferences.quietHours.end);

    if (startTime <= endTime) {
      if (currentTime >= startTime && currentTime <= endTime) {
        return false;
      }
    } else {
      if (currentTime >= startTime || currentTime <= endTime) {
        return false;
      }
    }
  }

  switch (type) {
    case 'job_update':
      return safePreferences.jobUpdates;
    case 'bid_received':
      return safePreferences.bidNotifications;
    case 'meeting_scheduled':
      return safePreferences.meetingReminders;
    case 'payment_received':
      return safePreferences.paymentAlerts;
    case 'message_received':
      return safePreferences.messages;
    case 'quote_sent':
      return safePreferences.quotes;
    case 'system':
      return safePreferences.systemAnnouncements;
    default:
      return true;
  }
}

export function getChannelId(type: NotificationData['type']): string {
  switch (type) {
    case 'job_update':
      return 'job-updates';
    case 'bid_received':
      return 'bid-notifications';
    case 'meeting_scheduled':
      return 'meeting-reminders';
    default:
      return 'default';
  }
}
