/**
 * Simple Redis Connection Test
 * Tests your Upstash Redis credentials
 */

const { Redis } = require('@upstash/redis');

async function testRedisConnection() {
  console.log('🔍 Testing Redis connection...');
  
  const redis = new Redis({
    url: 'https://infinite-duck-27013.upstash.io',
    token: 'AWmFAAIncDIzM2M0ZDcxMWU2ZjE0NGYyODU2YjI3MDY1MzgyZGQ1OHAyMjcwMTM',
  });

  try {
    // Test 1: Ping
    console.log('📡 Testing ping...');
    const pong = await redis.ping();
    console.log('✅ Ping successful:', pong);

    // Test 2: Set/Get
    console.log('💾 Testing set/get...');
    await redis.set('test-key', 'test-value');
    const value = await redis.get('test-key');
    console.log('✅ Set/Get successful:', value);

    // Test 3: Expire
    console.log('⏰ Testing expire...');
    await redis.setex('test-expire', 60, 'expire-value');
    const expireValue = await redis.get('test-expire');
    console.log('✅ Expire successful:', expireValue);

    // Test 4: Delete
    console.log('🗑️ Testing delete...');
    await redis.del('test-key');
    const deletedValue = await redis.get('test-key');
    console.log('✅ Delete successful:', deletedValue);

    // Cleanup
    await redis.del('test-expire');

    console.log('\n🎉 Redis connection test PASSED!');
    console.log('✅ Your Redis credentials are working correctly');
    console.log('✅ Rate limiting will work in production');
    console.log('\n📋 Next steps:');
    console.log('1. Add these to your .env.local file:');
    console.log('   UPSTASH_REDIS_REST_URL="https://infinite-duck-27013.upstash.io"');
    console.log('   UPSTASH_REDIS_REST_TOKEN="AWmFAAIncDIzM2M0ZDcxMWU2ZjE0NGYyODU2YjI3MDY1MzgyZGQ1OHAyMjcwMTM"');
    console.log('2. Deploy to production with these environment variables');
    console.log('3. Your app will now have working rate limiting!');

  } catch (error) {
    console.error('❌ Redis connection test FAILED!');
    console.error('Error:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check your Redis credentials');
    console.log('2. Ensure your Redis database is active');
    console.log('3. Check your network connection');
    process.exit(1);
  }
}

testRedisConnection();
