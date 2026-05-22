/**
 * Styles for ContractorDashboard — Direction A · Mint Editorial.
 *
 * Extracted from ContractorDashboard.tsx (2026-04-20) to keep the
 * dashboard under the 500-line pre-commit gate. Token-styled on the
 * `me` palette (design-system/mint-editorial.ts).
 */

import { StyleSheet } from 'react-native';
import { me } from '../../design-system/mint-editorial';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: me.bg },

  // ─────────────────────────────────────────────────────────────
  // Mint Editorial v2 (2026-05-22, from
  // .design-bundle/.../redesign-v2/mobile-screens.jsx HomeC):
  // slim top bar + caption (date) + serif greeting. Replaces
  // the brand-gradient hero + overlapping stat treatment. The
  // legacy hero / decor / greeting / overlappingStats styles
  // below are kept un-pruned to keep the diff focused; they're
  // no longer referenced by ContractorDashboard but other
  // contractor surfaces may copy from them.
  // ─────────────────────────────────────────────────────────────
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: me.bg,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandText: {
    fontFamily: me.font.display,
    fontSize: 21,
    color: me.ink,
    letterSpacing: me.displayTracking,
  },
  brandIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  greetingBlock: {
    paddingHorizontal: 20,
    paddingBottom: 18,
  },
  greetingCaption: {
    fontSize: 13,
    color: me.ink3,
    marginBottom: 4,
  },
  greetingTitle: {
    fontFamily: me.font.display,
    fontSize: 28,
    lineHeight: 32,
    color: me.ink,
    letterSpacing: me.displayTracking,
  },
  // Stats row replaces the previous overlapping-on-gradient
  // treatment. Now sits on the paper background with regular
  // padding.
  statsRow: {
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  hero: {
    paddingBottom: 56,
    paddingHorizontal: 20,
    overflow: 'hidden',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  overlappingStats: {
    marginTop: -36,
    paddingHorizontal: 20,
    zIndex: 10,
  },
  decorCircle1: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: -40,
    left: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  decorDiamond: {
    position: 'absolute',
    top: 80,
    right: 60,
    width: 60,
    height: 60,
    backgroundColor: 'rgba(255,255,255,0.05)',
    transform: [{ rotate: '45deg' }],
    borderRadius: 8,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoIcon: { width: 28, height: 28, borderRadius: 6 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  notifBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: me.errFg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    // Editorial v2: badge ring now matches the paper background
    // instead of the brand gradient that used to sit behind it.
    borderWidth: 2,
    borderColor: me.bg,
  },
  notifBadgeText: {
    color: me.onBrand,
    fontSize: 10,
    fontWeight: '700',
  },
  // Editorial v2: icon button is now a transparent affordance on
  // the paper top bar — no fill, just hitbox + ink-coloured icon.
  headerIconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Editorial v2: solid brand fill on the avatar pill so the
  // identity is unmissable against the light top bar.
  avatarButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: me.brand,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: me.onBrand,
    fontSize: 13,
    fontWeight: '700',
  },
  greeting: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  heroName: {
    fontFamily: me.font.display,
    fontSize: 30,
    color: me.onBrand,
    marginBottom: 20,
    letterSpacing: me.displayTracking,
  },
  content: { paddingHorizontal: 20, paddingTop: 8 },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: me.bg,
    padding: 40,
  },
  errorIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  errorEmoji: { fontSize: 28, fontWeight: '700', color: me.errFg },
  errorText: {
    fontSize: 16,
    color: me.ink,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: me.brand,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: me.radius.btn,
  },
  retryButtonText: {
    color: me.onBrand,
    fontSize: 15,
    fontWeight: '600',
  },
  bottomSpacer: { height: 40 },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  dropdownCard: {
    position: 'absolute',
    right: 12,
    width: 260,
    backgroundColor: me.surface,
    borderRadius: 12,
    overflow: 'hidden',
    maxHeight: 420,
    borderWidth: 1,
    borderColor: me.line,
    ...me.shadow.pop,
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
  },
  dropdownAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: me.brand,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownAvatarText: {
    color: me.onBrand,
    fontSize: 14,
    fontWeight: '700',
  },
  dropdownUserInfo: { flex: 1 },
  dropdownUserName: {
    fontSize: 14,
    fontWeight: '700',
    color: me.ink,
  },
  dropdownUserRole: {
    fontSize: 12,
    color: me.ink2,
    marginTop: 1,
  },
  dropdownDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: me.line,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: me.line2,
  },
  dropdownItemLast: { borderBottomWidth: 0 },
  dropdownItemIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownItemText: { flex: 1 },
  dropdownItemLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: me.ink,
  },
  dropdownItemSubtitle: {
    fontSize: 11,
    color: me.ink2,
    marginTop: 1,
  },
});
