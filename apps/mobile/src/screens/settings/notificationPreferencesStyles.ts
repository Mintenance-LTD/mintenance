/**
 * NotificationPreferencesScreen — styles split out to honour the
 * 300-line per-file MDC limit (the redesign added an urgent-always
 * banner + inline quiet-hours editor + purpose-grouped event rows).
 */
import { StyleSheet, Platform } from 'react-native';
import { me } from '../../design-system/mint-editorial';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: me.bg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: me.bg,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  headerWrap: {
    paddingTop: 12,
    paddingBottom: 18,
  },
  headline: {
    fontFamily: me.font.display,
    fontSize: 32,
    color: me.ink,
    letterSpacing: me.displayTracking,
  },
  sub: {
    fontSize: 13,
    color: me.ink2,
    lineHeight: 18,
    marginTop: 6,
  },
  // Urgent-always banner — explains that critical alerts bypass all
  // toggles. Sets expectation before users start muting things.
  urgentBanner: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    backgroundColor: me.brandSoft,
    borderRadius: 14,
    marginBottom: 20,
  },
  urgentBannerIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: me.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  urgentBannerText: {
    flex: 1,
    fontSize: 12,
    color: me.ink2,
    lineHeight: 17,
  },
  urgentBannerStrong: {
    fontWeight: '700',
    color: me.brand,
  },
  // Purpose group — one card per behaviour bucket.
  group: {
    backgroundColor: me.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: me.line2,
    ...me.shadow.card,
  },
  groupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  groupIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: me.ink,
    flex: 1,
  },
  groupAllMuted: {
    fontSize: 11,
    color: me.ink3,
    fontWeight: '600',
  },
  // Channel header — small Push / Email / SMS / In-app row above the
  // first event in each group. Quietly tells the user what those
  // switches will gate.
  channelStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 16,
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: me.line2,
  },
  channelLabel: {
    fontSize: 10,
    color: me.ink3,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    width: 36,
    textAlign: 'center',
  },
  row: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: me.line2,
  },
  rowBare: {
    paddingVertical: 12,
  },
  rowFlex: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLabel: {
    flex: 1,
    fontSize: 14,
    color: me.ink,
    marginRight: 12,
    lineHeight: 19,
  },
  rowSub: {
    fontSize: 11,
    color: me.ink3,
    marginTop: 2,
  },
  // Quiet hours card — inline HH:MM input instead of "edit on web".
  quietCard: {
    backgroundColor: me.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: me.line2,
    ...me.shadow.card,
  },
  quietTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: me.ink,
    marginBottom: 4,
  },
  quietDesc: {
    fontSize: 12,
    color: me.ink2,
    lineHeight: 17,
    marginBottom: 14,
  },
  quietRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  quietInputBlock: {
    flex: 1,
  },
  quietInputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: me.ink3,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  quietInput: {
    backgroundColor: me.bg,
    borderWidth: 1,
    borderColor: me.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    fontSize: 15,
    color: me.ink,
  },
  quietArrow: {
    paddingTop: 18,
  },
  quietTimezone: {
    fontSize: 11,
    color: me.ink3,
    marginTop: 10,
  },
  quietToggleBtn: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: me.bg2,
    borderWidth: 1,
    borderColor: me.line2,
  },
  quietToggleBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: me.ink,
  },
  footer: {
    backgroundColor: me.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: me.line,
    paddingHorizontal: 16,
    paddingTop: 12,
    ...me.shadow.pop,
  },
  saveButton: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: me.brand,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: me.onBrand,
    fontSize: 15,
    fontWeight: '700',
  },
});
