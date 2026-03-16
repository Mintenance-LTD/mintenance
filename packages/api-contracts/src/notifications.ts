/**
 * Notification API contracts.
 */
import { z } from 'zod';

// ── Request schemas ────────────────────────────────────────────────

export const notificationEngagementSchema = z.object({
  notificationId: z.string().min(1, 'Notification ID required').max(255, 'Notification ID too long'),
  action: z.enum(['opened', 'clicked', 'dismissed']),
});

// ── Response schemas ───────────────────────────────────────────────

const notificationSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  message: z.string(),
  read: z.boolean(),
  created_at: z.string(),
  action_url: z.string().optional().nullable(),
  link: z.string().optional().nullable(),
}).passthrough();

export const notificationListResponseSchema = z.object({
  notifications: z.array(notificationSchema),
});

// ── Inferred types ─────────────────────────────────────────────────

export type NotificationEngagementInput = z.infer<typeof notificationEngagementSchema>;
export type NotificationListResponse = z.infer<typeof notificationListResponseSchema>;
export type Notification = z.infer<typeof notificationSchema>;
