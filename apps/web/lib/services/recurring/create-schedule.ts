import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import {
  BadRequestError,
  ConflictError,
  InternalServerError,
  NotFoundError,
} from '@/lib/errors/api-error';

export async function createScheduleOnce(
  request: Request,
  actorId: string,
  propertyId: string,
  details: {
    title: string;
    description: string | null;
    task_type: string;
    category: string;
    frequency: string;
    next_due_date: string;
    auto_create_job: boolean;
  }
) {
  const key = z
    .string()
    .uuid()
    .safeParse(request.headers.get('Idempotency-Key'));
  if (!key.success)
    throw new BadRequestError(
      'Reload or update the app before creating a schedule. A valid request identity is required.'
    );
  const { data, error } = await serverSupabase.rpc(
    'create_recurring_schedule_once',
    {
      p_actor_id: actorId,
      p_property_id: propertyId,
      p_request_id: key.data,
      p_details: details,
    }
  );
  if (error?.code === '42501') throw new NotFoundError('Property not found');
  if (error?.code === '22023' || error?.code === 'P0002')
    throw new ConflictError(
      'This request was already used. Refresh your schedules before starting a new task.'
    );
  if (error || !data?.id)
    throw new InternalServerError(
      'Schedule save could not be confirmed. Retry the same request.'
    );
  return data;
}
