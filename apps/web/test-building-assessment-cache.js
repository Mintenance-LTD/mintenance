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

console.log('=== Building Assessment Cache Tests ===\n');

// Test 1: Cache Miss → Cache Set → Cache Hit
console.log('Test 1: Cache Miss → Set → Hit');
const imageUrls1 = ['https://example.com/img1.jpg', 'https://example.com/img2.jpg'];
const cacheKey1 = generateCacheKey(imageUrls1);

console.log(`  Cache key: ${cacheKey1.substring(0, 50)}...`);

let result = assessmentCache.get(cacheKey1);
console.log(`  First lookup (cache miss): ${result === undefined ? 'MISS ✓' : 'HIT ✗'}`);

const assessment1 = createMockAssessment('roof_damage', 'early');
assessmentCache.set(cacheKey1, assessment1);
console.log(`  Stored assessment (damage: ${assessment1.damageAssessment.damageType})`);

result = assessmentCache.get(cacheKey1);
console.log(`  Second lookup (cache hit): ${result !== undefined ? 'HIT ✓' : 'MISS ✗'}`);
console.log(`  Retrieved damage type: ${result.damageAssessment.damageType}\n`);

// Test 2: Same images, different order → Same cache key
console.log('Test 2: Cache Key Consistency (Order Independence)');
const imageUrls2a = ['https://example.com/a.jpg', 'https://example.com/b.jpg'];
const imageUrls2b = ['https://example.com/b.jpg', 'https://example.com/a.jpg']; // Reversed

const key2a = generateCacheKey(imageUrls2a);
const key2b = generateCacheKey(imageUrls2b);

console.log(`  Key from [a.jpg, b.jpg]: ${key2a.substring(0, 50)}...`);
console.log(`  Key from [b.jpg, a.jpg]: ${key2b.substring(0, 50)}...`);
console.log(`  Keys match: ${key2a === key2b ? 'YES ✓' : 'NO ✗'}\n`);

// Test 3: Cache Statistics
console.log('Test 3: Cache Statistics');
for (let i = 0; i < 45; i++) {
  const urls = [`https://example.com/test${i}.jpg`];
  const key = generateCacheKey(urls);
  assessmentCache.set(key, createMockAssessment(`damage_${i}`, 'early'));
}

console.log(`  Cache size: ${assessmentCache.size} / ${MAX_CACHE_SIZE}`);
console.log(`  Utilization: ${Math.round((assessmentCache.size / MAX_CACHE_SIZE) * 100)}%`);
console.log(`  Estimated calls saved (35% hit rate): ${Math.round(assessmentCache.size * 0.35)}`);
console.log(`  Estimated cost savings: $${(Math.round(assessmentCache.size * 0.35) * 0.01).toFixed(2)}\n`);

// Test 4: LRU Eviction
console.log('Test 4: LRU Eviction Policy');
const smallCache = new LRUCache({ max: 3, ttl: CACHE_TTL });

smallCache.set('key1', { id: 1 });
smallCache.set('key2', { id: 2 });
smallCache.set('key3', { id: 3 });
console.log(`  Added 3 items to cache (max: 3)`);
console.log(`  Cache size: ${smallCache.size}`);

// Access key1 to make it "recently used"
smallCache.get('key1');
console.log(`  Accessed key1 (now most recently used)`);

// Add key4, should evict key2 (least recently used)
smallCache.set('key4', { id: 4 });
console.log(`  Added key4 (should evict least recently used: key2)`);

console.log(`  key1 exists: ${smallCache.get('key1') !== undefined ? 'YES ✓' : 'NO ✗'}`);
console.log(`  key2 exists: ${smallCache.get('key2') !== undefined ? 'YES ✗' : 'NO ✓ (evicted)'}`);
console.log(`  key3 exists: ${smallCache.get('key3') !== undefined ? 'YES ✓' : 'NO ✗'}`);
console.log(`  key4 exists: ${smallCache.get('key4') !== undefined ? 'YES ✓' : 'NO ✗'}\n`);

// Test 5: TTL Expiration (Short TTL for testing)
console.log('Test 5: TTL Expiration (with 1s TTL for testing)');
const ttlCache = new LRUCache({ max: 10, ttl: 1000 }); // 1 second TTL

ttlCache.set('short-lived', { data: 'expires soon' });
console.log(`  Stored item with 1s TTL`);
console.log(`  Immediate lookup: ${ttlCache.get('short-lived') !== undefined ? 'FOUND ✓' : 'NOT FOUND ✗'}`);

// Wait 1.1 seconds
console.log(`  Waiting 1.1 seconds...`);
setTimeout(() => {
  console.log(`  Lookup after TTL: ${ttlCache.get('short-lived') !== undefined ? 'FOUND ✗' : 'NOT FOUND ✓ (expired)'}`);
  console.log('\n=== All Tests Complete ===');
}, 1100);

// Test 6: Memory Efficiency
console.log('Test 6: Memory Efficiency');
const assessmentSize = JSON.stringify(createMockAssessment('test', 'early')).length;
const totalMemory = (assessmentCache.size * assessmentSize) / 1024;
console.log(`  Average assessment size: ${(assessmentSize / 1024).toFixed(2)} KB`);
console.log(`  Current cache memory: ${totalMemory.toFixed(2)} KB`);
console.log(`  Peak memory (200 entries): ${((MAX_CACHE_SIZE * assessmentSize) / 1024).toFixed(2)} KB`);
console.log(`  Memory footprint: ${totalMemory < 1024 ? 'EXCELLENT ✓' : 'HIGH ✗'}\n`);
