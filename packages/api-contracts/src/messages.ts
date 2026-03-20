/**
 * Messaging API contracts.
 */
import { z } from 'zod';

// ── Request schemas ────────────────────────────────────────────────

export const sendMessageRequestSchema = z.object({
  jobId: z.string().uuid('Invalid job ID'),
  receiverId: z.string().uuid('Invalid receiver ID'),
  content: z.string().min(1, 'Message content required').max(2000, 'Message too long'),
  messageType: z.enum(['text', 'image', 'file', 'system']).default('text'),
});

export const messageReactionSchema = z.object({
  emoji: z.string().min(1, 'Emoji is required').max(10, 'Emoji too long')
    .regex(/^[\p{Emoji}\u200d]+$/u, 'Invalid emoji format'),
});

// ── Inferred types ─────────────────────────────────────────────────

export type SendMessageRequest = z.infer<typeof sendMessageRequestSchema>;
export type MessageReactionInput = z.infer<typeof messageReactionSchema>;
