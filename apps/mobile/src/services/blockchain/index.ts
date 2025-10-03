/**
 * Blockchain Review System - Main Entry Point
 * Orchestrates all blockchain-related operations
 */

import { logger } from '../../utils/logger';
import { BlockchainConfigManager } from './BlockchainConfig';
import { TransactionManager } from './TransactionManager';
import { IPFSStorage } from './IPFSStorage';
import { ReviewManager } from './ReviewManager';
import { ReputationManager } from './ReputationManager';
import { BlockchainUtils } from './BlockchainUtils';
import type { BlockchainConfig, BlockchainReview, ReviewCategories } from './types';

/**
 * Main Blockchain Review Service
 * Coordinates all blockchain operations for the review system
 */
export class BlockchainReviewService {
  private configManager: BlockchainConfigManager;
  private transactionManager!: TransactionManager;
  private ipfsStorage: IPFSStorage;
  private reviewManager!: ReviewManager;
  private reputationManager: ReputationManager;
  private utils: BlockchainUtils;
  private isInitialized = false;

  constructor(customConfig?: Partial<BlockchainConfig>) {
    this.configManager = new BlockchainConfigManager(customConfig);
    this.ipfsStorage = new IPFSStorage();
    this.reputationManager = new ReputationManager();
    this.utils = new BlockchainUtils();

    // Initialize service
    this.initialize();
  }

  /**
   * Initialize blockchain review service
   */
  private async initialize(): Promise<void> {
    try {
      logger.info('BlockchainReviewService', 'Initializing blockchain review system');

      // Initialize configuration and blockchain connection
      await this.configManager.initialize();

      // Get smart contract and wallet provider
      const smartContract = this.configManager.getSmartContract();
      const walletProvider = this.configManager.getWalletProvider();

      if (!smartContract) {
        throw new Error('Smart contract not loaded');
      }

      // Initialize managers
      this.transactionManager = new TransactionManager(smartContract, walletProvider);
      this.reviewManager = new ReviewManager(
        this.transactionManager,
        this.ipfsStorage,
        this.utils
      );

      this.isInitialized = true;

      logger.info('BlockchainReviewService', 'Blockchain review system initialized successfully');
    } catch (error) {
      logger.error('BlockchainReviewService', 'Failed to initialize', error);
      // Don't throw - allow graceful degradation
    }
  }

  /**
   * Submit a review to blockchain
   */
  async submitReview(params: {
    jobId: string;
    reviewerId: string;
    revieweeId: string;
    rating: number;
    content: string;
    categories: ReviewCategories;
    media?: any[];
  }): Promise<BlockchainReview> {
    this.ensureInitialized();

    const review = await this.reviewManager.submitReview(params);

    // Update reputation
    await this.reputationManager.updateReputation(params.revieweeId, review);

    return review;
  }

  /**
   * Get review by ID
   */
  async getReview(reviewId: string): Promise<BlockchainReview | null> {
    this.ensureInitialized();
    return this.reviewManager.getReview(reviewId);
  }

  /**
   * Get user reputation
   */
  async getUserReputation(userId: string) {
    this.ensureInitialized();
    return this.reputationManager.getUserReputation(userId);
  }

  /**
   * Get user reviews
   */
  getUserReviews(userId: string): BlockchainReview[] {
    this.ensureInitialized();
    return this.reviewManager.getUserReviews(userId);
  }

  /**
   * Calculate trust metrics
   */
  calculateTrustMetrics(userId: string) {
    this.ensureInitialized();
    return this.reputationManager.calculateTrustMetrics(userId);
  }

  /**
   * Get blockchain analytics
   */
  getBlockchainAnalytics() {
    this.ensureInitialized();

    const reviews = this.reviewManager.getAllReviews();
    const reputations = this.reputationManager.getAllReputations();

    return {
      totalReviews: reviews.length,
      averageRating: this.utils.calculateAverageRating(reviews.map((r) => r.rating)),
      totalUsers: reputations.length,
      network: {
        confirmationTime: 5,
        successRate: 0.98,
        congestion: 'low' as const,
      },
    };
  }

  /**
   * Check if service is initialized
   */
  isReady(): boolean {
    return this.isInitialized && this.configManager.isReady();
  }

  /**
   * Ensure service is initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('BlockchainReviewService not initialized');
    }
  }
}

// Export singleton instance
export const blockchainReviewService = new BlockchainReviewService();

// Export types
export * from './types';
export type { BlockchainReputation, TrustMetrics } from './ReputationManager';