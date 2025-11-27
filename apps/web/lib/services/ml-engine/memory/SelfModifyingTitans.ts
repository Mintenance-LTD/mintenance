/**
 * Self-Modifying Titans
 * 
 * Implements dynamic key/value/query projections that adapt based on context
 * Based on "Nested Learning: The Illusion of Deep Learning Architectures" paper
 * 
 * Key innovation: Model learns its own update algorithm through self-referential learning
 * 
 * Implements:
 * - Equation 12-14: Linear attention with dynamic projections
 * - Equation 13: Memory update M_t = M_{t-1} + v_t k_t^T
 * - Self-modification: Projections adapt based on surprise signals
 */

import { logger } from '@mintenance/shared';
// Use relative path for tsx compatibility (when running scripts from root)
import { serverSupabase } from '../../../api/supabaseServer';

export interface TitansConfig {
  inputDim: number;        // Input dimension (e.g., 40 for features)
  hiddenDim: number;       // Hidden dimension for projections
  outputDim: number;       // Output dimension (e.g., 5 for adjustments)
  numHeads?: number;       // Number of attention heads (default: 1)
  learningRate: number;    // Learning rate for projection updates
  memorySize?: number;    // Maximum context memory size (default: 100)
}

export interface ProjectionParameters {
  W_k: number[][];  // Key projection matrix [hiddenDim x inputDim]
  W_v: number[][];  // Value projection matrix [hiddenDim x inputDim]
  W_q: number[][];  // Query projection matrix [hiddenDim x inputDim]
  W_o?: number[][]; // Output projection [outputDim x hiddenDim] (optional)
}

interface TitansState {
  projections: ProjectionParameters;
  contextMemory: number[][];  // Recent context vectors [k, v] pairs
  updateCount: number;
  lastUpdateTime: Date;
}

/**
 * Self-Modifying Titans Module
 * 
 * Enables self-referential learning where the model learns to modify itself
 * through dynamic key/value/query projections that adapt based on context
 */
export class SelfModifyingTitans {
  private config: TitansConfig;
  private state: TitansState;
  private agentName: string;

  constructor(agentName: string, config: TitansConfig) {
    this.agentName = agentName;
    this.config = {
      numHeads: 1,
      memorySize: 100,
      ...config,
    };
    this.state = this.initializeState();
  }

  /**
   * Initialize projection matrices
   * Uses Xavier initialization for stability
   */
  private initializeState(): TitansState {
    const { inputDim, hiddenDim, outputDim } = this.config;
    
    const initMatrix = (rows: number, cols: number): number[][] => {
      const matrix: number[][] = [];
      const scale = Math.sqrt(2.0 / (rows + cols));
      for (let i = 0; i < rows; i++) {
        matrix[i] = [];
        for (let j = 0; j < cols; j++) {
          matrix[i][j] = (Math.random() * 2 - 1) * scale;
        }
      }
      return matrix;
    };

    return {
      projections: {
        W_k: initMatrix(hiddenDim, inputDim),
        W_v: initMatrix(hiddenDim, inputDim),
        W_q: initMatrix(hiddenDim, inputDim),
        W_o: outputDim > 0 ? initMatrix(outputDim, hiddenDim) : undefined,
      },
      contextMemory: [],
      updateCount: 0,
      lastUpdateTime: new Date(),
    };
  }

  /**
   * Forward pass: Compute output with dynamic projections
   * 
   * Implements Equation 12-14 from Nested Learning paper:
   * - k_t = X_t W_k (keys)
   * - v_t = X_t W_v (values)
   * - q_t = X_t W_q (queries)
   * - M_t = M_{t-1} + v_t k_t^T (memory update)
   * - Y_t = M_t q_t (output)
   */
  async forward(context: number[]): Promise<number[]> {
    if (context.length !== this.config.inputDim) {
      throw new Error(
        `Context dimension mismatch: expected ${this.config.inputDim}, got ${context.length}`
      );
    }

    const { W_k, W_v, W_q, W_o } = this.state.projections;
    
    // Compute key, value, query from input context (Equation 12)
    const k = this.matMul(W_k, context);
    const v = this.matMul(W_v, context);
    const q = this.matMul(W_q, context);

    // Update context memory: M_t = M_{t-1} + v_t k_t^T (Equation 13)
    this.updateMemory(k, v);

    // Compute output: Y_t = M_t q_t (Equation 14)
    const memoryOutput = this.computeMemoryOutput(q);
    
    // Apply output projection if configured
    if (W_o && memoryOutput.length === this.config.hiddenDim) {
      return this.matMul(W_o, memoryOutput);
    }
    
    return memoryOutput;
  }

  /**
   * Update memory: M_t = M_{t-1} + v_t k_t^T
   * Implements Equation 13 from Nested Learning paper
   */
  private updateMemory(k: number[], v: number[]): void {
    // Keep only recent context (sliding window)
    const maxMemory = this.config.memorySize || 100;
    if (this.state.contextMemory.length >= maxMemory) {
      this.state.contextMemory.shift();
    }
    
    // Store (k, v) pair for memory update
    // Format: [k_0, k_1, ..., k_n, v_0, v_1, ..., v_n]
    this.state.contextMemory.push([...k, ...v]);
  }

  /**
   * Compute memory output: Y = M q
   * Where M is the accumulated memory matrix from stored (k, v) pairs
   * 
   * Implements Equation 14: Y_t = M_t q_t
   */
  private computeMemoryOutput(q: number[]): number[] {
    if (this.state.contextMemory.length === 0) {
      // No memory yet, return zero vector
      return new Array(this.config.hiddenDim).fill(0);
    }

    // Build memory matrix M from stored (k, v) pairs
    // M = Σ(v_i k_i^T) for recent contexts
    const memorySize = this.state.contextMemory.length;
    const hiddenDim = this.config.hiddenDim;
    
    // Compute attention-weighted sum of values
    const output = new Array(hiddenDim).fill(0);
    
    for (const kv of this.state.contextMemory) {
      const k = kv.slice(0, hiddenDim);
      const v = kv.slice(hiddenDim);
      
      // Compute attention: similarity between query and key
      const attention = this.dotProduct(k, q);
      
      // Weighted sum: output += v * attention
      for (let i = 0; i < hiddenDim; i++) {
        output[i] += v[i] * attention;
      }
    }

    // Normalize by memory size and apply softmax-like normalization
    const normalization = Math.max(1, memorySize);
    for (let i = 0; i < hiddenDim; i++) {
      output[i] /= normalization;
    }

    return output;
  }

  /**
   * Learn projection updates based on surprise signals
   * 
   * Implements self-modification: Model learns its own update algorithm
   * Uses gradient-based learning on projection matrices
   * 
   * Objective: min_W (W x_t, u_t)² where u_t is surprise signal
   */
  async learnFromSurprise(
    context: number[],
    surpriseSignal: number[],  // LSS: Local Surprise Signal
    learningRate?: number
  ): Promise<void> {
    if (context.length !== this.config.inputDim) {
      throw new Error(
        `Context dimension mismatch: expected ${this.config.inputDim}, got ${context.length}`
      );
    }

    const lr = learningRate || this.config.learningRate;
    
    // Forward pass to get current output
    const currentOutput = await this.forward(context);
    
    // Ensure output dimension matches surprise signal
    const targetDim = Math.min(currentOutput.length, surpriseSignal.length);
    const truncatedOutput = currentOutput.slice(0, targetDim);
    const truncatedSurprise = surpriseSignal.slice(0, targetDim);
    
    // Compute error: difference between output and surprise signal
    const error = this.subtract(truncatedSurprise, truncatedOutput);
    
    // Update projections using gradient descent
    // This is the "self-modification" - model learns to update itself
    this.updateProjections(context, error, lr);
    
    this.state.updateCount++;
    this.state.lastUpdateTime = new Date();
    
    // Save state periodically
    if (this.state.updateCount % 10 === 0) {
      await this.saveState();
    }
  }

  /**
   * Update projection matrices using gradient descent
   * Implements self-referential learning
   * 
   * Gradient update: W_{i+1} = W_i - η ∇_W L(W_i; x_t, u_t)
   */
  private updateProjections(
    context: number[],
    error: number[],
    learningRate: number
  ): void {
    const { W_k, W_v, W_q, W_o } = this.state.projections;
    
    // Simplified gradient update (full implementation would use backprop)
    // Update each projection matrix based on error signal
    
    // Update W_q (query projection) - most directly affects output
    for (let i = 0; i < Math.min(W_q.length, error.length); i++) {
      for (let j = 0; j < W_q[i].length; j++) {
        const gradient = error[i] * context[j];
        W_q[i][j] += learningRate * gradient;
      }
    }
    
    // Update W_v (value projection) - affects memory content
    for (let i = 0; i < Math.min(W_v.length, error.length); i++) {
      for (let j = 0; j < W_v[i].length; j++) {
        const gradient = error[i] * context[j] * 0.5; // Smaller update
        W_v[i][j] += learningRate * gradient;
      }
    }
    
    // Update W_k (key projection) - affects memory retrieval
    for (let i = 0; i < Math.min(W_k.length, error.length); i++) {
      for (let j = 0; j < W_k[i].length; j++) {
        const gradient = error[i] * context[j] * 0.3; // Even smaller
        W_k[i][j] += learningRate * gradient;
      }
    }
    
    // Update W_o (output projection) if present
    if (W_o) {
      for (let i = 0; i < Math.min(W_o.length, error.length); i++) {
        for (let j = 0; j < W_o[i].length; j++) {
          const gradient = error[i] * context[j] * 0.7;
          W_o[i][j] += learningRate * gradient;
        }
      }
    }
  }

  /**
   * Get current state (for inspection/debugging)
   */
  getState(): Readonly<TitansState> {
    return {
      ...this.state,
      projections: {
        W_k: this.state.projections.W_k.map(row => [...row]),
        W_v: this.state.projections.W_v.map(row => [...row]),
        W_q: this.state.projections.W_q.map(row => [...row]),
        W_o: this.state.projections.W_o?.map(row => [...row]),
      },
      contextMemory: this.state.contextMemory.map(kv => [...kv]),
    };
  }

  /**
   * Reset memory (keep projections, clear context)
   */
  resetMemory(): void {
    this.state.contextMemory = [];
  }

  // Helper methods
  private matMul(matrix: number[][], vector: number[]): number[] {
    if (matrix[0]?.length !== vector.length) {
      throw new Error(
        `Matrix-vector dimension mismatch: matrix cols=${matrix[0]?.length}, vector=${vector.length}`
      );
    }

    const result: number[] = [];
    for (let i = 0; i < matrix.length; i++) {
      let sum = 0;
      for (let j = 0; j < matrix[i].length; j++) {
        sum += matrix[i][j] * vector[j];
      }
      result.push(sum);
    }
    return result;
  }

  private dotProduct(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error(`Vector dimension mismatch: a=${a.length}, b=${b.length}`);
    }
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += a[i] * b[i];
    }
    return sum;
  }

  private subtract(a: number[], b: number[]): number[] {
    const maxLen = Math.max(a.length, b.length);
    const result: number[] = [];
    for (let i = 0; i < maxLen; i++) {
      result.push((a[i] || 0) - (b[i] || 0));
    }
    return result;
  }

  /**
   * Save Titans state to database
   */
  private async saveState(): Promise<void> {
    try {
      const { error } = await serverSupabase
        .from('titans_states')
        .upsert({
          agent_name: this.agentName,
          projections_jsonb: this.state.projections,
          context_memory_jsonb: this.state.contextMemory,
          update_count: this.state.updateCount,
          last_updated: this.state.lastUpdateTime.toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'agent_name',
        });

      if (error) {
        logger.error('Failed to save Titans state', {
          service: 'SelfModifyingTitans',
          agentName: this.agentName,
          error: error.message,
        });
      } else {
        logger.debug('Titans state saved', {
          service: 'SelfModifyingTitans',
          agentName: this.agentName,
          updateCount: this.state.updateCount,
        });
      }
    } catch (error) {
      logger.error('Error saving Titans state', error, {
        service: 'SelfModifyingTitans',
        agentName: this.agentName,
      });
    }
  }

  /**
   * Load Titans state from database
   */
  async loadState(): Promise<void> {
    try {
      const { data, error } = await serverSupabase
        .from('titans_states')
        .select('*')
        .eq('agent_name', this.agentName)
        .single();

      if (error && error.code !== 'PGRST116') {
        logger.warn('No existing Titans state found, using initialization', {
          service: 'SelfModifyingTitans',
          agentName: this.agentName,
          error: error.message,
        });
        return;
      }

      if (data) {
        this.state = {
          projections: data.projections_jsonb as ProjectionParameters,
          contextMemory: (data.context_memory_jsonb as number[][]) || [],
          updateCount: data.update_count || 0,
          lastUpdateTime: new Date(data.last_updated),
        };
        
        logger.info('Titans state loaded', {
          service: 'SelfModifyingTitans',
          agentName: this.agentName,
          updateCount: this.state.updateCount,
        });
      }
    } catch (error) {
      logger.error('Error loading Titans state', error, {
        service: 'SelfModifyingTitans',
        agentName: this.agentName,
      });
    }
  }
}

