import { StyleSheet } from 'react-native';
import { me } from '../../design-system/mint-editorial';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: me.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: me.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: me.line,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: me.ink,
    textAlign: 'center',
  },
  scroll: { flex: 1 },

  // Profile row
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 22,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: me.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontFamily: me.font.display,
    fontSize: 22,
    color: me.onBrand,
    fontWeight: '600',
    letterSpacing: me.displayTracking,
  },
  profileMeta: { flex: 1 },
  profileName: {
    fontFamily: me.font.display,
    fontSize: 22,
    color: me.ink,
    letterSpacing: me.displayTracking,
  },
  profileLine: { fontSize: 12, color: me.ink3, marginTop: 2 },

  // Actions
  actionsRow: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: me.brandSoft,
  },
  actionLabel: { color: me.brand, fontSize: 13, fontWeight: '600' },

  // Stats
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
    fontSize: 18,
    color: me.ink,
    letterSpacing: me.displayTracking,
  },
  statLabel: {
    fontSize: 10,
    color: me.ink3,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginTop: 2,
    textAlign: 'center',
  },

  // Mint note
  mintNote: {
    backgroundColor: me.brandSoft,
    borderWidth: 1,
    borderColor: 'rgba(63,140,122,0.20)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
  },
  mintNoteBody: { fontSize: 13, color: me.ink, lineHeight: 19 },
  mintNoteLabel: { fontWeight: '700' },

  // Sections
  sectionEyebrow: {
    fontSize: 11,
    color: me.ink3,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    fontWeight: '700',
    marginBottom: 10,
  },

  // Property
  propertyCard: {
    backgroundColor: me.surface,
    borderWidth: 1,
    borderColor: me.line,
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
  },
  propertyAddress: {
    fontSize: 14,
    fontWeight: '500',
    color: me.ink,
    marginBottom: 2,
  },
  propertySub: { fontSize: 11, color: me.ink3, marginBottom: 10 },
  accessBlock: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    backgroundColor: me.bg2,
    borderRadius: 8,
  },
  accessLabel: { fontSize: 11, fontWeight: '700', color: me.ink2 },
  accessBody: { fontSize: 11, color: me.ink2, lineHeight: 18, flex: 1 },

  // Past jobs
  jobRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: me.line2,
  },
  jobRowFirst: { borderTopWidth: 0 },
  jobRowBody: { flex: 1 },
  jobRowTitle: { fontSize: 13, fontWeight: '500', color: me.ink },
  jobRowMeta: { fontSize: 11, color: me.ink3, marginTop: 2 },
  jobRowPrice: {
    fontFamily: me.font.display,
    fontSize: 15,
    color: me.ink,
    letterSpacing: me.displayTracking,
  },

  loadingWrap: { paddingVertical: 16, alignItems: 'center' },
  emptyLine: { fontSize: 13, color: me.ink3, marginBottom: 18 },
});
