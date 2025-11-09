import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

export type MediationStatus = 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

/**
 * Service for mediation coordination
 */
export class MediationService {
  /**
   * Request mediation
   */
  static async requestMediation(
    escrowId: string,
    requestedBy: string
  ): Promise<boolean> {
    try {
      const { error } = await serverSupabase
        .from('escrow_payments')
        .update({
          mediation_requested: true,
          mediation_requested_by: requestedBy,
          mediation_requested_at: new Date().toISOString(),
          mediation_status: 'pending',
        })
        .eq('id', escrowId)
        .eq('status', 'disputed');

      if (error) {
        logger.error('Failed to request mediation', {
          service: 'MediationService',
          escrowId,
          error: error.message,
        });
        return false;
      }

      // Notify admin
      await serverSupabase.from('notifications').insert({
        user_id: 'admin', // Would need actual admin user IDs
        title: 'Mediation Requested',
        message: `Mediation has been requested for dispute ${escrowId}`,
        type: 'mediation_request',
        read: false,
        action_url: `/admin/disputes/${escrowId}/mediation`,
        created_at: new Date().toISOString(),
      });

      return true;
    } catch (error) {
      logger.error('Error requesting mediation', error, {
        service: 'MediationService',
        escrowId,
      });
      return false;
    }
  }

  /**
   * Schedule mediation session
   */
  static async scheduleMediation(
    escrowId: string,
    scheduledAt: Date,
    mediatorId: string
  ): Promise<boolean> {
    try {
      const { error } = await serverSupabase
        .from('escrow_payments')
        .update({
          mediation_scheduled_at: scheduledAt.toISOString(),
          mediation_mediator_id: mediatorId,
          mediation_status: 'scheduled',
        })
        .eq('id', escrowId)
        .eq('mediation_requested', true);

      if (error) {
        logger.error('Failed to schedule mediation', {
          service: 'MediationService',
          escrowId,
          error: error.message,
        });
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error scheduling mediation', error, {
        service: 'MediationService',
        escrowId,
      });
      return false;
    }
  }

  /**
   * Record mediation outcome
   */
  static async recordOutcome(
    escrowId: string,
    outcome: string
  ): Promise<boolean> {
    try {
      const { error } = await serverSupabase
        .from('escrow_payments')
        .update({
          mediation_status: 'completed',
          mediation_outcome: outcome,
          mediation_completed_at: new Date().toISOString(),
        })
        .eq('id', escrowId);

      if (error) {
        logger.error('Failed to record mediation outcome', {
          service: 'MediationService',
          escrowId,
          error: error.message,
        });
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error recording mediation outcome', error, {
        service: 'MediationService',
        escrowId,
      });
      return false;
    }
  }
}

