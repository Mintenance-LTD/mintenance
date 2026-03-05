import type { Job } from '@mintenance/types';
import { logger } from '../../utils/logger';
import type { DatabaseJobRow } from './types';

export function mapRowToJob(row: DatabaseJobRow): Job {
  return {
    id: row.id, title: row.title, description: row.description, location: row.location,
    homeowner_id: row.homeowner_id, contractor_id: row.contractor_id ?? undefined,
    status: row.status as 'posted' | 'assigned' | 'in_progress' | 'completed',
    budget: row.budget, category: row.category ?? undefined, subcategory: row.subcategory ?? undefined,
    priority: row.priority as 'low' | 'medium' | 'high' | undefined,
    photos: row.photos ? JSON.parse(row.photos) : undefined,
    created_at: row.created_at, updated_at: row.updated_at,
    homeownerId: row.homeowner_id, contractorId: row.contractor_id ?? undefined,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

export async function saveJob(
  db: import('expo-sqlite').SQLiteDatabase,
  job: Job,
  markDirty: boolean = false
): Promise<void> {
  const query = `
    INSERT OR REPLACE INTO jobs
    (id, title, description, location, homeowner_id, contractor_id, status, budget,
     category, subcategory, priority, photos, created_at, updated_at, synced_at, is_dirty)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const location = typeof job.location === 'string' ? job.location : JSON.stringify(job.location);
  const params: (string | number | null)[] = [
    job.id, job.title, job.description, location, job.homeowner_id,
    job.contractor_id ?? null, job.status, job.budget ?? null, job.category ?? null,
    job.subcategory ?? null, job.priority ?? 'medium',
    job.photos ? JSON.stringify(job.photos) : null,
    job.created_at, job.updated_at,
    markDirty ? null : new Date().toISOString(), markDirty ? 1 : 0,
  ];
  await db.runAsync(query, params);
  logger.debug('Job saved to local database', { jobId: job.id, markDirty });
}

export async function getJob(
  db: import('expo-sqlite').SQLiteDatabase,
  jobId: string
): Promise<Job | null> {
  const result = await db.getFirstAsync<DatabaseJobRow>('SELECT * FROM jobs WHERE id = ?', [jobId]);
  return result ? mapRowToJob(result) : null;
}

export async function getJobsByHomeowner(
  db: import('expo-sqlite').SQLiteDatabase,
  homeownerId: string
): Promise<Job[]> {
  const rows = await db.getAllAsync<DatabaseJobRow>(
    'SELECT * FROM jobs WHERE homeowner_id = ? ORDER BY created_at DESC', [homeownerId]
  );
  return rows.map((row) => mapRowToJob(row));
}

export async function getJobsByStatus(
  db: import('expo-sqlite').SQLiteDatabase,
  status: string,
  userId?: string
): Promise<Job[]> {
  let query = 'SELECT * FROM jobs WHERE status = ?';
  const params = [status];
  if (userId) { query += ' AND (homeowner_id = ? OR contractor_id = ?)'; params.push(userId, userId); }
  query += ' ORDER BY created_at DESC';
  const rows = await db.getAllAsync<DatabaseJobRow>(query, params);
  return rows.map((row) => mapRowToJob(row));
}
