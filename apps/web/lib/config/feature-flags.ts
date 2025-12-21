/**
 * Feature Flag Configuration
 *
 * Manages feature flags for gradual rollout and A/B testing.
 * Integrates with LaunchDarkly for production, uses local config for development.
 */

import { LDClient, LDFlagSet } from 'launchdarkly-js-client-sdk';
import { logger } from '@mintenance/shared';

/**
 * Feature flag names
 */
export enum FeatureFlag {
    SAM3_PRESENCE_DETECTION = 'sam3-presence-detection',
    YOLO_SKIP_OPTIMIZATION = 'yolo-skip-optimization',
    HYBRID_INFERENCE = 'hybrid-inference',
    INTERNAL_MODEL_PRIMARY = 'internal-model-primary',
    DRIFT_DETECTION = 'drift-detection',
    AUTO_ROLLBACK = 'auto-rollback',
}

/**
 * Feature flag variations for SAM3 rollout
 */
export interface SAM3RolloutConfig {
    enabled: boolean;
    rolloutPercentage: number;
    skipYoloThreshold: number; // Confidence threshold to skip YOLO
    maxFalseNegativeRate: number; // Trigger rollback if exceeded
    performanceTracking: boolean;
    abTestGroup?: 'control' | 'treatment';
}

/**
 * Default configurations for development
 */
const DEFAULT_FLAGS: Record<string, any> = {
    [FeatureFlag.SAM3_PRESENCE_DETECTION]: {
        enabled: false,
        rolloutPercentage: 0,
        skipYoloThreshold: 0.95,
        maxFalseNegativeRate: 0.05,
        performanceTracking: true,
    },
    [FeatureFlag.YOLO_SKIP_OPTIMIZATION]: false,
    [FeatureFlag.HYBRID_INFERENCE]: true,
    [FeatureFlag.INTERNAL_MODEL_PRIMARY]: false,
    [FeatureFlag.DRIFT_DETECTION]: true,
    [FeatureFlag.AUTO_ROLLBACK]: true,
};

/**
 * Feature Flag Service
 */
export class FeatureFlagService {
    private static instance: FeatureFlagService;
    private ldClient?: LDClient;
    private flags: LDFlagSet = {};
    private initialized = false;
    private userContext: any = {};

    private constructor() {}

    static getInstance(): FeatureFlagService {
        if (!FeatureFlagService.instance) {
            FeatureFlagService.instance = new FeatureFlagService();
        }
        return FeatureFlagService.instance;
    }

    /**
     * Initialize feature flags
     */
    async initialize(
        userId?: string,
        attributes?: Record<string, any>
    ): Promise<void> {
        if (this.initialized) {
            return;
        }

        try {
            const isDevelopment = process.env.NODE_ENV === 'development';
            const ldKey = process.env.NEXT_PUBLIC_LAUNCHDARKLY_CLIENT_KEY;

            if (!isDevelopment && ldKey) {
                // Initialize LaunchDarkly for production
                const { initialize } = await import('launchdarkly-js-client-sdk');

                this.userContext = {
                    key: userId || 'anonymous',
                    anonymous: !userId,
                    custom: {
                        ...attributes,
                        environment: process.env.NEXT_PUBLIC_ENVIRONMENT || 'production',
                        deploymentRegion: process.env.NEXT_PUBLIC_REGION || 'eu-west-2',
                    },
                };

                this.ldClient = initialize(ldKey, this.userContext);

                await this.ldClient.waitForInitialization();
                this.flags = this.ldClient.allFlags();

                // Listen for flag changes
                this.ldClient.on('change', (changes) => {
                    logger.info('Feature flags updated', { changes });
                    this.flags = this.ldClient!.allFlags();
                    this.handleFlagChanges(changes);
                });

                logger.info('LaunchDarkly initialized', {
                    userId: this.userContext.key,
                    flags: Object.keys(this.flags),
                });
            } else {
                // Use default flags for development
                this.flags = DEFAULT_FLAGS;
                logger.info('Using default feature flags for development');
            }

            this.initialized = true;
        } catch (error) {
            logger.error('Failed to initialize feature flags', error);
            // Fall back to defaults
            this.flags = DEFAULT_FLAGS;
            this.initialized = true;
        }
    }

    /**
     * Get SAM3 rollout configuration
     */
    getSAM3Config(): SAM3RolloutConfig {
        const config = this.getFlag(
            FeatureFlag.SAM3_PRESENCE_DETECTION,
            DEFAULT_FLAGS[FeatureFlag.SAM3_PRESENCE_DETECTION]
        );

        // Ensure proper typing
        return {
            enabled: config.enabled || false,
            rolloutPercentage: config.rolloutPercentage || 0,
            skipYoloThreshold: config.skipYoloThreshold || 0.95,
            maxFalseNegativeRate: config.maxFalseNegativeRate || 0.05,
            performanceTracking: config.performanceTracking !== false,
            abTestGroup: config.abTestGroup,
        };
    }

    /**
     * Check if SAM3 presence detection should be used for this request
     */
    shouldUseSAM3PresenceDetection(userId?: string): boolean {
        const config = this.getSAM3Config();

        if (!config.enabled) {
            return false;
        }

        // Check rollout percentage
        if (config.rolloutPercentage < 100) {
            // Use consistent hashing based on userId for stable assignment
            const hash = this.hashUserId(userId || this.userContext.key || 'anonymous');
            const bucket = hash % 100;
            return bucket < config.rolloutPercentage;
        }

        return true;
    }

    /**
     * Check if YOLO should be skipped based on SAM3 confidence
     */
    shouldSkipYolo(sam3Confidence: number): boolean {
        if (!this.getFlag(FeatureFlag.YOLO_SKIP_OPTIMIZATION, false)) {
            return false;
        }

        const config = this.getSAM3Config();
        return sam3Confidence >= config.skipYoloThreshold;
    }

    /**
     * Get feature flag value
     */
    getFlag<T = any>(flag: FeatureFlag | string, defaultValue: T): T {
        if (!this.initialized) {
            logger.warn('Feature flags not initialized, using default', { flag });
            return defaultValue;
        }

        const value = this.flags[flag];
        return value !== undefined ? value : defaultValue;
    }

    /**
     * Track feature flag usage
     */
    trackUsage(flag: FeatureFlag, metadata?: Record<string, any>): void {
        if (this.ldClient) {
            this.ldClient.track(`${flag}-used`, metadata);
        }

        logger.info('Feature flag used', {
            flag,
            value: this.flags[flag],
            metadata,
        });
    }

    /**
     * Track performance metrics for SAM3
     */
    trackSAM3Performance(metrics: {
        falsePositiveReduction?: number;
        yoloSkipRate?: number;
        inferenceTimeMs?: number;
        falseNegativeRate?: number;
        errorRate?: number;
    }): void {
        if (this.ldClient) {
            this.ldClient.track('sam3-performance', metrics);
        }

        // Check if we need to trigger rollback
        const config = this.getSAM3Config();
        if (
            config.enabled &&
            config.maxFalseNegativeRate &&
            metrics.falseNegativeRate &&
            metrics.falseNegativeRate > config.maxFalseNegativeRate
        ) {
            this.triggerRollback('High false negative rate detected');
        }
    }

    /**
     * Trigger automatic rollback
     */
    private async triggerRollback(reason: string): Promise<void> {
        if (!this.getFlag(FeatureFlag.AUTO_ROLLBACK, true)) {
            logger.warn('Auto rollback disabled, manual intervention required', { reason });
            return;
        }

        logger.error('Triggering SAM3 rollback', { reason });

        try {
            // Disable SAM3 locally immediately
            this.flags[FeatureFlag.SAM3_PRESENCE_DETECTION] = {
                ...DEFAULT_FLAGS[FeatureFlag.SAM3_PRESENCE_DETECTION],
                enabled: false,
            };

            // Notify backend to update feature flag
            await fetch('/api/feature-flags/rollback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    flag: FeatureFlag.SAM3_PRESENCE_DETECTION,
                    reason,
                    metrics: {
                        timestamp: new Date().toISOString(),
                        userId: this.userContext.key,
                    },
                }),
            });

            logger.info('SAM3 rollback completed', { reason });
        } catch (error) {
            logger.error('Failed to trigger rollback', error);
        }
    }

    /**
     * Handle flag changes
     */
    private handleFlagChanges(changes: Record<string, any>): void {
        // Handle SAM3 flag changes
        if (changes[FeatureFlag.SAM3_PRESENCE_DETECTION]) {
            const newConfig = this.getSAM3Config();
            logger.info('SAM3 configuration changed', { newConfig });

            // Clear any cached SAM3 results
            if (typeof window !== 'undefined') {
                window.dispatchEvent(
                    new CustomEvent('sam3-config-changed', { detail: newConfig })
                );
            }
        }

        // Handle other flag changes as needed
        Object.keys(changes).forEach((flag) => {
            logger.info('Feature flag changed', {
                flag,
                oldValue: changes[flag].previous,
                newValue: changes[flag].current,
            });
        });
    }

    /**
     * Simple hash function for consistent user bucketing
     */
    private hashUserId(userId: string): number {
        let hash = 0;
        for (let i = 0; i < userId.length; i++) {
            const char = userId.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }

    /**
     * Get A/B test assignment for user
     */
    getABTestGroup(userId?: string): 'control' | 'treatment' {
        const config = this.getSAM3Config();

        if (!config.enabled || !config.abTestGroup) {
            // Assign based on user hash
            const hash = this.hashUserId(userId || this.userContext.key || 'anonymous');
            return hash % 2 === 0 ? 'control' : 'treatment';
        }

        return config.abTestGroup;
    }

    /**
     * Flush events to LaunchDarkly
     */
    async flush(): Promise<void> {
        if (this.ldClient) {
            await this.ldClient.flush();
        }
    }

    /**
     * Clean up resources
     */
    async cleanup(): Promise<void> {
        if (this.ldClient) {
            await this.ldClient.close();
        }
        this.initialized = false;
    }
}

// Export singleton instance
export const featureFlags = FeatureFlagService.getInstance();

// React hook for feature flags
export function useFeatureFlag<T = any>(
    flag: FeatureFlag,
    defaultValue: T
): T {
    if (typeof window === 'undefined') {
        return defaultValue;
    }

    const [value, setValue] = React.useState<T>(() =>
        featureFlags.getFlag(flag, defaultValue)
    );

    React.useEffect(() => {
        const handleChange = (event: CustomEvent) => {
            setValue(featureFlags.getFlag(flag, defaultValue));
        };

        window.addEventListener('sam3-config-changed', handleChange as any);
        return () => {
            window.removeEventListener('sam3-config-changed', handleChange as any);
        };
    }, [flag, defaultValue]);

    return value;
}

// Next.js API route helper
export async function initializeFeatureFlags(req: any): Promise<void> {
    const userId = req.cookies?.userId || req.headers['x-user-id'];
    const attributes = {
        ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        referer: req.headers['referer'],
    };

    await featureFlags.initialize(userId, attributes);
}

// Export for use in other modules
import React from 'react';
export default featureFlags;