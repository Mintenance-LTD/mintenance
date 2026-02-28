/**
 * Offline sync type definitions
 */

/** Job data structure */
export interface JobData {
  jobId?: string;
  status?: string;
  contractorId?: string;
  title?: string;
  description?: string;
  budget?: number;
  priority?: string;
  homeownerId?: string;
  photos?: string[];
  createdAt?: string;
  updatedAt?: string;
}

/** Bid data structure */
export interface BidData {
  bidId?: string;
  status?: string;
  amount?: number;
  description?: string;
  updatedAt?: string;
}

/** Message data structure */
export interface MessageData {
  jobId: string;
  receiverId: string;
  message: string;
  senderId: string;
}

/** Profile data structure */
export interface ProfileData {
  userId: string;
  updates?: Record<string, unknown>;
  name?: string;
  phone?: string;
  bio?: string;
  skills?: string[];
  isVerified?: boolean;
  rating?: number;
  completedJobs?: number;
}

/** Server entity data with version tracking */
export interface ServerEntityData {
  id?: string;
  version?: number;
  updatedAt?: string;
  updated_at?: string;
  [key: string]: unknown;
}

/** Offline action with retry scheduling */
export interface OfflineActionWithRetry extends OfflineAction {
  nextRetryAt?: number;
}

/**
 * Conflict resolution strategies for offline sync
 */
export type ConflictResolutionStrategy =
  | 'last-write-wins'   // Most recent timestamp wins
  | 'server-wins'       // Server data always takes precedence
  | 'client-wins'       // Client data always takes precedence
  | 'manual'            // Requires user intervention via UI dialog
  | 'merge';            // Attempt intelligent merge based on entity type

/**
 * Conflict information when offline changes conflict with server state
 */
export interface DataConflict {
  id: string;
  actionId: string;
  entity: string;
  entityId: string;
  clientVersion: number;
  serverVersion: number;
  clientData: unknown;
  serverData: unknown;
  clientTimestamp: number;
  serverTimestamp: number;
  detectedAt: number;
  strategy: ConflictResolutionStrategy;
  resolved: boolean;
  resolution?: 'client' | 'server' | 'merged';
  mergedData?: unknown;
}

/**
 * Enhanced offline action with version tracking for conflict detection
 */
export type OfflineAction = {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: string;
  data: unknown;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  queryKey?: string[];
  version?: number;
  entityId?: string;
  baseVersion?: number;
  strategy?: ConflictResolutionStrategy;
};

export type SyncStatus = 'syncing' | 'synced' | 'error' | 'pending' | 'conflict';
