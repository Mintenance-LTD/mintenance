import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';

interface IconConfig {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
}

export const SETTING_ICONS: Record<string, IconConfig> = {
  notifications: { name: 'notifications', color: '#3B82F6', bg: '#DBEAFE' },
  briefcase: {
    name: 'briefcase',
    color: theme.colors.primary,
    bg: theme.colors.primaryLight,
  },
  pricetag: {
    name: 'pricetag',
    color: theme.colors.accent,
    bg: theme.colors.accentLight,
  },
  chatbubble: { name: 'chatbubble', color: '#8B5CF6', bg: '#EDE9FE' },
  refresh: { name: 'refresh', color: '#3B82F6', bg: '#DBEAFE' },
  card: {
    name: 'card',
    color: theme.colors.primary,
    bg: theme.colors.primaryLight,
  },
  mail: { name: 'mail', color: theme.colors.error, bg: '#FEE2E2' },
  calendar: {
    name: 'calendar',
    color: theme.colors.accent,
    bg: theme.colors.accentLight,
  },
  'shield-checkmark': {
    name: 'shield-checkmark',
    color: theme.colors.error,
    bg: '#FEE2E2',
  },
  'volume-high': { name: 'volume-high', color: '#3B82F6', bg: '#DBEAFE' },
  'phone-portrait': { name: 'phone-portrait', color: '#8B5CF6', bg: '#EDE9FE' },
  megaphone: {
    name: 'megaphone',
    color: theme.colors.accent,
    bg: theme.colors.accentLight,
  },
  'information-circle': {
    name: 'information-circle',
    color: '#3B82F6',
    bg: '#DBEAFE',
  },
  'moon-outline': { name: 'moon-outline', color: '#8B5CF6', bg: '#EDE9FE' },
  'time-outline': {
    name: 'time-outline',
    color: theme.colors.textSecondary,
    bg: theme.colors.backgroundSecondary,
  },
  'checkmark-circle': {
    name: 'checkmark-circle',
    color: theme.colors.primary,
    bg: theme.colors.primaryLight,
  },
  'close-circle': {
    name: 'close-circle',
    color: theme.colors.error,
    bg: '#FEE2E2',
  },
};

export interface NotificationSettings {
  // Push Notifications
  pushEnabled: boolean;
  newJobs: boolean;
  newBids: boolean;
  newMessages: boolean;
  jobUpdates: boolean;
  paymentUpdates: boolean;

  // Email Notifications
  emailEnabled: boolean;
  weeklyDigest: boolean;
  promotionalEmails: boolean;
  securityAlerts: boolean;

  // In-App Settings
  soundEnabled: boolean;
  vibrationEnabled: boolean;

  // Marketing
  marketingEmails: boolean;
  productUpdates: boolean;

  // Quiet Hours
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

export const DEFAULT_SETTINGS: NotificationSettings = {
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

export const parseTime = (timeStr: string): Date => {
  const [h, m] = timeStr.split(':').map(Number) as [number, number];
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
};

export const formatTime = (timeStr: string): string =>
  parseTime(timeStr).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
