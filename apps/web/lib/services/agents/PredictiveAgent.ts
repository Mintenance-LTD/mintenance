import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { AgentLogger } from './AgentLogger';
import { AutomationPreferencesService } from './AutomationPreferencesService';
import { NoShowReminderService } from '../notifications/NoShowReminderService';
import { DisputeWorkflowService } from '../disputes/DisputeWorkflowService';
import { memoryManager } from '../ml-engine/memory/MemoryManager';
import { AdaptiveUpdateEngine } from './AdaptiveUpdateEngine';
import type { AgentResult, AgentContext, RiskPrediction } from './types';
import type { ContinuumMemoryConfig } from '../ml-engine/memory/types';

/**
 * Predictive agent that predicts job risks and applies preventive actions
 * Enhanced with Nested Learning multi-frequency memory system
 * 
 * Implements:
 * - 3-level risk memory (current/recent/long-term)
 * - Continual learning from prediction outcomes
 * - Self-improving risk models
 */
export class PredictiveAgent {
  private static memorySystemInitialized = false;
  private static readonly AGENT_NAME = 'predictive';
  private static predictionHistory: Map<string, { prediction: RiskPrediction; timestamp: Date }> = new Map();
  private static adaptiveEngine: AdaptiveUpdateEngine | null = null;

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
   * Trigger self-modification when prediction accuracy drops
   */
  private static async triggerSelfModification(accuracyDrop: number): Promise<void> {
    await this.initializeAdaptiveEngine();

    logger.info('PredictiveAgent self-modification triggered', {
      agentName: this.AGENT_NAME,
      accuracyDrop,
    });

    // Adjust memory update frequencies through adaptive engine
    if (this.adaptiveEngine) {
      await this.adaptiveEngine.recordPerformance(1 - accuracyDrop);
    }
  }

  /**
   * Initialize continuum memory system for risk prediction
   */
  private static async initializeMemorySystem(): Promise<void> {
    if (this.memorySystemInitialized) return;

    await this.initializeAdaptiveEngine();

    try {
      // Configure 3-level memory system for risk prediction
      // Level 0 (High-frequency): Current job context, updates every prediction
      // Level 1 (Mid-frequency): Recent 10 jobs pattern, updates every 10 predictions
      // Level 2 (Low-frequency): Contractor/user long-term history, updates weekly
      
      const config: ContinuumMemoryConfig = {
        agentName: this.AGENT_NAME,
        defaultChunkSize: 10,
        defaultLearningRate: 0.001,
        levels: [
          {
            level: 0,
            frequency: 1, // Updates every prediction
            chunkSize: 10, // Last 10 predictions
            learningRate: 0.01,
            mlpConfig: {
              inputSize: 24, // Job features + contractor history + timing factors
              hiddenSizes: [64, 32],
              outputSize: 4, // Risk probabilities for 4 risk types
              activation: 'relu',
            },
          },
          {
            level: 1,
            frequency: 10, // Updates every 10 predictions
            chunkSize: 100, // Last 100 predictions
            learningRate: 0.005,
            mlpConfig: {
              inputSize: 24,
              hiddenSizes: [128, 64],
              outputSize: 4,
              activation: 'relu',
            },
          },
          {
            level: 2,
            frequency: 1000000, // Updates weekly (low frequency)
            chunkSize: 1000, // Last 1000 predictions
            learningRate: 0.001,
            mlpConfig: {
              inputSize: 24,
              hiddenSizes: [256, 128, 64],
              outputSize: 4,
              activation: 'relu',
            },
          },
        ],
      };

      await memoryManager.getOrCreateMemorySystem(config);
      this.memorySystemInitialized = true;

      logger.info('PredictiveAgent memory system initialized', {
        agentName: this.AGENT_NAME,
        levels: config.levels.length,
      });
    } catch (error) {
      logger.error('Failed to initialize memory system', error, {
        service: 'PredictiveAgent',
      });
      // Continue with fallback behavior
    }
  }
  /**
   * Analyze a job for potential risks
   */
  static async analyzeJob(
    jobId: string,
    context?: AgentContext
  ): Promise<AgentResult[]> {
    const results: AgentResult[] = [];

    try {
      // Get job details
      const { data: job, error } = await serverSupabase
        .from('jobs')
        .select(
          'id, status, contractor_id, homeowner_id, scheduled_start_date, budget, category, created_at'
        )
        .eq('id', jobId)
        .single();

      if (error || !job) {
        logger.error('Failed to fetch job for risk analysis', {
          service: 'PredictiveAgent',
          jobId,
          error: error?.message,
        });
        return [
          {
            success: false,
            error: 'Failed to fetch job',
          },
        ];
      }

      // Predict no-show risk if job is assigned
      if (job.status === 'assigned' && job.contractor_id) {
        const noShowRisk = await this.predictNoShowRisk(jobId, job.contractor_id);
        if (noShowRisk) {
          results.push(noShowRisk);
        }
      }

      // Predict dispute risk
      const disputeRisk = await this.predictDisputeRisk(jobId, job);
      if (disputeRisk) {
        results.push(disputeRisk);
      }

      // Predict delay risk
      if (job.status === 'assigned' || job.status === 'in_progress') {
        const delayRisk = await this.predictDelayRisk(jobId, job);
        if (delayRisk) {
          results.push(delayRisk);
        }
      }

      return results;
    } catch (error) {
      logger.error('Error analyzing job risks', error, {
        service: 'PredictiveAgent',
        jobId,
      });

      return [
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      ];
    }
  }

  /**
   * Predict no-show risk based on contractor history
   * Enhanced with multi-frequency memory queries
   */
  private static async predictNoShowRisk(
    jobId: string,
    contractorId: string
  ): Promise<AgentResult | null> {
    try {
      await this.initializeMemorySystem();

      // Get job and contractor context
      const { data: job } = await serverSupabase
        .from('jobs')
        .select('id, scheduled_start_date, contractor_id')
        .eq('id', jobId)
        .single();

      // Extract features for memory keys
      const keys = await this.extractRiskKeys(jobId, contractorId, 'no-show', job);

      // Query all memory levels for risk probabilities
      const memoryProbabilities: number[] = [];
      
      for (let level = 0; level < 3; level++) {
        try {
          const queryResult = await memoryManager.query(
            this.AGENT_NAME,
            keys,
            level
          );
          // Memory returns probabilities for 4 risk types: [no-show, dispute, delay, quality]
          // Extract no-show probability (index 0)
          const prob = (queryResult.values[0] || 0) * 100; // Convert 0-1 to 0-100
          memoryProbabilities.push(prob);
        } catch (error) {
          logger.warn('Failed to query memory level for no-show risk', {
            service: 'PredictiveAgent',
            level,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          memoryProbabilities.push(0);
        }
      }

      // Combine probabilities from all levels with weights
      const combinedProbability = 
        memoryProbabilities[0] * 0.3 + // Current context
        memoryProbabilities[1] * 0.4 + // Recent patterns
        memoryProbabilities[2] * 0.3; // Long-term history

      // Fallback to rule-based if memory not available
      let finalProbability = combinedProbability;
      let reasoning = 'Memory-based prediction';
      
      if (memoryProbabilities.every(prob => prob === 0)) {
        // No memory data, use rule-based fallback
        const ruleBased = await this.calculateRuleBasedNoShowRisk(contractorId);
        finalProbability = ruleBased.probability;
        reasoning = ruleBased.reasoning;
      }

      // Determine severity
      let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
      if (finalProbability >= 60) {
        severity = 'high';
      } else if (finalProbability >= 40) {
        severity = 'medium';
      } else if (finalProbability >= 20) {
        severity = 'low';
      }

      if (finalProbability > 0) {
        return await this.createRiskPrediction(
          jobId,
          contractorId,
          'no-show',
          Math.round(finalProbability),
          severity,
          reasoning,
          jobId
        );
      }

      return null;
    } catch (error) {
      logger.error('Error predicting no-show risk', error, {
        service: 'PredictiveAgent',
        jobId,
      });
      return null;
    }
  }

  /**
   * Calculate rule-based no-show risk (fallback)
   */
  private static async calculateRuleBasedNoShowRisk(contractorId: string): Promise<{
    probability: number;
    reasoning: string;
  }> {
    const { data: contractorJobs, error } = await serverSupabase
      .from('jobs')
      .select('id, status, scheduled_start_date')
      .eq('contractor_id', contractorId)
      .in('status', ['assigned', 'in_progress', 'completed', 'cancelled']);

    if (error || !contractorJobs || contractorJobs.length === 0) {
      return {
        probability: 40,
        reasoning: 'New contractor - no history available',
      };
    }

    const pastNoShows = contractorJobs.filter((job) => {
      if (job.status === 'cancelled' && job.scheduled_start_date) {
        const scheduledDate = new Date(job.scheduled_start_date);
        const now = new Date();
        return scheduledDate.getTime() - now.getTime() < 24 * 60 * 60 * 1000;
      }
      return false;
    }).length;

    const noShowRate = (pastNoShows / contractorJobs.length) * 100;
    let probability = 0;

    if (noShowRate > 30) {
      probability = 75;
    } else if (noShowRate > 15) {
      probability = 50;
    } else if (noShowRate > 5) {
      probability = 30;
    }

    return {
      probability,
      reasoning: `Contractor has ${noShowRate.toFixed(1)}% no-show rate`,
    };
  }

  /**
   * Predict dispute risk based on job characteristics
   * Enhanced with multi-frequency memory queries
   */
  private static async predictDisputeRisk(
    jobId: string,
    job: any
  ): Promise<AgentResult | null> {
    try {
      await this.initializeMemorySystem();

      // Extract features for memory keys
      const keys = await this.extractRiskKeys(jobId, job.contractor_id || '', 'dispute', job);

      // Query all memory levels
      const memoryProbabilities: number[] = [];
      
      for (let level = 0; level < 3; level++) {
        try {
          const queryResult = await memoryManager.query(
            this.AGENT_NAME,
            keys,
            level
          );
          // Extract dispute probability (index 1)
          const prob = (queryResult.values[1] || 0) * 100;
          memoryProbabilities.push(prob);
        } catch (error) {
          logger.warn('Failed to query memory level for dispute risk', {
            service: 'PredictiveAgent',
            level,
          });
          memoryProbabilities.push(0);
        }
      }

      // Combine probabilities
      const combinedProbability = 
        memoryProbabilities[0] * 0.3 +
        memoryProbabilities[1] * 0.4 +
        memoryProbabilities[2] * 0.3;

      // Fallback to rule-based
      let finalProbability = combinedProbability;
      let factors: string[] = [];
      
      if (memoryProbabilities.every(prob => prob === 0)) {
        const ruleBased = await this.calculateRuleBasedDisputeRisk(job);
        finalProbability = ruleBased.riskScore;
        factors = ruleBased.factors;
      }

      if (finalProbability >= 30) {
        const severity: 'low' | 'medium' | 'high' | 'critical' =
          finalProbability >= 60 ? 'high' : finalProbability >= 40 ? 'medium' : 'low';

        return await this.createRiskPrediction(
          jobId,
          job.homeowner_id,
          'dispute',
          Math.min(Math.round(finalProbability), 100),
          severity,
          factors.length > 0 ? factors.join('; ') : 'Memory-based prediction',
          jobId
        );
      }

      return null;
    } catch (error) {
      logger.error('Error predicting dispute risk', error, {
        service: 'PredictiveAgent',
        jobId,
      });
      return null;
    }
  }

  /**
   * Calculate rule-based dispute risk (fallback)
   */
  private static async calculateRuleBasedDisputeRisk(job: any): Promise<{
    riskScore: number;
    factors: string[];
  }> {
    let riskScore = 0;
    const factors: string[] = [];

    if (job.budget && job.budget > 1000) {
      riskScore += 20;
      factors.push('High-value job (>£1000)');
    }

    if (job.contractor_id) {
      const { data: contractorJobs } = await serverSupabase
        .from('jobs')
        .select('id, status')
        .eq('contractor_id', job.contractor_id)
        .eq('status', 'completed');

      if (contractorJobs && contractorJobs.length < 5) {
        riskScore += 15;
        factors.push('Inexperienced contractor (<5 completed jobs)');
      }
    }

    const { data: homeownerJobs } = await serverSupabase
      .from('jobs')
      .select('id')
      .eq('homeowner_id', job.homeowner_id)
      .eq('status', 'completed');

    if (!homeownerJobs || homeownerJobs.length === 0) {
      riskScore += 10;
      factors.push('New homeowner (no completed jobs)');
    }

    return { riskScore, factors };
  }

  /**
   * Predict delay risk based on contractor workload
   */
  private static async predictDelayRisk(
    jobId: string,
    job: any
  ): Promise<AgentResult | null> {
    try {
      if (!job.contractor_id) {
        return null;
      }

      // Get contractor's active jobs
      const { data: activeJobs, error } = await serverSupabase
        .from('jobs')
        .select('id, status, scheduled_start_date')
        .eq('contractor_id', job.contractor_id)
        .in('status', ['assigned', 'in_progress']);

      if (error) {
        logger.error('Failed to fetch contractor workload', {
          service: 'PredictiveAgent',
          error: error.message,
        });
        return null;
      }

      const activeJobCount = activeJobs?.length || 0;
      let probability = 0;
      let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';

      // More active jobs = higher delay risk
      if (activeJobCount > 5) {
        probability = 60;
        severity = 'high';
      } else if (activeJobCount > 3) {
        probability = 40;
        severity = 'medium';
      } else if (activeJobCount > 1) {
        probability = 20;
        severity = 'low';
      }

      if (probability > 0) {
        return await this.createRiskPrediction(
          jobId,
          job.contractor_id,
          'delay',
          probability,
          severity,
          `Contractor has ${activeJobCount} active job(s)`,
          jobId
        );
      }

      return null;
    } catch (error) {
      logger.error('Error predicting delay risk', error, {
        service: 'PredictiveAgent',
        jobId,
      });
      return null;
    }
  }

  /**
   * Extract risk keys for memory queries
   * Keys: Job features, contractor history, timing factors
   */
  private static async extractRiskKeys(
    jobId: string,
    contractorId: string,
    riskType: 'no-show' | 'dispute' | 'delay' | 'quality',
    job?: any
  ): Promise<number[]> {
    const keys: number[] = [];

    // Get job details if not provided
    if (!job) {
      const { data: jobData } = await serverSupabase
        .from('jobs')
        .select('id, budget, category, scheduled_start_date, contractor_id, homeowner_id')
        .eq('id', jobId)
        .single();
      job = jobData;
    }

    // Get contractor features
    const { data: contractor } = await serverSupabase
      .from('users')
      .select('id, rating, total_jobs_completed')
      .eq('id', contractorId)
      .single();

    // Get contractor history
    const { data: contractorJobs } = await serverSupabase
      .from('jobs')
      .select('id, status, scheduled_start_date')
      .eq('contractor_id', contractorId)
      .in('status', ['assigned', 'in_progress', 'completed', 'cancelled']);

    // Normalize features to 0-1 range
    keys.push((contractor?.rating || 0) / 5); // Rating
    keys.push(Math.min((contractor?.total_jobs_completed || 0) / 100, 1)); // Experience
    keys.push(Math.min((job?.budget || 0) / 5000, 1)); // Budget
    keys.push(job?.category ? 1 : 0); // Has category

    // Timing factors
    if (job?.scheduled_start_date) {
      const scheduledDate = new Date(job.scheduled_start_date);
      const now = new Date();
      const hoursUntilStart = (scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      keys.push(Math.min(Math.max(hoursUntilStart / 168, 0), 1)); // Normalize to 0-1 (1 week)
    } else {
      keys.push(0);
    }

    // Contractor history features
    const totalJobs = contractorJobs?.length || 0;
    keys.push(Math.min(totalJobs / 50, 1)); // Total jobs
    const cancelledJobs = contractorJobs?.filter(j => j.status === 'cancelled').length || 0;
    keys.push(totalJobs > 0 ? cancelledJobs / totalJobs : 0); // Cancellation rate

    // Risk type encoding
    const riskTypeMap = { 'no-show': 0.25, 'dispute': 0.5, 'delay': 0.75, 'quality': 1.0 };
    keys.push(riskTypeMap[riskType] || 0);

    // Pad to expected input size (24 features)
    while (keys.length < 24) {
      keys.push(0);
    }

    return keys.slice(0, 24);
  }

  /**
   * Learn from prediction outcome
   * Updates memory with actual outcomes for continual learning
   */
  static async learnFromOutcome(
    predictionId: string,
    outcomeOccurred: boolean,
    riskType: 'no-show' | 'dispute' | 'delay' | 'quality'
  ): Promise<void> {
    try {
      await this.initializeMemorySystem();

      // Get original prediction
      const { data: prediction } = await serverSupabase
        .from('risk_predictions')
        .select('*')
        .eq('id', predictionId)
        .single();

      if (!prediction) {
        logger.warn('Prediction not found for learning', {
          service: 'PredictiveAgent',
          predictionId,
        });
        return;
      }

      // Extract keys from original prediction context
      const keys = await this.extractRiskKeys(
        prediction.job_id,
        prediction.user_id || '',
        riskType
      );

      // Values: actual outcome (1.0 = occurred, 0.0 = did not occur)
      // This represents the "surprise signal" - difference from prediction
      const predictedProb = prediction.probability / 100; // Convert to 0-1
      const actualOutcome = outcomeOccurred ? 1.0 : 0.0;
      const surpriseSignal = Math.abs(actualOutcome - predictedProb);
      const values = [
        riskType === 'no-show' ? surpriseSignal : 0,
        riskType === 'dispute' ? surpriseSignal : 0,
        riskType === 'delay' ? surpriseSignal : 0,
        riskType === 'quality' ? surpriseSignal : 0,
      ];

      // Add context flow to all memory levels
      for (let level = 0; level < 3; level++) {
        try {
          await memoryManager.addContextFlow(
            this.AGENT_NAME,
            keys,
            values,
            level
          );
        } catch (error) {
          logger.warn('Failed to add context flow for outcome learning', {
            service: 'PredictiveAgent',
            level,
          });
        }
      }

      // Update prediction outcome in database
      await AgentLogger.updateRiskOutcome(predictionId, outcomeOccurred);

      logger.info('Learned from prediction outcome', {
        service: 'PredictiveAgent',
        predictionId,
        riskType,
        outcomeOccurred,
        surpriseSignal,
      });

      // Check if self-modification is needed based on prediction accuracy
      const predictionAccuracy = outcomeOccurred === (predictedProb > 0.5) ? 1.0 : 0.0;
      if (predictionAccuracy < 0.7) {
        // Low accuracy, trigger self-modification
        await this.triggerSelfModification(1 - predictionAccuracy);
      }
    } catch (error) {
      logger.error('Error learning from outcome', error, {
        service: 'PredictiveAgent',
        predictionId,
      });
    }
  }

  /**
   * Create a risk prediction and apply preventive actions if enabled
   * Enhanced to store predictions for outcome learning
   */
  private static async createRiskPrediction(
    jobId: string,
    userId: string,
    riskType: 'no-show' | 'dispute' | 'delay' | 'quality',
    probability: number,
    severity: 'low' | 'medium' | 'high' | 'critical',
    reasoning: string,
    contextJobId: string
  ): Promise<AgentResult> {
    try {
      // Check if user wants risk prevention actions
      const autoApply = await AutomationPreferencesService.isEnabled(
        userId,
        'autoApplyRiskPreventions'
      );

      let preventiveAction: string | undefined;
      let actionTaken: 'preventive-reminder' | 'milestone-payment' | undefined;

      if (autoApply && probability >= 50) {
        // Apply preventive actions for high-risk predictions
        if (riskType === 'no-show') {
          // Send enhanced reminder
          const job = await serverSupabase
            .from('jobs')
            .select('id, title, scheduled_start_date, contractor_id, homeowner_id')
            .eq('id', contextJobId)
            .single();

          if (job.data) {
            // Send reminder
            await NoShowReminderService.sendPreStartReminders();
            preventiveAction = 'Enhanced reminder sent';
            actionTaken = 'preventive-reminder';
          }
        } else if (riskType === 'dispute' && severity === 'high') {
          // Suggest milestone payments for high-value disputes
          preventiveAction = 'Consider milestone payments';
          // Note: Milestone payment logic would be implemented separately
        }
      }

      // Log the risk prediction
      const predictionId = await AgentLogger.logRiskPrediction({
        jobId: contextJobId,
        userId,
        riskType,
        probability,
        severity,
        preventiveAction,
        applied: preventiveAction !== undefined,
      });

      // Store prediction for outcome learning
      if (predictionId) {
        this.predictionHistory.set(predictionId, {
          prediction: {
            id: predictionId,
            jobId: contextJobId,
            userId,
            riskType,
            probability,
            severity,
            preventiveAction,
            applied: preventiveAction !== undefined,
          },
          timestamp: new Date(),
        });
      }

      // Create agent decision log
      const decision = {
        jobId: contextJobId,
        userId,
        agentName: 'predictive' as const,
        decisionType: 'risk-prediction' as const,
        actionTaken,
        confidence: probability,
        reasoning: `${riskType} risk: ${reasoning}`,
        metadata: {
          predictionId,
          riskType,
          severity,
          preventiveAction,
        },
      };

      await AgentLogger.logDecision(decision);

      // Add context flow for this prediction (for memory learning)
      try {
        await this.initializeMemorySystem();
        const keys = await this.extractRiskKeys(contextJobId, userId, riskType);
        const predictedValues = [
          riskType === 'no-show' ? probability / 100 : 0,
          riskType === 'dispute' ? probability / 100 : 0,
          riskType === 'delay' ? probability / 100 : 0,
          riskType === 'quality' ? probability / 100 : 0,
        ];
        
        // Add to high-frequency memory (level 0) for immediate context
        await memoryManager.addContextFlow(
          this.AGENT_NAME,
          keys,
          predictedValues,
          0
        );
      } catch (error) {
        logger.warn('Failed to add prediction context flow', {
          service: 'PredictiveAgent',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      return {
        success: true,
        decision,
        metadata: {
          predictionId,
          riskType,
          probability,
          severity,
          preventiveAction,
        },
      };
    } catch (error) {
      logger.error('Error creating risk prediction', error, {
        service: 'PredictiveAgent',
        jobId,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

