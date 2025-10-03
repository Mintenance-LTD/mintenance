/**
 * Reputation Manager Module
 * Handles user reputation calculations and trust metrics
 */

import { logger } from '../../utils/logger';
import { BlockchainReview, ReviewCategories } from './types';

export interface BlockchainReputation {
  address: string;
  userId: string;
  totalReviews: number;
  averageRating: number;
  categoryRatings: ReviewCategories;
  verifiedJobs: number;
  totalValue: number;
  trustScore: number;
  badges: any[];
  disputeRate: number;
  responseRate: number;
  lastUpdated: number;
  reputationHistory: ReputationSnapshot[];
}

export interface ReputationSnapshot {
  timestamp: number;
  rating: number;
  reviewCount: number;
  trustScore: number;
}

export interface TrustMetrics {
  verificationLevel: number;
  consistencyScore: number;
  activityScore: number;
  communityStanding: number;
  overallTrustScore: number;
}

export class ReputationManager {
  private reputations: Map<string, BlockchainReputation> = new Map();

  /**
   * Get user reputation
   */
  async getUserReputation(userId: string): Promise<BlockchainReputation> {
    let reputation = this.reputations.get(userId);

    if (!reputation) {
      reputation = await this.createInitialReputation(userId);
      this.reputations.set(userId, reputation);
    }

    return reputation;
  }

  /**
   * Update reputation based on new review
   */
  async updateReputation(userId: string, review: BlockchainReview): Promise<void> {
    const reputation = await this.getUserReputation(userId);

    // Update review counts
    reputation.totalReviews += 1;

    // Calculate new average rating
    const totalRating = reputation.averageRating * (reputation.totalReviews - 1) + review.rating;
    reputation.averageRating = totalRating / reputation.totalReviews;

    // Update category ratings
    Object.keys(review.categories).forEach((key) => {
      const categoryKey = key as keyof ReviewCategories;
      const currentValue = reputation.categoryRatings[categoryKey];
      const newValue = review.categories[categoryKey];
      const totalValue = currentValue * (reputation.totalReviews - 1) + newValue;
      reputation.categoryRatings[categoryKey] = totalValue / reputation.totalReviews;
    });

    // Update trust score
    const reviews = this.getReviewsForUser(userId);
    reputation.trustScore = this.calculateTrustScore(reputation, reviews);

    // Add to reputation history
    reputation.reputationHistory.push({
      timestamp: Date.now(),
      rating: reputation.averageRating,
      reviewCount: reputation.totalReviews,
      trustScore: reputation.trustScore,
    });

    // Keep only last 100 history entries
    if (reputation.reputationHistory.length > 100) {
      reputation.reputationHistory = reputation.reputationHistory.slice(-100);
    }

    reputation.lastUpdated = Date.now();

    this.reputations.set(userId, reputation);

    logger.info('ReputationManager', 'Reputation updated', {
      userId,
      totalReviews: reputation.totalReviews,
      averageRating: reputation.averageRating,
      trustScore: reputation.trustScore,
    });
  }

  /**
   * Calculate trust score
   */
  private calculateTrustScore(
    reputation: BlockchainReputation,
    reviews: BlockchainReview[]
  ): number {
    // Base score from average rating (0-5 scale, converted to 0-100)
    const ratingScore = (reputation.averageRating / 5) * 40;

    // Review count factor (logarithmic scale, max 20 points)
    const reviewCountScore = Math.min(Math.log10(reputation.totalReviews + 1) * 10, 20);

    // Rating variance (lower variance = more consistent = higher score, max 20 points)
    const varianceScore = 20 - Math.min(this.calculateRatingVariance(reviews) * 4, 20);

    // Dispute rate penalty (max -20 points)
    const disputePenalty = reputation.disputeRate * 20;

    // Verification level bonus (max 20 points)
    const verificationBonus = reputation.verifiedJobs > 0 ? Math.min(reputation.verifiedJobs * 2, 20) : 0;

    const trustScore = Math.max(
      0,
      Math.min(100, ratingScore + reviewCountScore + varianceScore - disputePenalty + verificationBonus)
    );

    return Math.round(trustScore * 10) / 10;
  }

  /**
   * Calculate rating variance
   */
  private calculateRatingVariance(reviews: BlockchainReview[]): number {
    if (reviews.length === 0) return 0;

    const ratings = reviews.map((r) => r.rating);
    const mean = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
    const squaredDiffs = ratings.map((r) => Math.pow(r - mean, 2));
    const variance = squaredDiffs.reduce((sum, d) => sum + d, 0) / ratings.length;

    return Math.sqrt(variance);
  }

  /**
   * Calculate trust metrics
   */
  calculateTrustMetrics(userId: string): TrustMetrics {
    const reputation = this.reputations.get(userId);

    if (!reputation) {
      return this.getDefaultTrustMetrics();
    }

    const verificationLevel = this.calculateVerificationLevel(reputation);
    const consistencyScore = this.calculateConsistencyScore(reputation);
    const activityScore = this.calculateActivityScore(reputation);
    const communityStanding = this.calculateCommunityStanding(reputation);

    const overallTrustScore =
      (verificationLevel + consistencyScore + activityScore + communityStanding) / 4;

    return {
      verificationLevel,
      consistencyScore,
      activityScore,
      communityStanding,
      overallTrustScore: Math.round(overallTrustScore * 10) / 10,
    };
  }

  /**
   * Create initial reputation
   */
  private async createInitialReputation(userId: string): Promise<BlockchainReputation> {
    return {
      address: `0x${userId.substring(0, 40)}`,
      userId,
      totalReviews: 0,
      averageRating: 0,
      categoryRatings: {
        quality: 0,
        timeliness: 0,
        communication: 0,
        professionalism: 0,
        value: 0,
      },
      verifiedJobs: 0,
      totalValue: 0,
      trustScore: 0,
      badges: [],
      disputeRate: 0,
      responseRate: 1.0,
      lastUpdated: Date.now(),
      reputationHistory: [],
    };
  }

  private getDefaultTrustMetrics(): TrustMetrics {
    return {
      verificationLevel: 0,
      consistencyScore: 0,
      activityScore: 0,
      communityStanding: 0,
      overallTrustScore: 0,
    };
  }

  private calculateVerificationLevel(reputation: BlockchainReputation): number {
    return Math.min((reputation.verifiedJobs / 10) * 100, 100);
  }

  private calculateConsistencyScore(reputation: BlockchainReputation): number {
    const variance = reputation.reputationHistory.length > 0
      ? this.calculateRatingVariance(this.getReviewsForUser(reputation.userId))
      : 0;
    return Math.max(0, 100 - variance * 20);
  }

  private calculateActivityScore(reputation: BlockchainReputation): number {
    const daysSinceUpdate = (Date.now() - reputation.lastUpdated) / (1000 * 60 * 60 * 24);
    return Math.max(0, 100 - daysSinceUpdate * 2);
  }

  private calculateCommunityStanding(reputation: BlockchainReputation): number {
    return Math.min((reputation.totalReviews / 50) * 100, 100);
  }

  private getReviewsForUser(userId: string): BlockchainReview[] {
    // This would fetch reviews from ReviewManager in real implementation
    return [];
  }

  /**
   * Get all reputations
   */
  getAllReputations(): BlockchainReputation[] {
    return Array.from(this.reputations.values());
  }
}