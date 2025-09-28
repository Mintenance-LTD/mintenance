/**
 * Blockchain Review Service - Refactored
 * Main service for managing blockchain-based reviews
 */

import { logger } from '../../utils/logger';
import { performanceMonitor } from '../../utils/performanceMonitor';
import { BlockchainConnector } from './BlockchainConnector';
import { ReviewValidator } from './ReviewValidator';
import { 
  BlockchainConfig, 
  BlockchainReview, 
  SmartContract,
  BlockchainMetrics,
  DisputeResolution,
  TransactionResult
} from './types';

export class BlockchainReviewService {
  private connector: BlockchainConnector;
  private validator: ReviewValidator;
  private contract: SmartContract;
  private isInitialized: boolean = false;

  constructor(config: BlockchainConfig) {
    this.connector = new BlockchainConnector(config);
    this.validator = new ReviewValidator();
    this.contract = this.initializeContract(config);
  }

  /**
   * Initialize the service
   */
  public async initialize(): Promise<boolean> {
    try {
      performanceMonitor.startTimer('blockchain_service_init');
      
      logger.info('Initializing Blockchain Review Service');
      
      const connected = await this.connector.connect();
      if (!connected) {
        throw new Error('Failed to connect to blockchain network');
      }

      this.isInitialized = true;
      
      const duration = performanceMonitor.endTimer('blockchain_service_init');
      logger.info('Blockchain Review Service initialized successfully', { duration });
      
      return true;
    } catch (error) {
      logger.error('Failed to initialize Blockchain Review Service', { error });
      return false;
    }
  }

  /**
   * Submit a review to the blockchain
   */
  public async submitReview(review: Partial<BlockchainReview>): Promise<TransactionResult> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized');
    }

    try {
      performanceMonitor.startTimer('submit_review');

      // Validate review
      const validation = this.validator.validateReview(review);
      if (!validation.isValid) {
        throw new Error(`Review validation failed: ${validation.errors.join(', ')}`);
      }

      // Prepare review data
      const reviewData = this.prepareReviewData(review, validation.verificationLevel);

      // Submit to blockchain
      const result = await this.connector.sendTransaction(
        this.contract,
        'submitReview',
        [reviewData]
      );

      // Wait for confirmation
      const confirmedResult = await this.connector.waitForConfirmation(result.hash);

      const duration = performanceMonitor.endTimer('submit_review');
      logger.info('Review submitted successfully', { 
        hash: confirmedResult.hash,
        duration,
        reviewId: review.id 
      });

      return confirmedResult;
    } catch (error) {
      performanceMonitor.endTimer('submit_review');
      logger.error('Failed to submit review', { error, reviewId: review.id });
      throw error;
    }
  }

  /**
   * Get review from blockchain
   */
  public async getReview(reviewId: string): Promise<BlockchainReview | null> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized');
    }

    try {
      performanceMonitor.startTimer('get_review');

      const result = await this.connector.sendTransaction(
        this.contract,
        'getReview',
        [reviewId]
      );

      const review = this.parseReviewFromResult(result);
      
      const duration = performanceMonitor.endTimer('get_review');
      logger.info('Review retrieved successfully', { reviewId, duration });

      return review;
    } catch (error) {
      performanceMonitor.endTimer('get_review');
      logger.error('Failed to get review', { error, reviewId });
      throw error;
    }
  }

  /**
   * Get reviews for a contractor
   */
  public async getContractorReviews(contractorId: string): Promise<BlockchainReview[]> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized');
    }

    try {
      performanceMonitor.startTimer('get_contractor_reviews');

      const result = await this.connector.sendTransaction(
        this.contract,
        'getContractorReviews',
        [contractorId]
      );

      const reviews = this.parseReviewsFromResult(result);
      
      const duration = performanceMonitor.endTimer('get_contractor_reviews');
      logger.info('Contractor reviews retrieved', { 
        contractorId, 
        reviewCount: reviews.length,
        duration 
      });

      return reviews;
    } catch (error) {
      performanceMonitor.endTimer('get_contractor_reviews');
      logger.error('Failed to get contractor reviews', { error, contractorId });
      throw error;
    }
  }

  /**
   * Get blockchain metrics
   */
  public async getMetrics(): Promise<BlockchainMetrics> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized');
    }

    try {
      const result = await this.connector.sendTransaction(
        this.contract,
        'getMetrics',
        []
      );

      return this.parseMetricsFromResult(result);
    } catch (error) {
      logger.error('Failed to get blockchain metrics', { error });
      throw error;
    }
  }

  /**
   * Submit dispute resolution
   */
  public async submitDispute(dispute: DisputeResolution): Promise<TransactionResult> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized');
    }

    try {
      performanceMonitor.startTimer('submit_dispute');

      const result = await this.connector.sendTransaction(
        this.contract,
        'submitDispute',
        [dispute]
      );

      const confirmedResult = await this.connector.waitForConfirmation(result.hash);

      const duration = performanceMonitor.endTimer('submit_dispute');
      logger.info('Dispute submitted successfully', { 
        disputeId: dispute.id,
        reviewId: dispute.reviewId,
        duration 
      });

      return confirmedResult;
    } catch (error) {
      performanceMonitor.endTimer('submit_dispute');
      logger.error('Failed to submit dispute', { error, disputeId: dispute.id });
      throw error;
    }
  }

  /**
   * Verify review authenticity
   */
  public async verifyReview(reviewId: string): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized');
    }

    try {
      const result = await this.connector.sendTransaction(
        this.contract,
        'verifyReview',
        [reviewId]
      );

      const verification = this.parseVerificationFromResult(result);
      
      logger.info('Review verification completed', { 
        reviewId, 
        verified: verification 
      });

      return verification;
    } catch (error) {
      logger.error('Failed to verify review', { error, reviewId });
      throw error;
    }
  }

  /**
   * Cleanup and disconnect
   */
  public async cleanup(): Promise<void> {
    try {
      await this.connector.disconnect();
      this.isInitialized = false;
      logger.info('Blockchain Review Service cleaned up');
    } catch (error) {
      logger.error('Error during cleanup', { error });
    }
  }

  // Private helper methods

  private initializeContract(config: BlockchainConfig): SmartContract {
    return {
      address: config.contractAddress,
      abi: this.getContractABI(),
      network: config.network,
      version: '1.0.0'
    };
  }

  private getContractABI(): any[] {
    // This would contain the actual contract ABI
    // For now, returning a simplified version
    return [
      {
        name: 'submitReview',
        type: 'function',
        inputs: [{ name: 'review', type: 'tuple' }]
      },
      {
        name: 'getReview',
        type: 'function',
        inputs: [{ name: 'reviewId', type: 'string' }]
      },
      {
        name: 'getContractorReviews',
        type: 'function',
        inputs: [{ name: 'contractorId', type: 'string' }]
      },
      {
        name: 'getMetrics',
        type: 'function',
        inputs: []
      },
      {
        name: 'submitDispute',
        type: 'function',
        inputs: [{ name: 'dispute', type: 'tuple' }]
      },
      {
        name: 'verifyReview',
        type: 'function',
        inputs: [{ name: 'reviewId', type: 'string' }]
      }
    ];
  }

  private prepareReviewData(review: Partial<BlockchainReview>, verificationLevel: string): any {
    return {
      id: review.id,
      jobId: review.jobId,
      reviewerId: review.reviewerId,
      revieweeId: review.revieweeId,
      rating: review.rating,
      content: review.content,
      categories: review.categories,
      media: review.media || [],
      metadata: {
        ...review.metadata,
        verificationLevel,
        timestamp: Date.now()
      }
    };
  }

  private parseReviewFromResult(result: TransactionResult): BlockchainReview | null {
    // This would parse the actual blockchain result
    // For now, returning null as placeholder
    return null;
  }

  private parseReviewsFromResult(result: TransactionResult): BlockchainReview[] {
    // This would parse the actual blockchain result
    // For now, returning empty array as placeholder
    return [];
  }

  private parseMetricsFromResult(result: TransactionResult): BlockchainMetrics {
    // This would parse the actual blockchain result
    // For now, returning default metrics
    return {
      totalReviews: 0,
      averageRating: 0,
      totalGasUsed: 0,
      totalGasFees: 0,
      networkUptime: 100,
      transactionSuccessRate: 100,
      averageConfirmationTime: 0
    };
  }

  private parseVerificationFromResult(result: TransactionResult): boolean {
    // This would parse the actual verification result
    // For now, returning true as placeholder
    return true;
  }
}
