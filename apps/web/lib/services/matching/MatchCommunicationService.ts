import { serverSupabase } from '@/lib/api/supabaseServer';
import { MessagingService } from '@/lib/services/MessagingService';
import { logger } from '@mintenance/shared';

interface MatchExplanation {
  skillMatch: number;
  locationProximity: number;
  rating: number;
  experience: number;
  explanation: string;
}

/**
 * Service for enhanced contractor-client matching communication
 */
export class MatchCommunicationService {
  /**
   * Send match notification to contractor
   */
  static async notifyContractorOfMatch(
    jobId: string,
    contractorId: string,
    homeownerId: string,
    matchExplanation: MatchExplanation
  ): Promise<boolean> {
    try {
      // Create automated message explaining the match
      const message = `You've been matched with a job that fits your skills!\n\n` +
        `Match Score: ${Math.round((matchExplanation.skillMatch + matchExplanation.locationProximity + matchExplanation.rating + matchExplanation.experience) / 4)}%\n` +
        `- Skill Match: ${Math.round(matchExplanation.skillMatch)}%\n` +
        `- Location: ${Math.round(matchExplanation.locationProximity)}% match\n` +
        `- Your Rating: ${matchExplanation.rating.toFixed(1)}/5.0\n` +
        `\n${matchExplanation.explanation}\n\n` +
        `View the job details and submit your bid!`;

      await MessagingService.sendMessage(
        jobId,
        homeownerId,
        message,
        contractorId,
        'text'
      );

      // Also create notification
      await serverSupabase.from('notifications').insert({
        user_id: contractorId,
        title: 'New Job Match',
        message: `You've been matched with a job that fits your skills!`,
        type: 'job_match',
        read: false,
        action_url: `/contractor/jobs/${jobId}`,
        created_at: new Date().toISOString(),
      });

      logger.info('Match notification sent to contractor', {
        service: 'MatchCommunicationService',
        jobId,
        contractorId,
      });

      return true;
    } catch (error) {
      logger.error('Error sending match notification', error, {
        service: 'MatchCommunicationService',
        jobId,
        contractorId,
      });
      return false;
    }
  }

  /**
   * Get match explanation for homeowner
   */
  static async getMatchExplanation(
    jobId: string,
    contractorId: string
  ): Promise<MatchExplanation | null> {
    try {
      // Get job and contractor data
      const { data: job } = await serverSupabase
        .from('jobs')
        .select('id, required_skills, location, budget')
        .eq('id', jobId)
        .single();

      const { data: contractor } = await serverSupabase
        .from('users')
        .select('id, rating, total_jobs_completed, skills')
        .eq('id', contractorId)
        .single();

      if (!job || !contractor) {
        return null;
      }

      // Calculate match scores (simplified)
      const skillMatch = 85; // Would calculate based on actual skills
      const locationProximity = 90; // Would calculate based on distance
      const rating = (contractor.rating || 0) * 20; // Convert to percentage
      const experience = Math.min(100, (contractor.total_jobs_completed || 0) * 2);

      const explanation = `This contractor has a strong match for your job requirements. ` +
        `They have ${contractor.total_jobs_completed || 0} completed jobs and a ${contractor.rating?.toFixed(1) || 'N/A'} star rating.`;

      return {
        skillMatch,
        locationProximity,
        rating: contractor.rating || 0,
        experience: contractor.total_jobs_completed || 0,
        explanation,
      };
    } catch (error) {
      logger.error('Error getting match explanation', error, {
        service: 'MatchCommunicationService',
        jobId,
        contractorId,
      });
      return null;
    }
  }
}

