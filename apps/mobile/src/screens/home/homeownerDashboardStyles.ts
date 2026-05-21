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

  // Full-bleed Hero
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    overflow: 'hidden',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },

  // Primary Post-a-Job CTA inside the hero (homeowner-specific)
  postJobButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 20,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  postJobButtonText: {
    color: me.onBrand,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  heroDecorCircle: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: -60,
    right: -50,
  },
  heroDecorSmall: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.04)',
    bottom: 20,
    left: -20,
  },
  heroDecorDiamond: {
    position: 'absolute',
    width: 50,
    height: 50,
    backgroundColor: 'rgba(255,255,255,0.05)',
    top: 100,
    right: 70,
    transform: [{ rotate: '45deg' }],
    borderRadius: 6,
  },

  // Nav inside hero
  heroNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    zIndex: 1,
  },
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
    color: me.onBrand,
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
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: me.onBrand,
  },

  // Greeting inside hero
  heroOverline: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 4,
    zIndex: 1,
  },
  heroGreeting: {
    fontFamily: me.font.display,
    fontSize: 34,
    color: me.onBrand,
    lineHeight: 38,
    letterSpacing: me.displayTracking,
    zIndex: 1,
  },
  heroSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 6,
    marginBottom: 14,
    zIndex: 1,
  },
  // Compact emergency CTA pill in the hero — see HomeownerDashboard
  // comment block for why this is a *separate* entry from the bottom
  // tab "Post Job" path.
  heroEmergencyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.32)',
    marginBottom: 24,
    zIndex: 1,
  },
  heroEmergencyPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: me.onBrand,
    letterSpacing: 0.2,
  },

  // Stats cards below hero — bento grid
  statsCardsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginTop: -24,
    marginBottom: 8,
    zIndex: 2,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: me.surface,
    borderRadius: me.radius.card,
    padding: 14,
    minHeight: 76,
    borderWidth: 1,
    borderColor: me.line,
    ...me.shadow.pop,
  },
  statCardTop: {
    // legacy — kept so any external consumer doesn't crash; no longer used in HomeownerDashboard
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statCardTextCol: {
    flex: 1,
    minWidth: 0,
  },
  statCardLabel: {
    fontSize: 11,
    color: me.ink2,
    fontWeight: '600',
    marginTop: 2,
  },
  statCardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  statCardValue: {
    fontFamily: me.font.display,
    fontSize: 24,
    color: me.ink,
    letterSpacing: me.displayTracking,
    lineHeight: 28,
  },

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
