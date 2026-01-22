import { logger } from '@mintenance/shared';

/**
 * Test script for Building Assessment LRU Cache
 *
 * This demonstrates:
 * 1. Cache hit/miss behavior
 * 2. TTL expiration
 * 3. LRU eviction
 * 4. Cache statistics
 */

const { LRUCache } = require('lru-cache');
const crypto = require('crypto');

// Simulate the cache configuration from route.ts
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_CACHE_SIZE = 200;

const assessmentCache = new LRUCache({
  max: MAX_CACHE_SIZE,
  ttl: CACHE_TTL,
  updateAgeOnGet: true,
  allowStale: false,
});

// Simulate the generateCacheKey function
function generateCacheKey(imageUrls) {
  const hash = crypto
    .createHash('sha256')
    .update(imageUrls.sort().join('|'))
    .digest('hex');
  return `building_assessment:${hash}`;
}

// Mock assessment data
function createMockAssessment(damageType, severity) {
  return {
    damageAssessment: {
      damageType,
      severity,
      confidence: 85,
      location: 'Test Location',
      description: 'Test description',
      detectedItems: ['item1', 'item2'],
    },
    safetyHazards: { hazards: [], hasCriticalHazards: false, overallSafetyScore: 90 },
    compliance: { complianceIssues: [], requiresProfessionalInspection: false, complianceScore: 95 },
    insuranceRisk: { riskFactors: [], riskScore: 20, premiumImpact: 'low', mitigationSuggestions: [] },
    urgency: { urgency: 'monitor', recommendedActionTimeline: '1-2 weeks', reasoning: 'Test', priorityScore: 30 },
  };
}

logger.info('=== Building Assessment Cache Tests ===\n');

// Test 1: Cache Miss → Cache Set → Cache Hit
logger.info('Test 1: Cache Miss → Set → Hit');
const imageUrls1 = ['https://example.com/img1.jpg', 'https://example.com/img2.jpg'];
const cacheKey1 = generateCacheKey(imageUrls1);

logger.info(`  Cache key: ${cacheKey1.substring(0, 50)}...`);

let result = assessmentCache.get(cacheKey1);
logger.info(`  First lookup (cache miss): ${result === undefined ? 'MISS ✓' : 'HIT ✗'}`);

const assessment1 = createMockAssessment('roof_damage', 'early');
assessmentCache.set(cacheKey1, assessment1);
logger.info(`  Stored assessment (damage: ${assessment1.damageAssessment.damageType})`);

result = assessmentCache.get(cacheKey1);
logger.info(`  Second lookup (cache hit): ${result !== undefined ? 'HIT ✓' : 'MISS ✗'}`);
logger.info(`  Retrieved damage type: ${result.damageAssessment.damageType}\n`);

// Test 2: Same images, different order → Same cache key
logger.info('Test 2: Cache Key Consistency (Order Independence)');
const imageUrls2a = ['https://example.com/a.jpg', 'https://example.com/b.jpg'];
const imageUrls2b = ['https://example.com/b.jpg', 'https://example.com/a.jpg']; // Reversed

const key2a = generateCacheKey(imageUrls2a);
const key2b = generateCacheKey(imageUrls2b);

logger.info(`  Key from [a.jpg, b.jpg]: ${key2a.substring(0, 50)}...`);
logger.info(`  Key from [b.jpg, a.jpg]: ${key2b.substring(0, 50)}...`);
logger.info(`  Keys match: ${key2a === key2b ? 'YES ✓' : 'NO ✗'}\n`);

// Test 3: Cache Statistics
logger.info('Test 3: Cache Statistics');
for (let i = 0; i < 45; i++) {
  const urls = [`https://example.com/test${i}.jpg`];
  const key = generateCacheKey(urls);
  assessmentCache.set(key, createMockAssessment(`damage_${i}`, 'early'));
}

logger.info(`  Cache size: ${assessmentCache.size} / ${MAX_CACHE_SIZE}`);
logger.info(`  Utilization: ${Math.round((assessmentCache.size / MAX_CACHE_SIZE) * 100)}%`);
logger.info(`  Estimated calls saved (35% hit rate): ${Math.round(assessmentCache.size * 0.35)}`);
logger.info(`  Estimated cost savings: $${(Math.round(assessmentCache.size * 0.35) * 0.01).toFixed(2)}\n`);

// Test 4: LRU Eviction
logger.info('Test 4: LRU Eviction Policy');
const smallCache = new LRUCache({ max: 3, ttl: CACHE_TTL });

smallCache.set('key1', { id: 1 });
smallCache.set('key2', { id: 2 });
smallCache.set('key3', { id: 3 });
logger.info(`  Added 3 items to cache (max: 3)`);
logger.info(`  Cache size: ${smallCache.size}`);

// Access key1 to make it "recently used"
smallCache.get('key1');
logger.info(`  Accessed key1 (now most recently used)`);

// Add key4, should evict key2 (least recently used)
smallCache.set('key4', { id: 4 });
logger.info(`  Added key4 (should evict least recently used: key2)`);

logger.info(`  key1 exists: ${smallCache.get('key1') !== undefined ? 'YES ✓' : 'NO ✗'}`);
logger.info(`  key2 exists: ${smallCache.get('key2') !== undefined ? 'YES ✗' : 'NO ✓ (evicted)'}`);
logger.info(`  key3 exists: ${smallCache.get('key3') !== undefined ? 'YES ✓' : 'NO ✗'}`);
logger.info(`  key4 exists: ${smallCache.get('key4') !== undefined ? 'YES ✓' : 'NO ✗'}\n`);

// Test 5: TTL Expiration (Short TTL for testing)
logger.info('Test 5: TTL Expiration (with 1s TTL for testing)');
const ttlCache = new LRUCache({ max: 10, ttl: 1000 }); // 1 second TTL

ttlCache.set('short-lived', { data: 'expires soon' });
logger.info(`  Stored item with 1s TTL`);
logger.info(`  Immediate lookup: ${ttlCache.get('short-lived') !== undefined ? 'FOUND ✓' : 'NOT FOUND ✗'}`);

// Wait 1.1 seconds
logger.info(`  Waiting 1.1 seconds...`);
setTimeout(() => {
  logger.info(`  Lookup after TTL: ${ttlCache.get('short-lived') !== undefined ? 'FOUND ✗' : 'NOT FOUND ✓ (expired)'}`);
  logger.info('\n=== All Tests Complete ===');
}, 1100);

// Test 6: Memory Efficiency
logger.info('Test 6: Memory Efficiency');
const assessmentSize = JSON.stringify(createMockAssessment('test', 'early')).length;
const totalMemory = (assessmentCache.size * assessmentSize) / 1024;
logger.info(`  Average assessment size: ${(assessmentSize / 1024).toFixed(2)} KB`);
logger.info(`  Current cache memory: ${totalMemory.toFixed(2)} KB`);
logger.info(`  Peak memory (200 entries): ${((MAX_CACHE_SIZE * assessmentSize) / 1024).toFixed(2)} KB`);
logger.info(`  Memory footprint: ${totalMemory < 1024 ? 'EXCELLENT ✓' : 'HIGH ✗'}\n`);
