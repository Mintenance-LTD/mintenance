/**
 * BookingService Class
 * 
 * Handles all booking-related business logic including loading,
 * cancelling, and managing booking data.
 */

import type { User, Job } from '@mintenance/types';
import { JobService } from '../../services/JobService';
import { mobileApiClient } from '../../utils/mobileApiClient';
import { logger } from '../../utils/logger';
import { Booking } from './BookingStatusScreen';

interface UserProfile {
  id: string;
  first_name?: string;
  last_name?: string;
  profile_image_url?: string;
}

export class BookingService {
  /**
   * Load all bookings for a user (both as homeowner and contractor)
   */
  async loadUserBookings(user: User): Promise<Booking[]> {
    try {
      // getUserJobs returns jobs for any role (queries both homeowner_id and contractor_id)
      const allJobs = await JobService.getUserJobs(user.id);

      // Transform jobs into booking format
      const bookings: Booking[] = await Promise.all(
        (allJobs || []).map(async (job: Job) => {
          const otherUserId = user.role === 'homeowner' ? job.contractor_id : job.homeowner_id;
          const otherUser = otherUserId ? await this.getUserInfo(otherUserId) : null;

          return {
            id: job.id,
            contractorName: otherUser?.first_name
              ? `${otherUser.first_name} ${otherUser.last_name || ''}`.trim()
              : 'Unknown',
            contractorImage: otherUser?.profile_image_url,
            serviceName: job.title || 'Service Request',
            address: job.location || 'Address not provided',
            serviceId: job.id,
            date: this.formatDate(job.scheduled_start_date || job.created_at),
            time: this.formatTime(job.scheduled_start_date || job.created_at),
            status: this.mapJobStatusToBookingStatus(job.status),
            amount: job.budget || 0,
            rating: undefined,
            canCancel: this.canCancelBooking(job),
            canReschedule: this.canRescheduleBooking(job),
            estimatedDuration: 'Not specified',
            specialInstructions: undefined,
          };
        })
      );

      return bookings;
    } catch (error) {
      logger.error('Error loading user bookings:', error);
      throw new Error('Failed to load bookings');
    }
  }

  /**
   * Cancel a booking with a reason
   */
  async cancelBooking(bookingId: string, reason: string): Promise<void> {
    try {
      await JobService.updateJobStatus(bookingId, 'cancelled');
      logger.info(`Booking ${bookingId} cancelled. Reason: ${reason}`);
    } catch (error) {
      logger.error('Error cancelling booking:', error);
      throw new Error('Failed to cancel booking');
    }
  }

  /**
   * Get user information by ID via API
   */
  private async getUserInfo(userId: string): Promise<UserProfile | null> {
    try {
      if (!userId) return null;
      const res = await mobileApiClient.get<{ user: UserProfile }>(`/api/users/${userId}`);
      return res.user || null;
    } catch (error) {
      logger.error('Error getting user info:', error);
      return null;
    }
  }

  private formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return 'Date not available';
    }
  }

  private formatTime(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return 'Time not available';
    }
  }

  private mapJobStatusToBookingStatus(jobStatus: string): 'upcoming' | 'completed' | 'cancelled' {
    switch (jobStatus?.toLowerCase()) {
      case 'posted':
      case 'assigned':
      case 'in_progress':
        return 'upcoming';
      case 'completed':
        return 'completed';
      case 'cancelled':
        return 'cancelled';
      default:
        return 'upcoming';
    }
  }

  private canCancelBooking(job: Job): boolean {
    const status = job.status?.toLowerCase();
    return status === 'posted' || status === 'assigned';
  }

  private canRescheduleBooking(job: Job): boolean {
    const status = job.status?.toLowerCase();
    return status === 'posted' || status === 'assigned';
  }
}
