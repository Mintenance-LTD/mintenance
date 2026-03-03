import { StyleSheet } from 'react-native';
import { theme } from '../../theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
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
    borderBottomColor: theme.colors.borderLight,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginBottom: 20,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: '48%',
    borderRadius: theme.borderRadius.lg,
    padding: 20,
    alignItems: 'center',
    marginBottom: 15,
  },
  categoryIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryName: {
    fontSize: 16,
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
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    marginRight: 10,
    marginBottom: 10,
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
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.base,
    paddingHorizontal: 15,
    backgroundColor: theme.colors.background,
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  textArea: {
    height: 120,
    paddingTop: 15,
  },
  priorityContainer: {
    marginTop: 10,
  },
  priorityCard: {
    padding: 15,
    borderRadius: theme.borderRadius.base,
    borderWidth: 2,
    backgroundColor: theme.colors.background,
    marginBottom: 10,
  },
  priorityName: {
    fontSize: 16,
    fontWeight: '700',
  },
  priorityDescription: {
    fontSize: 14,
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
    borderRadius: 12,
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
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.borderLight,
    borderStyle: 'dashed',
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removePhotoButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: theme.colors.white,
    borderRadius: 12,
  },
  addPhotoText: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginTop: 4,
  },
  footer: {
    padding: 20,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  submitButton: {
    height: 50,
    borderRadius: theme.borderRadius.base,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: theme.colors.textTertiary,
  },
  submitButtonText: {
    color: theme.colors.textInverse,
    fontSize: 16,
    fontWeight: '700',
  },
  propertyOption: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    backgroundColor: theme.colors.background,
  },
  propertyOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: '#F7F7F7',
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
    color: theme.colors.primary,
  },
  propertyLocation: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  addPropertyInline: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F7F7F7',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#EBEBEB',
    borderStyle: 'dashed',
    gap: 10,
  },
  addPropertyInlineText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
});
