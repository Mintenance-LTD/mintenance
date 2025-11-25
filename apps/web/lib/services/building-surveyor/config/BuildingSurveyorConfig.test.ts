/**
 * Unit Tests for BuildingSurveyorConfig
 * 
 * Tests configuration loading, validation, and access
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
    loadBuildingSurveyorConfig,
    getConfig,
    validateConfig,
    resetConfig,
} from '../BuildingSurveyorConfig';

describe('BuildingSurveyorConfig', () => {
    // Store original env vars
    const originalEnv = { ...process.env };

    beforeEach(() => {
        // Reset config before each test
        resetConfig();
    });

    afterEach(() => {
        // Restore original env vars
        process.env = { ...originalEnv };
        resetConfig();
    });

    describe('loadBuildingSurveyorConfig', () => {
        it('should load configuration with default values', () => {
            const config = loadBuildingSurveyorConfig();

            expect(config.detectorTimeoutMs).toBe(7000);
            expect(config.visionTimeoutMs).toBe(9000);
            expect(config.imageBaseArea).toBe(786432);
            expect(config.useLearnedFeatures).toBe(false);
            expect(config.useTitans).toBe(false);
            expect(config.autoValidationEnabled).toBe(false);
        });

        it('should load configuration from environment variables', () => {
            process.env.OPENAI_API_KEY = 'test-api-key';
            process.env.BUILDING_SURVEYOR_DETECTOR_TIMEOUT_MS = '5000';
            process.env.USE_LEARNED_FEATURES = 'true';
            process.env.USE_TITANS = 'true';

            const config = loadBuildingSurveyorConfig();

            expect(config.openaiApiKey).toBe('test-api-key');
            expect(config.detectorTimeoutMs).toBe(5000);
            expect(config.useLearnedFeatures).toBe(true);
            expect(config.useTitans).toBe(true);
        });

        it('should handle invalid numeric values gracefully', () => {
            process.env.BUILDING_SURVEYOR_DETECTOR_TIMEOUT_MS = 'invalid';

            const config = loadBuildingSurveyorConfig();

            // Should fall back to default
            expect(config.detectorTimeoutMs).toBe(7000);
        });

        it('should load A/B test configuration', () => {
            process.env.AB_TEST_SFN_RATE_THRESHOLD = '0.2';
            process.env.AB_TEST_COVERAGE_VIOLATION_THRESHOLD = '10.0';

            const config = loadBuildingSurveyorConfig();

            expect(config.abTest.sfnRateThreshold).toBe(0.2);
            expect(config.abTest.coverageViolationThreshold).toBe(10.0);
        });
    });

    describe('getConfig', () => {
        it('should return singleton instance', () => {
            const config1 = getConfig();
            const config2 = getConfig();

            expect(config1).toBe(config2);
        });

        it('should load config on first access', () => {
            process.env.OPENAI_API_KEY = 'test-key';

            const config = getConfig();

            expect(config.openaiApiKey).toBe('test-key');
        });
    });

    describe('validateConfig', () => {
        it('should validate valid configuration', () => {
            const config = loadBuildingSurveyorConfig();

            expect(() => validateConfig(config)).not.toThrow();
        });

        it('should validate timeout values', () => {
            const config = loadBuildingSurveyorConfig();
            config.detectorTimeoutMs = -1;

            expect(() => validateConfig(config)).toThrow('Detector timeout must be positive');
        });

        it('should validate vision timeout values', () => {
            const config = loadBuildingSurveyorConfig();
            config.visionTimeoutMs = 0;

            expect(() => validateConfig(config)).toThrow('Vision timeout must be positive');
        });

        it('should validate image base area', () => {
            const config = loadBuildingSurveyorConfig();
            config.imageBaseArea = -100;

            expect(() => validateConfig(config)).toThrow('Image base area must be positive');
        });

        it('should validate A/B test thresholds', () => {
            const config = loadBuildingSurveyorConfig();
            config.abTest.sfnRateThreshold = -0.5;

            expect(() => validateConfig(config)).toThrow('SFN rate threshold must be between 0 and 1');
        });
    });

    describe('resetConfig', () => {
        it('should reset configuration', () => {
            process.env.OPENAI_API_KEY = 'test-key-1';
            const config1 = getConfig();
            expect(config1.openaiApiKey).toBe('test-key-1');

            resetConfig();
            process.env.OPENAI_API_KEY = 'test-key-2';
            const config2 = getConfig();

            expect(config2.openaiApiKey).toBe('test-key-2');
            expect(config1).not.toBe(config2);
        });
    });

    describe('Boolean parsing', () => {
        it('should parse "true" as true', () => {
            process.env.USE_LEARNED_FEATURES = 'true';
            const config = loadBuildingSurveyorConfig();
            expect(config.useLearnedFeatures).toBe(true);
        });

        it('should parse "false" as false', () => {
            process.env.USE_LEARNED_FEATURES = 'false';
            const config = loadBuildingSurveyorConfig();
            expect(config.useLearnedFeatures).toBe(false);
        });

        it('should parse "1" as true', () => {
            process.env.USE_TITANS = '1';
            const config = loadBuildingSurveyorConfig();
            expect(config.useTitans).toBe(true);
        });

        it('should parse empty string as false', () => {
            process.env.USE_LEARNED_FEATURES = '';
            const config = loadBuildingSurveyorConfig();
            expect(config.useLearnedFeatures).toBe(false);
        });
    });
});
