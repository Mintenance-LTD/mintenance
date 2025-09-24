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

