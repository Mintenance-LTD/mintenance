// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
/**
 * SAM3 Presence Detection Integration Tests
 *
 * Tests the SAM3Service's damage type segmentation as a presence detection mechanism.
 * Validates SAM3Service health checks, segmentDamageTypes, circuit breaker, and
 * integration with HybridInferenceService routing decisions.
 */

import { SAM3Service } from '../SAM3Service';
import type { DamageTypeSegmentation, SAM3SegmentationResponse } from '../SAM3Service';

// Mock external dependencies
vi.mock('@mintenance/shared', () => ({
    logger: {
        info: vi.fn(),
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('SAM3 Presence Detection Integration', () => {
    let originalEnv: NodeJS.ProcessEnv;

    beforeAll(() => {
        originalEnv = { ...process.env };
        // Enable SAM3 for tests
        process.env.SAM3_SERVICE_URL = 'http://localhost:8001';
        process.env.SAM3_ROLLOUT_PERCENTAGE = '100';
        process.env.SAM3_TIMEOUT_MS = '30000';
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    beforeEach(() => {
        vi.clearAllMocks();
        // Reset SAM3Service internal state (circuit breaker, cache)
        // Access private statics via bracket notation for testing
        (SAM3Service as unknown as Record<string, unknown>)['failureCount'] = 0;
        (SAM3Service as unknown as Record<string, unknown>)['lastFailureTime'] = 0;
        (SAM3Service as unknown as Record<string, unknown>)['healthCheckCache'] = null;
    });

    describe('Damage Detection via segmentDamageTypes', () => {
        it('should detect no damage when all scores are zero', async () => {
            // Mock image fetch (for imageUrlToBase64)
            mockFetch.mockImplementation(async (url: string) => {
                if (typeof url === 'string' && url.includes('localhost:8001')) {
                    // SAM3 service endpoint
                    if (url.includes('/segment-damage-types')) {
                        return {
                            ok: true,
                            json: async () => ({
                                success: true,
                                damage_types: {
                                    'water damage': {
                                        masks: [],
                                        boxes: [],
                                        scores: [],
                                        num_instances: 0,
                                    },
                                    'crack': {
                                        masks: [],
                                        boxes: [],
                                        scores: [],
                                        num_instances: 0,
                                    },
                                    'rot': {
                                        masks: [],
                                        boxes: [],
                                        scores: [],
                                        num_instances: 0,
                                    },
                                    'mold': {
                                        masks: [],
                                        boxes: [],
                                        scores: [],
                                        num_instances: 0,
                                    },
                                },
                            } satisfies DamageTypeSegmentation),
                        };
                    }
                }
                // Image URL fetch
                return {
                    ok: true,
                    arrayBuffer: async () => new ArrayBuffer(100),
                };
            });

            const result = await SAM3Service.segmentDamageTypes(
                'https://test.com/undamaged/clean-wall.jpg',
                ['water damage', 'crack', 'rot', 'mold']
            );

            expect(result).not.toBeNull();
            expect(result!.success).toBe(true);

            // All damage types should have zero instances
            for (const [, segmentation] of Object.entries(result!.damage_types)) {
                expect(segmentation.num_instances).toBe(0);
            }
        });

        it('should detect damage when segmentation finds instances', async () => {
            mockFetch.mockImplementation(async (url: string) => {
                if (typeof url === 'string' && url.includes('localhost:8001')) {
                    if (url.includes('/segment-damage-types')) {
                        return {
                            ok: true,
                            json: async () => ({
                                success: true,
                                damage_types: {
                                    'water damage': {
                                        masks: [[[0, 1, 1], [1, 1, 1]]],
                                        boxes: [[100, 150, 200, 150]],
                                        scores: [0.92],
                                        num_instances: 1,
                                    },
                                    'crack': {
                                        masks: [[[1, 0, 0], [1, 1, 0]]],
                                        boxes: [[50, 75, 100, 80]],
                                        scores: [0.85],
                                        num_instances: 1,
                                    },
                                    'rot': {
                                        masks: [],
                                        boxes: [],
                                        scores: [],
                                        num_instances: 0,
                                    },
                                    'mold': {
                                        masks: [],
                                        boxes: [],
                                        scores: [],
                                        num_instances: 0,
                                    },
                                },
                            } satisfies DamageTypeSegmentation),
                        };
                    }
                }
                return {
                    ok: true,
                    arrayBuffer: async () => new ArrayBuffer(100),
                };
            });

            const result = await SAM3Service.segmentDamageTypes(
                'https://test.com/damaged/water-damage.jpg',
                ['water damage', 'crack', 'rot', 'mold']
            );

            expect(result).not.toBeNull();
            expect(result!.success).toBe(true);

            // Water damage detected
            expect(result!.damage_types['water damage'].num_instances).toBe(1);
            expect(result!.damage_types['water damage'].scores[0]).toBe(0.92);

            // Crack detected
            expect(result!.damage_types['crack'].num_instances).toBe(1);
            expect(result!.damage_types['crack'].scores[0]).toBe(0.85);

            // No rot or mold
            expect(result!.damage_types['rot'].num_instances).toBe(0);
            expect(result!.damage_types['mold'].num_instances).toBe(0);
        });
    });

    describe('Health Check and Availability', () => {
        it('should return true when SAM3 service is healthy', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    status: 'healthy',
                    model_loaded: true,
                    service: 'sam3-segmentation',
                }),
            });

            const isHealthy = await SAM3Service.healthCheck();
            expect(isHealthy).toBe(true);
        });

        it('should return false when SAM3 service is not healthy', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    status: 'unhealthy',
                    model_loaded: false,
                    service: 'sam3-segmentation',
                }),
            });

            const isHealthy = await SAM3Service.healthCheck();
            expect(isHealthy).toBe(false);
        });

        it('should return false when health check request fails', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

            const isHealthy = await SAM3Service.healthCheck();
            expect(isHealthy).toBe(false);
        });

        it('should cache health check results', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    status: 'healthy',
                    model_loaded: true,
                    service: 'sam3-segmentation',
                }),
            });

            // First call should hit the API
            const result1 = await SAM3Service.healthCheck();
            expect(result1).toBe(true);
            expect(mockFetch).toHaveBeenCalledTimes(1);

            // Second call should use cache
            const result2 = await SAM3Service.healthCheck();
            expect(result2).toBe(true);
            expect(mockFetch).toHaveBeenCalledTimes(1); // No additional fetch
        });
    });

    describe('Circuit Breaker', () => {
        it('should open circuit breaker after repeated failures', async () => {
            // Simulate 3 consecutive failures to trip the circuit breaker
            mockFetch.mockRejectedValue(new Error('Connection refused'));

            // Three health check failures
            await SAM3Service.healthCheck();
            // Reset cache between calls to force new fetch attempts
            (SAM3Service as unknown as Record<string, unknown>)['healthCheckCache'] = null;
            await SAM3Service.healthCheck();
            (SAM3Service as unknown as Record<string, unknown>)['healthCheckCache'] = null;
            await SAM3Service.healthCheck();

            // Now the circuit breaker should be open -- next call should not even try fetch
            mockFetch.mockClear();
            const result = await SAM3Service.healthCheck();
            expect(result).toBe(false);
            // Circuit breaker should prevent the fetch call
            expect(mockFetch).not.toHaveBeenCalled();
        });
    });

    describe('Rollout Percentage', () => {
        it('should skip segmentation when rollout is 0%', async () => {
            process.env.SAM3_ROLLOUT_PERCENTAGE = '0';

            const result = await SAM3Service.segment(
                'https://test.com/test.jpg',
                'water damage'
            );

            expect(result).toBeNull();
            // Restore rollout
            process.env.SAM3_ROLLOUT_PERCENTAGE = '100';
        });

        it('should proceed with segmentation when rollout is 100%', async () => {
            process.env.SAM3_ROLLOUT_PERCENTAGE = '100';

            mockFetch.mockImplementation(async (url: string) => {
                if (typeof url === 'string' && url.includes('localhost:8001') && url.includes('/segment')) {
                    return {
                        ok: true,
                        json: async () => ({
                            success: true,
                            masks: [[[1, 0], [0, 1]]],
                            boxes: [[10, 20, 30, 40]],
                            scores: [0.88],
                            num_instances: 1,
                        } satisfies SAM3SegmentationResponse),
                    };
                }
                return {
                    ok: true,
                    arrayBuffer: async () => new ArrayBuffer(100),
                };
            });

            const result = await SAM3Service.segment(
                'https://test.com/test.jpg',
                'water damage',
                0.5
            );

            expect(result).not.toBeNull();
            expect(result!.success).toBe(true);
            expect(result!.num_instances).toBe(1);
        });
    });

    describe('Error Handling', () => {
        it('should return null when segmentation API returns error', async () => {
            process.env.SAM3_ROLLOUT_PERCENTAGE = '100';

            mockFetch.mockImplementation(async (url: string) => {
                if (typeof url === 'string' && url.includes('localhost:8001') && url.includes('/segment')) {
                    return {
                        ok: false,
                        statusText: 'Internal Server Error',
                        json: async () => ({ detail: 'Model inference failed' }),
                    };
                }
                return {
                    ok: true,
                    arrayBuffer: async () => new ArrayBuffer(100),
                };
            });

            const result = await SAM3Service.segment(
                'https://test.com/test.jpg',
                'water damage'
            );

            expect(result).toBeNull();
        });

        it('should return null for segmentDamageTypes when API fails', async () => {
            mockFetch.mockImplementation(async (url: string) => {
                if (typeof url === 'string' && url.includes('localhost:8001')) {
                    return {
                        ok: false,
                        statusText: 'Service Unavailable',
                        json: async () => ({ detail: 'Service overloaded' }),
                    };
                }
                return {
                    ok: true,
                    arrayBuffer: async () => new ArrayBuffer(100),
                };
            });

            const result = await SAM3Service.segmentDamageTypes(
                'https://test.com/test.jpg',
                ['water damage', 'crack']
            );

            expect(result).toBeNull();
        });

        it('should handle image download failure gracefully', async () => {
            process.env.SAM3_ROLLOUT_PERCENTAGE = '100';

            mockFetch.mockImplementation(async (url: string) => {
                if (typeof url === 'string' && !url.includes('localhost:8001')) {
                    // Image download fails
                    return {
                        ok: false,
                        statusText: 'Not Found',
                    };
                }
                return {
                    ok: true,
                    json: async () => ({ success: true }),
                };
            });

            const result = await SAM3Service.segment(
                'https://test.com/missing-image.jpg',
                'water damage'
            );

            expect(result).toBeNull();
        });
    });
});
