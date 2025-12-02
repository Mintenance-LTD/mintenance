/**
 * Redis Configuration Validator
 * Validates Redis connection and configuration for production deployment
 */

import { Redis } from '@upstash/redis';
import { logger } from '@mintenance/shared';

interface RedisConfig {
  url: string;
  token: string;
  tls?: boolean;
}

interface ValidationResult {
  success: boolean;
  error?: string;
  details: {
    connection: boolean;
    read: boolean;
    write: boolean;
    delete: boolean;
    ttl: boolean;
  };
}

export class RedisValidator {
  private redis: Redis | null = null;
  private config: RedisConfig;

  constructor(config: RedisConfig) {
    this.config = config;
  }

  /**
   * Validate Redis configuration and connectivity
   */
  async validate(): Promise<ValidationResult> {
    const result: ValidationResult = {
      success: false,
      details: {
        connection: false,
        read: false,
        write: false,
        delete: false,
        ttl: false,
      },
    };

    try {
      // Initialize Redis client
      this.redis = new Redis({
        url: this.config.url,
        token: this.config.token,
      });

      // Test basic connectivity
      await this.testConnection();
      result.details.connection = true;

      // Test write operation
      await this.testWrite();
      result.details.write = true;

      // Test read operation
      await this.testRead();
      result.details.read = true;

      // Test TTL functionality
      await this.testTTL();
      result.details.ttl = true;

      // Test delete operation
      await this.testDelete();
      result.details.delete = true;

      result.success = true;
    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown error';
    }

    return result;
  }

  private async testConnection(): Promise<void> {
    if (!this.redis) throw new Error('Redis client not initialized');
    
    // Test ping
    const pong = await this.redis.ping();
    if (pong !== 'PONG') {
      throw new Error('Redis ping failed');
    }
  }

  private async testWrite(): Promise<void> {
    if (!this.redis) throw new Error('Redis client not initialized');
    
    const testKey = 'redis-validator-test-write';
    const testValue = 'test-value';
    
    await this.redis.set(testKey, testValue);
  }

  private async testRead(): Promise<void> {
    if (!this.redis) throw new Error('Redis client not initialized');
    
    const testKey = 'redis-validator-test-write';
    const value = await this.redis.get(testKey);
    
    if (value !== 'test-value') {
      throw new Error('Redis read test failed');
    }
  }

  private async testTTL(): Promise<void> {
    if (!this.redis) throw new Error('Redis client not initialized');
    
    const testKey = 'redis-validator-test-ttl';
    const testValue = 'ttl-test-value';
    
    // Set with TTL
    await this.redis.setex(testKey, 60, testValue);
    
    // Check TTL
    const ttl = await this.redis.ttl(testKey);
    if (ttl <= 0) {
      throw new Error('Redis TTL test failed');
    }
  }

  private async testDelete(): Promise<void> {
    if (!this.redis) throw new Error('Redis client not initialized');
    
    const testKey = 'redis-validator-test-write';
    await this.redis.del(testKey);
    
    // Verify deletion
    const value = await this.redis.get(testKey);
    if (value !== null) {
      throw new Error('Redis delete test failed');
    }
  }

  /**
   * Clean up test keys
   */
  async cleanup(): Promise<void> {
    if (!this.redis) return;
    
    const testKeys = [
      'redis-validator-test-write',
      'redis-validator-test-ttl',
    ];
    
    await Promise.all(testKeys.map(key => this.redis!.del(key)));
  }
}

/**
 * Validate Redis configuration from environment variables
 */
export async function validateRedisConfig(): Promise<ValidationResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  const tls = process.env.UPSTASH_REDIS_REST_TLS === 'true';

  if (!url || !token) {
    return {
      success: false,
      error: 'Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN environment variables',
      details: {
        connection: false,
        read: false,
        write: false,
        delete: false,
        ttl: false,
      },
    };
  }

  const validator = new RedisValidator({ url, token, tls });
  const result = await validator.validate();
  
  // Clean up test keys
  await validator.cleanup();
  
  return result;
}

/**
 * CLI validation script
 */
export async function runRedisValidation(): Promise<void> {
  logger.info('🔍 Validating Redis configuration...');
  
  const result = await validateRedisConfig();
  
  if (result.success) {
    logger.info('✅ Redis validation successful!');
    logger.info('📊 Test Results:');
    logger.info(`  Connection: ${result.details.connection ? '✅' : '❌'}`);
    logger.info(`  Write: ${result.details.write ? '✅' : '❌'}`);
    logger.info(`  Read: ${result.details.read ? '✅' : '❌'}`);
    logger.info(`  TTL: ${result.details.ttl ? '✅' : '❌'}`);
    logger.info(`  Delete: ${result.details.delete ? '✅' : '❌'}`);
  } else {
    logger.error('❌ Redis validation failed!');
    logger.error(`Error: ${result.error}`);
    logger.info('📊 Test Results:');
    logger.info(`  Connection: ${result.details.connection ? '✅' : '❌'}`);
    logger.info(`  Write: ${result.details.write ? '✅' : '❌'}`);
    logger.info(`  Read: ${result.details.read ? '✅' : '❌'}`);
    logger.info(`  TTL: ${result.details.ttl ? '✅' : '❌'}`);
    logger.info(`  Delete: ${result.details.delete ? '✅' : '❌'}`);
    process.exit(1);
  }
}

// Run validation if called directly
if (require.main === module) {
  runRedisValidation().catch(console.error);
}
