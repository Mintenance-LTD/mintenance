import { Ionicons } from '@expo/vector-icons';
import { me } from '../../design-system/mint-editorial';

interface IconConfig {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
}

export const SETTING_ICONS: Record<string, IconConfig> = {
  notifications: { name: 'notifications', color: '#3B82F6', bg: '#DBEAFE' },
  briefcase: {
    name: 'briefcase',
    color: me.brand,
    bg: me.brandSoft,
  },
  pricetag: {
    name: 'pricetag',
    color: me.accent,
    bg: me.warnBg,
  },
  chatbubble: { name: 'chatbubble', color: '#8B5CF6', bg: '#EDE9FE' },
  refresh: { name: 'refresh', color: '#3B82F6', bg: '#DBEAFE' },
  card: {
    name: 'card',
    color: me.brand,
    bg: me.brandSoft,
  },
  mail: { name: 'mail', color: me.errFg, bg: me.errBg },
  calendar: {
    name: 'calendar',
    color: me.accent,
    bg: me.warnBg,
  },
  'shield-checkmark': {
    name: 'shield-checkmark',
    color: me.errFg,
    bg: me.errBg,
  },
  'volume-high': { name: 'volume-high', color: '#3B82F6', bg: '#DBEAFE' },
  'phone-portrait': { name: 'phone-portrait', color: '#8B5CF6', bg: '#EDE9FE' },
  megaphone: {
    name: 'megaphone',
    color: me.accent,
    bg: me.warnBg,
  },
  'information-circle': {
    name: 'information-circle',
    color: '#3B82F6',
    bg: '#DBEAFE',
  },
  'moon-outline': { name: 'moon-outline', color: '#8B5CF6', bg: '#EDE9FE' },
  'time-outline': {
    name: 'time-outline',
    color: me.ink2,
    bg: me.bg2,
  },
  'checkmark-circle': {
    name: 'checkmark-circle',
    color: me.brand,
    bg: me.brandSoft,
  },
  'close-circle': {
    name: 'close-circle',
    color: me.errFg,
    bg: me.errBg,
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
