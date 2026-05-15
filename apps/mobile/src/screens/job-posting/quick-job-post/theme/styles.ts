import { StyleSheet } from 'react-native';
import { me } from '../../../../design-system/mint-editorial';

/**
 * StyleSheet for the QuickJobPostScreen + sub-components.
 * Extracted 2026-05-09 (AUDIT_PUNCH_LIST P2 #44b).
 */
export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: me.bg2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
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
  headerSpacer: {
    width: 44,
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  subtitle: {
    fontSize: 14,
    color: me.ink2,
    marginTop: 16,
    marginBottom: 20,
  },

  propertyBanner: {
    backgroundColor: me.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    ...me.shadow.card,
  },
  propertyLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: me.ink3,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  propertyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  propertyText: {
    flex: 1,
  },
  propertyNameText: {
    fontSize: 16,
    fontWeight: '600',
    color: me.ink,
  },
  propertyAddressText: {
    fontSize: 13,
    color: me.ink2,
    marginTop: 1,
  },

  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: me.ink,
    marginBottom: 14,
  },

  templateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  templateCard: {
    width: '31%',
    backgroundColor: me.surface,
    borderRadius: 16,
    padding: 14,
    alignItems: 'flex-start',
    minHeight: 110,
    ...me.shadow.card,
  },
  templateCardActive: {
    backgroundColor: me.bg2,
  },
  templateIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: me.ink,
    marginTop: 8,
  },
  templateTitleActive: {
    color: me.ink,
  },
  templateBudget: {
    fontSize: 11,
    color: me.ink3,
    marginTop: 4,
  },

  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: me.ink2,
    marginBottom: 8,
    marginTop: 4,
  },
  input: {
    backgroundColor: me.bg2,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: me.ink,
    marginBottom: 12,
  },
  textArea: {
    minHeight: 80,
    paddingTop: 12,
  },

  budgetGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  budgetChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: me.surface,
    alignItems: 'center',
    ...me.shadow.card,
  },
  budgetChipActive: {
    backgroundColor: me.ink,
  },
  budgetText: {
    fontSize: 13,
    fontWeight: '500',
    color: me.ink2,
  },
  budgetTextActive: {
    color: me.onBrand,
    fontWeight: '700',
  },

  urgencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  urgencyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
    flex: 1,
    minWidth: '46%',
  },
  urgencyChipActive: {
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  urgencyText: {
    fontSize: 14,
    fontWeight: '600',
  },

  moreOptionsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 16,
  },
  moreOptionsText: {
    fontSize: 14,
    color: me.ink,
    fontWeight: '500',
  },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: me.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: me.line,
    paddingHorizontal: 20,
    paddingTop: 12,
    ...me.shadow.pop,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: me.ink,
    borderRadius: 28,
    paddingVertical: 16,
    gap: 8,
    minHeight: 56,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitText: {
    color: me.onBrand,
    fontSize: 16,
    fontWeight: '700',
  },
});
