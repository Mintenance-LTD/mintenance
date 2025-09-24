/**
 * Booking View Model
 *
 * Handles all business logic for the BookingStatus screen.
 * Manages booking data loading, filtering, and cancellation logic.
 *
 * @filesize Target: <300 lines
 * @compliance Architecture principles - Business logic separation
 */

import { useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { JobService } from '../../../services/JobService';
import { UserService } from '../../../services/UserService';
import { logger } from '../../../utils/logger';

export type BookingStatus = 'upcoming' | 'completed' | 'cancelled';

export interface Booking {
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

export interface CancellationReason {
  id: string;
  reason: string;
}

export interface TabInfo {
  id: string;
  name: string;
  count: number;
}

export interface BookingViewModel {
  // State
  activeTab: BookingStatus;
  bookings: Booking[];
  loading: boolean;
  cancelling: boolean;

  // Computed
  filteredBookings: Booking[];
  tabs: TabInfo[];

  // Actions
  setActiveTab: (tab: BookingStatus) => void;
  refreshBookings: () => Promise<void>;
  cancelBooking: (bookingId: string, reason: string, customReason?: string) => Promise<void>;

  // Utilities
  mapJobStatusToBookingStatus: (jobStatus: string) => BookingStatus;
  estimateJobDuration: (budget: number) => string;
  formatBookingDate: (dateString: string) => string;
  formatBookingTime: (dateString: string) => string;
}

export const cancellationReasons: CancellationReason[] = [
  { id: 'schedule_change', reason: 'Schedule Change' },
  { id: 'weather_conditions', reason: 'Weather conditions' },
  { id: 'parking_availability', reason: 'Parking Availability' },
  { id: 'lack_of_amenities', reason: 'Lack of amenities' },
  { id: 'alternative_option', reason: 'I have alternative option' },
  { id: 'other', reason: 'Other' },
];

/**
 * Custom hook for Booking business logic
 */
export const useBookingViewModel = (user: any): BookingViewModel => {
  const [activeTab, setActiveTab] = useState<BookingStatus>('upcoming');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  // Load bookings from JobService
  const loadBookings = useCallback(async () => {
    if (!user?.id) {
      setBookings([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let allJobs: any[] = [];

      if (user.role === 'homeowner') {
        allJobs = await JobService.getJobsByHomeowner(user.id);
      } else if (user.role === 'contractor') {
        // Get jobs assigned to this contractor
        const assignedJobs = await JobService.getJobsByStatus('assigned', user.id);
        const inProgressJobs = await JobService.getJobsByStatus('in_progress', user.id);
        const completedJobs = await JobService.getJobsByStatus('completed', user.id);
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
              try {
                const contractorData = await UserService.getUserProfile(job.contractor_id);
                contractorName = contractorData
                  ? `${contractorData.first_name || ''} ${contractorData.last_name || ''}`.trim()
                  : 'Unknown Contractor';
              } catch (error) {
                logger.warn('Failed to load contractor data:', error);
              }
            }

            return {
              id: job.id,
              contractorName,
              serviceName: job.title,
              address: job.location,
              serviceId: `#JOB${job.id.slice(-6).toUpperCase()}`,
              date: formatBookingDate(job.created_at),
              time: formatBookingTime(job.created_at),
              status: mapJobStatusToBookingStatus(job.status),
              amount: job.budget,
              canCancel: job.status === 'assigned' && user.role === 'homeowner',
              canReschedule: job.status === 'assigned' && user.role === 'homeowner',
              estimatedDuration: estimateJobDuration(job.budget),
              specialInstructions:
                job.description.length > 100
                  ? `${job.description.substring(0, 100)}...`
                  : job.description,
              rating: job.status === 'completed' ? Math.random() * 1 + 4 : undefined, // Mock rating for completed jobs
            };
          })
      );

      setBookings(jobBookings);
    } catch (error) {
      logger.error('Error loading bookings:', error);
      Alert.alert('Error', 'Failed to load bookings');
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Refresh bookings
  const refreshBookings = useCallback(async () => {
    await loadBookings();
  }, [loadBookings]);

  // Cancel booking
  const cancelBooking = useCallback(async (
    bookingId: string,
    reason: string,
    customReason?: string
  ) => {
    setCancelling(true);
    try {
      // Update job status to cancelled
      await JobService.updateJobStatus(bookingId, 'cancelled');

      // Log cancellation reason
      const cancellationData = {
        bookingId,
        reason,
        customReason: reason === 'other' ? customReason : undefined,
        cancelledBy: user.id,
        cancelledAt: new Date().toISOString(),
      };

      logger.info('Booking cancelled:', cancellationData);

      // Refresh bookings to reflect changes
      await refreshBookings();

      Alert.alert('Booking Cancelled', 'Your booking has been cancelled successfully.');
    } catch (error) {
      logger.error('Error cancelling booking:', error);
      Alert.alert('Error', 'Failed to cancel booking. Please try again.');
    } finally {
      setCancelling(false);
    }
  }, [user, refreshBookings]);

  // Load bookings on user change
  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  // Utility functions
  const mapJobStatusToBookingStatus = useCallback((jobStatus: string): BookingStatus => {
    switch (jobStatus) {
      case 'assigned':
      case 'in_progress':
        return 'upcoming';
      case 'completed':
        return 'completed';
      default:
        return 'cancelled';
    }
  }, []);

  const estimateJobDuration = useCallback((budget: number): string => {
    if (budget < 100) return '1-2 hours';
    if (budget < 300) return '2-4 hours';
    if (budget < 500) return '4-6 hours';
    if (budget < 1000) return '1-2 days';
    return '2+ days';
  }, []);

  const formatBookingDate = useCallback((dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, []);

  const formatBookingTime = useCallback((dateString: string): string => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  }, []);

  // Computed values
  const filteredBookings = bookings.filter((booking) => booking.status === activeTab);

  const tabs: TabInfo[] = [
    {
      id: 'upcoming',
      name: 'Upcoming',
      count: bookings.filter((b) => b.status === 'upcoming').length
    },
    {
      id: 'completed',
      name: 'Completed',
      count: bookings.filter((b) => b.status === 'completed').length
    },
    {
      id: 'cancelled',
      name: 'Cancelled',
      count: bookings.filter((b) => b.status === 'cancelled').length
    },
  ];

  return {
    // State
    activeTab,
    bookings,
    loading,
    cancelling,

    // Computed
    filteredBookings,
    tabs,

    // Actions
    setActiveTab,
    refreshBookings,
    cancelBooking,

    // Utilities
    mapJobStatusToBookingStatus,
    estimateJobDuration,
    formatBookingDate,
    formatBookingTime,
  };
};