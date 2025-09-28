/**
 * Blockchain Review Validator
 * Handles validation and verification of blockchain reviews
 */

import { logger } from '../../utils/logger';
import { 
  BlockchainReview, 
  ReviewValidationResult, 
  ReviewCategories,
  ReviewMetadata 
} from './types';

export class ReviewValidator {
  private static readonly MIN_RATING = 1;
  private static readonly MAX_RATING = 5;
  private static readonly MIN_CONTENT_LENGTH = 10;
  private static readonly MAX_CONTENT_LENGTH = 1000;
  private static readonly MAX_MEDIA_COUNT = 5;

  /**
   * Validate a blockchain review before submission
   */
  public validateReview(review: Partial<BlockchainReview>): ReviewValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let verificationLevel: 'basic' | 'enhanced' | 'premium' = 'basic';

    // Validate required fields
    this.validateRequiredFields(review, errors);

    // Validate rating
    this.validateRating(review.rating, errors);

    // Validate content
    this.validateContent(review.content, errors, warnings);

    // Validate categories
    if (review.categories) {
      this.validateCategories(review.categories, errors, warnings);
    }

    // Validate media
    if (review.media) {
      this.validateMedia(review.media, errors, warnings);
    }

    // Validate metadata
    if (review.metadata) {
      verificationLevel = this.validateMetadata(review.metadata, errors, warnings);
    }

    // Validate business rules
    this.validateBusinessRules(review, errors, warnings);

    const isValid = errors.length === 0;

    if (!isValid) {
      logger.warn('Review validation failed', { errors, warnings, reviewId: review.id });
    } else {
      logger.info('Review validation successful', { 
        verificationLevel, 
        warnings: warnings.length 
      });
    }

    return {
      isValid,
      errors,
      warnings,
      verificationLevel
    };
  }

  /**
   * Validate review categories
   */
  public validateCategories(categories: ReviewCategories): ReviewValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const categoryFields = ['quality', 'timeliness', 'communication', 'professionalism', 'value'];
    
    for (const field of categoryFields) {
      const value = categories[field as keyof ReviewCategories];
      
      if (typeof value !== 'number' || isNaN(value)) {
        errors.push(`${field} rating must be a valid number`);
      } else if (value < this.MIN_RATING || value > this.MAX_RATING) {
        errors.push(`${field} rating must be between ${this.MIN_RATING} and ${this.MAX_RATING}`);
      }
    }

    // Check for suspicious patterns
    const values = Object.values(categories);
    const allSame = values.every(v => v === values[0]);
    if (allSame && values[0] === this.MAX_RATING) {
      warnings.push('All category ratings are identical and maximum - this may be suspicious');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      verificationLevel: 'basic'
    };
  }

  /**
   * Validate review content for quality and appropriateness
   */
  public validateContent(content?: string): ReviewValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!content || typeof content !== 'string') {
      errors.push('Review content is required');
      return { isValid: false, errors, warnings, verificationLevel: 'basic' };
    }

    const trimmedContent = content.trim();

    // Length validation
    if (trimmedContent.length < this.MIN_CONTENT_LENGTH) {
      errors.push(`Review content must be at least ${this.MIN_CONTENT_LENGTH} characters`);
    }

    if (trimmedContent.length > this.MAX_CONTENT_LENGTH) {
      errors.push(`Review content must not exceed ${this.MAX_CONTENT_LENGTH} characters`);
    }

    // Content quality checks
    this.checkContentQuality(trimmedContent, warnings);

    // Profanity and inappropriate content
    this.checkInappropriateContent(trimmedContent, errors);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      verificationLevel: 'basic'
    };
  }

  /**
   * Validate review metadata
   */
  public validateMetadata(metadata: ReviewMetadata): ReviewValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate job category
    if (!metadata.jobCategory || typeof metadata.jobCategory !== 'string') {
      errors.push('Job category is required');
    }

    // Validate job value
    if (typeof metadata.jobValue !== 'number' || metadata.jobValue < 0) {
      errors.push('Job value must be a positive number');
    }

    // Validate completion date
    if (!metadata.completionDate || typeof metadata.completionDate !== 'number') {
      errors.push('Completion date is required');
    } else {
      const completionDate = new Date(metadata.completionDate);
      const now = new Date();
      
      if (completionDate > now) {
        errors.push('Completion date cannot be in the future');
      }
      
      if (completionDate < new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)) {
        warnings.push('Completion date is more than 1 year old');
      }
    }

    // Validate verification level
    if (!['basic', 'enhanced', 'premium'].includes(metadata.verificationLevel)) {
      errors.push('Invalid verification level');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      verificationLevel: metadata.verificationLevel
    };
  }

  // Private validation methods

  private validateRequiredFields(review: Partial<BlockchainReview>, errors: string[]): void {
    const requiredFields = ['id', 'jobId', 'reviewerId', 'revieweeId', 'rating'];
    
    for (const field of requiredFields) {
      if (!review[field as keyof BlockchainReview]) {
        errors.push(`${field} is required`);
      }
    }
  }

  private validateRating(rating?: number, errors: string[] = []): void {
    if (typeof rating !== 'number' || isNaN(rating)) {
      errors.push('Rating must be a valid number');
    } else if (rating < this.MIN_RATING || rating > this.MAX_RATING) {
      errors.push(`Rating must be between ${this.MIN_RATING} and ${this.MAX_RATING}`);
    }
  }

  private validateContent(content?: string, errors: string[] = [], warnings: string[] = []): void {
    if (!content || typeof content !== 'string') {
      errors.push('Review content is required');
      return;
    }

    const trimmedContent = content.trim();

    if (trimmedContent.length < this.MIN_CONTENT_LENGTH) {
      errors.push(`Content must be at least ${this.MIN_CONTENT_LENGTH} characters`);
    }

    if (trimmedContent.length > this.MAX_CONTENT_LENGTH) {
      errors.push(`Content must not exceed ${this.MAX_CONTENT_LENGTH} characters`);
    }

    this.checkContentQuality(trimmedContent, warnings);
    this.checkInappropriateContent(trimmedContent, errors);
  }

  private validateMedia(media: any[], errors: string[] = [], warnings: string[] = []): void {
    if (media.length > this.MAX_MEDIA_COUNT) {
      errors.push(`Maximum ${this.MAX_MEDIA_COUNT} media items allowed`);
    }

    for (let i = 0; i < media.length; i++) {
      const item = media[i];
      
      if (!item.id || !item.type || !item.hash) {
        errors.push(`Media item ${i + 1} is missing required fields`);
      }

      if (!['image', 'video', 'document'].includes(item.type)) {
        errors.push(`Media item ${i + 1} has invalid type`);
      }

      if (!item.verified) {
        warnings.push(`Media item ${i + 1} is not verified`);
      }
    }
  }

  private validateMetadata(
    metadata: ReviewMetadata, 
    errors: string[] = [], 
    warnings: string[] = []
  ): 'basic' | 'enhanced' | 'premium' {
    // Validate required fields
    if (!metadata.jobCategory) {
      errors.push('Job category is required');
    }

    if (typeof metadata.jobValue !== 'number' || metadata.jobValue < 0) {
      errors.push('Job value must be a positive number');
    }

    if (!metadata.completionDate) {
      errors.push('Completion date is required');
    }

    // Determine verification level based on metadata completeness
    let verificationLevel: 'basic' | 'enhanced' | 'premium' = 'basic';
    
    if (metadata.verificationLevel === 'premium' && metadata.disputeResolution) {
      verificationLevel = 'premium';
    } else if (metadata.verificationLevel === 'enhanced') {
      verificationLevel = 'enhanced';
    }

    return verificationLevel;
  }

  private validateBusinessRules(review: Partial<BlockchainReview>, errors: string[] = [], warnings: string[] = []): void {
    // Cannot review yourself
    if (review.reviewerId === review.revieweeId) {
      errors.push('Cannot review yourself');
    }

    // Check for duplicate reviews
    // This would typically check against a database or blockchain state
    // For now, we'll just add a warning
    warnings.push('Duplicate review check not implemented');
  }

  private checkContentQuality(content: string, warnings: string[]): void {
    // Check for repetitive content
    const words = content.toLowerCase().split(/\s+/);
    const wordCounts = new Map<string, number>();
    
    for (const word of words) {
      if (word.length > 3) { // Ignore short words
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      }
    }

    // Check for excessive repetition
    for (const [word, count] of wordCounts.entries()) {
      if (count > words.length * 0.1) { // More than 10% of words
        warnings.push(`Excessive repetition of word "${word}"`);
        break;
      }
    }

    // Check for all caps
    if (content === content.toUpperCase() && content.length > 10) {
      warnings.push('Content is entirely in uppercase');
    }

    // Check for excessive punctuation
    const punctuationCount = (content.match(/[!?.]/g) || []).length;
    if (punctuationCount > content.length * 0.1) {
      warnings.push('Excessive punctuation usage');
    }
  }

  private checkInappropriateContent(content: string, errors: string[]): void {
    const inappropriateWords = [
      'spam', 'fake', 'scam', 'fraud', 'illegal', 'hate', 'discrimination'
      // Add more inappropriate words as needed
    ];

    const lowerContent = content.toLowerCase();
    
    for (const word of inappropriateWords) {
      if (lowerContent.includes(word)) {
        errors.push(`Content contains inappropriate language: ${word}`);
        break;
      }
    }

    // Check for excessive special characters (potential spam)
    const specialCharCount = (content.match(/[^a-zA-Z0-9\s]/g) || []).length;
    if (specialCharCount > content.length * 0.3) {
      errors.push('Content contains excessive special characters');
    }
  }
}
