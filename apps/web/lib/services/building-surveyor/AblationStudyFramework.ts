/**
 * Ablation Study Framework
 * 
 * Systematic framework for conducting ablation studies on the building surveyor agent
 * Tests individual components and their contributions to overall performance
 */

import { logger } from '@mintenance/shared';
import { AssessmentAccuracyMetrics } from './AssessmentAccuracyMetrics';
import { FeatureExtractorABTest } from './FeatureExtractorABTest';
import { TitansEffectivenessAnalyzer } from './TitansEffectivenessAnalyzer';
import { PerformanceBenchmark } from './PerformanceBenchmark';

export interface AblationConfig {
  baseline: boolean; // No enhancements
  learnedFeatures: boolean; // Learned feature extraction only
  titans: boolean; // Titans only
  both: boolean; // Both learned features and Titans
}

export interface AblationResult {
  config: AblationConfig;
  accuracy: {
    overall: number;
    damageType: number;
    severity: number;
    urgency: number;
    confidence: number;
    cost: number;
  };
  performance: {
    averageLatencyMs: number;
    throughput: number;
    memoryUsageMB: number;
  };
  learningProgress?: {
    featureExtractorError: number;
    titansModifications: number;
  };
}

export interface AblationStudy {
  studyId: string;
  period: {
    start: Date;
    end: Date;
  };
  results: {
    baseline: AblationResult;
    learnedFeatures: AblationResult;
    titans: AblationResult;
    both: AblationResult;
  };
  contributions: {
    learnedFeatures: number; // Contribution to accuracy improvement
    titans: number; // Contribution to accuracy improvement
    interaction: number; // Interaction effect (synergy)
  };
}

/**
 * Ablation Study Framework
 * 
 * Systematically tests each component's contribution to performance
 */
export class AblationStudyFramework {
  /**
   * Run full ablation study
   */
  static async runStudy(
    period: { start: Date; end: Date },
    studyId?: string
  ): Promise<AblationStudy> {
    const id = studyId || `ablation-${Date.now()}`;
    
    logger.info('Starting ablation study', {
      service: 'AblationStudyFramework',
      studyId: id,
      period,
    });

    // Run each configuration
    const [baseline, learnedFeatures, titans, both] = await Promise.all([
      this.runConfiguration('baseline', period),
      this.runConfiguration('learnedFeatures', period),
      this.runConfiguration('titans', period),
      this.runConfiguration('both', period),
    ]);

    // Calculate contributions
    const contributions = this.calculateContributions(
      baseline,
      learnedFeatures,
      titans,
      both
    );

    return {
      studyId: id,
      period,
      results: {
        baseline,
        learnedFeatures,
        titans,
        both,
      },
      contributions,
    };
  }

  /**
   * Run a single configuration
   */
  private static async runConfiguration(
    config: 'baseline' | 'learnedFeatures' | 'titans' | 'both',
    period: { start: Date; end: Date }
  ): Promise<AblationResult> {
    logger.info(`Running ablation configuration: ${config}`, {
      service: 'AblationStudyFramework',
    });

    // Get accuracy metrics (would need to filter by configuration)
    // For now, use placeholder - in production would query assessments with specific flags
    const accuracyMetrics = await AssessmentAccuracyMetrics.calculateMetrics(
      period.start,
      period.end
    );

    // Get performance metrics (would need to run benchmarks)
    // For now, use placeholder
    const performanceMetrics = {
      averageLatencyMs: 0,
      throughput: 0,
      memoryUsageMB: 0,
    };

    // Get learning progress if applicable
    let learningProgress: AblationResult['learningProgress'];
    if (config === 'learnedFeatures' || config === 'both') {
      const metrics = await FeatureExtractorABTest.getMetrics(period.start, period.end);
      learningProgress = {
        featureExtractorError: metrics.learned.learningProgress?.averageError || 0,
        titansModifications: 0,
      };
    }
    if (config === 'titans' || config === 'both') {
      const analysis = await TitansEffectivenessAnalyzer.analyze(
        'building-surveyor',
        period.start,
        period.end
      );
      if (learningProgress) {
        learningProgress.titansModifications = analysis.metrics.totalModifications;
      } else {
        learningProgress = {
          featureExtractorError: 0,
          titansModifications: analysis.metrics.totalModifications,
        };
      }
    }

    return {
      config: this.getConfigForName(config),
      accuracy: {
        overall: accuracyMetrics.overallAccuracy,
        damageType: accuracyMetrics.componentAccuracy.damageType,
        severity: accuracyMetrics.componentAccuracy.severity,
        urgency: accuracyMetrics.componentAccuracy.urgency,
        confidence: accuracyMetrics.componentAccuracy.confidence,
        cost: accuracyMetrics.componentAccuracy.cost,
      },
      performance: performanceMetrics,
      learningProgress,
    };
  }

  /**
   * Calculate component contributions
   */
  private static calculateContributions(
    baseline: AblationResult,
    learnedFeatures: AblationResult,
    titans: AblationResult,
    both: AblationResult
  ): AblationStudy['contributions'] {
    // Main effects
    const learnedFeaturesContribution = learnedFeatures.accuracy.overall - baseline.accuracy.overall;
    const titansContribution = titans.accuracy.overall - baseline.accuracy.overall;

    // Interaction effect (synergy)
    // If both together > sum of individual, there's positive interaction
    const expectedBoth = baseline.accuracy.overall + learnedFeaturesContribution + titansContribution;
    const interaction = both.accuracy.overall - expectedBoth;

    return {
      learnedFeatures: learnedFeaturesContribution,
      titans: titansContribution,
      interaction,
    };
  }

  /**
   * Get config object for configuration name
   */
  private static getConfigForName(
    name: 'baseline' | 'learnedFeatures' | 'titans' | 'both'
  ): AblationConfig {
    switch (name) {
      case 'baseline':
        return { baseline: true, learnedFeatures: false, titans: false, both: false };
      case 'learnedFeatures':
        return { baseline: false, learnedFeatures: true, titans: false, both: false };
      case 'titans':
        return { baseline: false, learnedFeatures: false, titans: true, both: false };
      case 'both':
        return { baseline: false, learnedFeatures: true, titans: true, both: true };
      default:
        throw new Error(`Unknown configuration: ${name}`);
    }
  }

  /**
   * Generate ablation study report
   */
  static generateReport(study: AblationStudy): string {
    const report: string[] = [];

    report.push('# Ablation Study Report');
    report.push(`Study ID: ${study.studyId}`);
    report.push(`Period: ${study.period.start.toISOString()} to ${study.period.end.toISOString()}`);
    report.push(`Generated: ${new Date().toISOString()}\n`);

    // Accuracy comparison
    report.push('## Accuracy Comparison');
    report.push('| Configuration | Overall | Damage Type | Severity | Urgency | Confidence | Cost |');
    report.push('|--------------|---------|-------------|----------|---------|------------|------|');
    report.push(`| Baseline | ${study.results.baseline.accuracy.overall.toFixed(3)} | ${study.results.baseline.accuracy.damageType.toFixed(3)} | ${study.results.baseline.accuracy.severity.toFixed(3)} | ${study.results.baseline.accuracy.urgency.toFixed(3)} | ${study.results.baseline.accuracy.confidence.toFixed(3)} | ${study.results.baseline.accuracy.cost.toFixed(3)} |`);
    report.push(`| Learned Features | ${study.results.learnedFeatures.accuracy.overall.toFixed(3)} | ${study.results.learnedFeatures.accuracy.damageType.toFixed(3)} | ${study.results.learnedFeatures.accuracy.severity.toFixed(3)} | ${study.results.learnedFeatures.accuracy.urgency.toFixed(3)} | ${study.results.learnedFeatures.accuracy.confidence.toFixed(3)} | ${study.results.learnedFeatures.accuracy.cost.toFixed(3)} |`);
    report.push(`| Titans | ${study.results.titans.accuracy.overall.toFixed(3)} | ${study.results.titans.accuracy.damageType.toFixed(3)} | ${study.results.titans.accuracy.severity.toFixed(3)} | ${study.results.titans.accuracy.urgency.toFixed(3)} | ${study.results.titans.accuracy.confidence.toFixed(3)} | ${study.results.titans.accuracy.cost.toFixed(3)} |`);
    report.push(`| Both | ${study.results.both.accuracy.overall.toFixed(3)} | ${study.results.both.accuracy.damageType.toFixed(3)} | ${study.results.both.accuracy.severity.toFixed(3)} | ${study.results.both.accuracy.urgency.toFixed(3)} | ${study.results.both.accuracy.confidence.toFixed(3)} | ${study.results.both.accuracy.cost.toFixed(3)} |`);
    report.push('');

    // Component contributions
    report.push('## Component Contributions');
    report.push(`- Learned Features: ${(study.contributions.learnedFeatures * 100).toFixed(2)}% improvement`);
    report.push(`- Titans: ${(study.contributions.titans * 100).toFixed(2)}% improvement`);
    report.push(`- Interaction Effect: ${(study.contributions.interaction * 100).toFixed(2)}%`);
    
    if (study.contributions.interaction > 0) {
      report.push('  - Positive synergy: Components work better together');
    } else if (study.contributions.interaction < 0) {
      report.push('  - Negative interaction: Components may interfere');
    } else {
      report.push('  - No interaction: Components are independent');
    }
    report.push('');

    // Performance comparison
    report.push('## Performance Comparison');
    report.push('| Configuration | Avg Latency (ms) | Throughput (ops/sec) | Memory (MB) |');
    report.push('|--------------|------------------|---------------------|-------------|');
    report.push(`| Baseline | ${study.results.baseline.performance.averageLatencyMs.toFixed(2)} | ${study.results.baseline.performance.throughput.toFixed(2)} | ${study.results.baseline.performance.memoryUsageMB.toFixed(2)} |`);
    report.push(`| Learned Features | ${study.results.learnedFeatures.performance.averageLatencyMs.toFixed(2)} | ${study.results.learnedFeatures.performance.throughput.toFixed(2)} | ${study.results.learnedFeatures.performance.memoryUsageMB.toFixed(2)} |`);
    report.push(`| Titans | ${study.results.titans.performance.averageLatencyMs.toFixed(2)} | ${study.results.titans.performance.throughput.toFixed(2)} | ${study.results.titans.performance.memoryUsageMB.toFixed(2)} |`);
    report.push(`| Both | ${study.results.both.performance.averageLatencyMs.toFixed(2)} | ${study.results.both.performance.throughput.toFixed(2)} | ${study.results.both.performance.memoryUsageMB.toFixed(2)} |`);

    return report.join('\n');
  }

  /**
   * Run incremental ablation (add components one at a time)
   */
  static async runIncrementalAblation(
    period: { start: Date; end: Date }
  ): Promise<{
    step1: AblationResult; // Baseline
    step2: AblationResult; // + Learned Features
    step3: AblationResult; // + Titans
    improvements: {
      step1to2: number;
      step2to3: number;
    };
  }> {
    const baseline = await this.runConfiguration('baseline', period);
    const withLearned = await this.runConfiguration('learnedFeatures', period);
    const withBoth = await this.runConfiguration('both', period);

    return {
      step1: baseline,
      step2: withLearned,
      step3: withBoth,
      improvements: {
        step1to2: withLearned.accuracy.overall - baseline.accuracy.overall,
        step2to3: withBoth.accuracy.overall - withLearned.accuracy.overall,
      },
    };
  }
}

