import { StyleSheet } from 'react-native';
import { theme } from '../../theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  categorySection: {
    padding: 20,
  },
  section: {
    padding: 20,
    borderBottomWidth: 8,
    borderBottomColor: theme.colors.backgroundSecondary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    marginBottom: 16,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: '48%',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  categoryIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: theme.colors.border,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  subcategoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  subcategoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: theme.colors.backgroundSecondary,
    marginRight: 8,
    marginBottom: 8,
  },
  subcategoryText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  subcategoryTextSelected: {
    color: theme.colors.textInverse,
    fontWeight: '600',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    height: 50,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: theme.colors.textPrimary,
  },
  textArea: {
    height: 120,
    paddingTop: 14,
  },
  priorityContainer: {
    marginTop: 8,
  },
  priorityCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: theme.colors.backgroundSecondary,
    marginBottom: 8,
  },
  priorityName: {
    fontSize: 15,
    fontWeight: '700',
  },
  priorityDescription: {
    fontSize: 13,
    marginTop: 4,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  photoSlot: {
    width: '47%',
    aspectRatio: 4 / 3,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoSlotEmpty: {
    width: '47%',
    aspectRatio: 4 / 3,
    borderRadius: 16,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removePhotoButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
  },
  addPhotoText: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginTop: 4,
  },
  footer: {
    padding: 20,
    backgroundColor: theme.colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  submitButton: {
    height: 52,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.textPrimary,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: theme.colors.textInverse,
    fontSize: 16,
    fontWeight: '700',
  },
  propertyOption: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  propertyOptionSelected: {
    backgroundColor: '#DBEAFE',
  },
  propertyOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  propertyOptionText: {
    flex: 1,
    marginLeft: 12,
  },
  propertyAddress: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  propertyAddressSelected: {
    color: theme.colors.textPrimary,
  },
  propertyLocation: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  addPropertyInline: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 16,
    gap: 8,
  },
  addPropertyInlineText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
});
