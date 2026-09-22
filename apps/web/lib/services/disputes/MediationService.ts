import {
  mediationResponseSchema,
  type MediationAction,
} from '@/lib/disputes/mediation-contract';
import { serverSupabase } from '@/lib/api/supabaseServer';
import {
  ConflictError,
  ForbiddenError,
  InternalServerError,
  NotFoundError,
} from '@/lib/errors/api-error';

export class MediationService {
  static async transition(
    escrowId: string,
    actorId: string,
    action: MediationAction
  ) {
    const { data, error } = await serverSupabase.rpc(
      'transition_dispute_mediation',
      {
        p_escrow_id: escrowId,
        p_actor_id: actorId,
        p_action: action.action,
        p_scheduled_at:
          action.action === 'schedule' ? action.scheduledAt : null,
        p_mediator_id: action.action === 'schedule' ? action.mediatorId : null,
        p_outcome: action.action === 'complete' ? action.outcome : null,
      }
    );
    if (error?.code === '42501')
      throw new ForbiddenError('Not authorized to change this mediation.');
    if (error?.code === 'P0002') throw new NotFoundError('Dispute not found.');
    if (error?.code === '23514')
      throw new ConflictError(
        'Mediation could not be updated in its current state. Refresh the dispute and check the details.'
      );
    if (error)
      throw new InternalServerError('Unable to save mediation. Please retry.');
    const result = mediationResponseSchema.safeParse(data);
    if (!result.success || result.data.escrowId !== escrowId)
      throw new InternalServerError(
        'Mediation confirmation was incomplete. Please retry.'
      );
    return result.data;
  }
}
