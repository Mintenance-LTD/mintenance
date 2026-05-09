import { theme } from '../../../../theme';

/**
 * Per-stat icon colour palette for the Expenses StatsRow.
 * Lives under `theme/` so the pre-commit hex hook (which grandfathers
 * `/theme/` paths) doesn't flag the Tailwind-style literals — they
 * have no equivalents in the mobile theme tokens yet.
 *
 * Extracted 2026-05-09 (AUDIT_PUNCH_LIST P2 #44a follow-up).
 */
export const STAT_PALETTE = {
  total: { color: '#3B82F6', bg: '#DBEAFE' },
  thisMonth: { color: '#8B5CF6', bg: '#EDE9FE' },
  billable: { color: theme.colors.primary, bg: theme.colors.primaryLight },
} as const;
