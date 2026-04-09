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
  pushEnabled: true,
  newJobs: true,
  newBids: true,
  newMessages: true,
  jobUpdates: true,
  paymentUpdates: true,
  emailEnabled: true,
  weeklyDigest: true,
  promotionalEmails: false,
  securityAlerts: true,
  soundEnabled: true,
  vibrationEnabled: true,
  marketingEmails: false,
  productUpdates: true,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
};

function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

export async function getNotificationPreferences(
  userId: string
): Promise<NotificationPreferences> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('notification_preferences')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (!data?.notification_preferences) {
      addBreadcrumb('Fetched notification preferences', 'debug', {
        userId,
        preferences: DEFAULT_PREFERENCES,
      });
      return DEFAULT_PREFERENCES;
    }

    const preferences = {
      ...DEFAULT_PREFERENCES,
      ...(data.notification_preferences as Partial<NotificationPreferences>),
    };

    addBreadcrumb('Fetched notification preferences', 'debug', {
      userId,
      preferences,
    });
    return preferences;
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
    // Fetch current preferences to merge
    const { data: current } = await supabase
      .from('profiles')
      .select('notification_preferences')
      .eq('id', userId)
      .single();

    const merged = {
      ...DEFAULT_PREFERENCES,
      ...((current?.notification_preferences as Partial<NotificationPreferences>) ||
        {}),
      ...preferences,
    };

    const { error } = await supabase
      .from('profiles')
      .update({ notification_preferences: merged })
      .eq('id', userId);

    if (error) throw error;
    logger.info('Notification preferences updated', { userId });
    addBreadcrumb('Updated notification preferences', 'info', {
      userId,
      quietHoursEnabled: Boolean(preferences.quietHoursEnabled),
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
    pushEnabled: preferences?.pushEnabled ?? true,
    newJobs: preferences?.newJobs ?? true,
    newBids: preferences?.newBids ?? true,
    newMessages: preferences?.newMessages ?? true,
    jobUpdates: preferences?.jobUpdates ?? true,
    paymentUpdates: preferences?.paymentUpdates ?? true,
    emailEnabled: preferences?.emailEnabled ?? true,
    weeklyDigest: preferences?.weeklyDigest ?? true,
    promotionalEmails: preferences?.promotionalEmails ?? false,
    securityAlerts: preferences?.securityAlerts ?? true,
    soundEnabled: preferences?.soundEnabled ?? true,
    vibrationEnabled: preferences?.vibrationEnabled ?? true,
    marketingEmails: preferences?.marketingEmails ?? false,
    productUpdates: preferences?.productUpdates ?? true,
    quietHoursEnabled: preferences?.quietHoursEnabled ?? false,
    quietHoursStart: preferences?.quietHoursStart || '22:00',
    quietHoursEnd: preferences?.quietHoursEnd || '07:00',
  };

  // Push notifications globally disabled
  if (!safePreferences.pushEnabled) {
    return false;
  }

  // Check quiet hours
  if (safePreferences.quietHoursEnabled) {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const startTime = parseTime(safePreferences.quietHoursStart);
    const endTime = parseTime(safePreferences.quietHoursEnd);

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
      return safePreferences.newBids;
    case 'meeting_scheduled':
      return safePreferences.newJobs;
    case 'payment_received':
      return safePreferences.paymentUpdates;
    case 'message_received':
      return safePreferences.newMessages;
    case 'quote_sent':
      return safePreferences.newBids;
    case 'system':
      return safePreferences.pushEnabled;
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
