import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Share,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { useHaptics } from '../utils/haptics';
import { useAuth } from '../contexts/AuthContext';
import { JobService } from '../services/JobService';
import { UserService } from '../services/UserService';
import { logger } from '../utils/logger';

interface BookingStatusParams {
  jobId?: string;
}

interface Props {
  route?: RouteProp<{ params: BookingStatusParams }>;
  navigation: StackNavigationProp<any>;
}

type BookingStatus = 'upcoming' | 'completed' | 'cancelled';

interface Booking {
  id: string;
  contractorName: string;
  contractorImage?: string;
  serviceName: string;
  address: string;
  serviceId: string;
  date: string;
  time: string;
  status: BookingStatus;
  amount: number;
  rating?: number;
  canCancel: boolean;
  canReschedule: boolean;
  estimatedDuration: string;
  specialInstructions?: string;
}

interface CancellationReason {
  id: string;
  reason: string;
}

const BookingStatusScreen: React.FC<Props> = ({ route, navigation }) => {
  const { user } = useAuth();
  const haptics = useHaptics();
  const { jobId } = route?.params || {};

  const [activeTab, setActiveTab] = useState<BookingStatus>('upcoming');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedCancelReason, setSelectedCancelReason] = useState<string>('');
  const [customCancelReason, setCustomCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const cancellationReasons: CancellationReason[] = [
    { id: 'schedule_change', reason: 'Schedule Change' },
    { id: 'weather_conditions', reason: 'Weather conditions' },
    { id: 'parking_availability', reason: 'Parking Availability' },
    { id: 'lack_of_amenities', reason: 'Lack of amenities' },
    { id: 'alternative_option', reason: 'I have alternative option' },
    { id: 'other', reason: 'Other' },
  ];

  const tabs = [
    { id: 'upcoming', name: 'Upcoming', count: 0 },
    { id: 'completed', name: 'Completed', count: 0 },
    { id: 'cancelled', name: 'Cancelled', count: 0 },
  ];

  useEffect(() => {
    loadBookings();
  }, [user]);

  const loadBookings = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      // Get all jobs for the current user (both as homeowner and contractor)
      let allJobs: any[] = [];

      if (user.role === 'homeowner') {
        allJobs = await JobService.getJobsByHomeowner(user.id);
      } else if (user.role === 'contractor') {
        // Get jobs assigned to this contractor
        const assignedJobs = await JobService.getJobsByStatus(
          'assigned',
          user.id
        );
        const inProgressJobs = await JobService.getJobsByStatus(
          'in_progress',
          user.id
        );
        const completedJobs = await JobService.getJobsByStatus(
          'completed',
          user.id
        );
        allJobs = [...assignedJobs, ...inProgressJobs, ...completedJobs];
      }

      // Transform jobs to bookings format
      const jobBookings: Booking[] = await Promise.all(
        allJobs
          .filter((job) => job.contractor_id) // Only jobs with assigned contractors
          .map(async (job) => {
            let contractorName = 'Unknown Contractor';

            // Get contractor information
            if (job.contractor_id) {
              const contractorData = await UserService.getUserProfile(
                job.contractor_id
              );
              contractorName = contractorData
                ? `${contractorData.first_name || ''} ${contractorData.last_name || ''}`.trim()
                : 'Unknown Contractor';
            }

            return {
              id: job.id,
              contractorName,
              serviceName: job.title,
              address: job.location,
              serviceId: `#JOB${job.id.slice(-6).toUpperCase()}`,
              date: new Date(job.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              }),
              time: new Date(job.created_at).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
              }),
              status: mapJobStatusToBookingStatus(job.status),
              amount: job.budget,
              canCancel: job.status === 'assigned' && user.role === 'homeowner',
              canReschedule:
                job.status === 'assigned' && user.role === 'homeowner',
              estimatedDuration: estimateJobDuration(job.budget),
              specialInstructions:
                job.description.length > 100
                  ? `${job.description.substring(0, 100)}...`
                  : job.description,
              rating:
                job.status === 'completed' ? Math.random() * 1 + 4 : undefined, // Mock rating for completed jobs
            };
          })
      );

      setBookings(jobBookings);

      // Update tab counts
      tabs[0].count = jobBookings.filter((b) => b.status === 'upcoming').length;
      tabs[1].count = jobBookings.filter(
        (b) => b.status === 'completed'
      ).length;
      tabs[2].count = jobBookings.filter(
        (b) => b.status === 'cancelled'
      ).length;
    } catch (error) {
      logger.error('Error loading bookings:', error);
      Alert.alert('Error', 'Failed to load bookings');
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const mapJobStatusToBookingStatus = (jobStatus: string): BookingStatus => {
    switch (jobStatus) {
      case 'assigned':
      case 'in_progress':
        return 'upcoming';
      case 'completed':
        return 'completed';
      default:
        return 'cancelled';
    }
  };

  const estimateJobDuration = (budget: number): string => {
    if (budget < 100) return '1-2 hours';
    if (budget < 300) return '2-4 hours';
    if (budget < 600) return '4-6 hours';
    return '6+ hours';
  };

  const filteredBookings = bookings.filter(
    (booking) => booking.status === activeTab
  );

  const handleViewEReceipt = (booking: Booking) => {
    haptics.buttonPress();
    navigation.navigate('EReceipt', {
      bookingId: booking.id,
      serviceId: booking.serviceId,
      contractorName: booking.contractorName,
      serviceName: booking.serviceName,
      amount: booking.amount,
      date: booking.date,
      time: booking.time,
    });
  };

  const handleCancelBooking = (booking: Booking) => {
    haptics.buttonPress();
    setSelectedBooking(booking);
    setShowCancelModal(true);
  };

  const handleRescheduleBooking = (booking: Booking) => {
    haptics.buttonPress();
    navigation.navigate('RescheduleBooking', { bookingId: booking.id });
  };

  const handleContactContractor = (booking: Booking) => {
    haptics.buttonPress();

    Alert.alert(
      'Contact Contractor',
      `How would you like to contact ${booking.contractorName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call', onPress: () => handleCall(booking) },
        { text: 'Message', onPress: () => handleMessage(booking) },
      ]
    );
  };

  const handleCall = (booking: Booking) => {
    // In a real app, this would use the contractor's phone number
    Alert.alert('Calling', `Calling ${booking.contractorName}...`);
  };

  const handleMessage = (booking: Booking) => {
    navigation.navigate('Chat', {
      contractorName: booking.contractorName,
      bookingId: booking.id,
    });
  };

  const handleShareBooking = async (booking: Booking) => {
    haptics.buttonPress();
    try {
      await Share.share({
        message: `My upcoming service appointment with ${booking.contractorName} for ${booking.serviceName} on ${booking.date} at ${booking.time}`,
      });
    } catch (error) {
      console.error('Error sharing booking:', error);
    }
  };

  const submitCancellation = async () => {
    if (
      !selectedCancelReason ||
      (selectedCancelReason === 'other' && !customCancelReason.trim())
    ) {
      Alert.alert('Error', 'Please select a cancellation reason');
      return;
    }

    setCancelling(true);
    haptics.buttonPress();

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Update booking status
      setBookings((prev) =>
        prev.map((booking) =>
          booking.id === selectedBooking?.id
            ? { ...booking, status: 'cancelled' as BookingStatus }
            : booking
        )
      );

      setShowCancelModal(false);
      setSelectedBooking(null);
      setSelectedCancelReason('');
      setCustomCancelReason('');

      Alert.alert(
        'Booking Cancelled',
        'Your booking has been successfully cancelled. You will receive a confirmation email shortly.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to cancel booking. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  const renderBookingCard = (booking: Booking) => (
    <View key={booking.id} style={styles.bookingCard}>
      {/* Booking Header */}
      <View style={styles.bookingHeader}>
        <View style={styles.bookingInfo}>
          <Text style={styles.bookingDate}>
            {booking.date} - {booking.time}
          </Text>

          <View style={styles.contractorRow}>
            <View style={styles.contractorIcon}>
              <Ionicons name='person' size={24} color={theme.colors.primary} />
            </View>
            <View style={styles.contractorDetails}>
              <Text style={styles.contractorName}>
                {booking.contractorName}
              </Text>
              <View style={styles.serviceRow}>
                <Ionicons
                  name='location-outline'
                  size={14}
                  color={theme.colors.textSecondary}
                />
                <Text style={styles.serviceAddress}>{booking.address}</Text>
              </View>
              <View style={styles.serviceRow}>
                <Ionicons
                  name='document-text-outline'
                  size={14}
                  color={theme.colors.textSecondary}
                />
                <Text style={styles.serviceId}>
                  Service ID : {booking.serviceId}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Service Details */}
      <View style={styles.serviceDetails}>
        <Text style={styles.serviceName}>{booking.serviceName}</Text>
        <View style={styles.serviceMetaRow}>
          <View style={styles.serviceMeta}>
            <Ionicons
              name='time-outline'
              size={16}
              color={theme.colors.primary}
            />
            <Text style={styles.serviceMetaText}>
              {booking.estimatedDuration}
            </Text>
          </View>
          <View style={styles.serviceMeta}>
            <Ionicons
              name='cash-outline'
              size={16}
              color={theme.colors.secondary}
            />
            <Text style={styles.serviceMetaText}>
              ${booking.amount.toFixed(2)}
            </Text>
          </View>
        </View>

        {booking.specialInstructions && (
          <View style={styles.instructionsContainer}>
            <Ionicons
              name='information-circle-outline'
              size={16}
              color={theme.colors.accent}
            />
            <Text style={styles.instructionsText}>
              {booking.specialInstructions}
            </Text>
          </View>
        )}
      </View>

      {/* Status Badge */}
      <View
        style={[
          styles.statusBadge,
          booking.status === 'completed' && styles.completedBadge,
          booking.status === 'upcoming' && styles.upcomingBadge,
          booking.status === 'cancelled' && styles.cancelledBadge,
        ]}
      >
        <Text
          style={[
            styles.statusText,
            booking.status === 'completed' && styles.completedText,
            booking.status === 'upcoming' && styles.upcomingText,
            booking.status === 'cancelled' && styles.cancelledText,
          ]}
        >
          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
        </Text>
      </View>

      {/* Actions */}
      <View style={styles.bookingActions}>
        {booking.status === 'completed' && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleViewEReceipt(booking)}
          >
            <Text style={styles.actionButtonText}>View E-Receipt</Text>
          </TouchableOpacity>
        )}

        {booking.status === 'upcoming' && (
          <>
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                style={[styles.actionButton, styles.secondaryButton]}
                onPress={() => handleContactContractor(booking)}
              >
                <Ionicons
                  name='chatbubble-outline'
                  size={16}
                  color={theme.colors.primary}
                />
                <Text style={styles.secondaryButtonText}>Contact</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.secondaryButton]}
                onPress={() => handleShareBooking(booking)}
              >
                <Ionicons
                  name='share-outline'
                  size={16}
                  color={theme.colors.primary}
                />
                <Text style={styles.secondaryButtonText}>Share</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.actionButtonsRow}>
              {booking.canReschedule && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.rescheduleButton]}
                  onPress={() => handleRescheduleBooking(booking)}
                >
                  <Ionicons
                    name='calendar-outline'
                    size={16}
                    color={theme.colors.accent}
                  />
                  <Text style={styles.rescheduleButtonText}>Reschedule</Text>
                </TouchableOpacity>
              )}

              {booking.canCancel && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.cancelButton]}
                  onPress={() => handleCancelBooking(booking)}
                >
                  <Ionicons
                    name='close-circle-outline'
                    size={16}
                    color='#FF6B6B'
                  />
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

        {booking.status === 'completed' && booking.rating && (
          <View style={styles.ratingContainer}>
            <View style={styles.ratingStars}>
              {[...Array(5)].map((_, i) => (
                <Ionicons
                  key={i}
                  name={
                    i < Math.floor(booking.rating!) ? 'star' : 'star-outline'
                  }
                  size={14}
                  color='#FFD700'
                />
              ))}
              <Text style={styles.ratingText}>{booking.rating}</Text>
            </View>
            <TouchableOpacity style={styles.reviewButton}>
              <Text style={styles.reviewButtonText}>Leave Review</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );

  const renderCancelModal = () => (
    <Modal
      visible={showCancelModal}
      animationType='slide'
      presentationStyle='pageSheet'
      onRequestClose={() => setShowCancelModal(false)}
    >
      <View style={styles.cancelModalContainer}>
        <View style={styles.cancelModalHeader}>
          <TouchableOpacity onPress={() => setShowCancelModal(false)}>
            <Ionicons
              name='arrow-back'
              size={24}
              color={theme.colors.textPrimary}
            />
          </TouchableOpacity>
          <Text style={styles.cancelModalTitle}>Cancel Booking</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.cancelModalContent}>
          <Text style={styles.cancelQuestion}>
            Please select the reason for cancellations:
          </Text>

          {cancellationReasons.map((reason) => (
            <TouchableOpacity
              key={reason.id}
              style={[
                styles.reasonOption,
                selectedCancelReason === reason.id && styles.reasonSelected,
              ]}
              onPress={() => setSelectedCancelReason(reason.id)}
            >
              <View
                style={[
                  styles.radioButton,
                  selectedCancelReason === reason.id && styles.radioSelected,
                ]}
              >
                {selectedCancelReason === reason.id && (
                  <View style={styles.radioInner} />
                )}
              </View>
              <Text style={styles.reasonText}>{reason.reason}</Text>
            </TouchableOpacity>
          ))}

          {selectedCancelReason === 'other' && (
            <View style={styles.customReasonContainer}>
              <Text style={styles.customReasonLabel}>Other</Text>
              <TextInput
                style={styles.customReasonInput}
                multiline
                placeholder='Enter your Reason'
                placeholderTextColor={theme.colors.textTertiary}
                value={customCancelReason}
                onChangeText={setCustomCancelReason}
                maxLength={500}
              />
            </View>
          )}
        </ScrollView>

        <TouchableOpacity
          style={[
            styles.cancelConfirmButton,
            cancelling && styles.cancelConfirmButtonDisabled,
          ]}
          onPress={submitCancellation}
          disabled={cancelling}
        >
          {cancelling ? (
            <ActivityIndicator size='small' color={theme.colors.textInverse} />
          ) : (
            <Text style={styles.cancelConfirmButtonText}>Cancel Booking</Text>
          )}
        </TouchableOpacity>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons
            name='arrow-back'
            size={24}
            color={theme.colors.textPrimary}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bookings</Text>
        <TouchableOpacity>
          <Ionicons name='search' size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.activeTab]}
            onPress={() => {
              haptics.buttonPress();
              setActiveTab(tab.id as BookingStatus);
            }}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab.id && styles.activeTabText,
              ]}
            >
              {tab.name}
            </Text>
            {tab.count > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{tab.count}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size='large' color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading bookings...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentContainer}
        >
          {filteredBookings.length > 0 ? (
            filteredBookings.map(renderBookingCard)
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons
                name='calendar-outline'
                size={64}
                color={theme.colors.textTertiary}
              />
              <Text style={styles.emptyTitle}>No {activeTab} bookings</Text>
              <Text style={styles.emptyText}>
                {activeTab === 'upcoming'
                  ? "You don't have any upcoming appointments."
                  : `You don\'t have any ${activeTab} bookings to show.`}
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {renderCancelModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  activeTab: {
    borderBottomColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  activeTabText: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  tabBadge: {
    backgroundColor: theme.colors.secondary,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textInverse,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  bookingCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    ...theme.shadows.base,
    position: 'relative',
  },
  bookingHeader: {
    marginBottom: 16,
  },
  bookingInfo: {
    flex: 1,
  },
  bookingDate: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  contractorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  contractorIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contractorDetails: {
    flex: 1,
  },
  contractorName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  serviceAddress: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  serviceId: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  serviceDetails: {
    marginBottom: 16,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  serviceMetaRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 12,
  },
  serviceMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  serviceMetaText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  instructionsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: theme.colors.surfaceSecondary,
    padding: 12,
    borderRadius: 12,
  },
  instructionsText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  statusBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  completedBadge: {
    backgroundColor: theme.colors.secondary,
  },
  upcomingBadge: {
    backgroundColor: theme.colors.accent,
  },
  cancelledBadge: {
    backgroundColor: '#FF6B6B',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  completedText: {
    color: theme.colors.textInverse,
  },
  upcomingText: {
    color: theme.colors.textInverse,
  },
  cancelledText: {
    color: theme.colors.textInverse,
  },
  bookingActions: {
    gap: 12,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textInverse,
  },
  secondaryButton: {
    backgroundColor: theme.colors.surfaceSecondary,
    flexDirection: 'row',
    gap: 6,
  },
  secondaryButtonText: {
    color: theme.colors.primary,
  },
  rescheduleButton: {
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    flexDirection: 'row',
    gap: 6,
  },
  rescheduleButtonText: {
    color: theme.colors.accent,
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    flexDirection: 'row',
    gap: 6,
  },
  cancelButtonText: {
    color: '#FF6B6B',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  ratingStars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginLeft: 8,
  },
  reviewButton: {
    backgroundColor: theme.colors.surfaceSecondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  reviewButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Cancel Modal Styles
  cancelModalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  cancelModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  cancelModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  cancelModalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  cancelQuestion: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.textPrimary,
    marginBottom: 24,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 16,
  },
  reasonSelected: {
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: theme.colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.primary,
  },
  reasonText: {
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  customReasonContainer: {
    marginTop: 16,
    marginBottom: 24,
  },
  customReasonLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  customReasonInput: {
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.surface,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  cancelConfirmButton: {
    backgroundColor: '#FF6B6B',
    margin: 20,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelConfirmButtonDisabled: {
    opacity: 0.6,
  },
  cancelConfirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textInverse,
  },
});

export default BookingStatusScreen;
