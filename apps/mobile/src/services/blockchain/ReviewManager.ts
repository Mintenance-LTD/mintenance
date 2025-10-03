/**
 * Review Manager Module
 * Handles blockchain review CRUD operations
 */

import { logger } from '../../utils/logger';
import { performanceMonitor } from '../../utils/performanceMonitor';
import { BlockchainReview, ReviewCategories } from './types';
import { TransactionManager } from './TransactionManager';
import { IPFSStorage } from './IPFSStorage';
import { BlockchainUtils } from './BlockchainUtils';

export class ReviewManager {
  private reviews: Map<string, BlockchainReview> = new Map();

  constructor(
    private transactionManager: TransactionManager,
    private ipfsStorage: IPFSStorage,
    private utils: BlockchainUtils
  ) {}

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
    const operationId = performanceMonitor.startOperation('submit_blockchain_review');

    try {
      // Validate inputs
      const validation = this.utils.validateReviewInputs(params);
      if (!validation.isValid) {
        throw new Error(`Invalid review inputs: ${validation.errors.join(', ')}`);
      }

      logger.info('ReviewManager', 'Submitting review', {
        jobId: params.jobId,
        reviewerId: params.reviewerId,
        rating: params.rating,
      });

      // Upload content to IPFS
      const contentHash = await this.ipfsStorage.uploadToIPFS({
        content: params.content,
        categories: params.categories,
        media: params.media || [],
      });

      // Create blockchain transaction
      const txHash = await this.transactionManager.createReviewTransaction({
        jobId: params.jobId,
        rating: params.rating,
        contentHash,
        metadata: {
          reviewerId: params.reviewerId,
          revieweeId: params.revieweeId,
          categories: params.categories,
        },
      });

      // Wait for confirmation
      const transaction = await this.transactionManager.waitForConfirmation(txHash);

      // Create review record
      const review: BlockchainReview = {
        id: `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        transactionHash: txHash,
        blockNumber: transaction.blockNumber || 0,
        blockHash: this.ipfsStorage.generateVerificationHash({ txHash }),
        jobId: params.jobId,
        reviewerId: params.reviewerId,
        revieweeId: params.revieweeId,
        rating: params.rating,
        content: params.content,
        categories: params.categories,
        media: [],
        metadata: {
          jobCategory: 'general',
          jobValue: 0,
          completionDate: Date.now(),
          verificationLevel: validation.verificationLevel,
          disputeResolution: false,
        },
        timestamp: Date.now(),
        gasUsed: transaction.gasUsed,
        gasFee: transaction.gasUsed * transaction.gasPrice,
        verified: true,
        immutable: true,
        ipfsHash: contentHash,
      };

      this.reviews.set(review.id, review);

      logger.info('ReviewManager', 'Review submitted successfully', {
        reviewId: review.id,
        txHash: review.transactionHash,
        blockNumber: review.blockNumber,
      });

      performanceMonitor.endOperation(operationId);

      return review;
    } catch (error) {
      performanceMonitor.endOperation(operationId);
      logger.error('ReviewManager', 'Failed to submit review', error);
      throw error;
    }
  }

  /**
   * Get review by ID
   */
  async getReview(reviewId: string): Promise<BlockchainReview | null> {
    const operationId = performanceMonitor.startOperation('get_blockchain_review');

    try {
      // Check local cache
      const cachedReview = this.reviews.get(reviewId);
      if (cachedReview) {
        performanceMonitor.endOperation(operationId);
        return cachedReview;
      }

      // Fetch from blockchain (simulated)
      logger.info('ReviewManager', 'Fetching review from blockchain', { reviewId });

      performanceMonitor.endOperation(operationId);

      return null;
    } catch (error) {
      performanceMonitor.endOperation(operationId);
      logger.error('ReviewManager', 'Failed to get review', error);
      return null;
    }
  }

  /**
   * Get reviews for user
   */
  getUserReviews(userId: string): BlockchainReview[] {
    return Array.from(this.reviews.values()).filter(
      (review) => review.revieweeId === userId || review.reviewerId === userId
    );
  }

  /**
   * Get reviews for job
   */
  getJobReviews(jobId: string): BlockchainReview[] {
    return Array.from(this.reviews.values()).filter((review) => review.jobId === jobId);
  }

  /**
   * Verify review on blockchain
   */
  async verifyReview(review: BlockchainReview): Promise<void> {
    const operationId = performanceMonitor.startOperation('verify_blockchain_review');

    try {
      logger.info('ReviewManager', 'Verifying review on blockchain', {
        reviewId: review.id,
        txHash: review.transactionHash,
      });

      // Verify transaction exists and is confirmed
      const transaction = this.transactionManager.getTransaction(review.transactionHash);

      if (!transaction || transaction.status !== 'confirmed') {
        throw new Error('Review transaction not confirmed');
      }

      review.verified = true;
      this.reviews.set(review.id, review);

      logger.info('ReviewManager', 'Review verified', { reviewId: review.id });

      performanceMonitor.endOperation(operationId);
    } catch (error) {
      performanceMonitor.endOperation(operationId);
      logger.error('ReviewManager', 'Failed to verify review', error);
      throw error;
    }
  }

  /**
   * Get all reviews
   */
  getAllReviews(): BlockchainReview[] {
    return Array.from(this.reviews.values());
  }

  /**
   * Get review count
   */
  getReviewCount(): number {
    return this.reviews.size;
  }

  /**
   * Clear old reviews (keep last 500)
   */
  clearOldReviews(): void {
    if (this.reviews.size > 500) {
      const sortedReviews = Array.from(this.reviews.entries()).sort(
        (a, b) => b[1].timestamp - a[1].timestamp
      );

      this.reviews = new Map(sortedReviews.slice(0, 500));

      logger.info('ReviewManager', 'Cleared old reviews', {
        kept: this.reviews.size,
      });
    }
  }
}