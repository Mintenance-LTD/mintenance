import type { Message } from '@mintenance/types';
import { logger } from '../../utils/logger';
import type { DatabaseMessageRow } from './types';

export function mapRowToMessage(row: DatabaseMessageRow): Message {
  return {
    id: row.id, jobId: row.job_id, senderId: row.sender_id, receiverId: row.receiver_id,
    messageText: row.message_text,
    messageType: row.message_type as unknown as Message['messageType'],
    attachmentUrl: row.attachment_url ?? undefined, read: Boolean(row.read),
    createdAt: row.created_at,
    senderName: row.first_name && row.last_name ? `${row.first_name} ${row.last_name}`.trim() : 'Unknown User',
    senderRole: row.role,
  };
}

export async function saveMessage(
  db: import('expo-sqlite').SQLiteDatabase,
  message: Omit<Message, 'senderName' | 'senderRole'>,
  markDirty: boolean = false
): Promise<void> {
  const query = `
    INSERT OR REPLACE INTO messages
    (id, job_id, sender_id, receiver_id, message_text, message_type, attachment_url,
     read, created_at, synced_at, is_dirty)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  await db.runAsync(query, [
    message.id, message.jobId ?? null, message.senderId, message.receiverId ?? null,
    message.messageText ?? null, message.messageType ?? null, message.attachmentUrl ?? null,
    message.read ? 1 : 0, message.createdAt,
    markDirty ? null : new Date().toISOString(), markDirty ? 1 : 0,
  ]);
  logger.debug('Message saved to local database', { messageId: message.id, markDirty });
}

export async function getMessagesByJob(
  db: import('expo-sqlite').SQLiteDatabase,
  jobId: string,
  limit: number = 50
): Promise<Message[]> {
  const query = `
    SELECT m.*, u.first_name, u.last_name, u.role
    FROM messages m
    LEFT JOIN users u ON m.sender_id = u.id
    WHERE m.job_id = ?
    ORDER BY m.created_at DESC
    LIMIT ?
  `;
  const rows = await db.getAllAsync<DatabaseMessageRow>(query, [jobId, limit]);
  return rows.map((row) => mapRowToMessage(row)).reverse();
}
