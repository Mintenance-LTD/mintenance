import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EBEBEB',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F7F7F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222222',
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
    borderBottomColor: '#F7F7F7',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222222',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 15,
    color: '#717171',
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
    backgroundColor: '#F7F7F7',
  },
  categoryIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#EBEBEB',
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222222',
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
    backgroundColor: '#F7F7F7',
    marginRight: 8,
    marginBottom: 8,
  },
  subcategoryText: {
    fontSize: 14,
    color: '#717171',
  },
  subcategoryTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222222',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    height: 50,
    backgroundColor: '#F7F7F7',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#222222',
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
    backgroundColor: '#F7F7F7',
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
    backgroundColor: '#F7F7F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removePhotoButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  addPhotoText: {
    fontSize: 12,
    color: '#B0B0B0',
    marginTop: 4,
  },
  footer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#EBEBEB',
  },
  submitButton: {
    height: 52,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#222222',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  propertyOption: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    backgroundColor: '#F7F7F7',
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
    color: '#222222',
  },
  propertyAddressSelected: {
    color: '#222222',
  },
  propertyLocation: {
    fontSize: 12,
    color: '#717171',
    marginTop: 2,
  },
  addPropertyInline: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F7F7F7',
    borderRadius: 16,
    gap: 8,
  },
  addPropertyInlineText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#222222',
  },
});
