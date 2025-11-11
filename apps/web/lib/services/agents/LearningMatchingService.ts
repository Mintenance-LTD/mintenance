import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { memoryManager } from '../ml-engine/memory/MemoryManager';
import { SelfModifyingAgent } from './SelfModifyingAgent';
import { AdaptiveUpdateEngine } from './AdaptiveUpdateEngine';
import type { MatchingScore } from '../matching/types';
import type { ContinuumMemoryConfig, MLPConfig } from '../ml-engine/memory/types';
import type { SelfModificationConfig, PerformanceMetrics } from './SelfModifyingAgent';

/**
 * Service for learning-based matching improvements
 * Enhanced with Nested Learning multi-frequency memory system
 * 
 * Implements:
 * - Multi-frequency memory (short/mid/long-term)
 * - Associative memory mapping M: K → V
 * - Continual learning from outcomes
 * - Self-modifying capabilities
 */
export class LearningMatchingService {
  private static memorySystemInitialized = false;
  private static readonly AGENT_NAME = 'learning-matching';
  private static adaptiveEngine: AdaptiveUpdateEngine | null = null;
  private static selfModifyingConfig: SelfModificationConfig = {
    agentName: 'learning-matching',
    enableSelfModification: true,
    modificationThreshold: 0.1,
    adaptationRate: 0.01,
  };

  /**
   * Initialize adaptive update engine
   */
  private static async initializeAdaptiveEngine(): Promise<void> {
    if (!this.adaptiveEngine) {
      this.adaptiveEngine = new AdaptiveUpdateEngine({
        agentName: this.AGENT_NAME,
      });
    }
  }

  /**
   * Trigger self-modification when performance degrades
   */
  private static async triggerSelfModification(performanceDrop: number): Promise<void> {
    await this.initializeAdaptiveEngine();

    logger.info('LearningMatchingService self-modification triggered', {
      agentName: this.AGENT_NAME,
      performanceDrop,
    });

    // Adjust memory update frequencies through adaptive engine
    if (this.adaptiveEngine) {
      await this.adaptiveEngine.recordPerformance(1 - performanceDrop);
    }
  }

  /**
   * Initialize continuum memory system for learning matching
   */
  private static async initializeMemorySystem(): Promise<void> {
    if (this.memorySystemInitialized) return;

    await this.initializeAdaptiveEngine();

    try {
      // Configure 3-level memory system
      // Level 0 (High-frequency): Last 10 matches, updates every match (frequency=1)
      // Level 1 (Mid-frequency): Monthly patterns, updates daily (frequency=16)
      // Level 2 (Low-frequency): Overall preferences, updates weekly (frequency=1M)
      
      const config: ContinuumMemoryConfig = {
        agentName: this.AGENT_NAME,
        defaultChunkSize: 10,
        defaultLearningRate: 0.001,
        levels: [
          {
            level: 0,
            frequency: 1, // Updates every match
            chunkSize: 10, // Last 10 matches
            learningRate: 0.01, // Higher learning rate for short-term
            mlpConfig: {
              inputSize: 32, // Contractor features + homeowner history + job requirements
              hiddenSizes: [64, 32],
              outputSize: 1, // Match score adjustment
              activation: 'relu',
            },
          },
          {
            level: 1,
            frequency: 16, // Updates every 16 matches (daily batch)
            chunkSize: 100, // Last 100 matches
            learningRate: 0.005, // Medium learning rate
            mlpConfig: {
              inputSize: 32,
              hiddenSizes: [128, 64],
              outputSize: 1,
              activation: 'relu',
            },
          },
          {
            level: 2,
            frequency: 1000000, // Updates weekly (low frequency)
            chunkSize: 1000, // Last 1000 matches
            learningRate: 0.001, // Lower learning rate for long-term
            mlpConfig: {
              inputSize: 32,
              hiddenSizes: [256, 128, 64],
              outputSize: 1,
              activation: 'relu',
            },
          },
        ],
      };

      await memoryManager.getOrCreateMemorySystem(config);
      this.memorySystemInitialized = true;

      logger.info('LearningMatchingService memory system initialized', {
        agentName: this.AGENT_NAME,
        levels: config.levels.length,
      });
    } catch (error) {
      logger.error('Failed to initialize memory system', error, {
        service: 'LearningMatchingService',
      });
      // Continue with fallback behavior
    }
  }

  /**
   * Adjust match scores based on learned homeowner preferences
   * Enhanced with multi-frequency memory queries
   */
  static async adjustMatchScore(
    contractorId: string,
    homeownerId: string,
    baseScore: MatchingScore
  ): Promise<MatchingScore> {
    try {
      await this.initializeMemorySystem();

      // Extract features for associative memory keys
      const keys = await this.extractMatchingKeys(contractorId, homeownerId, baseScore);

      // Query all memory levels and combine results
      const memoryAdjustments: number[] = [];
      
      for (let level = 0; level < 3; level++) {
        try {
          const queryResult = await memoryManager.query(
            this.AGENT_NAME,
            keys,
            level
          );
          
          // Memory returns adjustment factor (0-1 range, normalized)
          // Convert to adjustment multiplier (0.8 to 1.2 range)
          const adjustment = 0.8 + (queryResult.values[0] || 0.5) * 0.4;
          memoryAdjustments.push(adjustment);
        } catch (error) {
          logger.warn('Failed to query memory level', {
            service: 'LearningMatchingService',
            level,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          memoryAdjustments.push(1.0); // Neutral adjustment on error
        }
      }

      // Combine adjustments from all levels with weights
      // Short-term: 0.3, Mid-term: 0.4, Long-term: 0.3
      const combinedAdjustment = 
        memoryAdjustments[0] * 0.3 +
        memoryAdjustments[1] * 0.4 +
        memoryAdjustments[2] * 0.3;

      // Fallback to rule-based if memory not available
      let finalAdjustment = combinedAdjustment;
      if (memoryAdjustments.every(adj => adj === 1.0)) {
        // No memory data available, use rule-based fallback
        finalAdjustment = await this.calculateRuleBasedAdjustment(
          contractorId,
          homeownerId
        );
      }

      // Apply adjustments to scores
      const adjustedScore: MatchingScore = {
        ...baseScore,
        overallScore: Math.min(
          100,
          Math.max(0, baseScore.overallScore * finalAdjustment)
        ),
      };

      return adjustedScore;
    } catch (error) {
      logger.error('Error adjusting match score', error, {
        service: 'LearningMatchingService',
      });
      return baseScore; // Return original score on error
    }
  }

  /**
   * Extract features for associative memory keys
   * Keys (K): Contractor features, homeowner history, job requirements
   */
  private static async extractMatchingKeys(
    contractorId: string,
    homeownerId: string,
    baseScore: MatchingScore
  ): Promise<number[]> {
    const keys: number[] = [];

    // Get contractor features
    const { data: contractor } = await serverSupabase
      .from('users')
      .select('id, rating, total_jobs_completed')
      .eq('id', contractorId)
      .single();

    // Get homeowner history
    const { data: homeownerJobs } = await serverSupabase
      .from('jobs')
      .select('id, category, budget, contractor_id')
      .eq('homeowner_id', homeownerId)
      .eq('status', 'completed')
      .not('contractor_id', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(10);

    // Normalize features to 0-1 range
    keys.push((contractor?.rating || 0) / 5); // Normalized rating
    keys.push(Math.min((contractor?.total_jobs_completed || 0) / 100, 1)); // Normalized experience
    keys.push(baseScore.skillMatch / 100);
    keys.push(baseScore.locationScore / 100);
    keys.push(baseScore.budgetAlignment / 100);
    keys.push(baseScore.ratingScore / 100);
    keys.push(baseScore.experienceScore / 100);
    keys.push(baseScore.availabilityMatch / 100);
    keys.push(baseScore.responsiveness / 100);
    keys.push(baseScore.priceCompetitiveness / 100);

    // Homeowner preference features
    const pastContractorIds = homeownerJobs?.map(j => j.contractor_id) || [];
    keys.push(pastContractorIds.includes(contractorId) ? 1 : 0); // Repeat contractor
    keys.push(Math.min((homeownerJobs?.length || 0) / 10, 1)); // Homeowner experience
    keys.push(Math.min((pastContractorIds.length || 0) / 5, 1)); // Contractor diversity

    // Category preferences
    const categories = homeownerJobs?.map(j => j.category || '').filter(Boolean) || [];
    const categoryFrequency = categories.length > 0 ? categories.length / 10 : 0;
    keys.push(Math.min(categoryFrequency, 1));

    // Budget patterns
    const budgets = homeownerJobs?.map(j => j.budget || 0).filter(b => b > 0) || [];
    const avgBudget = budgets.length > 0
      ? budgets.reduce((a, b) => a + b, 0) / budgets.length
      : 0;
    keys.push(Math.min(avgBudget / 5000, 1)); // Normalized average budget

    // Pad to expected input size (32 features)
    while (keys.length < 32) {
      keys.push(0);
    }

    return keys.slice(0, 32);
  }

  /**
   * Calculate rule-based adjustment (fallback)
   */
  private static async calculateRuleBasedAdjustment(
    contractorId: string,
    homeownerId: string
  ): Promise<number> {
    // Get homeowner's past selected contractors
    const { data: pastJobs } = await serverSupabase
      .from('jobs')
      .select('contractor_id, category, budget')
      .eq('homeowner_id', homeownerId)
      .eq('status', 'completed')
      .not('contractor_id', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(10);

    let adjustmentFactor = 1.0;

    // Boost if contractor was previously selected
    if (pastJobs?.some((job) => job.contractor_id === contractorId)) {
      adjustmentFactor += 0.15;
    }

    // Boost if similar contractors were selected
    if (pastJobs && pastJobs.length > 0) {
      adjustmentFactor += 0.1;
    }

    return adjustmentFactor;
  }

  /**
   * Learn from homeowner's bid acceptance
   * Enhanced with multi-frequency memory updates
   * Implements associative memory compression: M: K → V
   */
  static async learnFromAcceptance(
    jobId: string,
    homeownerId: string,
    contractorId: string,
    bidAmount: number
  ): Promise<void> {
    try {
      await this.initializeMemorySystem();

      // Get job and contractor details for context flow
      const { data: job } = await serverSupabase
        .from('jobs')
        .select('id, category, budget, contractor_id, homeowner_id')
        .eq('id', jobId)
        .single();

      const { data: contractor } = await serverSupabase
        .from('users')
        .select('id, rating, total_jobs_completed')
        .eq('id', contractorId)
        .single();

      if (!job || !contractor) {
        logger.warn('Missing data for learning', {
          service: 'LearningMatchingService',
          jobId,
          contractorId,
        });
        return;
      }

      // Extract keys (contractor features + homeowner history + job requirements)
      const keys = await this.extractMatchingKeysForLearning(
        contractorId,
        homeownerId,
        job
      );

      // Extract values (match outcome: acceptance = 1.0, represents successful match)
      // Value represents the "surprise signal" - positive outcome
      const values = [1.0]; // Successful acceptance

      // Add context flow to all memory levels
      // Each level will update at its own frequency
      for (let level = 0; level < 3; level++) {
        try {
          await memoryManager.addContextFlow(
            this.AGENT_NAME,
            keys,
            values,
            level
          );
        } catch (error) {
          logger.warn('Failed to add context flow to memory level', {
            service: 'LearningMatchingService',
            level,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Also update user behavior profile (existing functionality)
      const { data: existingProfile } = await serverSupabase
        .from('user_behavior_profiles')
        .select('*')
        .eq('user_id', homeownerId)
        .single();

      if (existingProfile) {
        await serverSupabase
          .from('user_behavior_profiles')
          .update({
            data_points_count: (existingProfile.data_points_count || 0) + 1,
            last_updated: new Date().toISOString(),
          })
          .eq('user_id', homeownerId);
      } else {
        await serverSupabase.from('user_behavior_profiles').insert({
          user_id: homeownerId,
          user_type: 'homeowner',
          data_points_count: 1,
          created_at: new Date().toISOString(),
          last_updated: new Date().toISOString(),
        });
      }

      logger.info('Learned from bid acceptance', {
        service: 'LearningMatchingService',
        jobId,
        homeownerId,
        contractorId,
        memoryLevelsUpdated: 3,
      });
    } catch (error) {
      logger.error('Error learning from acceptance', error, {
        service: 'LearningMatchingService',
      });
    }
  }

  /**
   * Extract matching keys for learning context flow
   */
  private static async extractMatchingKeysForLearning(
    contractorId: string,
    homeownerId: string,
    job: any
  ): Promise<number[]> {
    const keys: number[] = [];

    // Get contractor features
    const { data: contractor } = await serverSupabase
      .from('users')
      .select('id, rating, total_jobs_completed')
      .eq('id', contractorId)
      .single();

    // Get homeowner history
    const { data: homeownerJobs } = await serverSupabase
      .from('jobs')
      .select('id, category, budget, contractor_id')
      .eq('homeowner_id', homeownerId)
      .eq('status', 'completed')
      .not('contractor_id', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(10);

    // Normalize features
    keys.push((contractor?.rating || 0) / 5);
    keys.push(Math.min((contractor?.total_jobs_completed || 0) / 100, 1));
    keys.push(job.category ? 1 : 0); // Category match
    keys.push(Math.min((job.budget || 0) / 5000, 1)); // Normalized budget

    // Homeowner preference features
    const pastContractorIds = homeownerJobs?.map((j: any) => j.contractor_id) || [];
    keys.push(pastContractorIds.includes(contractorId) ? 1 : 0);
    keys.push(Math.min((homeownerJobs?.length || 0) / 10, 1));

    // Pad to expected input size
    while (keys.length < 32) {
      keys.push(0);
    }

    return keys.slice(0, 32);
  }
}

