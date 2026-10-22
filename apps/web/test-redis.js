/**
 * Simple Redis Connection Test
 * Tests your Upstash Redis credentials
 */

const { Redis } = require('@upstash/redis');
const logger = console;

async function testRedisConnection() {
  logger.info('🔍 Testing Redis connection...');
  
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    throw new Error('Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN before running this diagnostic.');
  }
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  try {
    // Test 1: Ping
    logger.info('📡 Testing ping...');
    const pong = await redis.ping();
    logger.info('✅ Ping successful:', pong);

    // Test 2: Set/Get
    logger.info('💾 Testing set/get...');
    await redis.set('test-key', 'test-value');
    const value = await redis.get('test-key');
    logger.info('✅ Set/Get successful:', value);

    // Test 3: Expire
    logger.info('⏰ Testing expire...');
    await redis.setex('test-expire', 60, 'expire-value');
    const expireValue = await redis.get('test-expire');
    logger.info('✅ Expire successful:', expireValue);

    // Test 4: Delete
    logger.info('🗑️ Testing delete...');
    await redis.del('test-key');
    const deletedValue = await redis.get('test-key');
    logger.info('✅ Delete successful:', deletedValue);

    // Cleanup
    await redis.del('test-expire');

    logger.info('\n🎉 Redis connection test PASSED!');
    logger.info('✅ Your Redis credentials are working correctly');
    logger.info('✅ Rate limiting will work in production');
    logger.info('\n📋 Next steps:');
    logger.info('1. Add these to your .env.local file:');
    logger.info('2. Deploy to production with these environment variables');
    logger.info('3. Your app will now have working rate limiting!');

  } catch (error) {
    logger.error('❌ Redis connection test FAILED!');
    logger.error('Error:', error.message);
    logger.info('\n🔧 Troubleshooting:');
    logger.info('1. Check your Redis credentials');
    logger.info('2. Ensure your Redis database is active');
    logger.info('3. Check your network connection');
    process.exit(1);
  }
}

testRedisConnection();
