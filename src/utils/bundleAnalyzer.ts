/**
 * BUNDLE ANALYSIS & OPTIMIZATION
 * Real-time bundle size monitoring and analysis
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from './logger';

export interface BundleMetrics {
  totalSize: number;
  compressedSize: number;
  assets: BundleAsset[];
  chunks: BundleChunk[];
  largestAssets: BundleAsset[];
  duplicateModules: string[];
  unusedExports: string[];
  treeShakingOpportunities: string[];
  timestamp: number;
}

export interface BundleAsset {
  name: string;
  size: number;
  compressedSize: number;
  type: 'js' | 'image' | 'font' | 'other';
  loadTime: number;
  critical: boolean;
}

export interface BundleChunk {
  name: string;
  size: number;
  modules: string[];
  loadOrder: number;
  lazy: boolean;
}

export interface OptimizationRecommendation {
  type: 'code-splitting' | 'lazy-loading' | 'tree-shaking' | 'compression' | 'caching';
  priority: 'high' | 'medium' | 'low';
  description: string;
  estimatedSavings: number; // in KB
  implementation: string;
}

export class BundleAnalyzer {
  private static readonly STORAGE_KEY = '@mintenance/bundle_metrics';
  private static readonly ANALYSIS_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Analyze current bundle and generate optimization recommendations
   */
  static async analyzeBundle(): Promise<{
    metrics: BundleMetrics;
    recommendations: OptimizationRecommendation[];
  }> {
    try {
      logger.performance('Bundle analysis', 0, { phase: 'start' });
      const startTime = performance.now();

      const metrics = await this.collectBundleMetrics();
      const recommendations = this.generateRecommendations(metrics);

      // Store metrics for trend analysis
      await this.storeBundleMetrics(metrics);

      const analysisTime = performance.now() - startTime;
      logger.performance('Bundle analysis', analysisTime, { 
        totalSize: metrics.totalSize,
        recommendations: recommendations.length
      });

      return { metrics, recommendations };
    } catch (error) {
      logger.error('Bundle analysis failed:', error as Error);
      throw error;
    }
  }

  /**
   * Collect current bundle metrics
   */
  private static async collectBundleMetrics(): Promise<BundleMetrics> {
    // Simulate bundle metrics collection
    // In a real implementation, this would integrate with Metro bundler
    const mockMetrics: BundleMetrics = {
      totalSize: 15 * 1024 * 1024, // 15MB
      compressedSize: 5 * 1024 * 1024, // 5MB compressed
      assets: [
        {
          name: 'main.bundle.js',
          size: 8 * 1024 * 1024,
          compressedSize: 2.5 * 1024 * 1024,
          type: 'js',
          loadTime: 1200,
          critical: true
        },
        {
          name: 'vendor.bundle.js',
          size: 4 * 1024 * 1024,
          compressedSize: 1.5 * 1024 * 1024,
          type: 'js',
          loadTime: 800,
          critical: true
        },
        {
          name: 'assets.bundle',
          size: 3 * 1024 * 1024,
          compressedSize: 1 * 1024 * 1024,
          type: 'image',
          loadTime: 500,
          critical: false
        }
      ],
      chunks: [
        {
          name: 'main',
          size: 8 * 1024 * 1024,
          modules: ['App.tsx', 'screens/*', 'components/*'],
          loadOrder: 1,
          lazy: false
        },
        {
          name: 'vendor',
          size: 4 * 1024 * 1024,
          modules: ['react-native', 'react', '@expo/*'],
          loadOrder: 0,
          lazy: false
        }
      ],
      largestAssets: [],
      duplicateModules: ['lodash', 'moment'],
      unusedExports: ['utils/oldHelper.ts', 'components/DeprecatedComponent.tsx'],
      treeShakingOpportunities: ['@expo/vector-icons', 'react-native-svg'],
      timestamp: Date.now()
    };

    // Sort largest assets
    mockMetrics.largestAssets = mockMetrics.assets
      .sort((a, b) => b.size - a.size)
      .slice(0, 10);

    return mockMetrics;
  }

  /**
   * Generate optimization recommendations based on bundle analysis
   */
  private static generateRecommendations(metrics: BundleMetrics): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    // Check bundle size
    if (metrics.totalSize > 20 * 1024 * 1024) { // 20MB
      recommendations.push({
        type: 'code-splitting',
        priority: 'high',
        description: 'Bundle size exceeds 20MB. Implement code splitting for non-critical screens.',
        estimatedSavings: 5 * 1024, // 5MB
        implementation: 'Use React.lazy() for screen components and implement route-based splitting'
      });
    }

    // Check for large assets
    const largeAssets = metrics.assets.filter(asset => asset.size > 1024 * 1024); // 1MB
    if (largeAssets.length > 0) {
      recommendations.push({
        type: 'lazy-loading',
        priority: 'medium',
        description: `Found ${largeAssets.length} assets larger than 1MB. Implement lazy loading.`,
        estimatedSavings: 2 * 1024, // 2MB
        implementation: 'Use dynamic imports and lazy loading for large assets'
      });
    }

    // Check for duplicate modules
    if (metrics.duplicateModules.length > 0) {
      recommendations.push({
        type: 'tree-shaking',
        priority: 'high',
        description: `Found ${metrics.duplicateModules.length} duplicate modules: ${metrics.duplicateModules.join(', ')}`,
        estimatedSavings: 1.5 * 1024, // 1.5MB
        implementation: 'Review dependencies and eliminate duplicate imports'
      });
    }

    // Check for unused exports
    if (metrics.unusedExports.length > 0) {
      recommendations.push({
        type: 'tree-shaking',
        priority: 'medium',
        description: `Found ${metrics.unusedExports.length} unused exports that can be removed`,
        estimatedSavings: 500, // 500KB
        implementation: 'Remove unused exports and enable tree shaking'
      });
    }

    // Check compression opportunities
    const compressionRatio = metrics.compressedSize / metrics.totalSize;
    if (compressionRatio > 0.7) { // Poor compression
      recommendations.push({
        type: 'compression',
        priority: 'medium',
        description: 'Bundle compression ratio is poor. Optimize assets and enable better compression.',
        estimatedSavings: 3 * 1024, // 3MB
        implementation: 'Optimize images, enable Gzip compression, minify JavaScript'
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Store bundle metrics for trend analysis
   */
  private static async storeBundleMetrics(metrics: BundleMetrics): Promise<void> {
    try {
      const existingData = await AsyncStorage.getItem(this.STORAGE_KEY);
      const history: BundleMetrics[] = existingData ? JSON.parse(existingData) : [];
      
      // Keep only last 30 entries
      history.push(metrics);
      if (history.length > 30) {
        history.shift();
      }

      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      logger.warn('Failed to store bundle metrics:', { data: error });
    }
  }

  /**
   * Get bundle metrics history for trend analysis
   */
  static async getBundleHistory(): Promise<BundleMetrics[]> {
    try {
      const data = await AsyncStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      logger.warn('Failed to retrieve bundle history:', { data: error });
      return [];
    }
  }

  /**
   * Check if bundle analysis should run
   */
  static async shouldRunAnalysis(): Promise<boolean> {
    try {
      const history = await this.getBundleHistory();
      if (history.length === 0) return true;

      const lastAnalysis = history[history.length - 1];
      const timeSinceLastAnalysis = Date.now() - lastAnalysis.timestamp;
      
      return timeSinceLastAnalysis > this.ANALYSIS_INTERVAL;
    } catch {
      return true;
    }
  }

  /**
   * Generate bundle size trend report
   */
  static async generateTrendReport(): Promise<{
    currentSize: number;
    sizeChange: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    recommendations: string[];
  }> {
    const history = await this.getBundleHistory();
    if (history.length < 2) {
      return {
        currentSize: 0,
        sizeChange: 0,
        trend: 'stable',
        recommendations: ['Insufficient data for trend analysis']
      };
    }

    const current = history[history.length - 1];
    const previous = history[history.length - 2];
    const sizeChange = current.totalSize - previous.totalSize;
    const changePercentage = (sizeChange / previous.totalSize) * 100;

    let trend: 'increasing' | 'decreasing' | 'stable';
    if (Math.abs(changePercentage) < 5) {
      trend = 'stable';
    } else if (sizeChange > 0) {
      trend = 'increasing';
    } else {
      trend = 'decreasing';
    }

    const recommendations: string[] = [];
    if (trend === 'increasing' && changePercentage > 10) {
      recommendations.push('Bundle size increased significantly. Review recent changes.');
    }
    if (current.totalSize > 25 * 1024 * 1024) { // 25MB
      recommendations.push('Bundle size is very large. Implement aggressive code splitting.');
    }

    return {
      currentSize: current.totalSize,
      sizeChange,
      trend,
      recommendations
    };
  }
}