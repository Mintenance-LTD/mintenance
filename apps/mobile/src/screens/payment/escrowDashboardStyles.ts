/**
 * EscrowDashboardScreen styles — split out to honour the 300-line
 * per-file MDC cap. All values are `me.*` tokens, never literal hex.
 */
import { StyleSheet } from 'react-native';
import { me } from '../../design-system/mint-editorial';

export const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: me.bg,
  },
  container: {
    flex: 1,
    backgroundColor: me.bg,
  },
  // Top nav row — minimal, paper background. We previously had a
  // boxed header bar with a centered title; the deck has a small back
  // button + an inline serif title further down with the eyebrow.
  topNav: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: me.bg2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  // Inline screen header — eyebrow + serif title + supporting copy.
  screenHeader: {
    marginTop: 6,
    marginBottom: 16,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: me.brand,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  headline: {
    fontFamily: me.font.display,
    fontSize: 32,
    color: me.ink,
    letterSpacing: me.displayTracking,
  },
  sub: {
    fontSize: 14,
    color: me.ink2,
    marginTop: 6,
  },
  // Amber held-in-escrow hero — replaces the 3 small SummaryCards.
  heroCard: {
    backgroundColor: me.warnBg,
    borderRadius: 18,
    padding: 18,
    marginBottom: 22,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  heroBody: {
    flex: 1,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: me.warnFg,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    marginBottom: 4,
  },
  heroAmount: {
    fontFamily: me.font.display,
    fontSize: 36,
    color: me.warnFg,
    letterSpacing: me.displayTracking,
  },
  heroSub: {
    fontSize: 13,
    color: me.warnFg,
    marginTop: 8,
    lineHeight: 18,
  },
  heroLockIcon: {
    marginTop: 4,
  },
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: me.ink3,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    marginBottom: 12,
  },
  // Per-job row.
  recordCard: {
    backgroundColor: me.surface,
    borderRadius: me.radius.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: me.line2,
    ...me.shadow.card,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 4,
  },
  recordTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: me.ink,
  },
  recordAmount: {
    fontFamily: me.font.display,
    fontSize: 18,
    color: me.ink,
    letterSpacing: me.displayTracking,
  },
  recordMeta: {
    fontSize: 12,
    color: me.ink3,
    marginBottom: 12,
  },
  // 4-step progress bar.
  progressTrack: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 8,
  },
  progressSeg: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: me.bg2,
  },
  progressSegDone: {
    backgroundColor: me.brand,
  },
  progressSegActive: {
    backgroundColor: me.warnFg,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: 10,
    color: me.ink3,
    fontWeight: '600',
    flex: 1,
    textAlign: 'left',
  },
  progressLabelEnd: {
    textAlign: 'right',
  },
  progressLabelCenter: {
    textAlign: 'center',
  },
  // Auto-release footer card.
  autoReleaseCard: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    backgroundColor: me.bg2,
    borderRadius: 14,
    marginTop: 16,
  },
  autoReleaseText: {
    flex: 1,
    fontSize: 12,
    color: me.ink2,
    lineHeight: 17,
  },
  autoReleaseStrong: {
    fontWeight: '700',
    color: me.ink,
  },
});
