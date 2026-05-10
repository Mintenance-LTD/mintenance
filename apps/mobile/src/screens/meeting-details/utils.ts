import type { ContractorMeeting, LocationData } from '@mintenance/types';
import { theme } from '../../theme';

/**
 * Pure helpers for the MeetingDetailsScreen.
 * Extracted 2026-05-09 (AUDIT_PUNCH_LIST P2 #44g).
 */

export function calculateDistanceKm(
  loc1: LocationData,
  loc2: LocationData
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (loc2.latitude - loc1.latitude) * (Math.PI / 180);
  const dLon = (loc2.longitude - loc1.longitude) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(loc1.latitude * (Math.PI / 180)) *
      Math.cos(loc2.latitude * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function getStatusColor(status: ContractorMeeting['status']): string {
  switch (status) {
    case 'scheduled':
      return theme.colors.textPrimary;
    case 'in_progress':
      return theme.colors.accent;
    case 'completed':
      return theme.colors.primary;
    case 'cancelled':
      return theme.colors.error;
    case 'rescheduled':
      return theme.colors.accent;
    default:
      return theme.colors.textSecondary;
  }
}

export function formatMeetingTime(dateTime: string): string {
  const date = new Date(dateTime);
  return date.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatUpdateTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}
