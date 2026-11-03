import { z } from 'zod';
import { serverSupabase as db } from '@/lib/api/supabaseServer';
import {
  BadRequestError,
  ForbiddenError,
  InternalServerError,
  NotFoundError,
} from '@/lib/errors/api-error';
export const supportCaseSchema = z
  .object({
    subject: z.string().trim().min(1).max(200),
    message: z.string().trim().min(1).max(5000),
    category: z
      .enum(['general', 'account', 'payment', 'safety', 'cancellation'])
      .default('general'),
    priority: z.enum(['normal', 'high', 'urgent']).default('normal'),
    jobId: z.string().uuid().optional(),
    requestId: z.string().uuid(),
  })
  .strict();
export const supportReplySchema = z
  .object({
    body: z.string().trim().min(1).max(5000),
    internal: z.boolean().default(false),
    requestId: z.string().uuid(),
  })
  .strict();
export function parseInput<T extends z.ZodTypeAny>(
  schema: T,
  value: unknown
): z.output<T> {
  const p = schema.safeParse(value);
  if (!p.success)
    throw new BadRequestError(p.error.issues[0]?.message || 'Invalid input');
  return p.data;
}
export async function readCase(id: string, userId: string, isAdmin = false) {
  if (!z.string().uuid().safeParse(id).success)
    throw new NotFoundError('Case not found');
  let q = db.from('support_tickets').select('*').eq('id', id);
  if (!isAdmin) q = q.eq('user_id', userId);
  const { data: ticket, error } = await q.maybeSingle();
  if (error) throw new InternalServerError('Could not load support case');
  if (!ticket) throw new NotFoundError('Case not found');
  let messages = db
    .from('support_messages')
    .select('id,author_id,body,internal,created_at')
    .eq('ticket_id', id)
    .order('created_at', { ascending: false })
    .limit(200);
  if (!isAdmin) messages = messages.eq('internal', false);
  const { data: thread, error: threadError } = await messages;
  if (threadError) throw new InternalServerError('Could not load replies');
  return {
    ticket,
    messages: (thread || []).reverse(),
    olderMessagesMayExist: (thread || []).length === 200,
  };
}
export async function createCase(
  userId: string | null,
  email: string | null,
  input: z.infer<typeof supportCaseSchema>
) {
  const { data, error } = await db.rpc('create_support_case', {
    p_user: userId,
    p_email: email,
    p_subject: input.subject,
    p_body: input.message,
    p_category: input.category,
    p_priority: input.priority,
    p_job: input.jobId || null,
    p_request: input.requestId,
  });
  if (error?.code === '42501')
    throw new ForbiddenError('You cannot use that case or job reference');
  if (error) throw new InternalServerError('Could not save support request');
  return data as string;
}
export async function replyCase(
  id: string,
  actor: string,
  input: z.infer<typeof supportReplySchema>
) {
  const { data, error } = await db.rpc('reply_support_case', {
    p_ticket: id,
    p_actor: actor,
    p_body: input.body,
    p_internal: input.internal,
    p_request: input.requestId,
  });
  if (error?.code === '42501') throw new ForbiddenError('Case access denied');
  if (error?.code === '23514')
    throw new BadRequestError('Reopen the case before replying');
  if (error) throw new InternalServerError('Could not save reply');
  return data;
}
export async function requireSupportPermission(
  adminId: string,
  permission: 'can_broadcast' | 'can_manage_team'
) {
  const { data, error } = await db
    .from('support_operator_settings')
    .select('can_broadcast,can_manage_team')
    .eq('admin_id', adminId)
    .maybeSingle();
  if (error)
    throw new InternalServerError('Could not verify support permissions');
  if (!data?.[permission])
    throw new ForbiddenError('This action requires the support lead');
}
