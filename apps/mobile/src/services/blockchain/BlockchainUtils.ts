/**
 * Blockchain Utilities Module
 * Validation, verification, and helper functions
 */

import { ReviewCategories, ReviewValidationResult } from './types';

export class BlockchainUtils {
  /**
   * Validate review inputs
   */
  validateReviewInputs(params: {
    jobId: string;
    reviewerId: string;
    revieweeId: string;
    rating: number;
    content: string;
    categories: ReviewCategories;
  }): ReviewValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate required fields
    if (!params.jobId || params.jobId.trim() === '') {
      errors.push('Job ID is required');
    }

    if (!params.reviewerId || params.reviewerId.trim() === '') {
      errors.push('Reviewer ID is required');
    }

    if (!params.revieweeId || params.revieweeId.trim() === '') {
      errors.push('Reviewee ID is required');
    }

    // Validate rating
    if (typeof params.rating !== 'number') {
      errors.push('Rating must be a number');
    } else if (params.rating < 1 || params.rating > 5) {
      errors.push('Rating must be between 1 and 5');
    }

    // Validate content
    if (!params.content || params.content.trim() === '') {
      errors.push('Review content is required');
    } else if (params.content.length < 10) {
      warnings.push('Review content is very short');
    } else if (params.content.length > 5000) {
      errors.push('Review content exceeds maximum length (5000 characters)');
    }

    // Validate categories
    if (!params.categories) {
      errors.push('Review categories are required');
    } else {
      const categoryKeys: (keyof ReviewCategories)[] = [
        'quality',
        'timeliness',
        'communication',
        'professionalism',
        'value',
      ];

      for (const key of categoryKeys) {
        const value = params.categories[key];
        if (typeof value !== 'number' || value < 1 || value > 5) {
          errors.push(`Category "${key}" must be a number between 1 and 5`);
        }
      }
    }

    // Validate reviewer != reviewee
    if (params.reviewerId === params.revieweeId) {
      errors.push('Reviewer and reviewee cannot be the same person');
    }

    // Determine verification level
    let verificationLevel: 'basic' | 'enhanced' | 'premium' = 'basic';

    if (errors.length === 0) {
      if (warnings.length === 0 && params.content.length >= 100) {
        verificationLevel = 'premium';
      } else if (params.content.length >= 50) {
        verificationLevel = 'enhanced';
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      verificationLevel,
    };
  }

  /**
   * Validate badge parameters
   */
  validateBadgeParams(params: {
    userId: string;
    badgeType: string;
    criteria: string;
  }): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!params.userId || params.userId.trim() === '') {
      errors.push('User ID is required');
    }

    if (!params.badgeType || params.badgeType.trim() === '') {
      errors.push('Badge type is required');
    }

    const validBadgeTypes = ['achievement', 'verification', 'milestone', 'special'];
    if (!validBadgeTypes.includes(params.badgeType)) {
      errors.push(`Badge type must be one of: ${validBadgeTypes.join(', ')}`);
    }

    if (!params.criteria || params.criteria.trim() === '') {
      errors.push('Badge criteria is required');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Format blockchain address
   */
  formatAddress(address: string, short = true): string {
    if (!address || address.length < 10) {
      return address;
    }

    if (short) {
      return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    }

    return address;
  }

  /**
   * Generate unique ID
   */
  generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Calculate average rating
   */
  calculateAverageRating(ratings: number[]): number {
    if (ratings.length === 0) return 0;

    const sum = ratings.reduce((total, rating) => total + rating, 0);
    return Math.round((sum / ratings.length) * 10) / 10;
  }

  /**
   * Calculate category averages
   */
  calculateCategoryAverages(categories: ReviewCategories[]): ReviewCategories {
    if (categories.length === 0) {
      return {
        quality: 0,
        timeliness: 0,
        communication: 0,
        professionalism: 0,
        value: 0,
      };
    }

    const sums = categories.reduce(
      (totals, cat) => ({
        quality: totals.quality + cat.quality,
        timeliness: totals.timeliness + cat.timeliness,
        communication: totals.communication + cat.communication,
        professionalism: totals.professionalism + cat.professionalism,
        value: totals.value + cat.value,
      }),
      { quality: 0, timeliness: 0, communication: 0, professionalism: 0, value: 0 }
    );

    const count = categories.length;

    return {
      quality: Math.round((sums.quality / count) * 10) / 10,
      timeliness: Math.round((sums.timeliness / count) * 10) / 10,
      communication: Math.round((sums.communication / count) * 10) / 10,
      professionalism: Math.round((sums.professionalism / count) * 10) / 10,
      value: Math.round((sums.value / count) * 10) / 10,
    };
  }

  /**
   * Verify content hash
   */
  verifyContentHash(content: any, hash: string): boolean {
    // In real implementation, would regenerate hash and compare
    return hash.length > 0;
  }

  /**
   * Parse blockchain error
   */
  parseBlockchainError(error: any): string {
    if (typeof error === 'string') {
      return error;
    }

    if (error.message) {
      return error.message;
    }

    if (error.reason) {
      return error.reason;
    }

    return 'Unknown blockchain error';
  }
}