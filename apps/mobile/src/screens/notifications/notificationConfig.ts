/**
 * Notification configuration constants.
 * Icon color mappings, filter tab definitions.
 */

import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { NotificationData } from '../../services/NotificationService';

export type FilterTab = 'all' | 'unread' | 'jobs' | 'payments' | 'messages';

export const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'jobs', label: 'Jobs' },
  { key: 'payments', label: 'Payments' },
  { key: 'messages', label: 'Messages' },
];

export const ICON_COLORS: Record<string, { icon: string; bg: string }> = {
  job_update: { icon: '#3B82F6', bg: '#DBEAFE' },
  bid_received: { icon: theme.colors.primary, bg: theme.colors.primaryLight },
  bid_accepted: { icon: theme.colors.primary, bg: theme.colors.primaryLight },
  contract_created: { icon: '#8B5CF6', bg: '#EDE9FE' },
  contract_accepted: {
    icon: theme.colors.primary,
    bg: theme.colors.primaryLight,
  },
  meeting_scheduled: { icon: '#8B5CF6', bg: '#EDE9FE' },
  payment_received: { icon: theme.colors.accent, bg: theme.colors.accentLight },
  message_received: { icon: '#06B6D4', bg: '#CFFAFE' },
  new_message: { icon: '#06B6D4', bg: '#CFFAFE' },
  new_job: { icon: '#3B82F6', bg: '#DBEAFE' },
  job_posted: { icon: '#3B82F6', bg: '#DBEAFE' },
  job_completed: { icon: theme.colors.primary, bg: theme.colors.primaryLight },
  escrow_released: { icon: theme.colors.accent, bg: theme.colors.accentLight },
  quote_sent: { icon: '#EC4899', bg: '#FCE7F3' },
  system: {
    icon: theme.colors.textSecondary,
    bg: theme.colors.backgroundSecondary,
  },
};

export const getIconName = (
  type: NotificationData['type']
): keyof typeof Ionicons.glyphMap => {
  switch (type) {
    case 'job_update':
      return 'briefcase-outline';
    case 'bid_received':
      return 'cash-outline';
    case 'bid_accepted' as NotificationData['type']:
      return 'checkmark-circle-outline';
    case 'contract_created' as NotificationData['type']:
      return 'document-outline';
    case 'contract_accepted' as NotificationData['type']:
      return 'shield-checkmark-outline';
    case 'new_job' as NotificationData['type']:
      return 'briefcase-outline';
    case 'new_message' as NotificationData['type']:
      return 'chatbubble-outline';
    case 'job_posted' as NotificationData['type']:
      return 'add-circle-outline';
    case 'job_completed' as NotificationData['type']:
      return 'checkmark-done-outline';
    case 'escrow_released' as NotificationData['type']:
      return 'wallet-outline';
    case 'meeting_scheduled':
      return 'calendar-outline';
    case 'payment_received':
      return 'card-outline';
    case 'message_received':
      return 'chatbubble-outline';
    case 'quote_sent':
      return 'document-text-outline';
    case 'system':
      return 'information-circle-outline';
    default:
      return 'notifications-outline';
  }
};
