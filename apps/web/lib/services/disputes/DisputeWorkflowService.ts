import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { DisputeResolutionAgent } from '../agents/DisputeResolutionAgent';

export type DisputePriority = 'low' | 'medium' | 'high' | 'critical';

interface SLADefinition {
  hours: number;
  autoEscalate: boolean;
}

const PRIORITY_SLA: Record<DisputePriority, SLADefinition> = {
  low: { hours: 336, autoEscalate: true }, // 14 days
  medium: { hours: 168, autoEscalate: true }, // 7 days
  high: { hours: 72, autoEscalate: true }, // 3 days
  critical: { hours: 24, autoEscalate: true }, // 24 hours
};

/**
 * Service for automated dispute workflow with SLA tracking
 */
export class DisputeWorkflowService {
  /**
   * Set dispute priority and SLA
   */
  static async setDisputePriority(
    escrowId: string,
    priority: DisputePriority
  ): Promise<boolean> {
    try {
      const sla = PRIORITY_SLA[priority];
      const deadline = new Date(Date.now() + sla.hours * 60 * 60 * 1000);

      const { error } = await serverSupabase
        .from('escrow_payments')
        .update({
          dispute_priority: priority,
          sla_deadline: deadline.toISOString(),
          escalation_level: 0,
        })
        .eq('id', escrowId)
        .eq('status', 'disputed');

      if (error) {
        logger.error('Failed to set dispute priority', {
          service: 'DisputeWorkflowService',
          escrowId,
          error: error.message,
        });
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error setting dispute priority', error, {
        service: 'DisputeWorkflowService',
        escrowId,
      });
      return false;
    }
  }

  /**
   * Attempt auto-resolution for a dispute
   */
  static async attemptAutoResolution(escrowId: string): Promise<boolean> {
    try {
      // Get escrow details
      const { data: escrowDetails } = await serverSupabase
        .from('escrow_payments')
        .select('homeowner_id, contractor_id')
        .eq('id', escrowId)
        .single();

      if (!escrowDetails) {
        return false;
      }

      // Attempt auto-resolution
      const result = await DisputeResolutionAgent.attemptAutoResolution(
        escrowId,
        undefined, // jobId will be fetched from escrow
        {
          userId: escrowDetails.homeowner_id,
        }
      );

      return result?.success || false;
    } catch (error) {
      logger.error('Error attempting auto-resolution', error, {
        service: 'DisputeWorkflowService',
        escrowId,
      });
      return false;
    }
  }

  /**
   * Check and auto-escalate disputes approaching SLA
   */
  static async checkAndEscalateDisputes(): Promise<void> {
    try {
      const now = new Date();
      const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // Find disputes approaching SLA deadline
      const { data: disputes, error } = await serverSupabase
        .from('escrow_payments')
        .select('id, dispute_priority, sla_deadline, escalation_level')
        .eq('status', 'disputed')
        .not('sla_deadline', 'is', null)
        .lte('sla_deadline', oneDayFromNow.toISOString())
        .gte('sla_deadline', now.toISOString());

      if (error) {
        logger.error('Error fetching disputes for escalation', {
          service: 'DisputeWorkflowService',
          error: error.message,
        });
        return;
      }

      if (!disputes || disputes.length === 0) {
        return;
      }

      for (const dispute of disputes) {
        await this.escalateDispute(dispute.id, dispute.escalation_level || 0);
      }
    } catch (error) {
      logger.error('Error checking and escalating disputes', error, {
        service: 'DisputeWorkflowService',
      });
    }
  }

  /**
   * Escalate dispute
   */
  private static async escalateDispute(
    escrowId: string,
    currentLevel: number
  ): Promise<void> {
    try {
      const { error } = await serverSupabase
        .from('escrow_payments')
        .update({
          escalation_level: currentLevel + 1,
        })
        .eq('id', escrowId);

      if (error) {
        logger.error('Failed to escalate dispute', {
          service: 'DisputeWorkflowService',
          escrowId,
          error: error.message,
        });
        return;
      }

      // Notify admin
      await serverSupabase.from('notifications').insert({
        user_id: 'admin', // Would need actual admin user IDs
        title: 'Dispute Escalation',
        message: `Dispute ${escrowId} has been escalated to level ${currentLevel + 1}`,
        type: 'dispute_escalation',
        read: false,
        action_url: `/admin/disputes/${escrowId}`,
        created_at: new Date().toISOString(),
      });

      logger.info('Dispute escalated', {
        service: 'DisputeWorkflowService',
        escrowId,
        level: currentLevel + 1,
      });
    } catch (error) {
      logger.error('Error escalating dispute', error, {
        service: 'DisputeWorkflowService',
        escrowId,
      });
    }
  }
}

