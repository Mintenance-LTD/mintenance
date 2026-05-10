import { Platform, StyleSheet } from 'react-native';
import { theme } from '../../../theme';

/**
 * StyleSheet for the Subscription screen + sub-components.
 * Extracted 2026-05-09 (AUDIT_PUNCH_LIST P2 #44f).
 */
export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  statusCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  statusLabel: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planName: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    textTransform: 'capitalize',
  },
  trialChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.accentLight,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  trialText: {
    fontSize: 13,
    color: theme.colors.accent,
    fontWeight: '600',
  },
  periodText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 6,
  },
  cancelBtn: {
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 14,
  },
  planCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  currentPlanCard: {
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  selectedPlanCard: {
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  planTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  planPrice: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginTop: 4,
  },
  planCycle: {
    fontSize: 14,
    fontWeight: '400',
    color: theme.colors.textTertiary,
  },
  badgeStack: {
    gap: 4,
    alignItems: 'flex-end',
  },
  recommendedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.accentLight,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  recommendedText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.accent,
  },
  currentBadge: {
    backgroundColor: theme.colors.primaryLight,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  currentBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  featureCheckWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  subscribeBtn: {
    marginTop: 16,
    borderRadius: 28,
  },
  inlineCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  inlineText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
  },
  retryBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 10,
    marginTop: 4,
  },
  retryBtnText: {
    color: theme.colors.textInverse,
    fontSize: 14,
    fontWeight: '600',
  },
});
