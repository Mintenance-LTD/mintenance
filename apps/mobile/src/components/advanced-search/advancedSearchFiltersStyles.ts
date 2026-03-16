import { StyleSheet } from 'react-native';
import { theme } from '../../theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  resetButton: {
    padding: 8,
  },
  resetText: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  sliderContainer: {
    marginTop: 8,
  },
  sliderLabel: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -8,
  },
  sliderLabelText: {
    fontSize: 12,
    color: theme.colors.textTertiary,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  priceInputContainer: {
    flex: 0.45,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  priceLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginRight: 8,
  },
  priceInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  switchLabel: {
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  skillChipSelected: {
    backgroundColor: theme.colors.textPrimary,
  },
  skillChipText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  skillChipTextSelected: {
    color: theme.colors.textInverse,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  starButton: {
    padding: 4,
  },
  ratingText: {
    marginLeft: 12,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  radioOptionSelected: {
    backgroundColor: theme.colors.backgroundSecondary,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioCircleSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.textPrimary,
  },
  radioText: {
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  footerInfo: {
    flex: 1,
  },
  footerText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  applyButton: {
    backgroundColor: theme.colors.textPrimary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 28,
    minWidth: 120,
    alignItems: 'center',
  },
  applyButtonDisabled: {
    opacity: 0.6,
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textInverse,
  },
});
