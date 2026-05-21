import { StyleSheet } from 'react-native';
import { me } from '../../../design-system/mint-editorial';

export const styles = StyleSheet.create({
  section: { marginBottom: 14 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  eyebrow: {
    fontSize: 11,
    color: me.ink3,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    fontWeight: '700',
  },
  seeAll: { fontSize: 11, color: me.brand, fontWeight: '600' },

  row: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    marginBottom: 8,
    backgroundColor: me.surface,
    borderWidth: 1,
    borderColor: me.line,
    borderRadius: 14,
    alignItems: 'center',
  },
  rowHot: { borderColor: me.brand },
  leftRail: {
    width: 4,
    height: 36,
    borderRadius: 9999,
    backgroundColor: me.bg3,
  },
  leftRailHot: { backgroundColor: me.brand },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 14, fontWeight: '600', color: me.ink },
  rowSubtitle: { fontSize: 11, color: me.ink3 },

  pill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9999,
    minWidth: 38,
    alignItems: 'center',
  },
  pillHot: { backgroundColor: me.brand },
  pillCool: { backgroundColor: me.bg3 },
  pillText: { fontSize: 11, fontWeight: '700' },
  pillTextHot: { color: me.onBrand },
  pillTextCool: { color: me.ink3 },
});
