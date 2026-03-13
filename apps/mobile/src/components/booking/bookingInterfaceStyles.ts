import { StyleSheet, Dimensions, Platform } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EBEBEB',
  },
  backButton: {
    padding: 8,
  },
  backText: {
    fontSize: 15,
    color: '#222222',
    fontWeight: '500',
  },
  contractorInfo: {
    alignItems: 'center',
  },
  contractorName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222222',
  },
  contractorRating: {
    fontSize: 13,
    color: '#717171',
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: '#F7F7F7',
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
    backgroundColor: '#EBEBEB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  completedCircle: {
    backgroundColor: '#222222',
  },
  activeCircle: {
    backgroundColor: '#222222',
  },
  stepNumber: {
    fontSize: 13,
    fontWeight: '600',
    color: '#717171',
  },
  activeStepNumber: {
    color: '#FFFFFF',
  },
  stepText: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#717171',
    marginBottom: 6,
  },
  activeStepTitle: {
    color: '#222222',
    fontWeight: '600',
  },
  stepSubtitle: {
    fontSize: 13,
    color: '#B0B0B0',
  },
  stepConnector: {
    width: 2,
    height: 16,
    backgroundColor: '#EBEBEB',
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
    color: '#222222',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 15,
    color: '#717171',
    marginBottom: 24,
  },
  servicesGrid: {
    gap: 16,
  },
  serviceCard: {
    backgroundColor: '#FFFFFF',
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
    borderColor: '#222222',
  },
  popularBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  popularText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  serviceName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222222',
    marginBottom: 8,
  },
  serviceDescription: {
    fontSize: 15,
    color: '#717171',
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
    color: '#B0B0B0',
  },
  servicePrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222222',
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
    color: '#222222',
  },
  textInput: {
    backgroundColor: '#F7F7F7',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 15,
    color: '#222222',
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
    backgroundColor: '#F7F7F7',
    alignItems: 'center',
  },
  selectedUrgencyButton: {
    backgroundColor: '#222222',
  },
  urgencyText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#717171',
  },
  selectedUrgencyText: {
    color: '#FFFFFF',
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
    backgroundColor: '#F7F7F7',
    minWidth: (screenWidth - 64) / 3,
    alignItems: 'center',
  },
  selectedTimeSlot: {
    backgroundColor: '#222222',
  },
  unavailableTimeSlot: {
    backgroundColor: '#F7F7F7',
    opacity: 0.5,
  },
  timeSlotText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#222222',
  },
  selectedTimeSlotText: {
    color: '#FFFFFF',
  },
  unavailableTimeSlotText: {
    color: '#B0B0B0',
  },
  timeSlotPrice: {
    fontSize: 13,
    color: '#717171',
    marginTop: 6,
  },
  confirmationCard: {
    backgroundColor: '#FFFFFF',
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
    color: '#717171',
    marginBottom: 6,
  },
  confirmationValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222222',
    marginBottom: 6,
  },
  confirmationSubtext: {
    fontSize: 13,
    color: '#717171',
  },
  confirmationDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#EBEBEB',
    marginVertical: 20,
  },
  confirmationPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222222',
  },
  bottomAction: {
    padding: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#EBEBEB',
    backgroundColor: '#FFFFFF',
  },
  nextButton: {
    backgroundColor: '#222222',
    paddingVertical: 20,
    borderRadius: 28,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#B0B0B0',
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  bookButton: {
    backgroundColor: '#222222',
    paddingVertical: 20,
    borderRadius: 28,
    alignItems: 'center',
  },
  bookButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
