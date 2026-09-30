/**
 * Shared types for useJobTravelTracking + useContractorTravelRealtime.
 * Extracted 2026-05-28 to keep the hook under the 500-line file cap.
 */

export interface TravelLocation {
  latitude: number;
  longitude: number;
  eta: number;
  heading?: number;
  speed?: number;
  timestamp: string;
}

export interface UseJobTravelTrackingOptions {
  meetingId?: string | null;
  jobId?: string;
  destination: { latitude: number; longitude: number };
  onLocationUpdate?: (location: TravelLocation) => void;
  onArrival?: () => void;
  /**
   * Resume an existing en-route trip for this job when GPS permission
   * is already granted. Never creates a trip or prompts on screen mount.
   */
  autoStartIfPermitted?: boolean;
}

export interface UseJobTravelTrackingReturn {
  isTracking: boolean;
  /**
   * True once the contractor has tapped "Arrived" for this job (or a
   * prior session left the contractor_locations row in an arrived
   * context). Terminal for the job session — suppresses
   * autoStartIfPermitted so tracking doesn't bounce back to en-route,
   * and lets the contractor UI show a distinct "on site" state instead
   * of the en-route "sharing location" card.
   */
  hasArrived: boolean;
  currentLocation: TravelLocation | null;
  eta: number | null;
  /**
   * Begin travel tracking. Pass `{ createTrip: true }` for an explicit
   * contractor "I'm on my way" tap — this creates a contractor_trips
   * en_route row (web parity, U4) which notifies the homeowner + all
   * admins and lights up the web trip card + global auto-start chain.
   * The silent autoStartIfPermitted path omits it (no trip on mere
   * screen open).
   */
  startTracking: (opts?: { createTrip?: boolean }) => Promise<void>;
  stopTracking: () => Promise<void>;
  markArrived: () => Promise<void>;
  error: string | null;
}
