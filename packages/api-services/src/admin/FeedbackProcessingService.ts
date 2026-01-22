import { logger } from '@mintenance/shared';

/**
 * Feedback Processing Service - Handle user feedback and corrections
 */
// Temporary types
interface FeedbackItem {
  id: string;
  predictionId: string;
  modelId: string;
  modelVersion: string;
  originalPrediction: any;
  correctedValue: any;
  confidence: number;
  feedbackType: 'correction' | 'validation' | 'rejection';
  userId: string;
  userRole: string;
  timestamp: string;
  status: 'pending' | 'approved' | 'rejected' | 'incorporated';
  approvedBy?: string;
  approvedAt?: string;
  notes?: string;
  metadata?: {
    jobId?: string;
    propertyType?: string;
    defectType?: string;
    severity?: string;
  };
}
interface FeedbackMetrics {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  incorporated: number;
  byType: {
    correction: number;
    validation: number;
    rejection: number;
  };
  byModel: {
    modelId: string;
    modelVersion: string;
    count: number;
    accuracy: number;
  }[];
  byUser: {
    userId: string;
    count: number;
    approvalRate: number;
  }[];
  trends: {
    date: string;
    count: number;
    approvalRate: number;
  }[];
  qualityMetrics: {
    averageConfidence: number;
    agreementRate: number;
    incorporationRate: number;
  };
}
interface FeedbackApprovalResult {
  approved: number;
  failed: number;
  errors?: string[];
}
export class FeedbackProcessingService {
  private supabase: any;
  constructor(config: { supabase: any }) {
    this.supabase = config.supabase;
  }
  /**
   * Get feedback metrics for a time range
   */
  async getFeedbackMetrics(timeRange: string): Promise<FeedbackMetrics> {
    try {
      const startDate = this.parseTimeRange(timeRange);
      // Get all feedback items in range
      const { data: feedback } = await this.supabase
        .from('ml_feedback')
        .select('*')
        .gte('timestamp', startDate.toISOString());
      if (!feedback || feedback.length === 0) {
        return this.getDefaultMetrics();
      }
      // Calculate metrics by status
      const statusCounts = {
        total: feedback.length,
        pending: feedback.filter((f: any) => f.status === 'pending').length,
        approved: feedback.filter((f: any) => f.status === 'approved').length,
        rejected: feedback.filter((f: any) => f.status === 'rejected').length,
        incorporated: feedback.filter((f: any) => f.status === 'incorporated').length
      };
      // Calculate metrics by type
      const typeCounts = {
        correction: feedback.filter((f: any) => f.feedback_type === 'correction').length,
        validation: feedback.filter((f: any) => f.feedback_type === 'validation').length,
        rejection: feedback.filter((f: any) => f.feedback_type === 'rejection').length
      };
      // Calculate metrics by model
      const modelMetrics = await this.calculateModelMetrics(feedback);
      // Calculate metrics by user
      const userMetrics = await this.calculateUserMetrics(feedback);
      // Calculate trends
      const trends = await this.calculateTrends(feedback, startDate);
      // Calculate quality metrics
      const qualityMetrics = this.calculateQualityMetrics(feedback);
      return {
        ...statusCounts,
        byType: typeCounts,
        byModel: modelMetrics,
        byUser: userMetrics,
        trends,
        qualityMetrics
      };
    } catch (error) {
      logger.error('Error getting feedback metrics:', error);
      return this.getDefaultMetrics();
    }
  }
  /**
   * Approve feedback corrections
   */
  async approveFeedback(
    feedbackIds: string[],
    approvedBy: string,
    notes?: string
  ): Promise<FeedbackApprovalResult> {
    try {
      const approved: string[] = [];
      const failed: string[] = [];
      const errors: string[] = [];
      for (const feedbackId of feedbackIds) {
        try {
          // Get feedback item
          const { data: feedback, error: fetchError } = await this.supabase
            .from('ml_feedback')
            .select('*')
            .eq('id', feedbackId)
            .single();
          if (fetchError || !feedback) {
            failed.push(feedbackId);
            errors.push(`Feedback ${feedbackId} not found`);
            continue;
          }
          // Check if already processed
          if (feedback.status !== 'pending') {
            failed.push(feedbackId);
            errors.push(`Feedback ${feedbackId} already ${feedback.status}`);
            continue;
          }
          // Validate the correction
          const isValid = await this.validateFeedback(feedback);
          if (!isValid) {
            failed.push(feedbackId);
            errors.push(`Feedback ${feedbackId} failed validation`);
            continue;
          }
          // Update feedback status
          const { error: updateError } = await this.supabase
            .from('ml_feedback')
            .update({
              status: 'approved',
              approved_by: approvedBy,
              approved_at: new Date().toISOString(),
              notes: notes || null
            })
            .eq('id', feedbackId);
          if (updateError) {
            failed.push(feedbackId);
            errors.push(`Failed to update feedback ${feedbackId}: ${updateError.message}`);
            continue;
          }
          // Queue for incorporation into training data
          await this.queueForIncorporation(feedback);
          approved.push(feedbackId);
        } catch (error) {
          failed.push(feedbackId);
          errors.push(`Error processing feedback ${feedbackId}: ${error}`);
        }
      }
      return {
        approved: approved.length,
        failed: failed.length,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      logger.error('Error approving feedback:', error);
      throw new Error('Failed to approve feedback');
    }
  }
  /**
   * Reject feedback items
   */
  async rejectFeedback(
    feedbackIds: string[],
    rejectedBy: string,
    reason: string
  ): Promise<FeedbackApprovalResult> {
    try {
      const { error } = await this.supabase
        .from('ml_feedback')
        .update({
          status: 'rejected',
          approved_by: rejectedBy,
          approved_at: new Date().toISOString(),
          notes: reason
        })
        .in('id', feedbackIds)
        .eq('status', 'pending');
      if (error) {
        throw error;
      }
      return {
        approved: 0,
        failed: 0
      };
    } catch (error) {
      logger.error('Error rejecting feedback:', error);
      throw new Error('Failed to reject feedback');
    }
  }
  /**
   * Get pending feedback for review
   */
  async getPendingFeedback(params: {
    limit?: number;
    offset?: number;
    modelId?: string;
  }): Promise<{ items: FeedbackItem[]; total: number }> {
    try {
      let query = this.supabase
        .from('ml_feedback')
        .select('*, count', { count: 'exact' })
        .eq('status', 'pending');
      if (params.modelId) {
        query = query.eq('model_id', params.modelId);
      }
      query = query
        .order('timestamp', { ascending: false })
        .range(params.offset || 0, (params.offset || 0) + (params.limit || 20) - 1);
      const { data: items, count } = await query;
      return {
        items: items?.map(this.mapFeedbackItem) || [],
        total: count || 0
      };
    } catch (error) {
      logger.error('Error getting pending feedback:', error);
      return { items: [], total: 0 };
    }
  }
  /**
   * Incorporate approved feedback into training data
   */
  async incorporateFeedback(batchSize: number = 100): Promise<{
    incorporated: number;
    failed: number;
  }> {
    try {
      // Get approved feedback that hasn't been incorporated
      const { data: feedback } = await this.supabase
        .from('ml_feedback')
        .select('*')
        .eq('status', 'approved')
        .limit(batchSize);
      if (!feedback || feedback.length === 0) {
        return { incorporated: 0, failed: 0 };
      }
      let incorporated = 0;
      let failed = 0;
      for (const item of feedback) {
        try {
          // Add to training data
          await this.addToTrainingData(item);
          // Update status
          await this.supabase
            .from('ml_feedback')
            .update({
              status: 'incorporated',
              incorporated_at: new Date().toISOString()
            })
            .eq('id', item.id);
          incorporated++;
        } catch (error) {
          logger.error(`Failed to incorporate feedback ${item.id}:`, error);
          failed++;
        }
      }
      // Trigger incremental training if enough feedback accumulated
      if (incorporated >= 50) {
        await this.triggerIncrementalTraining();
      }
      return { incorporated, failed };
    } catch (error) {
      logger.error('Error incorporating feedback:', error);
      throw new Error('Failed to incorporate feedback');
    }
  }
  // ============= Private Helper Methods =============
  private async validateFeedback(feedback: any): Promise<boolean> {
    // Validate that the correction makes sense
    // This would include domain-specific validation
    try {
      // Check if corrected value is valid for the prediction type
      if (feedback.feedback_type === 'correction') {
        // For classification, check if the corrected class is valid
        if (feedback.metadata?.defectType) {
          const validDefectTypes = [
            'crack', 'water_damage', 'structural', 'electrical',
            'plumbing', 'roof', 'foundation', 'mold', 'pest'
          ];
          return validDefectTypes.includes(feedback.corrected_value);
        }
      }
      return true;
    } catch (error) {
      logger.error('Error validating feedback:', error);
      return false;
    }
  }
  private async queueForIncorporation(feedback: any): Promise<void> {
    try {
      await this.supabase
        .from('ml_training_queue')
        .insert({
          feedback_id: feedback.id,
          model_id: feedback.model_id,
          priority: this.calculatePriority(feedback),
          queued_at: new Date().toISOString()
        });
    } catch (error) {
      logger.error('Error queuing feedback for incorporation:', error);
    }
  }
  private calculatePriority(feedback: any): 'low' | 'normal' | 'high' {
    // High priority for low confidence predictions that were corrected
    if (feedback.confidence < 0.5 && feedback.feedback_type === 'correction') {
      return 'high';
    }
    // Normal priority for most corrections
    if (feedback.feedback_type === 'correction') {
      return 'normal';
    }
    // Low priority for validations
    return 'low';
  }
  private async addToTrainingData(feedback: any): Promise<void> {
    // Add the corrected example to the training dataset
    await this.supabase
      .from('ml_training_data')
      .insert({
        input_data: feedback.original_input,
        label: feedback.corrected_value,
        source: 'feedback',
        feedback_id: feedback.id,
        created_at: new Date().toISOString()
      });
  }
  private async triggerIncrementalTraining(): Promise<void> {
    // Trigger incremental model training with the new data
    logger.info('Triggering incremental training with accumulated feedback');
    // This would integrate with the ML pipeline
  }
  private async calculateModelMetrics(feedback: any[]): Promise<any[]> {
    const modelGroups = new Map();
    for (const item of feedback) {
      const key = `${item.model_id}_${item.model_version}`;
      if (!modelGroups.has(key)) {
        modelGroups.set(key, {
          modelId: item.model_id,
          modelVersion: item.model_version,
          items: []
        });
      }
      modelGroups.get(key).items.push(item);
    }
    const metrics = [];
    for (const [, group] of modelGroups) {
      const correct = group.items.filter((i: any) => i.feedback_type === 'validation').length;
      const total = group.items.length;
      metrics.push({
        modelId: group.modelId,
        modelVersion: group.modelVersion,
        count: total,
        accuracy: total > 0 ? (correct / total) * 100 : 0
      });
    }
    return metrics.sort((a, b) => b.count - a.count);
  }
  private async calculateUserMetrics(feedback: any[]): Promise<any[]> {
    const userGroups = new Map();
    for (const item of feedback) {
      if (!userGroups.has(item.user_id)) {
        userGroups.set(item.user_id, {
          userId: item.user_id,
          items: []
        });
      }
      userGroups.get(item.user_id).items.push(item);
    }
    const metrics = [];
    for (const [, group] of userGroups) {
      const approved = group.items.filter((i: any) => i.status === 'approved').length;
      const total = group.items.length;
      metrics.push({
        userId: group.userId,
        count: total,
        approvalRate: total > 0 ? (approved / total) * 100 : 0
      });
    }
    return metrics.sort((a, b) => b.count - a.count).slice(0, 10);
  }
  private async calculateTrends(feedback: any[], startDate: Date): Promise<any[]> {
    const dailyGroups = new Map();
    for (const item of feedback) {
      const date = new Date(item.timestamp).toISOString().split('T')[0];
      if (!dailyGroups.has(date)) {
        dailyGroups.set(date, {
          date,
          items: []
        });
      }
      dailyGroups.get(date).items.push(item);
    }
    const trends = [];
    for (const [, group] of dailyGroups) {
      const approved = group.items.filter((i: any) => i.status === 'approved').length;
      const total = group.items.length;
      trends.push({
        date: group.date,
        count: total,
        approvalRate: total > 0 ? (approved / total) * 100 : 0
      });
    }
    return trends.sort((a, b) => a.date.localeCompare(b.date));
  }
  private calculateQualityMetrics(feedback: any[]): any {
    const totalConfidence = feedback.reduce((sum, f) => sum + (f.confidence || 0), 0);
    const approved = feedback.filter(f => f.status === 'approved').length;
    const incorporated = feedback.filter(f => f.status === 'incorporated').length;
    return {
      averageConfidence: feedback.length > 0 ? totalConfidence / feedback.length : 0,
      agreementRate: feedback.length > 0 ? (approved / feedback.length) * 100 : 0,
      incorporationRate: approved > 0 ? (incorporated / approved) * 100 : 0
    };
  }
  private mapFeedbackItem(item: any): FeedbackItem {
    return {
      id: item.id,
      predictionId: item.prediction_id,
      modelId: item.model_id,
      modelVersion: item.model_version,
      originalPrediction: item.original_prediction,
      correctedValue: item.corrected_value,
      confidence: item.confidence,
      feedbackType: item.feedback_type,
      userId: item.user_id,
      userRole: item.user_role,
      timestamp: item.timestamp,
      status: item.status,
      approvedBy: item.approved_by,
      approvedAt: item.approved_at,
      notes: item.notes,
      metadata: item.metadata
    };
  }
  private parseTimeRange(timeRange: string): Date {
    const now = new Date();
    const match = timeRange.match(/(\d+)([dhm])/);
    if (!match) return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // Default 7 days
    const [, value, unit] = match;
    const num = parseInt(value);
    switch (unit) {
      case 'd':
        return new Date(now.getTime() - num * 24 * 60 * 60 * 1000);
      case 'h':
        return new Date(now.getTime() - num * 60 * 60 * 1000);
      case 'm':
        return new Date(now.getTime() - num * 60 * 1000);
      default:
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
  }
  private getDefaultMetrics(): FeedbackMetrics {
    return {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      incorporated: 0,
      byType: {
        correction: 0,
        validation: 0,
        rejection: 0
      },
      byModel: [],
      byUser: [],
      trends: [],
      qualityMetrics: {
        averageConfidence: 0,
        agreementRate: 0,
        incorporationRate: 0
      }
    };
  }
}