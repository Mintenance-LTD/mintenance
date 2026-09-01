import { z } from 'zod';

/** Canonical request accepted by POST /api/ai/analyze. */
export const aiAnalyzeRequestSchema = z
  .object({
    images: z.array(z.string().url()).min(1).max(20),
    context: z.record(z.string(), z.unknown()),
  })
  .strict();

export type AiAnalyzeRequest = z.infer<typeof aiAnalyzeRequestSchema>;
