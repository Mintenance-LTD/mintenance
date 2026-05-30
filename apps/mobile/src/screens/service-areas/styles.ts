/**
 * ServiceAreasScreen — styles split out to keep the screen file
 * under the 500-line pre-commit cap. Mint Editorial tokens only.
 */
import { StyleSheet } from 'react-native';
import { me } from '../../design-system/mint-editorial';

export const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: me.bg },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 4,
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
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: me.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenHeader: {
    paddingHorizontal: 20,
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
    color: me.ink3,
    marginTop: 4,
  },
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: me.ink3,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    marginTop: 22,
    marginBottom: 12,
  },
  chipsRow: {
    gap: 8,
    paddingBottom: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  chipCovered: {
    backgroundColor: me.brandSoft,
  },
  chipSurcharge: {
    backgroundColor: me.warnBg,
  },
  chipAdd: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: me.line,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextCovered: {
    color: me.brand,
  },
  chipTextSurcharge: {
    color: me.warnFg,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 60,
  },
  emptyList: {
    flexGrow: 1,
    paddingHorizontal: 32,
    justifyContent: 'center',
  },
  sep: { height: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: me.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: me.line2,
    borderRightColor: me.line2,
    borderBottomColor: me.line2,
    ...me.shadow.card,
  },
  areaName: {
    fontSize: 14,
    fontWeight: '700',
    color: me.ink,
  },
  areaMeta: {
    fontSize: 12,
    color: me.ink3,
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 16,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: me.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontFamily: me.font.display,
    fontSize: 24,
    color: me.ink,
    marginBottom: 8,
    letterSpacing: me.displayTracking,
  },
  emptyDesc: {
    fontSize: 13,
    color: me.ink2,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 18,
    maxWidth: 280,
  },
  emptyBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: me.ink,
  },
  emptyBtnTxt: {
    color: me.onBrand,
    fontSize: 13,
    fontWeight: '700',
  },
});
