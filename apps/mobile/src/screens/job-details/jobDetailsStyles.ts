/**
 * Styles for JobDetailsScreen and its extracted sub-components.
 */
import { StyleSheet, Dimensions, Platform } from 'react-native';
import { theme } from '../../theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  scrollView: {
    flex: 1,
  },
  placeholderHero: {
    height: Math.round(Dimensions.get('window').width * 0.6),
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // The hero overlay buttons sit on top of either a job photo
  // (dark-ish) or the placeholder gray gradient (light-ish). A
  // white-90% circle disappears against the latter — user flagged
  // both back + share as "hard to read". A dark semi-transparent
  // fill with a white icon (Airbnb-pattern) reads on both.
  backButton: {
    position: 'absolute',
    left: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
      },
      android: { elevation: 3 },
    }),
  },
  shareButton: {
    position: 'absolute',
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
      },
      android: { elevation: 3 },
    }),
  },

  // -- Sections --
  section: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  sectionPadded: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border,
    marginHorizontal: 20,
  },

  // -- Title Section --
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  urgentTag: {
    backgroundColor: '#FEE2E2',
  },
  tagText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  locationText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
  },
  metaText: {
    fontSize: 13,
    color: theme.colors.textTertiary,
    marginTop: 4,
  },

  // -- Pricing --
  pricingCard: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  pricingMain: {
    marginBottom: 12,
  },
  pricingAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  pricingLabelText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  escrowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  escrowText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },

  // -- Details --
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    minHeight: 48,
  },
  detailIconContainer: {
    width: 40,
    alignItems: 'center',
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.textPrimary,
    marginTop: 2,
  },

  // -- Withdraw Bid --
  withdrawBidButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: theme.colors.error,
    backgroundColor: 'transparent',
  },
  withdrawBidText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.error,
  },

  // -- Description --
  description: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    lineHeight: 24,
  },

  // -- Bids Section (inline styles kept minimal) --
  bidCard: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  bidRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bidContractorName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  bidAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bidAmount: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  bidStatusBadge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  bidStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  bidMessage: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 6,
  },

  // -- Escrow Info Modal --
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 20,
  },
  escrowStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    gap: 14,
  },
  escrowStepIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  escrowStepContent: {
    flex: 1,
  },
  escrowStepTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  escrowStepDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  escrowFooterNote: {
    fontSize: 13,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  escrowModalButton: {
    backgroundColor: theme.colors.textPrimary,
    borderRadius: 28,
    paddingVertical: 14,
    alignItems: 'center',
  },
  escrowModalButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textInverse,
  },
  quickActionsSection: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    paddingBottom: 24,
  },
  quickActionRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: theme.colors.border,
    gap: 12,
  },
  quickActionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500' as const,
    color: theme.colors.textPrimary,
  },
  logExpenseRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  logExpenseText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600' as const,
    color: theme.colors.textPrimary,
  },
});
