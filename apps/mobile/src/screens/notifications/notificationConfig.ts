/**
 * Notification configuration constants.
 * Icon color mappings, filter tab definitions.
 */

import { Ionicons } from '@expo/vector-icons';
import { me } from '../../design-system/mint-editorial';
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
  bid_received: { icon: me.brand, bg: me.brandSoft },
  bid_accepted: { icon: me.brand, bg: me.brandSoft },
  contract_created: { icon: '#8B5CF6', bg: '#EDE9FE' },
  contract_accepted: {
    icon: me.brand,
    bg: me.brandSoft,
  },
  meeting_scheduled: { icon: '#8B5CF6', bg: '#EDE9FE' },
  payment_received: { icon: me.accent, bg: me.warnBg },
  message_received: { icon: '#06B6D4', bg: '#CFFAFE' },
  new_message: { icon: '#06B6D4', bg: '#CFFAFE' },
  new_job: { icon: '#3B82F6', bg: '#DBEAFE' },
  job_posted: { icon: '#3B82F6', bg: '#DBEAFE' },
  job_completed: { icon: me.brand, bg: me.brandSoft },
  escrow_released: { icon: me.accent, bg: me.warnBg },
  quote_sent: { icon: '#EC4899', bg: '#FCE7F3' },
  system: {
    icon: me.ink2,
    bg: me.bg2,
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
