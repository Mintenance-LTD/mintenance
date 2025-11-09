import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { AgentLogger } from './AgentLogger';
import { PredictiveAgent } from './PredictiveAgent';
import type { AgentResult, AgentContext } from './types';

interface PhotoVerificationResult {
  verificationScore: number; // 0-1
  matchesJobDescription: boolean;
  completionIndicators: string[];
  qualityScore: number; // 0-1
  status: 'verified' | 'failed' | 'manual_review';
  aiAnalysis?: Record<string, any>;
}

interface AutoReleaseRule {
  id: string;
  contractorTier?: string;
  jobValueMin?: number;
  jobValueMax?: number;
  jobCategory?: string;
  holdPeriodDays: number;
  requirePhotoVerification: boolean;
  requireReview: boolean;
  minPhotoScore: number;
  riskMultiplier: number;
  disputeHistoryPenaltyDays: number;
  priority: number;
}

/**
 * Agent for automated and secure escrow release
 * - Photo/Video verification using AI
 * - Timeline-based auto-release
 * - Risk-based holds
 * - Dispute prediction integration
 */
export class EscrowReleaseAgent {
  /**
   * Verify completion photos against job description using AI
   */
  static async verifyCompletionPhotos(
    escrowId: string,
    jobId: string,
    photoUrls: string[]
  ): Promise<PhotoVerificationResult | null> {
    try {
      if (!photoUrls || photoUrls.length === 0) {
        return {
          verificationScore: 0,
          matchesJobDescription: false,
          completionIndicators: [],
          qualityScore: 0,
          status: 'failed',
        };
      }

      // Get job details
      const { data: job, error: jobError } = await serverSupabase
        .from('jobs')
        .select('id, title, description, category, status')
        .eq('id', jobId)
        .single();

      if (jobError || !job) {
        logger.error('Failed to fetch job for photo verification', {
          service: 'EscrowReleaseAgent',
          jobId,
          error: jobError?.message,
        });
        return null;
      }

      // Analyze photos using AI (OpenAI GPT-4 Vision)
      const aiAnalysis = await this.analyzePhotosWithAI(photoUrls, job);

      // Calculate verification score
      const verificationScore = this.calculateVerificationScore(aiAnalysis, job);
      const qualityScore = aiAnalysis.qualityScore || 0.7;

      // Determine completion indicators
      const completionIndicators = this.extractCompletionIndicators(aiAnalysis);

      // Determine if photos match job description
      const matchesJobDescription = verificationScore >= 0.6;

      // Determine status
      let status: 'verified' | 'failed' | 'manual_review' = 'manual_review';
      if (verificationScore >= 0.7 && matchesJobDescription) {
        status = 'verified';
      } else if (verificationScore < 0.4 || !matchesJobDescription) {
        status = 'failed';
      }

      // Store verification results
      for (const photoUrl of photoUrls) {
        await serverSupabase.from('escrow_photo_verification').insert({
          escrow_id: escrowId,
          job_id: jobId,
          photo_url: photoUrl,
          verification_score: verificationScore,
          verification_status: status,
          verification_method: 'ai_analysis',
          ai_analysis: aiAnalysis,
          matches_job_description: matchesJobDescription,
          completion_indicators: completionIndicators,
          quality_score: qualityScore,
          verified_at: status === 'verified' ? new Date().toISOString() : null,
        });
      }

      // Update escrow payment with verification status
      await serverSupabase
        .from('escrow_transactions')
        .update({
          photo_verification_status: status,
          photo_verification_score: verificationScore,
          updated_at: new Date().toISOString(),
        })
        .eq('id', escrowId);

      await AgentLogger.logDecision({
        agentName: 'escrow-release',
        decisionType: 'photo_verification',
        actionTaken: status === 'verified' ? 'photo_verified' : status === 'failed' ? 'photo_failed' : 'photo_manual_review',
        confidence: Math.round(verificationScore * 100),
        reasoning: `Photo verification completed. Score: ${verificationScore.toFixed(2)}, Matches job: ${matchesJobDescription}`,
        jobId,
        metadata: { escrowId, verificationScore, completionIndicators },
      });

      return {
        verificationScore,
        matchesJobDescription,
        completionIndicators,
        qualityScore,
        status,
        aiAnalysis,
      };
    } catch (error) {
      logger.error('Error verifying completion photos', error, {
        service: 'EscrowReleaseAgent',
        escrowId,
        jobId,
      });
      return null;
    }
  }

  /**
   * Calculate auto-release date based on contractor tier and risk assessment
   */
  static async calculateAutoReleaseDate(
    escrowId: string,
    jobId: string,
    contractorId: string
  ): Promise<Date | null> {
    try {
      // Get job details
      const { data: job, error: jobError } = await serverSupabase
        .from('jobs')
        .select('id, category, budget, status, contractor_id')
        .eq('id', jobId)
        .single();

      if (jobError || !job) {
        return null;
      }

      // Get contractor tier (from payout tiers or default to standard)
      const { PayoutTierService } = await import('@/lib/services/payment/PayoutTierService');
      let contractorTier = 'standard';
      try {
        const tier = await PayoutTierService.calculateTier(contractorId);
        contractorTier = tier || 'standard';
      } catch (error) {
        logger.warn('Failed to get contractor tier, defaulting to standard', {
          service: 'EscrowReleaseAgent',
          contractorId,
        });
      }

      // Map payout tier to escrow tier (elite/trusted/standard -> platinum/gold/silver/bronze)
      const escrowTierMap: Record<string, string> = {
        elite: 'platinum',
        trusted: 'gold',
        standard: 'bronze',
      };
      const escrowTier = escrowTierMap[contractorTier] || 'bronze';

      // Get applicable auto-release rule
      const rule = await this.getApplicableRule(escrowTier, job.budget || 0, job.category || '');

      if (!rule) {
        return null;
      }

      // Base hold period
      let holdPeriodDays = rule.holdPeriodDays;

      // Apply risk multiplier
      const riskLevel = await this.assessJobRisk(jobId, contractorId);
      holdPeriodDays = Math.ceil(holdPeriodDays * rule.riskMultiplier * riskLevel.multiplier);

      // Add dispute history penalty
      const disputePenalty = await this.getDisputeHistoryPenalty(contractorId);
      holdPeriodDays += disputePenalty;

      // Calculate release date (from now, or from job completion if job is completed)
      const jobCompletedAt = job.status === 'completed' ? new Date() : null;
      const baseDate = jobCompletedAt || new Date();
      const releaseDate = new Date(baseDate);
      releaseDate.setDate(releaseDate.getDate() + holdPeriodDays);

      // Update escrow with auto-release date
      await serverSupabase
        .from('escrow_transactions')
        .update({
          auto_release_date: releaseDate.toISOString(),
          auto_release_enabled: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', escrowId);

      return releaseDate;
    } catch (error) {
      logger.error('Error calculating auto-release date', error, {
        service: 'EscrowReleaseAgent',
        escrowId,
        jobId,
      });
      return null;
    }
  }

  /**
   * Evaluate if escrow should be automatically released
   */
  static async evaluateAutoRelease(escrowId: string): Promise<AgentResult | null> {
    try {
      // Get escrow details
      const { data: escrow, error: escrowError } = await serverSupabase
        .from('escrow_transactions')
        .select(
          `
          id,
          job_id,
          payer_id,
          payee_id,
          amount,
          status,
          auto_release_enabled,
          auto_release_date,
          photo_verification_status,
          photo_verification_score,
          risk_hold_extended,
          jobs (
            id,
            status,
            contractor_id,
            homeowner_id
          )
        `
        )
        .eq('id', escrowId)
        .single();

      if (escrowError || !escrow || escrow.status !== 'held') {
        return null; // Only evaluate held escrows
      }

      if (!escrow.auto_release_enabled) {
        return null; // Auto-release disabled
      }

      const job = escrow.jobs as any;
      if (!job || job.status !== 'completed') {
        return null; // Job must be completed
      }

      // Check if auto-release date has passed
      if (!escrow.auto_release_date) {
        // Calculate auto-release date if not set
        const releaseDate = await this.calculateAutoReleaseDate(
          escrowId,
          job.id,
          job.contractor_id
        );
        if (!releaseDate) {
          return null;
        }
        // Re-fetch escrow to get updated auto_release_date
        const { data: updatedEscrow } = await serverSupabase
          .from('escrow_transactions')
          .select('auto_release_date')
          .eq('id', escrowId)
          .single();
        if (!updatedEscrow || new Date(updatedEscrow.auto_release_date) > new Date()) {
          return null; // Not yet time for auto-release
        }
      } else {
        if (new Date(escrow.auto_release_date) > new Date()) {
          return null; // Not yet time for auto-release
        }
      }

      // Get contractor tier for rule matching
      const { PayoutTierService } = await import('@/lib/services/payment/PayoutTierService');
      let contractorTier = 'standard';
      try {
        const tier = await PayoutTierService.calculateTier(job.contractor_id);
        contractorTier = tier || 'standard';
      } catch (error) {
        // Default to standard if tier fetch fails
      }

      // Map payout tier to escrow tier (elite/trusted/standard -> platinum/gold/silver/bronze)
      const escrowTierMap: Record<string, string> = {
        elite: 'platinum',
        trusted: 'gold',
        standard: 'bronze',
      };
      const escrowTier = escrowTierMap[contractorTier] || 'bronze';

      // Check photo verification if required
      const rule = await this.getApplicableRule(
        escrowTier,
        escrow.amount || 0,
        ''
      );

      if (rule?.requirePhotoVerification) {
        if (
          escrow.photo_verification_status !== 'verified' ||
          (escrow.photo_verification_score || 0) < (rule.minPhotoScore || 0.7)
        ) {
          // Photo verification failed or not completed
          return null;
        }
      }

      // Check for active disputes
      const { count: disputeCount } = await serverSupabase
        .from('escrow_transactions')
        .select('id', { count: 'exact', head: true })
        .eq('job_id', job.id)
        .eq('status', 'disputed');

      if ((disputeCount || 0) > 0) {
        return null; // Active dispute exists
      }

      // Check for predicted disputes (using PredictiveAgent)
      const riskAssessmentResults = await PredictiveAgent.analyzeJob(job.id, {
        jobId: job.id,
        userId: job.homeowner_id,
        contractorId: job.contractor_id,
      });

      // If high dispute risk predicted, extend hold
      // Find result with risks in metadata
      const riskAssessmentWithRisks = riskAssessmentResults.find(
        (result) => result.metadata && typeof result.metadata === 'object' && (result.metadata as any).risks
      );

      if (riskAssessmentWithRisks?.metadata && typeof riskAssessmentWithRisks.metadata === 'object') {
        const risks = (riskAssessmentWithRisks.metadata as any).risks;
        if (Array.isArray(risks)) {
          const highRiskDisputes = risks.filter(
            (r: any) => r.risk_type === 'dispute' && r.severity === 'high'
          );
          if (highRiskDisputes.length > 0) {
          // Extend hold period
          const extendedDate = new Date();
          extendedDate.setDate(extendedDate.getDate() + 7); // Extend by 7 days

          await serverSupabase
            .from('escrow_transactions')
            .update({
              auto_release_date: extendedDate.toISOString(),
              risk_hold_extended: true,
              risk_hold_reason: 'High dispute risk predicted',
              updated_at: new Date().toISOString(),
            })
            .eq('id', escrowId);

          return {
            success: true,
            message: 'Auto-release delayed due to predicted dispute risk',
            metadata: { extendedDate: extendedDate.toISOString() },
          };
          }
        }
      }

      // All checks passed - auto-release is approved
      // Note: Actual release should be handled by the payment service
      // This agent only evaluates and approves

      await AgentLogger.logDecision({
        agentName: 'escrow-release',
        decisionType: 'auto_release_approved',
        actionTaken: 'approved_auto_release',
        confidence: 90,
        reasoning: `Auto-release approved: Job completed, photo verified (if required), no disputes, risk assessment passed`,
        jobId: job.id,
        userId: job.homeowner_id,
        metadata: { escrowId, autoReleaseDate: escrow.auto_release_date },
      });

      return {
        success: true,
        message: 'Auto-release approved',
        metadata: {
          escrowId,
          autoReleaseDate: escrow.auto_release_date,
          photoVerificationScore: escrow.photo_verification_score,
        },
      };
    } catch (error) {
      logger.error('Error evaluating auto-release', error, {
        service: 'EscrowReleaseAgent',
        escrowId,
      });
      return null;
    }
  }

  /**
   * Analyze photos using OpenAI GPT-4 Vision
   */
  private static async analyzePhotosWithAI(
    photoUrls: string[],
    job: { title: string; description: string; category?: string }
  ): Promise<any> {
    try {
      if (!process.env.OPENAI_API_KEY) {
        logger.warn('OpenAI API key not configured, using fallback analysis', {
          service: 'EscrowReleaseAgent',
        });
        return this.generateFallbackAnalysis(job);
      }

      const systemPrompt = `You are an expert maintenance professional analyzing completion photos for a job.
      Determine if the photos show completed work that matches the job description.
      Look for:
      1. Completed work matching the job description
      2. Clean work area (tools removed, debris cleared)
      3. Quality indicators (proper installation, finishing touches)
      4. Before/after comparison if available
      
      Respond in JSON format:
      {
        "completionIndicators": string[],
        "matchesDescription": boolean,
        "qualityScore": number (0-1),
        "concerns": string[],
        "recommendation": "verified" | "failed" | "manual_review"
      }`;

      const userPrompt = `Analyze these completion photos for this job:
      
      Title: ${job.title}
      Description: ${job.description || 'No description'}
      Category: ${job.category || 'general'}
      
      Do the photos show completed work that matches the job description?`;

      const messages: any[] = [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: userPrompt },
            ...photoUrls.slice(0, 4).map((photo) => ({
              type: 'image_url',
              image_url: { url: photo, detail: 'low' },
            })),
          ],
        },
      ];

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o', // Using gpt-4o for vision
          messages,
          max_tokens: 500,
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('OpenAI API error', {
          service: 'EscrowReleaseAgent',
          status: response.status,
          error: errorText,
        });
        return this.generateFallbackAnalysis(job);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || '{}';

      try {
        return JSON.parse(content);
      } catch (parseError) {
        logger.error('Failed to parse OpenAI response', {
          service: 'EscrowReleaseAgent',
          content,
        });
        return this.generateFallbackAnalysis(job);
      }
    } catch (error) {
      logger.error('Error analyzing photos with AI', error, {
        service: 'EscrowReleaseAgent',
      });
      return this.generateFallbackAnalysis(job);
    }
  }

  /**
   * Generate fallback analysis when AI is unavailable
   */
  private static generateFallbackAnalysis(job: { title: string; description: string }): any {
    // Conservative fallback - requires manual review
    return {
      completionIndicators: [],
      matchesDescription: false,
      qualityScore: 0.5,
      concerns: ['AI analysis unavailable - manual review required'],
      recommendation: 'manual_review',
    };
  }

  /**
   * Calculate verification score from AI analysis
   */
  private static calculateVerificationScore(aiAnalysis: any, job: { description: string }): number {
    let score = 0;

    // Base score from matchesDescription
    if (aiAnalysis.matchesDescription === true) {
      score += 0.5;
    }

    // Score from quality
    if (aiAnalysis.qualityScore) {
      score += aiAnalysis.qualityScore * 0.3;
    }

    // Score from completion indicators
    const indicators = aiAnalysis.completionIndicators || [];
    score += Math.min(0.2, indicators.length * 0.05);

    // Penalty for concerns
    const concerns = aiAnalysis.concerns || [];
    score -= Math.min(0.3, concerns.length * 0.1);

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Extract completion indicators from AI analysis
   */
  private static extractCompletionIndicators(aiAnalysis: any): string[] {
    return aiAnalysis.completionIndicators || [];
  }

  /**
   * Get applicable auto-release rule
   */
  private static async getApplicableRule(
    contractorTier: string,
    jobValue: number,
    jobCategory: string
  ): Promise<AutoReleaseRule | null> {
    try {
      const { data: rules, error } = await serverSupabase
        .from('escrow_auto_release_rules')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false });

      if (error || !rules || rules.length === 0) {
        return null;
      }

      // Find best matching rule
      for (const rule of rules) {
        // Check contractor tier match
        if (rule.contractor_tier && rule.contractor_tier !== contractorTier) {
          continue;
        }

        // Check job value range
        if (rule.job_value_min && jobValue < rule.job_value_min) {
          continue;
        }
        if (rule.job_value_max && jobValue > rule.job_value_max) {
          continue;
        }

        // Check job category
        if (rule.job_category && rule.job_category !== jobCategory) {
          continue;
        }

        // Rule matches
        return {
          id: rule.id,
          contractorTier: rule.contractor_tier || undefined,
          jobValueMin: rule.job_value_min || undefined,
          jobValueMax: rule.job_value_max || undefined,
          jobCategory: rule.job_category || undefined,
          holdPeriodDays: rule.hold_period_days,
          requirePhotoVerification: rule.require_photo_verification,
          requireReview: rule.require_review,
          minPhotoScore: rule.min_photo_score,
          riskMultiplier: rule.risk_multiplier,
          disputeHistoryPenaltyDays: rule.dispute_history_penalty_days,
          priority: rule.priority,
        };
      }

      // Return default rule (last one, lowest priority)
      const defaultRule = rules[rules.length - 1];
      return {
        id: defaultRule.id,
        holdPeriodDays: defaultRule.hold_period_days,
        requirePhotoVerification: defaultRule.require_photo_verification,
        requireReview: defaultRule.require_review,
        minPhotoScore: defaultRule.min_photo_score,
        riskMultiplier: defaultRule.risk_multiplier,
        disputeHistoryPenaltyDays: defaultRule.dispute_history_penalty_days,
        priority: defaultRule.priority,
      };
    } catch (error) {
      logger.error('Error getting applicable auto-release rule', error, {
        service: 'EscrowReleaseAgent',
      });
      return null;
    }
  }

  /**
   * Assess job risk level
   */
  private static async assessJobRisk(jobId: string, contractorId: string): Promise<{ multiplier: number }> {
    try {
      // Check for predicted risks
      const { data: risks } = await serverSupabase
        .from('risk_predictions')
        .select('risk_type, severity, probability')
        .eq('job_id', jobId)
        .in('severity', ['high', 'critical']);

      if (risks && risks.length > 0) {
        // High risk - increase multiplier
        return { multiplier: 1.5 };
      }

      // Check contractor dispute history
      const { count: disputeCount } = await serverSupabase
        .from('escrow_transactions')
        .select('id', { count: 'exact', head: true })
        .eq('payee_id', contractorId)
        .eq('status', 'disputed');

      if ((disputeCount || 0) > 2) {
        // Multiple disputes - increase multiplier
        return { multiplier: 1.3 };
      }

      return { multiplier: 1.0 }; // Normal risk
    } catch (error) {
      logger.error('Error assessing job risk', error, {
        service: 'EscrowReleaseAgent',
        jobId,
      });
      return { multiplier: 1.0 };
    }
  }

  /**
   * Get dispute history penalty days
   */
  private static async getDisputeHistoryPenalty(contractorId: string): Promise<number> {
    try {
      const { count: disputeCount } = await serverSupabase
        .from('escrow_transactions')
        .select('id', { count: 'exact', head: true })
        .eq('payee_id', contractorId)
        .eq('status', 'disputed');

      // Add 1 day per dispute (capped at 7 days)
      return Math.min(7, disputeCount || 0);
    } catch (error) {
      logger.error('Error getting dispute history penalty', error, {
        service: 'EscrowReleaseAgent',
        contractorId,
      });
      return 0;
    }
  }
}

