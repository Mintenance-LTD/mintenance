import { StyleSheet } from 'react-native';
import { me } from '../design-system/mint-editorial';

// 2026-06-06 audit: extracted from DisputeScreen.tsx to keep the screen
// under the 500-line cap after adding the null-escrow guard. (#DBEAFE was
// swapped for the me.infoBg token in the move.)
export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: me.bg2,
  },
  scrollContent: {
    padding: 16,
  },
  jobCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: me.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
    gap: 12,
    ...me.shadow.card,
  },
  jobIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: me.infoBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  jobTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: me.ink,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: me.ink,
    marginBottom: 12,
  },
  reasonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
    gap: 10,
  },
  reasonCard: {
    width: '47%',
    backgroundColor: me.surface,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    ...me.shadow.card,
  },
  reasonCardSelected: {
    backgroundColor: me.ink,
  },
  reasonIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  reasonLabel: {
    fontSize: 13,
    color: me.ink2,
    fontWeight: '500',
    textAlign: 'center',
  },
  reasonLabelSelected: {
    color: me.onBrand,
    fontWeight: '600',
  },
  descriptionInput: {
    backgroundColor: me.surface,
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    color: me.ink,
    minHeight: 140,
    marginBottom: 4,
    ...me.shadow.card,
  },
  charCount: {
    fontSize: 12,
    color: me.ink3,
    textAlign: 'right',
    marginBottom: 20,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: me.errFg,
    paddingVertical: 16,
    borderRadius: 28,
    marginBottom: 16,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: me.onBrand,
    fontSize: 16,
    fontWeight: '700',
  },
  disclaimer: {
    fontSize: 12,
    color: me.ink3,
    lineHeight: 18,
    textAlign: 'center',
    paddingBottom: 16,
  },
  thumbList: { marginBottom: 12 },
  thumbWrap: { marginRight: 10, position: 'relative' },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: me.bg2,
  },
  thumbRemove: { position: 'absolute', top: -6, right: -6 },
  evidenceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: me.line,
    borderStyle: 'dashed',
    justifyContent: 'center',
    marginBottom: 20,
  },
  evidenceButtonText: {
    fontSize: 15,
    color: me.ink,
    fontWeight: '600',
  },
});
