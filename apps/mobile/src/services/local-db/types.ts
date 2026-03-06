export interface LocalDatabaseConfig {
  name: string;
  version: number;
}

export interface SyncMetadata {
  table: string;
  lastSyncTimestamp: number;
  recordCount: number;
  isDirty: boolean;
}

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

export interface DatabaseJobRow {
  id: string;
  title: string;
  description: string;
  location: string;
  homeowner_id: string;
  contractor_id: string | null;
  status: string;
  budget: number;
  category: string | null;
  subcategory: string | null;
  priority: string | null;
  photos: string | null;
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
  first_name?: string | null;
  last_name?: string | null;
  role?: string;
}

export interface DatabaseSyncMetadataRow {
  table_name: string;
  last_sync_timestamp: number;
  record_count: number;
  is_dirty: number;
}

export interface DatabaseStorageInfoRow {
  total?: number;
  dirty?: number;
  actions?: number;
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
