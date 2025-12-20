/**
 * Blockchain Review System Types
 * Core interfaces and types for blockchain-based review system
 */

export interface BlockchainConfig {
  network: 'ethereum' | 'polygon' | 'binance' | 'avalanche' | 'solana';
  contractAddress: string;
  providerUrl: string;
  gasPrice: number;
  confirmations: number;
  enableMetrics: boolean;
}

export interface BlockchainReview {
  id: string;
  transactionHash: string;
  blockNumber: number;
  blockHash: string;
  jobId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number; // 1-5 scale
  content: string;
  categories: ReviewCategories;
  media: BlockchainReviewMedia[];
  metadata: ReviewMetadata;
  timestamp: number;
  gasUsed: number;
  gasFee: number;
  verified: boolean;
}

export interface ReviewCategories {
  quality: number;
  timeliness: number;
  communication: number;
  professionalism: number;
  value: number;
}

export interface BlockchainReviewMedia {
  id: string;
  type: 'image' | 'video' | 'document';
  hash: string;
  url: string;
  verified: boolean;
  timestamp: number;
}

export interface ReviewMetadata {
  jobCategory: string;
  jobValue: number;
  completionDate: number;
  verificationLevel: 'basic' | 'enhanced' | 'premium';
  disputeResolution: boolean;
}

export interface SmartContract {
  address: string;
  abi: any[];
  network: string;
  version: string;
}

export interface TransactionResult {
  hash: string;
  blockNumber?: number;
  gasUsed: number;
  gasPrice: number;
  status: 'pending' | 'confirmed' | 'failed';
  confirmations: number;
}

export interface BlockchainMetrics {
  totalReviews: number;
  averageRating: number;
  totalGasUsed: number;
  totalGasFees: number;
  networkUptime: number;
  transactionSuccessRate: number;
  averageConfirmationTime: number;
}

export interface ReviewValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  verificationLevel: 'basic' | 'enhanced' | 'premium';
}

export interface DisputeResolution {
  id: string;
  reviewId: string;
  disputeReason: string;
  evidence: string[];
  status: 'pending' | 'under_review' | 'resolved' | 'rejected';
  resolution?: string;
  timestamp: number;
}
