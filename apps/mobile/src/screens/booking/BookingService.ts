/**
 * BookingService Class
 * 
 * Handles all booking-related business logic including loading,
 * cancelling, and managing booking data.
 */

import { User } from '../../types';
import { JobService } from '../../services/JobService';
import { UserService } from '../../services/UserService';
import { logger } from '../../utils/logger';
import { Booking } from './BookingStatusScreen';

export class BookingService {
  /**
   * Load all bookings for a user (both as homeowner and contractor)
   */
  async loadUserBookings(user: User): Promise<Booking[]> {
    try {
      let allJobs: any[] = [];

      if (user.role === 'homeowner') {
        const homeownerJobs = await JobService.getUserJobs(user.id);
        allJobs = [...(homeownerJobs || [])];
      } else if (user.role === 'contractor') {
        const contractorJobs = await JobService.getContractorJobs(user.id);
        allJobs = [...(contractorJobs || [])];
      }

      // Transform jobs into booking format
      const bookings: Booking[] = await Promise.all(
        allJobs.map(async (job) => {
          const contractor = await this.getContractorInfo(job.contractor_id || job.homeowner_id);
          
          return {
            id: job.id,
            contractorName: contractor?.firstName 
              ? `${contractor.firstName} ${contractor.lastName}`.trim()
              : 'Unknown Contractor',
            contractorImage: contractor?.profileImageUrl,
            serviceName: job.title || 'Service Request',
            address: job.location || 'Address not provided',
            serviceId: job.id,
            date: this.formatDate(job.scheduled_start_date || job.created_at),
            time: this.formatTime(job.scheduled_start_date || job.created_at),
            status: this.mapJobStatusToBookingStatus(job.status),
            amount: job.budget || job.total_cost || 0,
            rating: job.homeowner_rating || job.contractor_rating,
            canCancel: this.canCancelBooking(job),
            canReschedule: this.canRescheduleBooking(job),
            estimatedDuration: job.estimated_duration_hours 
              ? `${job.estimated_duration_hours} hours`
              : 'Not specified',
            specialInstructions: job.special_instructions,
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
      // Update job status to cancelled
      await JobService.updateJobStatus(bookingId, 'cancelled');
      
      // Log cancellation reason (could be stored in a separate table)
      logger.info(`Booking ${bookingId} cancelled. Reason: ${reason}`);
      
      // Could also send notification to contractor/homeowner
      // await NotificationService.sendCancellationNotification(bookingId, reason);
    } catch (error) {
      logger.error('Error cancelling booking:', error);
      throw new Error('Failed to cancel booking');
    }
  }

  /**
   * Get contractor information by ID
   */
  private async getContractorInfo(contractorId: string): Promise<any> {
    try {
      if (!contractorId) return null;
      return await UserService.getUserById(contractorId);
    } catch (error) {
      logger.error('Error getting contractor info:', error);
      return null;
    }
  }

  /**
   * Format date for display
   */
  private formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch (error) {
      return 'Date not available';
    }
  }

  /**
   * Format time for display
   */
  private formatTime(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch (error) {
      return 'Time not available';
    }
  }

  /**
   * Map job status to booking status
   */
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

  /**
   * Check if booking can be cancelled
   */
  private canCancelBooking(job: any): boolean {
    const status = job.status?.toLowerCase();
    return status === 'posted' || status === 'assigned';
  }

  /**
   * Check if booking can be rescheduled
   */
  private canRescheduleBooking(job: any): boolean {
    const status = job.status?.toLowerCase();
    return status === 'posted' || status === 'assigned';
  }
}
