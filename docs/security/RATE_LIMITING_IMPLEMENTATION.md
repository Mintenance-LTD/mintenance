# Rate Limiting Implementation

## Overview

A comprehensive, centralized rate limiting solution has been implemented for the Mintenance platform to protect all API endpoints from abuse, DDoS attacks, and ensure fair resource usage.

## Key Features

### 1. **Global Coverage**
- ✅ ALL `/api/` routes are now protected by rate limiting
- ✅ Automatic application via middleware (no per-route configuration needed)
- ✅ Consistent rate limit headers across all endpoints
- ✅ Special handling for webhooks, health checks, and public endpoints

### 2. **Tiered Rate Limits**
Different limits based on user authentication status:
- **Anonymous**: Strictest limits for unauthenticated users
- **Authenticated**: Standard limits for logged-in users
- **Premium**: Higher limits for premium subscribers
- **Admin**: Highest limits for administrative users

### 3. **Intelligent Configuration**
Rate limits are configured based on endpoint sensitivity:
- **STRICT**: Auth, payments, MFA (5-10 requests/window)
- **MODERATE**: Profile updates, messages (30-100 requests/window)
- **RELAXED**: Read operations, search (100-500 requests/window)
- **EXEMPT**: Health checks, metrics (1000+ requests/window)

### 4. **Security Features**
- **DDoS Protection**: Automatic detection and blocking of attack patterns
- **IP Blacklisting**: Critical violations result in automatic IP blocks
- **Security Event Logging**: All violations logged to database for analysis
- **Fail-Closed**: In production, if rate limiting fails, requests are denied

## Implementation Details

### Files Created/Modified

#### 1. **Core Rate Limiter**
`apps/web/lib/rate-limiter-enhanced.ts`
- Sliding window algorithm for accurate rate limiting
- Multiple storage backend support (Redis/Upstash/In-Memory)
- Automatic failover and fallback mechanisms
- DDoS detection and prevention

#### 2. **Configuration**
`apps/web/lib/constants/rate-limits.ts`
- Centralized configuration for all endpoints
- Path pattern matching with wildcard support
- Tier-based limit definitions
- Bypass rules for monitoring and internal services

#### 3. **Middleware Integration**
`apps/web/middleware.ts`
- Global rate limiting for all API routes
- Automatic tier detection from JWT
- Rate limit headers added to all responses
- 429 responses for exceeded limits

#### 4. **Database Schema**
`supabase/migrations/20251222_add_security_events_table.sql`
- `security_events` table for violation logging
- `ip_blacklist` table for blocking malicious IPs
- `rate_limit_overrides` for custom limits
- RLS policies restricting access to admins

#### 5. **API Helpers**
`apps/web/lib/api/with-rate-limit.ts`
- Helper functions for consistent API responses
- Automatic rate limit header injection
- Error response standardization

#### 6. **Testing**
`apps/web/__tests__/rate-limiting.test.ts`
- Comprehensive test coverage
- Configuration validation
- Tier detection tests
- Bypass rule verification

## Configuration Examples

### Authentication Endpoints (Strict)
```typescript
'/api/auth/login': {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: {
    anonymous: 5,      // 5 attempts per 15 min
    authenticated: 10, // 10 attempts per 15 min
    admin: 20,        // 20 attempts per 15 min
    premium: 15       // 15 attempts per 15 min
  }
}
```

### Payment Endpoints (No Anonymous Access)
```typescript
'/api/payments/*': {
  windowMs: 60 * 1000, // 1 minute
  max: {
    anonymous: 0,      // No anonymous payments
    authenticated: 10, // 10 requests per minute
    admin: 50,
    premium: 20
  }
}
```

### AI Endpoints (Resource-Intensive)
```typescript
'/api/ai/search': {
  windowMs: 60 * 1000, // 1 minute
  max: {
    anonymous: 5,      // Very limited for anonymous
    authenticated: 20, // Moderate for authenticated
    admin: 100,
    premium: 40       // Higher for premium users
  }
}
```

## Environment Variables

Add to your `.env` file:

```env
# Upstash Redis (Recommended for production)
UPSTASH_REDIS_REST_URL=https://your-redis-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-upstash-redis-token

# Rate Limit Configuration
RATE_LIMIT_WHITELIST_IPS=192.168.1.1,10.0.0.1  # Office IPs
INTERNAL_SERVICE_TOKENS=secret-token-1,secret-token-2  # For service-to-service
```

## HTTP Headers

All rate-limited responses include these headers:

### Modern Headers (RFC Draft)
- `RateLimit-Limit`: Maximum requests allowed
- `RateLimit-Remaining`: Requests remaining in window
- `RateLimit-Reset`: When the window resets (ISO 8601)
- `RateLimit-Policy`: Policy details

### Legacy Headers (Compatibility)
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Unix timestamp of reset

### When Rate Limited
- `Retry-After`: Seconds to wait before retrying

## Security Event Logging

All rate limit violations are logged to the `security_events` table:

```sql
-- Example query to view recent violations
SELECT
  event_type,
  severity,
  ip_address,
  path,
  rate_limit_attempts,
  created_at
FROM security_events
WHERE event_type = 'rate_limit_exceeded'
ORDER BY created_at DESC
LIMIT 100;
```

## Bypass Rules

Certain requests can bypass rate limiting:

### 1. Health Check Services
User agents from monitoring services:
- UptimeRobot
- Pingdom
- DataDog
- NewRelic

### 2. Whitelisted IPs
Configure via `RATE_LIMIT_WHITELIST_IPS` environment variable

### 3. Internal Services
Use `x-service-token` header with configured tokens

## Testing Rate Limits

### Manual Testing
```bash
# Test login rate limit (5 attempts for anonymous)
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"test"}' \
    -w "\nStatus: %{http_code}\n"
done
```

### Check Headers
```bash
curl -I http://localhost:3000/api/contractors
# Look for RateLimit-* headers
```

### Run Tests
```bash
npm test -- rate-limiting.test.ts
```

## Monitoring & Alerts

### Dashboard Queries

1. **Top Rate Limited IPs**:
```sql
SELECT
  ip_address,
  COUNT(*) as violation_count,
  MAX(rate_limit_attempts) as max_attempts
FROM security_events
WHERE event_type = 'rate_limit_exceeded'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY ip_address
ORDER BY violation_count DESC
LIMIT 20;
```

2. **Endpoint Abuse Detection**:
```sql
SELECT
  path,
  COUNT(*) as hit_count,
  COUNT(DISTINCT ip_address) as unique_ips
FROM security_events
WHERE event_type = 'rate_limit_exceeded'
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY path
ORDER BY hit_count DESC;
```

3. **Potential DDoS Detection**:
```sql
SELECT *
FROM security_events
WHERE event_type = 'rate_limit_ddos'
  AND severity = 'CRITICAL'
  AND created_at > NOW() - INTERVAL '1 hour';
```

## Best Practices

### For Developers

1. **Don't Skip Rate Limiting**: Never bypass rate limiting without security review
2. **Use Appropriate Tiers**: Ensure endpoints have correct tier configurations
3. **Monitor Violations**: Regularly check security events for patterns
4. **Test Limits**: Always test rate limits when adding new endpoints

### For API Consumers

1. **Respect Rate Limits**: Check headers and implement backoff
2. **Use Authentication**: Authenticated users get higher limits
3. **Cache Responses**: Reduce unnecessary API calls
4. **Handle 429 Responses**: Implement proper retry logic with exponential backoff

## Troubleshooting

### Common Issues

1. **"Service Unavailable" Errors**
   - Check Redis/Upstash connection
   - Verify environment variables are set
   - Check logs for initialization errors

2. **Too Restrictive Limits**
   - Review configuration in `rate-limits.ts`
   - Consider user tier upgrades
   - Check for custom overrides in database

3. **Headers Not Appearing**
   - Ensure middleware is running
   - Check that route matches `/api/*` pattern
   - Verify response is going through middleware

## Future Enhancements

1. **Distributed Rate Limiting**: Multi-region Redis clusters
2. **Machine Learning**: Adaptive limits based on usage patterns
3. **GraphQL Support**: Rate limiting for GraphQL queries
4. **Cost-Based Limiting**: Limits based on computational cost
5. **User Dashboards**: Self-service rate limit monitoring

## Security Benefits

✅ **DDoS Protection**: Automatic detection and mitigation
✅ **Brute Force Prevention**: Strict auth endpoint limits
✅ **Resource Protection**: Prevents API abuse
✅ **Fair Usage**: Ensures equitable access for all users
✅ **Audit Trail**: Complete logging of security events
✅ **Compliance**: Helps meet security compliance requirements

## Conclusion

This comprehensive rate limiting solution provides robust protection for all API endpoints while maintaining good user experience through tiered limits and intelligent configuration. The system is designed to scale with the platform and adapt to evolving security threats.