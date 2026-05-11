/**
 * Helpers shared across the Mint Editorial homeowner dashboard
 * sub-components.
 */

export const formatGBP = (n: number) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(n);

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'YOU';

export interface ActiveJob {
  id: string;
  title: string;
  status: string;
  budget: number;
  category?: string;
  contractor?: { name: string; image?: string };
  progress: number;
  bidsCount: number;
  scheduledDate?: string;
  // Resolved Job-storage URL (signed when stored privately, public CDN
  // otherwise). When absent we fall back to the category icon tile.
  photoUrl?: string | null;
  // Real escrow balance currently held for this job, summed from
  // payments rows with status='in_escrow'. Used by the card's "£X held"
  // badge — previously the card faked this from job.budget when
  // status===in_progress, which lied when escrow was never funded.
  escrowAmount?: number;
}

export interface PendingBid {
  id: string;
  amount: number;
  jobId: string;
  jobTitle: string;
  contractorName: string;
  contractorImage?: string;
  createdAt: string;
}

export interface Appointment {
  id: string;
  title: string;
  date: string;
  time: string;
  endTime?: string;
  locationType?: string;
  status: string;
  contractor?: { name: string };
}

/**
 * Polymorphic "Needs you" attention item — one row in the right-rail
 * NeedsYou card. Each variant gets its own icon, copy, and CTA.
 *
 * Sourced from server-side queries on /dashboard:
 *   - bid          → pendingBids[0]   (top pending bid for a homeowner job)
 *   - bidsClosing  → jobs with several pending bids and a soon-to-expire
 *                    review window
 *   - verifyProp   → properties with `verified === false`
 *   - quote        → contractor quote that needs accept/reject
 */
export type NeedsYouItem =
  | {
      kind: 'bid';
      id: string;
      contractorName: string;
      jobTitle: string;
      jobId: string;
      amount: number;
    }
  | {
      kind: 'bidsClosing';
      id: string;
      jobTitle: string;
      jobId: string;
      bidCount: number;
      closesInHours: number;
    }
  | {
      kind: 'verifyProp';
      id: string;
      propertyName: string;
      address: string;
    }
  | {
      kind: 'quote';
      id: string;
      contractorName: string;
      jobTitle: string;
      jobId: string;
      amount: number;
    };

export interface DashboardData {
  homeowner: {
    id: string;
    name: string;
    avatar?: string;
    email: string;
    /** Role label for the sidebar user-card subtitle. */
    role?: string;
    /** Optional postcode appended to the role line. */
    postcode?: string;
  };
  metrics: {
    totalSpent: number;
    /** Currently-held escrow balance — used by the PaymentProtected
     *  card and the "Held in escrow" KPI. Distinct from totalSpent,
     *  which is lifetime money paid (including already-released). */
    heldInEscrow: number;
    activeJobs: number;
    completedJobs: number;
    savedContractors: number;
  };
  activeJobs: ActiveJob[];
  pendingBids?: PendingBid[];
  upcomingAppointments?: Appointment[];
  /** Right-rail "Needs you" feed, server-aggregated from multiple
   *  data sources (bids, properties, quotes). When absent the card
   *  falls back to deriving a single bid item from `pendingBids[0]`. */
  needsYou?: NeedsYouItem[];
}
