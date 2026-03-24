import type { Ionicons } from '@expo/vector-icons';
import { Job } from '@mintenance/types';
import { theme, getStatusBadge } from '../../theme';

export type SortMode = 'for_you' | 'nearest' | 'highest_pay' | 'newest' | 'map';
export type FilterStatus = 'all' | 'posted' | 'assigned' | 'in_progress' | 'completed' | 'bid';

export const SORT_TABS: { key: SortMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'for_you', label: 'For You', icon: 'sparkles' },
  { key: 'nearest', label: 'Nearest', icon: 'navigate' },
  { key: 'highest_pay', label: 'Top Pay', icon: 'trending-up' },
  { key: 'newest', label: 'Newest', icon: 'time' },
  { key: 'map', label: 'Map', icon: 'map' },
];

export const HOMEOWNER_TABS: { key: FilterStatus; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'all', label: 'All', icon: 'grid-outline' },
  { key: 'posted', label: 'Posted', icon: 'megaphone-outline' },
  { key: 'assigned', label: 'Assigned', icon: 'person-add-outline' },
  { key: 'in_progress', label: 'Active', icon: 'hammer-outline' },
  { key: 'completed', label: 'Done', icon: 'checkmark-circle-outline' },
];

export const CONTRACTOR_TABS: { key: FilterStatus; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'all', label: 'All', icon: 'grid-outline' },
  { key: 'in_progress', label: 'In Progress', icon: 'flash-outline' },
  { key: 'bid', label: 'Bids Pending', icon: 'time-outline' },
  { key: 'completed', label: 'Completed', icon: 'checkmark-circle-outline' },
];

export const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  plumbing: 'water-outline',
  electrical: 'flash-outline',
  roofing: 'home-outline',
  painting: 'color-palette-outline',
  carpentry: 'hammer-outline',
  landscaping: 'leaf-outline',
  cleaning: 'sparkles-outline',
  hvac: 'thermometer-outline',
  general: 'construct-outline',
};

export const CATEGORY_COLORS: Record<string, { icon: string; bg: string; text: string }> = {
  plumbing:    { icon: theme.colors.primary, bg: theme.colors.primaryLight, text: theme.colors.primary },
  electrical:  { icon: theme.colors.accent, bg: theme.colors.accentLight, text: theme.colors.accent },
  roofing:     { icon: theme.colors.primary, bg: theme.colors.primaryLight, text: theme.colors.primary },
  painting:    { icon: '#3B82F6', bg: '#DBEAFE', text: '#3B82F6' },
  carpentry:   { icon: theme.colors.accent, bg: theme.colors.accentLight, text: theme.colors.accent },
  cleaning:    { icon: '#3B82F6', bg: '#DBEAFE', text: '#3B82F6' },
  hvac:        { icon: theme.colors.error, bg: '#FEE2E2', text: theme.colors.error },
  landscaping: { icon: theme.colors.primary, bg: theme.colors.primaryLight, text: theme.colors.primary },
  general:     { icon: theme.colors.textSecondary, bg: theme.colors.backgroundSecondary, text: theme.colors.textSecondary },
};

const STATUS_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  posted: 'megaphone',
  pending: 'hourglass',
  assigned: 'person-add',
  in_progress: 'hammer',
  completed: 'checkmark-circle',
  accepted: 'checkmark-circle',
  rejected: 'close-circle',
  cancelled: 'close-circle',
  draft: 'document',
};

export const STATUS_STYLES: Record<string, { label: string; bg: string; text: string; icon: keyof typeof Ionicons.glyphMap }> = Object.fromEntries(
  Object.keys(STATUS_ICONS).map((key) => {
    const badge = getStatusBadge(key);
    return [key, { label: badge.label, bg: badge.bg, text: badge.text, icon: STATUS_ICONS[key] }];
  })
);

export const EMPTY_MESSAGES: Record<FilterStatus, { title: string; desc: string }> = {
  all:         { title: 'No Jobs Yet', desc: 'Post your first maintenance job to get started.' },
  posted:      { title: 'No Posted Jobs', desc: 'When you post a job, it will appear here waiting for bids.' },
  assigned:    { title: 'No Assigned Jobs', desc: 'Jobs will appear here once you accept a contractor\'s bid.' },
  in_progress: { title: 'No Active Jobs', desc: 'Jobs currently being worked on will show up here.' },
  completed:   { title: 'No Completed Jobs', desc: 'Finished jobs and their reviews will appear here.' },
  bid:         { title: 'No Pending Bids', desc: 'Jobs you\'ve bid on will appear here while awaiting homeowner response.' },
};

export interface JobStats {
  total: number;
  newToday: number;
  avgBudget: number;
  activeCount: number;
  totalBids: number;
  completedCount: number;
  postedCount: number;
}

export interface JobCardProps {
  item: Job;
  saved: boolean;
  onPress: () => void;
  onSave: () => void;
  onBid: () => void;
  bidCount?: number;
  isContractor?: boolean;
}
