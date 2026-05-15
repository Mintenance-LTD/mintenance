/**
 * Styles for ContractorVerificationScreen.
 *
 * Extracted from the screen file to keep it under the 500-line
 * pre-commit gate after the 20260420000001 schema-fix patch landed.
 */

import { StyleSheet } from 'react-native';
import { me } from '../../design-system/mint-editorial';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: me.bg2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: me.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: me.line,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: me.bg2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: me.ink,
  },
  scrollView: { flex: 1 },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: me.surface,
    margin: 16,
    padding: 16,
    borderRadius: 16,
    ...me.shadow.card,
  },
  infoBannerIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: me.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoBannerContent: { flex: 1 },
  infoBannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: me.ink,
    marginBottom: 4,
  },
  infoBannerText: {
    fontSize: 14,
    color: me.ink2,
    lineHeight: 20,
  },
  form: {
    backgroundColor: me.surface,
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 16,
    ...me.shadow.card,
  },
  formGroup: { marginBottom: 16 },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: me.ink,
    marginBottom: 6,
  },
  required: { color: me.errFg },
  input: {
    backgroundColor: me.bg2,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    color: me.ink,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  helpText: {
    fontSize: 12,
    color: me.ink2,
    marginTop: 4,
  },
  radioGroup: { marginTop: 4 },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: me.line,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioActive: { borderColor: me.ink },
  radioSelected: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: me.ink,
  },
  radioLabel: { fontSize: 15, color: me.ink },
  benefitsSection: {
    backgroundColor: me.surface,
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 16,
    ...me.shadow.card,
  },
  benefitsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: me.ink3,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  benefitItem: { fontSize: 14, color: me.ink },
  submitButton: {
    backgroundColor: me.ink,
    marginHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: 'center',
  },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: me.onBrand,
  },
  privacyNote: {
    fontSize: 12,
    color: me.ink3,
    textAlign: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 32,
  },
});
