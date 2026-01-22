import { logger } from '@mintenance/shared';

/**
 * Embedding Service - Generate and manage embeddings for semantic search
 */
export class EmbeddingService {
  private supabase: any;
  private apiKey?: string;
  private apiUrl?: string;
  constructor(config: { supabase: any }) {
    this.supabase = config.supabase;
    this.apiKey = process.env.OPENAI_API_KEY;
    this.apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  }
  /**
   * Generate embedding for text using OpenAI or local model
   */
  async generateEmbedding(
    text: string,
    options: { timeout?: number; model?: string } = {}
  ): Promise<number[]> {
    try {
      const { timeout = 5000, model = 'text-embedding-3-small' } = options;
      // Try OpenAI API first
      if (this.apiKey) {
        return await this.generateOpenAIEmbedding(text, model, timeout);
      }
      // Fallback to local embedding service
      return await this.generateLocalEmbedding(text, timeout);
    } catch (error) {
      logger.error('Error generating embedding:', error);
      throw new Error('Failed to generate embedding');
    }
  }
  /**
   * Batch generate embeddings for multiple texts
   */
  async generateBatchEmbeddings(
    texts: string[],
    options: { batchSize?: number; model?: string } = {}
  ): Promise<number[][]> {
    const { batchSize = 100, model = 'text-embedding-3-small' } = options;
    const embeddings: number[][] = [];
    // Process in batches
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchEmbeddings = await Promise.all(
        batch.map(text => this.generateEmbedding(text, { model }))
      );
      embeddings.push(...batchEmbeddings);
    }
    return embeddings;
  }
  /**
   * Store embedding for an item
   */
  async storeEmbedding(
    itemId: string,
    itemType: string,
    embedding: number[],
    metadata?: any
  ): Promise<void> {
    try {
      const table = `${itemType}_embeddings`;
      await this.supabase
        .from(table)
        .upsert({
          id: itemId,
          embedding,
          metadata,
          updated_at: new Date().toISOString()
        });
    } catch (error) {
      logger.error('Error storing embedding:', error);
      throw new Error('Failed to store embedding');
    }
  }
  /**
   * Update embeddings for multiple items
   */
  async updateEmbeddings(
    items: Array<{
      id: string;
      type: string;
      text: string;
      metadata?: any;
    }>
  ): Promise<{ updated: number; failed: number }> {
    let updated = 0;
    let failed = 0;
    for (const item of items) {
      try {
        const embedding = await this.generateEmbedding(item.text);
        await this.storeEmbedding(item.id, item.type, embedding, item.metadata);
        updated++;
      } catch (error) {
        logger.error(`Failed to update embedding for ${item.type}:${item.id}:`, error);
        failed++;
      }
    }
    return { updated, failed };
  }
  /**
   * Calculate cosine similarity between two embeddings
   */
  calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same dimension');
    }
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }
    const similarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
    return similarity;
  }
  /**
   * Find nearest neighbors using embeddings
   */
  async findNearestNeighbors(
    embedding: number[],
    table: string,
    k: number = 10,
    threshold: number = 0.5
  ): Promise<Array<{ id: string; similarity: number; metadata: any }>> {
    try {
      // Use pgvector for efficient similarity search
      const { data } = await this.supabase.rpc('find_nearest_neighbors', {
        query_embedding: embedding,
        target_table: table,
        match_count: k,
        match_threshold: threshold
      });
      return data || [];
    } catch (error) {
      logger.error('Error finding nearest neighbors:', error);
      return [];
    }
  }
  // ============= Private Helper Methods =============
  private async generateOpenAIEmbedding(
    text: string,
    model: string,
    timeout: number
  ): Promise<number[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          input: text,
          model
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }
      const data = await response.json();
      return (data as any).data[0].embedding;
    } catch (error) {
      clearTimeout(timeoutId);
      if ((error as any).name === 'AbortError') {
        throw new Error('Embedding generation timeout');
      }
      throw error;
    }
  }
  private async generateLocalEmbedding(
    text: string,
    timeout: number
  ): Promise<number[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(`${this.apiUrl}/api/ai/generate-embedding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        throw new Error(`Local embedding service error: ${response.status}`);
      }
      const data = await response.json();
      return (data as any).embedding;
    } catch (error) {
      clearTimeout(timeoutId);
      if ((error as any).name === 'AbortError') {
        throw new Error('Embedding generation timeout');
      }
      throw error;
    }
  }
}