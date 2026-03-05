import type { User } from '@mintenance/types';
import { logger } from '../../utils/logger';
import type { DatabaseUserRow } from './types';

export function mapRowToUser(row: DatabaseUserRow): User {
  return {
    id: row.id,
    email: row.email,
    first_name: row.first_name ?? '',
    last_name: row.last_name ?? '',
    role: row.role as 'homeowner' | 'contractor' | 'admin',
    phone: row.phone ?? undefined,
    profile_image_url: row.profile_image_url ?? undefined,
    bio: row.bio ?? undefined,
    rating: row.rating ?? undefined,
    jobs_count: row.total_jobs_completed ?? undefined,
    location: row.address ?? undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
    firstName: row.first_name ?? undefined,
    lastName: row.last_name ?? undefined,
    createdAt: row.created_at,
  };
}

export async function saveUser(
  db: import('expo-sqlite').SQLiteDatabase,
  user: User,
  markDirty: boolean = false
): Promise<void> {
  const query = `
    INSERT OR REPLACE INTO users
    (id, email, first_name, last_name, role, phone, profile_image_url, bio, rating,
     total_jobs_completed, is_available, latitude, longitude, address, created_at,
     updated_at, synced_at, is_dirty)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  await db.runAsync(query, [
    user.id, user.email, user.first_name, user.last_name, user.role,
    user.phone || null, user.profile_image_url || null, user.bio || null,
    user.rating || 0, user.jobs_count || 0, 1, null, null,
    user.location || null, user.created_at, user.updated_at,
    markDirty ? null : new Date().toISOString(), markDirty ? 1 : 0,
  ]);
  logger.debug('User saved to local database', { userId: user.id, markDirty });
}

export async function getUser(
  db: import('expo-sqlite').SQLiteDatabase,
  userId: string
): Promise<User | null> {
  const result = await db.getFirstAsync<DatabaseUserRow>('SELECT * FROM users WHERE id = ?', [userId]);
  return result ? mapRowToUser(result) : null;
}

export async function getAllUsers(db: import('expo-sqlite').SQLiteDatabase): Promise<User[]> {
  const rows = await db.getAllAsync<DatabaseUserRow>('SELECT * FROM users ORDER BY created_at DESC');
  return rows.map((row) => mapRowToUser(row));
}
