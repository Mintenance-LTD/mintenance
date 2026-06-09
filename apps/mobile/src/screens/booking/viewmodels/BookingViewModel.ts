/**
 * Booking View Model Types
 *
 * Shared type definitions for the BookingStatus screen surface
 * (consumed by TabHeader and BookingNavigationCoordinator).
 *
 * @compliance Architecture principles - Business logic separation
 */

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

export interface TabInfo {
  id: string;
  name: string;
  count: number;
}
