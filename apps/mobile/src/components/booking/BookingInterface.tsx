import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Dimensions,
} from 'react-native';
import { theme } from '../../theme';
import { styles } from './bookingInterfaceStyles';

const { width: screenWidth } = Dimensions.get('window');

interface BookingStep {
  id: string;
  title: string;
  subtitle: string;
  completed: boolean;
  active: boolean;
}

interface TimeSlot {
  id: string;
  time: string;
  available: boolean;
  price?: number;
}

interface ServicePackage {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: string;
  popular?: boolean;
}

interface BookingInterfaceProps {
  contractorName: string;
  contractorRating: number;
  services: ServicePackage[];
  timeSlots: TimeSlot[];
  onBookingComplete: (booking: unknown) => void;
  onBack: () => void;
}

export const BookingInterface: React.FC<BookingInterfaceProps> = ({
  contractorName,
  contractorRating,
  services,
  timeSlots,
  onBookingComplete,
  onBack,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [jobDetails, setJobDetails] = useState({
    title: '',
    description: '',
    location: '',
    urgency: 'normal',
    budget: '',
  });

  const steps: BookingStep[] = [
    {
      id: 'service',
      title: 'Select Service',
      subtitle: 'Choose what you need help with',
      completed: !!selectedService,
      active: currentStep === 0,
    },
    {
      id: 'details',
      title: 'Job Details',
      subtitle: 'Tell us about your project',
      completed: jobDetails.title && jobDetails.description,
      active: currentStep === 1,
    },
    {
      id: 'schedule',
      title: 'Schedule',
      subtitle: 'Pick a convenient time',
      completed: !!selectedTimeSlot,
      active: currentStep === 2,
    },
    {
      id: 'confirm',
      title: 'Confirm',
      subtitle: 'Review and book',
      completed: false,
      active: currentStep === 3,
    },
  ];

  const selectedServiceData = services.find(s => s.id === selectedService);
  const selectedTimeData = timeSlots.find(t => t.id === selectedTimeSlot);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      onBack();
    }
  };

  const handleBooking = () => {
    const booking = {
      service: selectedServiceData,
      timeSlot: selectedTimeData,
      details: jobDetails,
      contractor: contractorName,
    };
    onBookingComplete(booking);
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return !!selectedService;
      case 1:
        return !!(jobDetails.title && jobDetails.description && jobDetails.location);
      case 2:
        return !!selectedTimeSlot;
      case 3:
        return true;
      default:
        return false;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.contractorInfo}>
          <Text style={styles.contractorName}>{contractorName}</Text>
          <Text style={styles.contractorRating}>⭐ {contractorRating}</Text>
        </View>
      </View>

      {/* Progress Steps */}
      <View style={styles.progressContainer}>
        {steps.map((step, index) => (
          <StepIndicator
            key={step.id}
            step={step}
            index={index}
            isLast={index === steps.length - 1}
          />
        ))}
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {currentStep === 0 && (
          <ServiceSelection
            services={services}
            selectedService={selectedService}
            onServiceSelect={setSelectedService}
          />
        )}

        {currentStep === 1 && (
          <JobDetailsForm
            details={jobDetails}
            onDetailsChange={setJobDetails}
          />
        )}

        {currentStep === 2 && (
          <TimeSlotSelection
            timeSlots={timeSlots}
            selectedTimeSlot={selectedTimeSlot}
            onTimeSlotSelect={setSelectedTimeSlot}
          />
        )}

        {currentStep === 3 && (
          <BookingConfirmation
            service={selectedServiceData}
            timeSlot={selectedTimeData}
            details={jobDetails}
            contractor={contractorName}
          />
        )}
      </ScrollView>

      {/* Bottom Action */}
      <View style={styles.bottomAction}>
        {currentStep < 3 ? (
          <TouchableOpacity
            style={[styles.nextButton, !canProceed() && styles.disabledButton]}
            onPress={handleNext}
            disabled={!canProceed()}
          >
            <Text style={styles.nextButtonText}>
              {currentStep === 2 ? 'Review Booking' : 'Continue'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.bookButton} onPress={handleBooking}>
            <Text style={styles.bookButtonText}>Confirm Booking</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// Step Components
const StepIndicator: React.FC<{
  step: BookingStep;
  index: number;
  isLast: boolean;
}> = ({ step, index, isLast }) => {
  return (
    <View style={styles.stepContainer}>
      <View style={styles.stepContent}>
        <View style={[
          styles.stepCircle,
          step.completed && styles.completedCircle,
          step.active && styles.activeCircle,
        ]}>
          <Text style={[
            styles.stepNumber,
            (step.completed || step.active) && styles.activeStepNumber,
          ]}>
            {step.completed ? '✓' : index + 1}
          </Text>
        </View>
        <View style={styles.stepText}>
          <Text style={[styles.stepTitle, step.active && styles.activeStepTitle]}>
            {step.title}
          </Text>
          <Text style={styles.stepSubtitle}>{step.subtitle}</Text>
        </View>
      </View>
      {!isLast && <View style={styles.stepConnector} />}
    </View>
  );
};

const ServiceSelection: React.FC<{
  services: ServicePackage[];
  selectedService: string | null;
  onServiceSelect: (id: string) => void;
}> = ({ services, selectedService, onServiceSelect }) => {
  return (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>What do you need help with?</Text>
      <Text style={styles.sectionSubtitle}>
        Choose the service that best matches your project
      </Text>

      <View style={styles.servicesGrid}>
        {services.map((service) => (
          <TouchableOpacity
            key={service.id}
            style={[
              styles.serviceCard,
              selectedService === service.id && styles.selectedServiceCard,
            ]}
            onPress={() => onServiceSelect(service.id)}
          >
            {service.popular && (
              <View style={styles.popularBadge}>
                <Text style={styles.popularText}>Popular</Text>
              </View>
            )}

            <Text style={styles.serviceName}>{service.name}</Text>
            <Text style={styles.serviceDescription}>{service.description}</Text>

            <View style={styles.serviceFooter}>
              <Text style={styles.serviceDuration}>{service.duration}</Text>
              <Text style={styles.servicePrice}>From ${service.price}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

interface JobDetails {
  title: string;
  description: string;
  location: string;
  preferredDate: string;
  urgency: string;
  [key: string]: string;
}

const JobDetailsForm: React.FC<{
  details: JobDetails;
  onDetailsChange: (details: JobDetails) => void;
}> = ({ details, onDetailsChange }) => {
  const updateDetail = (key: keyof JobDetails, value: string) => {
    onDetailsChange({ ...details, [key]: value });
  };

  return (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>Tell us about your project</Text>
      <Text style={styles.sectionSubtitle}>
        Provide details to help the contractor understand your needs
      </Text>

      <View style={styles.formContainer}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Project Title *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g., Fix leaky kitchen faucet"
            value={details.title}
            onChangeText={(text) => updateDetail('title', text)}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Description *</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            placeholder="Describe the work needed, any specific requirements, materials, etc."
            value={details.description}
            onChangeText={(text) => updateDetail('description', text)}
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Location *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter your address"
            value={details.location}
            onChangeText={(text) => updateDetail('location', text)}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Budget Range</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g., $100-200"
            value={details.budget}
            onChangeText={(text) => updateDetail('budget', text)}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Urgency</Text>
          <View style={styles.urgencyContainer}>
            {['normal', 'urgent', 'emergency'].map((urgency) => (
              <TouchableOpacity
                key={urgency}
                style={[
                  styles.urgencyButton,
                  details.urgency === urgency && styles.selectedUrgencyButton,
                ]}
                onPress={() => updateDetail('urgency', urgency)}
              >
                <Text style={[
                  styles.urgencyText,
                  details.urgency === urgency && styles.selectedUrgencyText,
                ]}>
                  {urgency.charAt(0).toUpperCase() + urgency.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
};

const TimeSlotSelection: React.FC<{
  timeSlots: TimeSlot[];
  selectedTimeSlot: string | null;
  onTimeSlotSelect: (id: string) => void;
}> = ({ timeSlots, selectedTimeSlot, onTimeSlotSelect }) => {
  return (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>When would you like to schedule?</Text>
      <Text style={styles.sectionSubtitle}>
        Choose a time that works for you
      </Text>

      <View style={styles.timeSlotsContainer}>
        {timeSlots.map((slot) => (
          <TouchableOpacity
            key={slot.id}
            style={[
              styles.timeSlot,
              !slot.available && styles.unavailableTimeSlot,
              selectedTimeSlot === slot.id && styles.selectedTimeSlot,
            ]}
            onPress={() => slot.available && onTimeSlotSelect(slot.id)}
            disabled={!slot.available}
          >
            <Text style={[
              styles.timeSlotText,
              !slot.available && styles.unavailableTimeSlotText,
              selectedTimeSlot === slot.id && styles.selectedTimeSlotText,
            ]}>
              {slot.time}
            </Text>
            {slot.price && (
              <Text style={styles.timeSlotPrice}>+${slot.price}</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const BookingConfirmation: React.FC<{
  service: ServicePackage | undefined;
  timeSlot: TimeSlot | undefined;
  details: JobDetails;
  contractor: string;
}> = ({ service, timeSlot, details, contractor }) => {
  return (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>Confirm your booking</Text>
      <Text style={styles.sectionSubtitle}>
        Review the details before confirming
      </Text>

      <View style={styles.confirmationCard}>
        <View style={styles.confirmationSection}>
          <Text style={styles.confirmationLabel}>Contractor</Text>
          <Text style={styles.confirmationValue}>{contractor}</Text>
        </View>

        <View style={styles.confirmationSection}>
          <Text style={styles.confirmationLabel}>Service</Text>
          <Text style={styles.confirmationValue}>{service?.name}</Text>
          <Text style={styles.confirmationSubtext}>{service?.description}</Text>
        </View>

        <View style={styles.confirmationSection}>
          <Text style={styles.confirmationLabel}>Project</Text>
          <Text style={styles.confirmationValue}>{details.title}</Text>
          <Text style={styles.confirmationSubtext}>{details.description}</Text>
        </View>

        <View style={styles.confirmationSection}>
          <Text style={styles.confirmationLabel}>Scheduled Time</Text>
          <Text style={styles.confirmationValue}>{timeSlot?.time}</Text>
        </View>

        <View style={styles.confirmationSection}>
          <Text style={styles.confirmationLabel}>Location</Text>
          <Text style={styles.confirmationValue}>{details.location}</Text>
        </View>

        <View style={styles.confirmationDivider} />

        <View style={styles.confirmationSection}>
          <Text style={styles.confirmationLabel}>Estimated Cost</Text>
          <Text style={styles.confirmationPrice}>
            From ${service?.price}{timeSlot?.price && ` + $${timeSlot.price}`}
          </Text>
        </View>
      </View>
    </View>
  );
};

