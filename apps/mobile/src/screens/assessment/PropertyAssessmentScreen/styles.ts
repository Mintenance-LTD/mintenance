import { StyleSheet } from 'react-native';
import { me } from '../../../design-system/mint-editorial';

const borderedCard = {
  backgroundColor: me.surface,
  borderRadius: 20,
  padding: 16,
  marginBottom: 16,
  borderWidth: 1,
  borderColor: me.line,
} as const;

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: me.bg2 },
  content: { padding: 16 },
  stepsSection: { ...borderedCard },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: me.ink3,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  formSection: { ...borderedCard },

  // Property info form
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: me.ink2,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: me.bg2,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: me.ink,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: me.bg2,
    borderWidth: 1,
    borderColor: me.line,
  },
  chipSelected: {
    backgroundColor: me.brandSoft,
    borderColor: me.brand,
  },
  chipText: { fontSize: 13, color: me.ink2, fontWeight: '500' },
  chipTextSelected: { color: me.brand, fontWeight: '700' },
  saveFormButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: me.brand,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 16,
  },
  saveFormButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Video done
  videoDoneRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  videoDoneText: { fontSize: 14, color: me.ink, fontWeight: '500' },

  // Photo grid
  photoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  photoThumb: { width: 80, height: 80, borderRadius: 10, overflow: 'hidden' },
  photoImage: { width: '100%', height: '100%' },
  photoRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Notes
  notesInput: {
    backgroundColor: me.bg2,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: me.ink,
    minHeight: 120,
  },

  // Review
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: me.line,
  },
  reviewLabel: { fontSize: 14, color: me.ink2 },
  reviewValue: {
    fontSize: 14,
    fontWeight: '600',
    color: me.ink,
    maxWidth: '60%',
    textAlign: 'right',
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: me.ink,
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  submitButtonText: {
    color: me.onBrand,
    fontSize: 16,
    fontWeight: '700',
  },

  // Quick actions
  quickActions: { marginBottom: 16 },
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: me.ink,
    borderRadius: 24,
    paddingVertical: 16,
    gap: 10,
  },
  primaryActionText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  walkthroughAction: { marginTop: 12, backgroundColor: me.brand },
});
