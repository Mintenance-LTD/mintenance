/**
 * Blockchain Configuration Module
 * Handles blockchain network configuration and initialization
 */

import { Platform } from 'react-native';
import { logger } from '../../utils/logger';
import { errorTracking } from '../../utils/productionSetupGuide';
import { BlockchainConfig, SmartContract } from './types';

export class BlockchainConfigManager {
  private config: BlockchainConfig;
  private smartContract?: SmartContract;
  private walletProvider: any;
  private isInitialized = false;

  constructor(customConfig?: Partial<BlockchainConfig>) {
    this.config = {
      ...this.getDefaultConfig(),
      ...customConfig,
    };
  }

  /**
   * Get default blockchain configuration
   */
  private getDefaultConfig(): BlockchainConfig {
    return {
      network: 'polygon', // Use Polygon for lower gas fees
      contractAddress: '0x1234567890123456789012345678901234567890',
      providerUrl: 'https://polygon-rpc.com',
      gasPrice: 20000000000, // 20 gwei
      confirmations: 3,
      enableMetrics: true,
    };
  }

  /**
   * Initialize blockchain service
   */
  async initialize(): Promise<void> {
    try {
      // Initialize based on platform
      if (Platform.OS === 'web') {
        await this.initializeWebBlockchain();
      } else {
        await this.initializeMobileBlockchain();
      }

      // Load smart contract
      await this.loadSmartContract();

      this.isInitialized = true;

      logger.info('BlockchainConfig', 'Blockchain service initialized', {
        network: this.config.network,
        contractAddress: this.config.contractAddress,
      });
    } catch (error) {
      logger.error('BlockchainConfig', 'Failed to initialize blockchain service', error);
      errorTracking.trackError(error as Error, { context: 'blockchain_initialization' });
      throw error;
    }
  }

  /**
   * Initialize web blockchain (using MetaMask or other wallet)
   */
  private async initializeWebBlockchain(): Promise<void> {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      this.walletProvider = (window as any).ethereum;
      logger.info('BlockchainConfig', 'Web3 wallet detected');
    } else {
      logger.warn('BlockchainConfig', 'No Web3 wallet detected, using read-only mode');
    }
  }

  /**
   * Initialize mobile blockchain
   */
  private async initializeMobileBlockchain(): Promise<void> {
    // Mobile blockchain integration would use react-native-web3 or similar
    logger.info('BlockchainConfig', 'Mobile blockchain initialized');
  }

  /**
   * Load smart contract
   */
  private async loadSmartContract(): Promise<void> {
    const contractABI = this.getContractABI();

    this.smartContract = {
      address: this.config.contractAddress,
      abi: contractABI,
      network: this.config.network,
      version: '1.0.0',
    };

    logger.info('BlockchainConfig', 'Smart contract loaded', {
      address: this.smartContract.address,
      network: this.smartContract.network,
    });
  }

  /**
   * Get smart contract ABI
   */
  private getContractABI(): any[] {
    return [
      {
        inputs: [
          { name: 'jobId', type: 'string' },
          { name: 'rating', type: 'uint8' },
          { name: 'contentHash', type: 'string' },
          { name: 'metadata', type: 'string' },
        ],
        name: 'submitReview',
        outputs: [{ name: '', type: 'bytes32' }],
        type: 'function',
      },
      {
        inputs: [{ name: 'reviewId', type: 'bytes32' }],
        name: 'getReview',
        outputs: [
          { name: 'rating', type: 'uint8' },
          { name: 'contentHash', type: 'string' },
          { name: 'timestamp', type: 'uint256' },
          { name: 'verified', type: 'bool' },
        ],
        type: 'function',
      },
      {
        inputs: [
          { name: 'userId', type: 'address' },
          { name: 'badgeType', type: 'string' },
          { name: 'metadata', type: 'string' },
        ],
        name: 'issueBadge',
        outputs: [{ name: '', type: 'uint256' }],
        type: 'function',
      },
    ];
  }

  /**
   * Get current configuration
   */
  getConfig(): BlockchainConfig {
    return { ...this.config };
  }

  /**
   * Get smart contract
   */
  getSmartContract(): SmartContract | undefined {
    return this.smartContract;
  }

  /**
   * Get wallet provider
   */
  getWalletProvider(): any {
    return this.walletProvider;
  }

  /**
   * Check if initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<BlockchainConfig>): void {
    this.config = {
      ...this.config,
      ...updates,
    };

    logger.info('BlockchainConfig', 'Configuration updated', updates);
  }
}