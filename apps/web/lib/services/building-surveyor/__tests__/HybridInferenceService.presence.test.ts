// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
/**
 * Tests for SAM3Service integration points
 *
 * Tests the SAM3 service's core methods that would feed into the
 * HybridInferenceService when presence detection is enabled.
 * Current SAM3 API: healthCheck, segment, segmentDamageTypes, shouldUseSAM3
 *
 * Key behaviors from implementation:
 * - segment() returns null (not throws) on failure, circuit breaker open, or rollout disabled
 * - segmentDamageTypes() returns null (not throws) on failure
 * - healthCheck() caches results and has circuit breaker logic
 * - shouldUseSAM3() checks SAM3_ROLLOUT_PERCENTAGE env var (default 0 = disabled)
 */

import { SAM3Service } from '../SAM3Service';
import { logger } from '@mintenance/shared';

// Mock dependencies
vi.mock('@mintenance/shared', () => ({
    logger: {
        info: vi.fn(),
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}));

// Save original env
const originalEnv = { ...process.env };

describe('SAM3Service Integration Points', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset env vars
        process.env.SAM3_ROLLOUT_PERCENTAGE = '0';
        process.env.SAM3_SERVICE_URL = 'http://localhost:8001';

        // Reset SAM3Service static state (circuit breaker, cache) by accessing private fields
        // We use Object.assign on the class to reset internal state
        (SAM3Service as any).failureCount = 0;
        (SAM3Service as any).lastFailureTime = 0;
        (SAM3Service as any).healthCheckCache = null;
    });

    afterEach(() => {
        process.env = { ...originalEnv };
    });

    describe('Health Check', () => {
        it('should return true for healthy service', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: () => Promise.resolve({ status: 'healthy', model_loaded: true, service: 'sam3' }),
            } as Response);

            const result = await SAM3Service.healthCheck();
            expect(result).toBe(true);
            expect(typeof result).toBe('boolean');
        });

        it('should return false when model is not loaded', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: () => Promise.resolve({ status: 'healthy', model_loaded: false, service: 'sam3' }),
            } as Response);

            const result = await SAM3Service.healthCheck();
            expect(result).toBe(false);
        });

        it('should handle health check failure gracefully', async () => {
            global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

            const result = await SAM3Service.healthCheck();
            expect(result).toBe(false);
        });

        it('should handle non-200 health check response', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 503,
                json: () => Promise.resolve({ error: 'Service unavailable' }),
            } as Response);

            const result = await SAM3Service.healthCheck();
            expect(result).toBe(false);
        });
    });

    describe('shouldUseSAM3', () => {
        it('should return false when rollout is 0', () => {
            process.env.SAM3_ROLLOUT_PERCENTAGE = '0';
            const result = SAM3Service.shouldUseSAM3();
            expect(result).toBe(false);
        });

        it('should return true when rollout is 100', () => {
            process.env.SAM3_ROLLOUT_PERCENTAGE = '100';
            const result = SAM3Service.shouldUseSAM3();
            expect(result).toBe(true);
        });

        it('should return boolean for SAM3 availability check', () => {
            const result = SAM3Service.shouldUseSAM3();
            expect(typeof result).toBe('boolean');
        });
    });

    describe('Segmentation', () => {
        it('should return null when rollout is disabled', async () => {
            process.env.SAM3_ROLLOUT_PERCENTAGE = '0';

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: () => Promise.resolve({
                    success: true,
                    masks: [],
                    boxes: [],
                    scores: [],
                    num_instances: 0,
                }),
            } as Response);

            const result = await SAM3Service.segment(
                'https://example.com/image.jpg',
                'water damage'
            );

            // segment() returns null when shouldUseSAM3() returns false
            expect(result).toBeNull();
        });

        it('should segment image when rollout is enabled', async () => {
            process.env.SAM3_ROLLOUT_PERCENTAGE = '100';

            const segmentResponse = {
                success: true,
                masks: [],
                boxes: [],
                scores: [],
                num_instances: 0,
            };

            // First call: imageUrlToBase64 fetches the image
            // Second call: segment API call
            global.fetch = vi.fn()
                .mockResolvedValueOnce({
                    ok: true,
                    arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
                } as Response)
                .mockResolvedValueOnce({
                    ok: true,
                    status: 200,
                    json: () => Promise.resolve(segmentResponse),
                } as Response);

            const result = await SAM3Service.segment(
                'https://example.com/image.jpg',
                'water damage'
            );

            expect(result).toBeDefined();
            expect(result).not.toBeNull();
            expect(result!.success).toBe(true);
        });

        it('should return null on segment failure (not throw)', async () => {
            process.env.SAM3_ROLLOUT_PERCENTAGE = '100';

            // All fetch calls fail - imageUrlToBase64 will throw, caught by segment()
            global.fetch = vi.fn().mockRejectedValue(new Error('SAM3 service error'));

            const result = await SAM3Service.segment('https://example.com/image.jpg', 'damage');

            // segment() catches errors and returns null
            expect(result).toBeNull();
        });
    });

    describe('Damage Type Segmentation', () => {
        it('should return null on segmentDamageTypes failure (not throw)', async () => {
            // segmentDamageTypes calls imageUrlToBase64 first, which will fail
            global.fetch = vi.fn().mockRejectedValue(new Error('Service unavailable'));

            const result = await SAM3Service.segmentDamageTypes('https://example.com/image.jpg', ['crack']);

            // segmentDamageTypes() catches errors and returns null
            expect(result).toBeNull();
            expect(logger.error).toHaveBeenCalled();
        });

        it('should segment multiple damage types successfully', async () => {
            const damageTypeResponse = {
                success: true,
                damage_types: {
                    'water_damage': {
                        masks: [],
                        boxes: [],
                        scores: [],
                        num_instances: 0,
                    },
                    'crack': {
                        masks: [],
                        boxes: [[10, 20, 50, 30]],
                        scores: [0.85],
                        num_instances: 1,
                    },
                },
            };

            // First call: imageUrlToBase64, second call: API
            global.fetch = vi.fn()
                .mockResolvedValueOnce({
                    ok: true,
                    arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
                } as Response)
                .mockResolvedValueOnce({
                    ok: true,
                    status: 200,
                    json: () => Promise.resolve(damageTypeResponse),
                } as Response);

            const result = await SAM3Service.segmentDamageTypes(
                'https://example.com/image.jpg',
                ['water_damage', 'crack']
            );

            expect(result).toBeDefined();
            expect(result).not.toBeNull();
            expect(result!.success).toBe(true);
            expect(result!.damage_types).toBeDefined();
        });
    });

    describe('Circuit Breaker Behavior', () => {
        it('should handle repeated failures gracefully', async () => {
            global.fetch = vi.fn().mockRejectedValue(new Error('Connection failed'));

            // Multiple sequential health checks should not crash
            const result1 = await SAM3Service.healthCheck();
            // Clear cache so next call actually calls fetch
            (SAM3Service as any).healthCheckCache = null;
            const result2 = await SAM3Service.healthCheck();
            (SAM3Service as any).healthCheckCache = null;
            const result3 = await SAM3Service.healthCheck();

            // All should return false due to failures
            expect(result1).toBe(false);
            expect(result2).toBe(false);
            expect(result3).toBe(false);
        });

        it('should skip health check when circuit breaker is open', async () => {
            // Manually set failure count above threshold
            (SAM3Service as any).failureCount = 5;
            (SAM3Service as any).lastFailureTime = Date.now();

            global.fetch = vi.fn();

            const result = await SAM3Service.healthCheck();
            expect(result).toBe(false);

            // fetch should NOT have been called because circuit breaker is open
            expect(global.fetch).not.toHaveBeenCalled();
            expect(logger.warn).toHaveBeenCalledWith(
                expect.stringContaining('circuit breaker'),
                expect.any(Object)
            );
        });

        it('should skip segment when circuit breaker is open', async () => {
            process.env.SAM3_ROLLOUT_PERCENTAGE = '100';
            (SAM3Service as any).failureCount = 5;
            (SAM3Service as any).lastFailureTime = Date.now();

            global.fetch = vi.fn();

            const result = await SAM3Service.segment('https://example.com/img.jpg', 'damage');
            expect(result).toBeNull();
            expect(global.fetch).not.toHaveBeenCalled();
        });
    });
});
