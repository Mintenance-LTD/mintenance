import { z } from 'zod';
import { UUIDSchema, DateSchema } from './common';

// ============================================================================
// MESSAGE SCHEMAS
// ============================================================================

const MessageTypeSchema = z.enum(['text', 'image', 'file', 'system'], {
  errorMap: () => ({ message: 'Invalid message type' }),
});

const MessageSchema = z.object({
  id: UUIDSchema,
  conversation_id: UUIDSchema,
  sender_id: UUIDSchema,
  recipient_id: UUIDSchema,
  type: MessageTypeSchema.default('text'),
  content: z
    .string()
    .min(1, 'Message content is required')
    .max(2000, 'Message too long'),
  attachments: z
    .array(
      z.object({
        url: z.string().url('Invalid attachment URL'),
        type: z.string(),
        name: z.string(),
        size: z.number().positive(),
      })
    )
    .optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  read_at: DateSchema.optional(),
  created_at: DateSchema,
  updated_at: DateSchema,
});

const CreateMessageSchema = z.object({
  conversation_id: UUIDSchema,
  recipient_id: UUIDSchema,
  type: MessageTypeSchema.default('text'),
  content: z
    .string()
    .min(1, 'Message content is required')
    .max(2000, 'Message too long'),
  attachments: z
    .array(
      z.object({
        url: z.string().url('Invalid attachment URL'),
        type: z.string(),
        name: z.string(),
        size: z.number().positive(),
      })
    )
    .optional(),
});

// Type exports
type Message = z.infer<typeof MessageSchema>;
type CreateMessage = z.infer<typeof CreateMessageSchema>;
type MessageType = z.infer<typeof MessageTypeSchema>;
