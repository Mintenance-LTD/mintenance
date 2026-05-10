/**
 * Shared types for the sync pipeline. Extracted from
 * `services/SyncManager.ts` on 2026-05-09.
 */

export type SyncStrategy = 'immediate' | 'background' | 'manual';
export type SyncDirection = 'upload' | 'download' | 'bidirectional';

export interface SyncOptions {
  strategy: SyncStrategy;
  direction: SyncDirection;
  batchSize?: number;
  timeout?: number;
}

export interface SyncStatus {
  isActive: boolean;
  lastSyncTime: Date | null;
  pendingUploads: number;
  pendingDownloads: number;
  errors: SyncError[];
}

export interface SyncError {
  id: string;
  entity: string;
  operation: string;
  error: string;
  timestamp: Date;
  retryCount: number;
}

// Database row interfaces (SQLite schema with snake_case)
export interface DatabaseUserRow {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  phone: string | null;
  profile_image_url: string | null;
  bio: string | null;
  rating: number | null;
  total_jobs_completed: number | null;
  is_available: number;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  created_at: string;
  updated_at: string;
  synced_at: string | null;
  is_dirty: number;
}

export interface DatabaseMessageRow {
  id: string;
  job_id: string;
  sender_id: string;
  receiver_id: string;
  message_text: string;
  message_type: string;
  attachment_url: string | null;
  read: number;
  created_at: string;
  synced_at: string | null;
  is_dirty: number;
}

export interface DatabaseOfflineActionRow {
  id: string;
  type: string;
  entity: string;
  data: string;
  retry_count: number;
  max_retries: number;
  query_key: string | null;
  created_at: number;
  synced_at: number | null;
}

// Typed data structures for queued actions
export interface JobActionData {
  jobId?: string;
  status?: string;
  contractorId?: string;
  title?: string;
  description?: string;
  budget?: number;
  priority?: string;
  homeownerId?: string;
  photos?: string[];
}

export interface MessageActionData {
  jobId: string;
  receiverId: string;
  messageText: string;
  senderId: string;
  messageType?: string;
  attachmentUrl?: string;
}

export interface ProfileActionData {
  userId: string;
  updates?: Record<string, unknown>;
}

// Subscription types
export interface AppStateSubscription {
  remove: () => void;
}

export type NetworkUnsubscribe = () => void;

export const SYNC_DEFAULTS = {
  BATCH_SIZE: 50,
  TIMEOUT_MS: 30_000,
  BACKGROUND_INTERVAL_MS: 5 * 60 * 1000, // 5 minutes
} as const;
