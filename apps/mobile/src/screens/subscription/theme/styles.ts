import { StyleSheet } from 'react-native';
import { me } from '../../../design-system/mint-editorial';

/**
 * StyleSheet for the Subscription screen + sub-components.
 * Extracted 2026-05-09 (AUDIT_PUNCH_LIST P2 #44f).
 */
export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: me.bg2,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  statusCard: {
    backgroundColor: me.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    ...me.shadow.card,
  },
  statusLabel: {
    fontSize: 12,
    color: me.ink3,
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
    color: me.ink,
    textTransform: 'capitalize',
  },
  trialChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: me.warnBg,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  trialText: {
    fontSize: 13,
    color: me.accent,
    fontWeight: '600',
  },
  periodText: {
    fontSize: 13,
    color: me.ink2,
    marginTop: 6,
  },
  cancelBtn: {
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: me.ink,
    marginBottom: 14,
  },
  planCard: {
    backgroundColor: me.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 14,
    ...me.shadow.card,
  },
  currentPlanCard: {
    borderWidth: 2,
    borderColor: me.brand,
  },
  selectedPlanCard: {
    borderWidth: 2,
    borderColor: me.brand,
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
    color: me.ink,
  },
  planPrice: {
    fontSize: 28,
    fontWeight: '700',
    color: me.ink,
    marginTop: 4,
  },
  planCycle: {
    fontSize: 14,
    fontWeight: '400',
    color: me.ink3,
  },
  badgeStack: {
    gap: 4,
    alignItems: 'flex-end',
  },
  recommendedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: me.warnBg,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  recommendedText: {
    fontSize: 11,
    fontWeight: '700',
    color: me.accent,
  },
  currentBadge: {
    backgroundColor: me.brandSoft,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  currentBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: me.brand,
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
    backgroundColor: me.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontSize: 14,
    color: me.ink2,
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
    color: me.ink2,
  },
  retryBtn: {
    backgroundColor: me.brand,
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 10,
    marginTop: 4,
  },
  retryBtnText: {
    color: me.onBrand,
    fontSize: 14,
    fontWeight: '600',
  },
});
