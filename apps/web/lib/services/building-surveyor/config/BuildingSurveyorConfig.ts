/**
 * Centralized Configuration for Building Surveyor Service
 * 
 * All environment variable access is centralized here with:
 * - Type safety
 * - Default values
 * - Validation
 * - Documentation
 */

export interface BuildingSurveyorConfig {
    // API Keys
    openaiApiKey: string | undefined;

    // Timeouts (ms)
    detectorTimeoutMs: number;
    visionTimeoutMs: number;

    // Image Processing
    imageBaseArea: number;

    // Feature Extraction
    useLearnedFeatures: boolean;

    // Memory & Learning
    useTitans: boolean;

    // Hybrid Inference
    useHybridInference: boolean;

    // A/B Testing
    abTest: {
        sfnRateThreshold: number;
        coverageViolationThreshold: number;
        automationSpikeThreshold: number;
        criticObservationsThreshold: number;
        calibrationDataThreshold: number;
    };

    // Data Collection
    autoValidationEnabled: boolean;

    // YOLO Configuration
    yolo: {
        dataYamlPath: string | undefined;
    };
}

import { env, isDevelopment } from '../../../env';
import { logger } from '@mintenance/shared';

/**
 * Load and validate configuration from environment variables
 */
export function loadBuildingSurveyorConfig(): BuildingSurveyorConfig {
    // Use validated env.OPENAI_API_KEY if available, otherwise fall back to process.env
    // This handles cases where validation might have issues but the key is still present
    const openaiApiKey = env.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    
    // Log warning if OpenAI key is missing in non-development environments
    if (!openaiApiKey && !isDevelopment()) {
        logger.warn('OpenAI API key not configured - AI features will be disabled', {
            service: 'BuildingSurveyorConfig',
        });
    }

    return {
        // API Keys
        openaiApiKey,

        // Timeouts (ms)
        detectorTimeoutMs: Number.parseInt(
            process.env.BUILDING_SURVEYOR_DETECTOR_TIMEOUT_MS || '7000',
            10
        ),
        visionTimeoutMs: Number.parseInt(
            process.env.BUILDING_SURVEYOR_VISION_TIMEOUT_MS || '9000',
            10
        ),

        // Image Processing
        imageBaseArea: Number.parseInt(
            process.env.BUILDING_SURVEYOR_IMAGE_BASE_AREA || '786432', // 1024 * 768
            10
        ),

        // Feature Extraction
        useLearnedFeatures: process.env.USE_LEARNED_FEATURES === 'true',

        // Memory & Learning
        useTitans: process.env.USE_TITANS === 'true',

        // Hybrid Inference (default: false until models are trained)
        useHybridInference: process.env.USE_HYBRID_INFERENCE === 'true',

        // A/B Testing
        abTest: {
            sfnRateThreshold: Number.parseFloat(
                process.env.AB_TEST_SFN_RATE_THRESHOLD || '0.1'
            ),
            coverageViolationThreshold: Number.parseFloat(
                process.env.AB_TEST_COVERAGE_VIOLATION_THRESHOLD || '5.0'
            ),
            automationSpikeThreshold: Number.parseFloat(
                process.env.AB_TEST_AUTOMATION_SPIKE_THRESHOLD || '20.0'
            ),
            criticObservationsThreshold: Number.parseInt(
                process.env.AB_TEST_CRITIC_OBSERVATIONS_THRESHOLD || '100',
                10
            ),
            calibrationDataThreshold: Number.parseInt(
                process.env.AB_TEST_CALIBRATION_DATA_THRESHOLD || '100',
                10
            ),
        },

        // Data Collection
        autoValidationEnabled: process.env.BUILDING_SURVEYOR_AUTO_VALIDATION_ENABLED === 'true',

        // YOLO Configuration
        yolo: {
            dataYamlPath: process.env.YOLO_DATA_YAML_PATH,
        },
    };
}

/**
 * Validate configuration and throw errors for missing required values
 */
export function validateConfig(config: BuildingSurveyorConfig): void {
    const errors: string[] = [];

    // Validate timeouts
    if (config.detectorTimeoutMs <= 0) {
        errors.push('BUILDING_SURVEYOR_DETECTOR_TIMEOUT_MS must be positive');
    }
    if (config.visionTimeoutMs <= 0) {
        errors.push('BUILDING_SURVEYOR_VISION_TIMEOUT_MS must be positive');
    }

    // Validate image base area
    if (config.imageBaseArea <= 0) {
        errors.push('BUILDING_SURVEYOR_IMAGE_BASE_AREA must be positive');
    }

    // Validate A/B test thresholds
    if (config.abTest.sfnRateThreshold < 0 || config.abTest.sfnRateThreshold > 1) {
        errors.push('AB_TEST_SFN_RATE_THRESHOLD must be between 0 and 1');
    }

    if (errors.length > 0) {
        throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }
}

/**
 * Singleton instance of configuration
 */
let configInstance: BuildingSurveyorConfig | null = null;

/**
 * Get the singleton configuration instance
 */
export function getConfig(): BuildingSurveyorConfig {
    if (!configInstance) {
        configInstance = loadBuildingSurveyorConfig();
        validateConfig(configInstance);
    }
    return configInstance;
}

/**
 * Reset configuration (useful for testing)
 */
export function resetConfig(): void {
    configInstance = null;
}
