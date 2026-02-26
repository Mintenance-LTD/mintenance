// Contract interface matching DB: public.contracts
export type ContractStatus = 'draft' | 'pending_homeowner' | 'pending_contractor' | 'accepted' | 'rejected' | 'cancelled';

export interface Contract {
  id: string;
  job_id?: string;
  homeowner_id?: string;
  contractor_id?: string;
  title?: string;
  description?: string;
  amount?: number;
  start_date?: string;
  end_date?: string;
  terms?: Record<string, unknown>;
  status: ContractStatus;
  homeowner_signed_at?: string;
  contractor_signed_at?: string;
  contractor_company_name?: string;
  contractor_license_registration?: string;
  contractor_license_type?: string;
  created_at: string;
  updated_at: string;
  // Populated relations
  job?: { id: string; title: string; description?: string };
  homeowner?: { id: string; first_name: string; last_name: string };
  contractor?: { id: string; first_name: string; last_name: string; company_name?: string };
}

// Dispute interface matching DB: public.disputes
export type DisputeStatus = 'open' | 'under_review' | 'resolved' | 'escalated' | 'closed';

export interface Dispute {
  id: string;
  job_id?: string;
  raised_by: string;
  against: string;
  reason: string;
  description?: string;
  status: DisputeStatus;
  resolution?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
  // Populated relations
  job?: { id: string; title: string };
  raiser?: { id: string; first_name: string; last_name: string };
  respondent?: { id: string; first_name: string; last_name: string };
}

export interface ContractorSummary {
  id: string;
  name: string;
  avatarUrl?: string;
  rating?: number;
  reviewCount?: number;
  categories?: string[];
  distanceKm?: number;
}

export interface Service {
  id: string;
  name: string;
  description?: string;
  priceMin?: number;
  priceMax?: number;
}

export interface Review {
  id: string;
  authorId: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface ContractorProfile extends ContractorSummary {
  bio?: string;
  services?: Service[];
  reviews?: Review[];
}

export interface UserSummary {
  id: string;
  name?: string;
  avatarUrl?: string;
}

export interface JobSummary {
  id: string;
  title: string;
  status: 'posted' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface TimelineEvent {
  id: string;
  type: string;
  message?: string;
  createdAt: string;
}

export interface JobDetail extends JobSummary {
  description?: string;
  location?: { lat: number; lng: number } | string;
  attachments?: string[];
  timeline?: TimelineEvent[];
}

export interface Message {
  id: string;
  senderId: string;
  content: string;
  attachments?: string[];
  createdAt: string;
}

export interface ThreadSummary {
  id: string;
  participants: UserSummary[];
  lastMessageAt?: string;
  unreadCount?: number;
}

export interface Payment {
  id: string;
  jobId: string;
  amount: number;
  currency: string;
  status: 'requires_payment' | 'processing' | 'succeeded' | 'failed' | 'refunded';
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  nextCursor?: string;
}

