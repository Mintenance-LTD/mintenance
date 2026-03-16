import { StyleSheet, Dimensions, Platform } from 'react-native';
import { theme } from '../../theme';

const { width: screenWidth } = Dimensions.get('window');

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: 8,
  },
  backText: {
    fontSize: 15,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  contractorInfo: {
    alignItems: 'center',
  },
  contractorName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  contractorRating: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  stepContainer: {
    marginBottom: 20,
  },
  stepContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  completedCircle: {
    backgroundColor: theme.colors.textPrimary,
  },
  activeCircle: {
    backgroundColor: theme.colors.textPrimary,
  },
  stepNumber: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  activeStepNumber: {
    color: theme.colors.textInverse,
  },
  stepText: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  activeStepTitle: {
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  stepSubtitle: {
    fontSize: 13,
    color: theme.colors.textTertiary,
  },
  stepConnector: {
    width: 2,
    height: 16,
    backgroundColor: theme.colors.border,
    marginLeft: 15,
    marginTop: 8,
  },
  content: {
    flex: 1,
  },
  sectionContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    marginBottom: 24,
  },
  servicesGrid: {
    gap: 16,
  },
  serviceCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  selectedServiceCard: {
    borderWidth: 2,
    borderColor: theme.colors.textPrimary,
  },
  popularBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  popularText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textInverse,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  serviceDescription: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    marginBottom: 16,
    lineHeight: 22,
  },
  serviceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceDuration: {
    fontSize: 13,
    color: theme.colors.textTertiary,
  },
  servicePrice: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  formContainer: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  textInput: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 15,
    color: theme.colors.textPrimary,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  urgencyContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  urgencyButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
  },
  selectedUrgencyButton: {
    backgroundColor: theme.colors.textPrimary,
  },
  urgencyText: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  selectedUrgencyText: {
    color: theme.colors.textInverse,
  },
  timeSlotsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  timeSlot: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: theme.colors.backgroundSecondary,
    minWidth: (screenWidth - 64) / 3,
    alignItems: 'center',
  },
  selectedTimeSlot: {
    backgroundColor: theme.colors.textPrimary,
  },
  unavailableTimeSlot: {
    backgroundColor: theme.colors.backgroundSecondary,
    opacity: 0.5,
  },
  timeSlotText: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  selectedTimeSlotText: {
    color: theme.colors.textInverse,
  },
  unavailableTimeSlotText: {
    color: theme.colors.textTertiary,
  },
  timeSlotPrice: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 6,
  },
  confirmationCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  confirmationSection: {
    marginBottom: 20,
  },
  confirmationLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  confirmationValue: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  confirmationSubtext: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  confirmationDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border,
    marginVertical: 20,
  },
  confirmationPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  bottomAction: {
    padding: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  nextButton: {
    backgroundColor: theme.colors.textPrimary,
    paddingVertical: 20,
    borderRadius: 28,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: theme.colors.textTertiary,
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textInverse,
  },
  bookButton: {
    backgroundColor: theme.colors.textPrimary,
    paddingVertical: 20,
    borderRadius: 28,
    alignItems: 'center',
  },
  bookButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textInverse,
  },
});
