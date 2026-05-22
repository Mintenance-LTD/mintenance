import { StyleSheet } from 'react-native';
import { me } from '../../design-system/mint-editorial';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: me.bg,
  },
  listContainer: {
    padding: 16,
  },
  // 2026-05-22 Mint Editorial v2: inline top bar replaces the
  // shared ScreenHeader + separate `screenLabel` eyebrow combo.
  // Eyebrow + serif headline on the left, mint-fill add button on
  // the right. Same pattern as HomeownerDashboard / BusinessHub.
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
  },
  headerBlock: {
    flex: 1,
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
    fontSize: 28,
    lineHeight: 32,
    color: me.ink,
    letterSpacing: me.displayTracking,
  },
  addButtonTop: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: me.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  propertyCard: {
    backgroundColor: me.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: me.line,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  propertyIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderText: {
    flex: 1,
    marginLeft: 12,
  },
  propertyAddress: {
    fontSize: 16,
    fontWeight: '600',
    color: me.ink,
  },
  propertyLocation: {
    fontSize: 13,
    color: me.ink2,
    marginTop: 2,
  },
  propertyMeta: {
    flexDirection: 'row',
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: me.line,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  metaText: {
    fontSize: 13,
    color: me.ink2,
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: me.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: me.line,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: me.ink,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: me.ink2,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: me.brand,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 28,
    gap: 8,
  },
  addButtonText: {
    color: me.onBrand,
    fontSize: 16,
    fontWeight: '600',
  },
  sortRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sortChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: me.surface,
    borderWidth: 1,
    borderColor: me.line,
  },
  sortChipActive: {
    backgroundColor: me.brand,
  },
  favChipActive: {
    backgroundColor: me.errBg,
  },
  sortChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: me.ink2,
  },
  sortChipTextActive: {
    color: me.onBrand,
  },
});
