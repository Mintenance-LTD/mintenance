import { StyleSheet, Platform } from 'react-native';
import { theme } from '../../../theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // Full-bleed Hero
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    overflow: 'hidden',
  },
  heroDecorCircle: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: -50,
    right: -40,
  },
  heroDecorSmall: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.04)',
    bottom: 10,
    left: -20,
  },
  heroDecorDiamond: {
    position: 'absolute',
    width: 50,
    height: 50,
    backgroundColor: 'rgba(255,255,255,0.05)',
    top: 80,
    right: 60,
    transform: [{ rotate: '45deg' }],
    borderRadius: 6,
  },
  heroNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    zIndex: 1,
  },
  heroNavTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textInverse,
    letterSpacing: -0.3,
  },
  heroLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
    zIndex: 1,
  },
  heroAmount: {
    fontSize: 40,
    fontWeight: '700',
    color: theme.colors.textInverse,
    letterSpacing: -1.5,
    marginBottom: 24,
    zIndex: 1,
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  heroStat: {
    alignItems: 'flex-start',
  },
  heroStatValue: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.textInverse,
    letterSpacing: -0.3,
  },
  heroStatLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
    marginTop: 2,
  },
  heroStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 24,
  },

  // Stat Cards — overlap hero bottom
  statCardsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginTop: -20,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 },
      android: { elevation: 4 },
    }),
  },
  statCardValue: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    letterSpacing: -0.3,
    marginTop: 6,
  },
  statCardLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },

  // Content body
  contentBody: {
    paddingHorizontal: 16,
  },

  // Section Card
  sectionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 12 },
      android: { elevation: 2 },
    }),
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    letterSpacing: -0.3,
  },
  viewAllText: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },

  // Budget Overview
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  budgetItem: {},
  budgetLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
    marginBottom: 4,
  },
  budgetValue: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    letterSpacing: -0.3,
  },
  budgetBarBg: {
    height: 8,
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  budgetBarFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },
  budgetHint: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: '600',
  },

  // Donut
  donutContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  donutOuter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 12,
    borderColor: theme.colors.border,
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutInner: {
    alignItems: 'center',
  },
  donutTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    letterSpacing: -0.3,
  },
  donutLabel: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    fontWeight: '500',
    marginTop: 1,
  },
  donutLegend: {
    flex: 1,
    marginLeft: 20,
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 13,
    color: theme.colors.textPrimary,
    fontWeight: '500',
    flex: 1,
  },
  legendPercent: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },

  // Category Progress Bars
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  categoryIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryName: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  categoryAmount: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 6,
    borderRadius: 3,
  },

  // Subscription
  subscriptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 12 },
      android: { elevation: 2 },
    }),
  },
  subscriptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  subscriptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subscriptionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    textTransform: 'capitalize',
  },
  subscriptionStatus: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '500',
    marginTop: 2,
    textTransform: 'capitalize',
  },

  // Transactions
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.borderLight,
  },
  transactionRowLast: {
    borderBottomWidth: 0,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
    marginRight: 12,
  },
  transactionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  transactionDate: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  transactionStatusWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  transactionStatus: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'capitalize',
  },

  // Empty
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textTertiary,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 13,
    color: theme.colors.textTertiary,
    textAlign: 'center',
  },

  bottomSpacer: {
    height: 20,
  },
});
