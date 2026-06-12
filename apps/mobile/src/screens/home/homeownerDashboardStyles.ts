import { StyleSheet } from 'react-native';
import { me } from '../../design-system/mint-editorial';

/**
 * HomeownerDashboard styles — Direction A · Mint Editorial.
 * Token-styled on the `me` palette (design-system/mint-editorial.ts).
 */

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: me.bg,
  },

  // ─────────────────────────────────────────────────────────────
  // Mint Editorial v2 (2026-05-22, from
  // .design-bundle/.../redesign-v2/mobile-screens.jsx HomeHO):
  // slim top bar + caption-greeting + serif headline. Replaces
  // the gradient hero + bento stat cards. Legacy hero/stat
  // styles below are kept for two reasons: (1) the parallel
  // ContractorDashboard still imports a couple of them and
  // (2) the diff stays small. They'll be pruned in a follow-up.
  // ─────────────────────────────────────────────────────────────
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: me.bg,
  },
  greetingBlock: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  greetingCaption: {
    fontSize: 13,
    color: me.ink3,
    marginBottom: 4,
  },
  greetingTitle: {
    fontFamily: me.font.display,
    fontSize: 30,
    lineHeight: 34,
    color: me.ink,
    letterSpacing: me.displayTracking,
    marginBottom: 8,
  },
  greetingSubtitle: {
    fontSize: 14,
    color: me.ink2,
    lineHeight: 20,
    marginBottom: 14,
  },
  // Emergency pill — outlined, paper-feeling. Reuses --err-fg for
  // the warning icon so the affordance is unmistakeable without
  // turning into a red shouty button.
  emergencyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9999,
    backgroundColor: me.errBg,
    borderWidth: 1,
    borderColor: me.errBg,
  },
  emergencyPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: me.errFg,
    letterSpacing: 0.2,
  },
  // AI damage-check pill — brand-soft sibling of the emergency pill.
  // Entry point for the single-photo Mint AI assessment modal.
  aiCheckPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9999,
    backgroundColor: me.brandSoft,
    borderWidth: 1,
    borderColor: me.brandSoft,
    marginTop: 8,
  },
  aiCheckPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: me.brand,
    letterSpacing: 0.2,
  },
  // Quick Post 2×2 trade grid — flat surfaces with brand-soft
  // icon tiles. Each tile preselects a category on tap.
  quickPostSection: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 16,
  },
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: me.ink3,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  quickPostGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickPostTile: {
    flexBasis: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: me.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: me.line,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  quickPostIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: me.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickPostLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: me.ink,
  },

  // Brand mark inside the top bar (kept — used by the editorial v2
  // top bar). Legacy gradient hero / decor / overlay / heroNav styles
  // were removed 2026-05-22 alongside the redesign.
  brandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  brandText: {
    fontFamily: me.font.display,
    fontSize: 21,
    // Editorial v2: the top bar is now on a light bg (no gradient),
    // so the wordmark inks in the ink colour rather than white.
    color: me.ink,
    letterSpacing: me.displayTracking,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  notificationButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: me.errFg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  notificationBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: me.onBrand,
  },
  profileButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    // Editorial v2: the avatar sits on a light top bar now, so use
    // the brand fill instead of a translucent-on-gradient look.
    backgroundColor: me.brand,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: me.onBrand,
  },

  // Legacy gradient-hero greeting + bento stat-card styles
  // (heroOverline / heroGreeting / heroSubtitle / heroEmergencyPill /
  // heroEmergencyPillText / statsCardsRow / statCard / statCardTop /
  // statCardTextCol / statCardLabel / statCardIconWrap /
  // statCardValue) were removed 2026-05-22 — the redesign uses the
  // editorial greetingBlock / greetingCaption / greetingTitle /
  // greetingSubtitle / emergencyPill / quickPostGrid styles above
  // instead. Listed here for the next person grep-hunting them.

  mainContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  // Dropdown
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingRight: 16,
  },
  dropdownMenu: {
    backgroundColor: me.surface,
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 220,
    borderWidth: 1,
    borderColor: me.line,
    ...me.shadow.pop,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  dropdownIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: me.bg2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownItemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: me.ink,
  },
  dropdownDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: me.line,
    marginVertical: 4,
    marginHorizontal: 16,
  },

  // Error
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
    backgroundColor: me.errBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
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

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: me.font.display,
    fontSize: 22,
    color: me.ink,
    letterSpacing: me.displayTracking,
  },
  viewAllLink: {
    fontSize: 14,
    fontWeight: '600',
    color: me.brand,
  },

  // Appointments — the homeowner's "Schedule" view inline on the
  // dashboard. Date block is mint-tinted with a serif day number to
  // match the Mint Editorial pattern used by Finance / Escrow heroes.
  appointmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: me.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: me.line2,
    ...me.shadow.card,
  },
  appointmentDateBlock: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: me.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  appointmentDay: {
    fontFamily: me.font.display,
    fontSize: 20,
    color: me.brand,
    letterSpacing: me.displayTracking,
    lineHeight: 22,
  },
  appointmentMonth: {
    fontSize: 9,
    fontWeight: '700',
    color: me.brand,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  appointmentInfo: {
    flex: 1,
  },
  appointmentTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: me.ink,
    marginBottom: 2,
  },
  appointmentMeta: {
    fontSize: 12,
    color: me.ink3,
    fontWeight: '600',
  },
});
