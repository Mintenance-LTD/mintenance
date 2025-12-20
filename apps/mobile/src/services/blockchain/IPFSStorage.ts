/**
 * IPFS Storage Module
 * Handles IPFS upload, retrieval, and verification operations
 */

import { logger } from '../../utils/logger';
import { performanceMonitor } from '../../utils/performanceMonitor';

export interface IPFSContent {
  hash: string;
  content: any;
  size: number;
  timestamp: number;
  pinned: boolean;
}

export class IPFSStorage {
  private ipfsContents: Map<string, IPFSContent> = new Map();
  private readonly ipfsGateway = 'https://ipfs.io/ipfs/';

  /**
   * Upload content to IPFS
   */
  async uploadToIPFS(content: any): Promise<string> {
    const operationId = performanceMonitor.startOperation('ipfs_upload');

    try {
      logger.info('IPFSStorage', 'Uploading content to IPFS', {
        contentType: typeof content,
        size: JSON.stringify(content).length,
      });

      // Simulate IPFS upload (in real implementation, would use IPFS client)
      const hash = this.generateIPFSHash(content);
      const size = JSON.stringify(content).length;

      const ipfsContent: IPFSContent = {
        hash,
        content,
        size,
        timestamp: Date.now(),
        pinned: true,
      };

      this.ipfsContents.set(hash, ipfsContent);

      logger.info('IPFSStorage', 'Content uploaded to IPFS', { hash, size });

      performanceMonitor.endOperation(operationId);

      return hash;
    } catch (error) {
      performanceMonitor.endOperation(operationId);
      logger.error('IPFSStorage', 'Failed to upload to IPFS', error);
      throw error;
    }
  }

  /**
   * Retrieve content from IPFS
   */
  async retrieveFromIPFS(hash: string): Promise<any> {
    const operationId = performanceMonitor.startOperation('ipfs_retrieve');

    try {
      logger.info('IPFSStorage', 'Retrieving content from IPFS', { hash });

      // Check local cache first
      const cachedContent = this.ipfsContents.get(hash);
      if (cachedContent) {
        performanceMonitor.endOperation(operationId);
        return cachedContent.content;
      }

      // In real implementation, would fetch from IPFS network
      logger.warn('IPFSStorage', 'Content not found in cache', { hash });

      performanceMonitor.endOperation(operationId);

      return null;
    } catch (error) {
      performanceMonitor.endOperation(operationId);
      logger.error('IPFSStorage', 'Failed to retrieve from IPFS', error);
      throw error;
    }
  }

  /**
   * Generate verification hash for content
   */
  generateVerificationHash(content: any): string {
    const contentStr = JSON.stringify(content);
    let hash = 0;

    for (let i = 0; i < contentStr.length; i++) {
      const char = contentStr.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }

    return `0x${Math.abs(hash).toString(16).padStart(64, '0')}`;
  }

  /**
   * Generate IPFS hash (CID)
   */
  private generateIPFSHash(content: any): string {
    const contentStr = JSON.stringify(content);
    const hash = this.generateVerificationHash(content);

    // Convert to IPFS CIDv1 format (base58)
    return `Qm${hash.substring(2, 48)}`;
  }

  /**
   * Pin content to ensure persistence
   */
  async pinContent(hash: string): Promise<void> {
    const content = this.ipfsContents.get(hash);

    if (content) {
      content.pinned = true;
      this.ipfsContents.set(hash, content);
      logger.info('IPFSStorage', 'Content pinned', { hash });
    } else {
      logger.warn('IPFSStorage', 'Content not found for pinning', { hash });
    }
  }

  /**
   * Unpin content
   */
  async unpinContent(hash: string): Promise<void> {
    const content = this.ipfsContents.get(hash);

    if (content) {
      content.pinned = false;
      this.ipfsContents.set(hash, content);
      logger.info('IPFSStorage', 'Content unpinned', { hash });
    }
  }

  /**
   * Get IPFS gateway URL
   */
  getGatewayURL(hash: string): string {
    return `${this.ipfsGateway}${hash}`;
  }

  /**
   * Get content metadata
   */
  getContentMetadata(hash: string): IPFSContent | undefined {
    return this.ipfsContents.get(hash);
  }

  /**
   * Clear old unpinned content (keep last 50)
   */
  clearOldContent(): void {
    const entries = Array.from(this.ipfsContents.entries());
    const pinnedContent = entries.filter(([, content]) => content.pinned);
    const unpinnedContent = entries
      .filter(([, content]) => !content.pinned)
      .sort((a, b) => b[1].timestamp - a[1].timestamp)
      .slice(0, 50);

    this.ipfsContents = new Map([...pinnedContent, ...unpinnedContent]);

    logger.info('IPFSStorage', 'Cleared old content', {
      pinned: pinnedContent.length,
      unpinned: unpinnedContent.length,
    });
  }
}