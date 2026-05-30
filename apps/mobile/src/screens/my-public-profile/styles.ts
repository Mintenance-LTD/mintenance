import { StyleSheet } from 'react-native';
import { me } from '../../design-system/mint-editorial';

const COVER_HEIGHT = 200;
const AVATAR_SIZE = 72;

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: me.bg },
  scroll: { flex: 1 },

  // Cover
  coverWrap: { position: 'relative' },
  cover: {
    height: COVER_HEIGHT,
    backgroundColor: me.bg3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverPlaceholder: {
    fontSize: 10,
    color: me.ink3,
    letterSpacing: 1.2,
    fontFamily: 'Menlo',
  },
  coverBtn: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverEditBtn: {
    position: 'absolute',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9999,
    backgroundColor: 'rgba(255,255,255,0.94)',
  },
  coverEditText: { fontSize: 12, fontWeight: '600', color: me.ink },

  // Avatar
  avatarFrame: {
    position: 'absolute',
    bottom: -AVATAR_SIZE / 2,
    left: 20,
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: me.brand,
    borderWidth: 4,
    borderColor: me.bg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarInitials: {
    fontFamily: me.font.display,
    fontSize: 28,
    color: me.onBrand,
    letterSpacing: me.displayTracking,
  },

  // Loading / error
  loadingWrap: {
    paddingTop: AVATAR_SIZE / 2 + 24,
    alignItems: 'center',
    gap: 6,
  },
  errorText: { color: me.ink2, fontSize: 14 },
  errorRetry: {
    color: me.brand,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },

  // Body
  body: {
    paddingTop: AVATAR_SIZE / 2 + 14,
    paddingHorizontal: 20,
  },
  name: {
    fontFamily: me.font.display,
    fontSize: 26,
    color: me.ink,
    letterSpacing: me.displayTracking,
  },
  subline: { fontSize: 13, color: me.ink3, marginTop: 4 },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
    marginBottom: 16,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pillBrand: { backgroundColor: me.brand },
  pillBrandText: { fontSize: 11, fontWeight: '600', color: me.onBrand },
  pillSoft: { backgroundColor: me.brandSoft },
  pillSoftText: { fontSize: 11, fontWeight: '600', color: me.brand },
  pillNeutral: { backgroundColor: me.bg2 },
  pillNeutralText: { fontSize: 11, fontWeight: '600', color: me.ink2 },

  // Bio + stats
  bio: {
    fontSize: 14,
    color: me.ink2,
    lineHeight: 21,
    marginBottom: 18,
  },
  statRow: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  statCard: {
    flex: 1,
    backgroundColor: me.surface,
    borderWidth: 1,
    borderColor: me.line,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: me.font.display,
    fontSize: 20,
    color: me.ink,
    letterSpacing: me.displayTracking,
  },
  statLabel: {
    fontSize: 10,
    color: me.ink3,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginTop: 2,
  },

  // Sections
  sectionEyebrow: {
    fontSize: 11,
    color: me.ink3,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    fontWeight: '700',
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 18,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9999,
    backgroundColor: me.surface,
    borderWidth: 1,
    borderColor: me.line,
  },
  chipText: { fontSize: 12, fontWeight: '500', color: me.ink },

  // Grid
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  gridTile: {
    width: '49%',
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: me.bg3,
  },

  // Empty states
  emptyServices: {
    padding: 14,
    backgroundColor: me.surface,
    borderWidth: 1,
    borderColor: me.line,
    borderRadius: 14,
    marginBottom: 18,
  },
  emptyServicesText: { fontSize: 13, color: me.brand, fontWeight: '600' },
  emptyPortfolio: {
    padding: 18,
    backgroundColor: me.surface,
    borderWidth: 1,
    borderColor: me.line,
    borderRadius: 14,
    alignItems: 'center',
  },
  emptyPortfolioText: {
    fontSize: 13,
    color: me.ink3,
    textAlign: 'center',
    lineHeight: 18,
  },
});
