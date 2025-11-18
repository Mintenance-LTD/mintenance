/**
 * Learned Feature Extractor
 * 
 * Implements feature extraction as associative memory optimization
 * Based on Equation 5-6 from "Nested Learning" paper
 * 
 * Learns optimal mapping: M(x_t) → u_t where u_t is surprise signal
 * 
 * Objective: min_M (M(x_t), u_t)² + λ||M - M_t||²
 * Where:
 * - M is the feature extractor (MLP)
 * - x_t is raw input (images, detections, context)
 * - u_t is target features (from validation feedback)
 * - λ is L2 regularization
 */

import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import type {
  AssessmentContext,
  RoboflowDetection,
  VisionAnalysisSummary,
} from './types';

export interface FeatureExtractorConfig {
  inputDim: number;        // Raw input dimension (varies, will be padded/truncated)
  outputDim: number;       // Fixed output dimension (40)
  hiddenDims: number[];    // Hidden layer dimensions [64, 48]
  learningRate: number;
  regularization: number;  // L2 regularization coefficient
  useBatchNorm?: boolean; // Use batch normalization (default: false)
}

interface FeatureExtractorState {
  weights: number[][][];   // MLP weights [layer][neuron][input]
  biases: number[][];      // MLP biases [layer][neuron]
  updateCount: number;
  lastUpdateTime: Date;
  totalError: number;       // Cumulative error for monitoring
}

/**
 * Learned Feature Extractor
 * 
 * Replaces handcrafted feature extraction with learned MLP
 * that adapts based on validation feedback (surprise signals)
 */
export class LearnedFeatureExtractor {
  private config: FeatureExtractorConfig;
  private state: FeatureExtractorState;
  private agentName: string;

  constructor(agentName: string, config: FeatureExtractorConfig) {
    this.agentName = agentName;
    this.config = {
      useBatchNorm: false,
      ...config,
    };
    this.state = this.initializeState();
  }

  /**
   * Initialize MLP weights using Xavier initialization
   */
  private initializeState(): FeatureExtractorState {
    const { inputDim, outputDim, hiddenDims } = this.config;
    const dims = [inputDim, ...hiddenDims, outputDim];
    
    const weights: number[][][] = [];
    const biases: number[][] = [];

    for (let layer = 0; layer < dims.length - 1; layer++) {
      const layerWeights: number[][] = [];
      const layerBiases: number[] = [];
      
      const scale = Math.sqrt(2.0 / (dims[layer] + dims[layer + 1]));
      
      for (let i = 0; i < dims[layer + 1]; i++) {
        const neuronWeights: number[] = [];
        for (let j = 0; j < dims[layer]; j++) {
          neuronWeights.push((Math.random() * 2 - 1) * scale);
        }
        layerWeights.push(neuronWeights);
        layerBiases.push((Math.random() * 2 - 1) * scale);
      }
      
      weights.push(layerWeights);
      biases.push(layerBiases);
    }

    return {
      weights,
      biases,
      updateCount: 0,
      lastUpdateTime: new Date(),
      totalError: 0,
    };
  }

  /**
   * Extract features from raw inputs
   * 
   * This replaces the handcrafted extractDetectionFeatures method
   * 
   * @param imageUrls - Image URLs
   * @param context - Assessment context
   * @param roboflowDetections - Roboflow detection results
   * @param visionSummary - Google Vision analysis summary
   * @returns Learned feature vector (40 dimensions)
   */
  async extractFeatures(
    imageUrls: string[],
    context?: AssessmentContext,
    roboflowDetections?: RoboflowDetection[],
    visionSummary?: VisionAnalysisSummary | null
  ): Promise<number[]> {
    // Build raw input vector from all available data
    const rawInput = this.buildRawInput(
      imageUrls,
      context,
      roboflowDetections,
      visionSummary
    );

    // Forward pass through learned MLP
    return this.forward(rawInput);
  }

  /**
   * Build raw input vector from all available data
   * This is the "key" in associative memory terminology
   * 
   * Combines all available information into a single vector
   */
  private buildRawInput(
    imageUrls: string[],
    context?: AssessmentContext,
    roboflowDetections?: RoboflowDetection[],
    visionSummary?: VisionAnalysisSummary | null
  ): number[] {
    const input: number[] = [];

    // Property context (normalized)
    input.push(context?.propertyType === 'residential' ? 1.0 : 0.0);
    input.push(context?.propertyType === 'commercial' ? 1.0 : 0.0);
    input.push((context?.ageOfProperty || 0) / 200);
    input.push(this.encodeLocation(context?.location || ''));
    
    // Detection counts and statistics
    const detectionCount = roboflowDetections?.length || 0;
    input.push(detectionCount / 50); // Normalized
    
    if (roboflowDetections && roboflowDetections.length > 0) {
      const confidences = roboflowDetections.map(d => d.confidence / 100);
      input.push(confidences.reduce((a, b) => a + b, 0) / confidences.length); // Mean
      input.push(Math.max(...confidences)); // Max
      input.push(Math.min(...confidences)); // Min
      
      // Class diversity
      const uniqueClasses = new Set(roboflowDetections.map(d => d.className)).size;
      input.push(uniqueClasses / detectionCount);
      
      // Detection area statistics
      const areas = roboflowDetections.map(d => 
        (d.boundingBox.width || 0) * (d.boundingBox.height || 0)
      );
      const totalArea = areas.reduce((a, b) => a + b, 0);
      input.push(Math.min(1.0, totalArea / (1024 * 768))); // Normalized
      input.push(Math.min(1.0, Math.max(...areas) / (1024 * 768))); // Max area
    } else {
      input.push(0, 0, 0, 0, 0, 0); // Fill missing detection features
    }

    // Vision summary features
    if (visionSummary) {
      input.push(visionSummary.confidence / 100);
      input.push(Math.min(1.0, visionSummary.labels.length / 20));
      input.push(Math.min(1.0, visionSummary.objects.length / 20));
      
      // Feature presence indicators
      const features = visionSummary.detectedFeatures || [];
      input.push(features.some(f => f.toLowerCase().includes('water')) ? 1.0 : 0.0);
      input.push(features.some(f => f.toLowerCase().includes('structural')) ? 1.0 : 0.0);
      input.push(features.some(f => f.toLowerCase().includes('mold')) ? 1.0 : 0.0);
      input.push(features.some(f => f.toLowerCase().includes('electrical')) ? 1.0 : 0.0);
    } else {
      input.push(0, 0, 0, 0, 0, 0, 0, 0); // Fill missing vision features
    }

    // Image count and quality proxies
    input.push(Math.min(1.0, imageUrls.length / 10));
    
    // Temporal features
    const now = new Date();
    input.push((now.getMonth() / 11) * 0.25 + (now.getDate() / 30) * 0.25);

    // Pad or truncate to match inputDim
    while (input.length < this.config.inputDim) {
      input.push(0);
    }
    
    return input.slice(0, this.config.inputDim);
  }

  /**
   * Forward pass through learned MLP
   * 
   * Implements: y = MLP(x) with ReLU activations
   */
  private forward(input: number[]): number[] {
    if (input.length !== this.config.inputDim) {
      throw new Error(
        `Input dimension mismatch: expected ${this.config.inputDim}, got ${input.length}`
      );
    }

    let current = input;

    for (let layer = 0; layer < this.state.weights.length; layer++) {
      const layerOutput: number[] = [];
      const weights = this.state.weights[layer];
      const biases = this.state.biases[layer];

      for (let i = 0; i < weights.length; i++) {
        let sum = biases[i];
        for (let j = 0; j < weights[i].length; j++) {
          sum += weights[i][j] * current[j];
        }
        // ReLU activation (except last layer - linear)
        layerOutput.push(
          layer < this.state.weights.length - 1 
            ? Math.max(0, sum)  // ReLU
            : sum               // Linear for output
        );
      }

      current = layerOutput;
    }

    // Ensure output dimension matches config
    if (current.length !== this.config.outputDim) {
      logger.warn('Output dimension mismatch, truncating/padding', {
        service: 'LearnedFeatureExtractor',
        expected: this.config.outputDim,
        actual: current.length,
      });
      
      while (current.length < this.config.outputDim) {
        current.push(0);
      }
      return current.slice(0, this.config.outputDim);
    }

    return current;
  }

  /**
   * Learn from surprise signal
   * 
   * Implements: min_M (M(x_t), u_t)² + λ||M - M_t||²
   * Where u_t is the surprise signal (validation feedback)
   * 
   * @param rawInput - Raw input vector (key)
   * @param surpriseSignal - Target features (value from validation)
   * @param learningRate - Optional learning rate override
   */
  async learnFromSurprise(
    rawInput: number[],
    surpriseSignal: number[],  // Target features (from validation)
    learningRate?: number
  ): Promise<void> {
    if (rawInput.length !== this.config.inputDim) {
      throw new Error(
        `Input dimension mismatch: expected ${this.config.inputDim}, got ${rawInput.length}`
      );
    }

    const lr = learningRate || this.config.learningRate;
    
    // Forward pass to get current features
    const currentFeatures = this.forward(rawInput);
    
    // Ensure dimensions match
    const targetDim = Math.min(currentFeatures.length, surpriseSignal.length);
    const truncatedOutput = currentFeatures.slice(0, targetDim);
    const truncatedSurprise = surpriseSignal.slice(0, targetDim);
    
    // Compute error (surprise signal)
    const error = truncatedSurprise.map((target, i) => 
      target - truncatedOutput[i]
    );
    
    // Compute mean squared error for monitoring
    const mse = error.reduce((sum, e) => sum + e * e, 0) / error.length;
    this.state.totalError += mse;
    
    // Backward pass to compute gradients
    const gradients = this.backward(rawInput, error, truncatedOutput);
    
    // Update weights using gradient descent with L2 regularization
    this.updateWeights(gradients, lr);
    
    this.state.updateCount++;
    this.state.lastUpdateTime = new Date();
    
    // Save periodically
    if (this.state.updateCount % 10 === 0) {
      await this.saveState();
      
      logger.debug('Feature extractor learned from surprise', {
        service: 'LearnedFeatureExtractor',
        agentName: this.agentName,
        updateCount: this.state.updateCount,
        mse,
        avgError: this.state.totalError / this.state.updateCount,
      });
    }
  }

  /**
   * Backward pass to compute gradients
   * Simplified backpropagation (full implementation would use analytical gradients)
   */
  private backward(
    input: number[],
    error: number[],
    output: number[]
  ): {
    weightGradients: number[][][];
    biasGradients: number[][];
  } {
    const weightGradients: number[][][] = [];
    const biasGradients: number[][] = [];
    
    // Simplified gradient computation
    // Full implementation would use proper backpropagation through all layers
    
    let currentError = error;
    let currentInput = input;
    
    // Backward through layers (reverse order)
    for (let layer = this.state.weights.length - 1; layer >= 0; layer--) {
      const layerWGrad: number[][] = [];
      const layerBGrad: number[] = [];
      const weights = this.state.weights[layer];
      
      for (let i = 0; i < weights.length; i++) {
        const neuronWGrad: number[] = [];
        const errorSignal = currentError[i] || 0;
        
        // Weight gradients: ∂L/∂W = error * input
        for (let j = 0; j < weights[i].length; j++) {
          neuronWGrad.push(errorSignal * currentInput[j]);
        }
        layerWGrad.push(neuronWGrad);
        
        // Bias gradients: ∂L/∂b = error
        layerBGrad.push(errorSignal);
      }
      
      weightGradients.unshift(layerWGrad);
      biasGradients.unshift(layerBGrad);
      
      // Propagate error backward (simplified)
      // Full implementation would compute proper gradients
      if (layer > 0) {
        currentInput = new Array(this.state.weights[layer - 1].length).fill(0);
        // Simplified: distribute error proportionally
        for (let i = 0; i < currentError.length; i++) {
          for (let j = 0; j < currentInput.length; j++) {
            currentInput[j] += currentError[i] * weights[i][j] / currentInput.length;
          }
        }
        currentError = currentInput;
      }
    }
    
    return { weightGradients, biasGradients };
  }

  /**
   * Update weights using gradients
   * Includes L2 regularization
   */
  private updateWeights(
    gradients: { weightGradients: number[][][]; biasGradients: number[][] },
    learningRate: number
  ): void {
    const { weightGradients, biasGradients } = gradients;
    const lambda = this.config.regularization;

    for (let layer = 0; layer < this.state.weights.length; layer++) {
      for (let i = 0; i < this.state.weights[layer].length; i++) {
        // Update bias: b = b + η(∇b - λb)
        this.state.biases[layer][i] += 
          learningRate * (biasGradients[layer][i] - lambda * this.state.biases[layer][i]);
        
        // Update weights: W = W + η(∇W - λW)
        for (let j = 0; j < this.state.weights[layer][i].length; j++) {
          this.state.weights[layer][i][j] += 
            learningRate * (
              weightGradients[layer][i][j] - 
              lambda * this.state.weights[layer][i][j]
            );
        }
      }
    }
  }

  /**
   * Get current state (for inspection/debugging)
   */
  getState(): Readonly<FeatureExtractorState> {
    return {
      ...this.state,
      weights: this.state.weights.map(layer => 
        layer.map(neuron => [...neuron])
      ),
      biases: this.state.biases.map(layer => [...layer]),
    };
  }

  /**
   * Get average error (for monitoring)
   */
  getAverageError(): number {
    return this.state.updateCount > 0 
      ? this.state.totalError / this.state.updateCount 
      : 0;
  }

  /**
   * Save state to database
   */
  private async saveState(): Promise<void> {
    try {
      const { error } = await serverSupabase
        .from('learned_feature_extractors')
        .upsert({
          agent_name: this.agentName,
          weights_jsonb: this.state.weights,
          biases_jsonb: this.state.biases,
          update_count: this.state.updateCount,
          total_error: this.state.totalError,
          last_updated: this.state.lastUpdateTime.toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'agent_name',
        });

      if (error) {
        logger.error('Failed to save feature extractor state', {
          service: 'LearnedFeatureExtractor',
          agentName: this.agentName,
          error: error.message,
        });
      } else {
        logger.debug('Feature extractor state saved', {
          service: 'LearnedFeatureExtractor',
          agentName: this.agentName,
          updateCount: this.state.updateCount,
        });
      }
    } catch (error) {
      logger.error('Error saving feature extractor state', error, {
        service: 'LearnedFeatureExtractor',
        agentName: this.agentName,
      });
    }
  }

  /**
   * Load state from database
   */
  async loadState(): Promise<void> {
    try {
      const { data, error } = await serverSupabase
        .from('learned_feature_extractors')
        .select('*')
        .eq('agent_name', this.agentName)
        .single();

      if (error && error.code !== 'PGRST116') {
        logger.warn('No existing feature extractor state found, using initialization', {
          service: 'LearnedFeatureExtractor',
          agentName: this.agentName,
          error: error.message,
        });
        return;
      }

      if (data) {
        this.state = {
          weights: data.weights_jsonb as number[][][],
          biases: data.biases_jsonb as number[][],
          updateCount: data.update_count || 0,
          totalError: data.total_error || 0,
          lastUpdateTime: new Date(data.last_updated),
        };
        
        logger.info('Feature extractor state loaded', {
          service: 'LearnedFeatureExtractor',
          agentName: this.agentName,
          updateCount: this.state.updateCount,
        });
      }
    } catch (error) {
      logger.error('Error loading feature extractor state', error, {
        service: 'LearnedFeatureExtractor',
        agentName: this.agentName,
      });
    }
  }

  /**
   * Encode location string to 0-1 value (same as BuildingSurveyorService)
   */
  private encodeLocation(location: string): number {
    if (!location) return 0.5;
    let hash = 0;
    for (let i = 0; i < location.length; i++) {
      hash = ((hash << 5) - hash) + location.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash % 1000) / 1000;
  }
}

