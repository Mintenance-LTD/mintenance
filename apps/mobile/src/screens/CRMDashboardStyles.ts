import { StyleSheet } from 'react-native';
import { me } from '../design-system/mint-editorial';

const shadow = me.shadow.card as Record<string, unknown>;

export const styles = StyleSheet.create({
  // Bake the light-mode background in at module load so we don't end up
  // with a dark reactive backgroundColor rendering under static-light
  // text colors captured elsewhere in this StyleSheet — which is exactly
  // what produced the invisible-dark-on-dark rendering in the earlier
  // user-reported screenshot. Keeping this screen light until the
  // whole app is dark-mode-aware.
  root: { flex: 1, backgroundColor: me.bg },
  // Editorial v2 (2026-05-22): slim top bar (back arrow only) +
  // separate screenHeader block. Replaces the older centered
  // phone-app navbar + sumBar pattern. Legacy `hdr` / `hdrTitle`
  // / `sumBar` / `sumTxt` styles removed alongside.
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenHeader: {
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: me.brand,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  headline: {
    fontFamily: me.font.display,
    fontSize: 30,
    lineHeight: 34,
    color: me.ink,
    letterSpacing: me.displayTracking,
  },
  headerSub: {
    fontSize: 13,
    color: me.ink3,
    marginTop: 6,
    lineHeight: 18,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
    gap: 10,
  },
  fltBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: me.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: me.line,
  },
  fltBtnOn: {
    backgroundColor: me.brand,
    borderColor: me.brand,
  },
  fltRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 24,
    backgroundColor: me.surface,
    borderWidth: 1,
    borderColor: me.line,
  },
  pillOn: {
    backgroundColor: me.brand,
    borderColor: me.brand,
  },
  pillTxt: {
    fontSize: 13,
    fontWeight: '600',
    color: me.ink2,
  },
  pillTxtOn: { color: me.onBrand },
  err: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: me.errBg,
  },
  errTxt: { fontSize: 13, color: me.errFg, textAlign: 'center' },
  list: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 32,
    flexGrow: 1,
  },
  card: {
    backgroundColor: me.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    ...shadow,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: me.bg2,
  },
  avatarFb: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: me.bg2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontSize: 15,
    fontWeight: '700',
    color: me.ink2,
  },
  info: { flex: 1, marginLeft: 12, marginRight: 8 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: me.ink,
    flexShrink: 1,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  sub: { fontSize: 13, color: me.ink2, marginTop: 2 },
  badge: {
    backgroundColor: me.bg2,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeTxt: {
    fontSize: 13,
    fontWeight: '700',
    color: me.ink,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    gap: 8,
  },
  actBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: me.bg2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyIco: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: me.bg2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyH: {
    fontSize: 18,
    fontWeight: '700',
    color: me.ink,
    marginBottom: 8,
  },
  emptyP: {
    fontSize: 14,
    fontWeight: '400',
    color: me.ink2,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 40,
    marginBottom: 28,
  },
  cta: {
    backgroundColor: me.brand,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 24,
  },
  ctaTxt: {
    color: me.onBrand,
    fontSize: 16,
    fontWeight: '700',
  },
});
