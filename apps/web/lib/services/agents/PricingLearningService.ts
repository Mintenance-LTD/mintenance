/**
 * PricingLearningService
 *
 * Handles ML memory updates, contractor pricing patterns, and market analytics
 * for the PricingAgent. Extracted to keep PricingAgent focused on recommendation logic.
 */

import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { AgentLogger } from './AgentLogger';
import { memoryManager } from '../ml-engine/memory/MemoryManager';
import type { AgentResult, AgentContext } from './types';
import type { ContinuumMemoryConfig } from '../ml-engine/memory/types';
import type { BidWithJob, ContractorPricingPattern } from './PricingCalculations';

const AGENT_NAME = 'pricing';
let memorySystemInitialized = false;

/**
 * Initialize continuum memory system for pricing (3-level multi-frequency).
 */
export async function initializePricingMemory(): Promise<void> {
  if (memorySystemInitialized) return;

  try {
    const config: ContinuumMemoryConfig = {
      agentName: AGENT_NAME,
      defaultChunkSize: 10,
      defaultLearningRate: 0.001,
      levels: [
        {
          level: 0,
          frequency: 1, // Updates every bid analysis
          chunkSize: 10,
          learningRate: 0.01,
          mlpConfig: {
            inputSize: 20,
            hiddenSizes: [64, 32],
            outputSize: 1,
            activation: 'relu',
          },
        },
        {
          level: 1,
          frequency: 16, // Updates daily
          chunkSize: 100,
          learningRate: 0.005,
          mlpConfig: {
            inputSize: 20,
            hiddenSizes: [128, 64],
            outputSize: 1,
            activation: 'relu',
          },
        },
        {
          level: 2,
          frequency: 1000000, // Updates weekly
          chunkSize: 1000,
          learningRate: 0.001,
          mlpConfig: {
            inputSize: 20,
            hiddenSizes: [256, 128, 64],
            outputSize: 1,
            activation: 'relu',
          },
        },
      ],
    };

    await memoryManager.getOrCreateMemorySystem(config);
    memorySystemInitialized = true;

    logger.info('PricingAgent memory system initialized', {
      agentName: AGENT_NAME,
      levels: config.levels.length,
    });
  } catch (error) {
    logger.error('Failed to initialize memory system', error, {
      service: 'PricingAgent',
    });
    // Continue with fallback behavior
  }
}

/**
 * Extract pricing feature keys for memory system queries.
 * Keys: market features, category, location, job features (20-dim vector).
 */
export async function extractPricingKeys(
  category: string,
  location: string,
  jobBudget: number | null
): Promise<number[]> {
  const keys: number[] = [];

  // Category encoding (one-hot style)
  const categories = ['plumbing', 'electrical', 'hvac', 'painting', 'carpentry', 'other'];
  const categoryIndex = categories.indexOf(category.toLowerCase());
  for (let i = 0; i < categories.length; i++) {
    keys.push(i === categoryIndex ? 1 : 0);
  }

  // Location features (simplified)
  const region = location.split(',').map((p) => p.trim()).pop() || 'unknown';
  keys.push(region !== 'unknown' ? 1 : 0);
  keys.push(location.length > 0 ? Math.min(location.length / 50, 1) : 0);

  // Budget features
  if (jobBudget !== null) {
    keys.push(Math.min(jobBudget / 5000, 1));
    keys.push(jobBudget > 1000 ? 1 : 0);
  } else {
    keys.push(0.5);
    keys.push(0);
  }

  // Market demand features (placeholders for future real data)
  keys.push(0.5);
  keys.push(0.5);

  // Pad to expected input size (20 features)
  while (keys.length < 20) {
    keys.push(0);
  }

  return keys.slice(0, 20);
}

/**
 * Learn from bid acceptance/rejection.
 * Enhanced with multi-frequency memory updates and pricing pattern compression.
 */
export async function learnFromBidOutcome(
  bidId: string,
  wasAccepted: boolean
): Promise<AgentResult> {
  try {
    await initializePricingMemory();

    // Get bid details
    const { data: bid, error: bidError } = await serverSupabase
      .from('bids')
      .select('id, amount, contractor_id, job_id, pricing_recommendation_id, jobs!inner(category, location, budget)')
      .eq('id', bidId)
      .single();

    if (bidError || !bid) {
      return { success: false, error: 'Bid not found' };
    }

    const typedBid = bid as BidWithJob;
    const job = typedBid.jobs;

    // Extract keys for memory
    const keys = await extractPricingKeys(
      job.category || '',
      job.location || '',
      job.budget || null
    );

    // Values: accepted price normalized (0-1 range)
    const normalizedPrice = Math.min((bid.amount || 0) / 5000, 1);
    const values = [normalizedPrice];

    // Add context flow to all memory levels
    for (let level = 0; level < 3; level++) {
      try {
        await memoryManager.addContextFlow(AGENT_NAME, keys, values, level);
      } catch {
        logger.warn('Failed to add context flow to memory level', {
          service: 'PricingAgent',
          level,
        });
      }
    }

    // Update pricing recommendation with outcome
    if (bid.pricing_recommendation_id) {
      await serverSupabase
        .from('pricing_recommendations')
        .update({
          final_bid_amount: bid.amount,
          bid_was_accepted: wasAccepted,
          updated_at: new Date().toISOString(),
        })
        .eq('id', bid.pricing_recommendation_id);
    }

    // Update contractor pricing patterns
    await updateContractorPricingPattern(bid.contractor_id, bid.amount, wasAccepted, job.category || '');

    // Update market analytics
    if (wasAccepted) {
      await updateMarketAnalytics(job.category || '', job.location || '', bid.amount, job.budget || 0);
    }

    await AgentLogger.logDecision({
      agentName: 'pricing',
      decisionType: 'learn_from_bid',
      actionTaken: 'updated_patterns',
      confidence: 95,
      reasoning: `Learned from bid outcome: ${wasAccepted ? 'accepted' : 'rejected'} at £${bid.amount}`,
      jobId: bid.job_id,
      userId: bid.contractor_id,
      metadata: { bidId, wasAccepted, bidAmount: bid.amount },
    });

    logger.info('Learned from bid outcome', {
      service: 'PricingAgent',
      bidId,
      wasAccepted,
      bidAmount: bid.amount,
      memoryLevelsUpdated: 3,
    });

    return { success: true, message: 'Learning data updated' };
  } catch (error) {
    logger.error('Error learning from bid outcome', error, {
      service: 'PricingAgent',
      bidId,
    });
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Update contractor pricing patterns based on a bid outcome.
 */
async function updateContractorPricingPattern(
  contractorId: string,
  bidAmount: number,
  wasAccepted: boolean,
  category: string
): Promise<void> {
  try {
    const { data: pattern } = await serverSupabase
      .from('contractor_pricing_patterns')
      .select('*')
      .eq('contractor_id', contractorId)
      .single();

    const totalBids = (pattern?.total_bids_count || 0) + 1;
    const acceptedBids = (pattern?.accepted_bids_count || 0) + (wasAccepted ? 1 : 0);
    const acceptanceRate = (acceptedBids / totalBids) * 100;

    const existingAvg = pattern?.avg_bid_amount || 0;
    const existingCount = pattern?.total_bids_count || 0;
    const newAvg = existingCount > 0
      ? (existingAvg * existingCount + bidAmount) / totalBids
      : bidAmount;

    let pricingStyle = 'variable';
    if (acceptanceRate >= 70 && existingAvg) {
      const deviation = Math.abs(bidAmount - existingAvg) / existingAvg;
      if (deviation < 0.1) {
        pricingStyle = 'competitive';
      } else if (bidAmount < existingAvg * 0.9) {
        pricingStyle = 'budget';
      } else if (bidAmount > existingAvg * 1.1) {
        pricingStyle = 'premium';
      }
    }

    const categoryPatterns = pattern?.category_patterns || {};
    if (!categoryPatterns[category]) {
      categoryPatterns[category] = { totalBids: 0, acceptedBids: 0, avgPrice: 0 };
    }
    const catPattern = categoryPatterns[category];
    catPattern.totalBids = (catPattern.totalBids || 0) + 1;
    catPattern.acceptedBids = (catPattern.acceptedBids || 0) + (wasAccepted ? 1 : 0);
    catPattern.avgPrice =
      ((catPattern.avgPrice || 0) * (catPattern.totalBids - 1) + bidAmount) / catPattern.totalBids;

    if (pattern) {
      await serverSupabase
        .from('contractor_pricing_patterns')
        .update({
          avg_bid_amount: newAvg,
          total_bids_count: totalBids,
          accepted_bids_count: acceptedBids,
          acceptance_rate: acceptanceRate,
          pricing_style: pricingStyle,
          category_patterns: categoryPatterns,
          patterns_learned_from_bids: (pattern.patterns_learned_from_bids || 0) + 1,
          last_analyzed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('contractor_id', contractorId);
    } else {
      await serverSupabase.from('contractor_pricing_patterns').insert({
        contractor_id: contractorId,
        avg_bid_amount: newAvg,
        total_bids_count: totalBids,
        accepted_bids_count: acceptedBids,
        acceptance_rate: acceptanceRate,
        pricing_style: pricingStyle,
        category_patterns: categoryPatterns,
        patterns_learned_from_bids: 1,
        last_analyzed_at: new Date().toISOString(),
      });
    }
  } catch (error) {
    logger.error('Error updating contractor pricing pattern', error, {
      service: 'PricingAgent',
      contractorId,
    });
  }
}

/**
 * Store an accepted bid data point for future market analysis.
 */
async function updateMarketAnalytics(
  category: string,
  location: string,
  acceptedPrice: number,
  budget: number
): Promise<void> {
  try {
    await serverSupabase.from('pricing_analytics').insert({
      category,
      location,
      budget,
      accepted_bid_amount: acceptedPrice,
      analyzed_at: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error updating market analytics', error, {
      service: 'PricingAgent',
      category,
    });
  }
}

/**
 * Get stored contractor pricing pattern from database.
 */
export async function getContractorPricingPattern(
  contractorId: string
): Promise<ContractorPricingPattern | null> {
  try {
    const { data: pattern } = await serverSupabase
      .from('contractor_pricing_patterns')
      .select('*')
      .eq('contractor_id', contractorId)
      .single();

    return pattern as ContractorPricingPattern | null;
  } catch (error) {
    logger.error('Error fetching contractor pricing pattern', error, {
      service: 'PricingAgent',
      contractorId,
    });
    return null;
  }
}
