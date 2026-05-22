/**
 * Styles for JobDetailsScreen and its extracted sub-components.
 */
import { StyleSheet, Dimensions } from 'react-native';
import { me } from '../../design-system/mint-editorial';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: me.surface,
  },
  scrollView: {
    flex: 1,
  },
  placeholderHero: {
    height: Math.round(Dimensions.get('window').width * 0.6),
    backgroundColor: me.bg2,
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
    ...me.shadow.pop,
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
    ...me.shadow.pop,
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
    color: me.ink3,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: me.line,
    marginHorizontal: 20,
  },

  // -- Title Section --
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: me.ink,
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
    backgroundColor: me.bg2,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  urgentTag: {
    backgroundColor: me.errBg,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '500',
    color: me.ink2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  locationText: {
    fontSize: 15,
    color: me.ink2,
  },
  metaText: {
    fontSize: 13,
    color: me.ink3,
    marginTop: 4,
  },

  // -- Pricing --
  pricingCard: {
    backgroundColor: me.bg2,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: me.line,
  },
  pricingMain: {
    marginBottom: 12,
  },
  pricingAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: me.ink,
  },
  pricingLabelText: {
    fontSize: 13,
    color: me.ink2,
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
    color: me.ink2,
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
    color: me.ink2,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '500',
    color: me.ink,
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
    borderColor: me.errFg,
    backgroundColor: 'transparent',
  },
  withdrawBidText: {
    fontSize: 15,
    fontWeight: '600',
    color: me.errFg,
  },

  // -- Description --
  description: {
    fontSize: 15,
    color: me.ink2,
    lineHeight: 24,
  },

  // -- Bids Section --
  // Editorial v2 (2026-05-22): bid card promoted from a flat
  // bg2 rectangle to a surface card with a hairline border,
  // matching the design spec where each bid feels like its own
  // editorial item. Price uses the Inter-Black display face so
  // numerals carry the visual weight of a serif quote.
  bidCard: {
    backgroundColor: me.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: me.line,
    padding: 14,
    marginBottom: 10,
  },
  bidRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bidContractorName: {
    fontSize: 15,
    fontWeight: '600',
    color: me.ink,
  },
  bidAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bidAmount: {
    fontFamily: me.font.display,
    fontSize: 20,
    color: me.ink,
    letterSpacing: me.displayTracking,
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
    color: me.ink2,
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
    backgroundColor: me.surface,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: me.ink,
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
    color: me.ink,
    marginBottom: 2,
  },
  escrowStepDescription: {
    fontSize: 13,
    color: me.ink2,
    lineHeight: 20,
  },
  escrowFooterNote: {
    fontSize: 13,
    color: me.ink3,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  escrowModalButton: {
    backgroundColor: me.ink,
    borderRadius: 28,
    paddingVertical: 14,
    alignItems: 'center',
  },
  escrowModalButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: me.onBrand,
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
    borderBottomColor: me.line,
    gap: 12,
  },
  quickActionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500' as const,
    color: me.ink,
  },
  logExpenseRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: me.bg2,
  },
  logExpenseText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600' as const,
    color: me.ink,
  },
});
