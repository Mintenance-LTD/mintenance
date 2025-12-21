# Redis Setup Guide for Mintenance Production

## Overview
This guide helps you set up Upstash Redis for production rate limiting and caching in your Mintenance application.

## Step 1: Create Upstash Redis Database

### Option A: Via Upstash Console (Recommended)
1. Go to [Upstash Console](https://console.upstash.com/)
2. Sign up/Login with your account
3. Click "Create Database"
4. Choose:
   - **Name**: `mintenance-production`
   - **Region**: Choose closest to your deployment (e.g., `us-east-1` for Vercel)
   - **Type**: `Regional` (for production)
5. Click "Create"

### Option B: Via Upstash CLI
```bash
# Install Upstash CLI
npm install -g @upstash/cli

# Login to Upstash
upstash login

# Create database
upstash create mintenance-production --region us-east-1
```

## Step 2: Get Redis Credentials

After creating the database, you'll get:
- **REST URL**: `https://your-db-name.upstash.io`
- **REST Token**: `your-rest-token`

## Step 3: Configure Environment Variables

### For Vercel Deployment:
1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add these variables:

```bash
# Production Redis Configuration
UPSTASH_REDIS_REST_URL=https://your-db-name.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-rest-token

# Optional: Redis TLS (recommended for production)
UPSTASH_REDIS_REST_TLS=true
```

### For Local Development:
Add to your `.env.local` file:
```bash
# Development Redis (use free tier)
UPSTASH_REDIS_REST_URL=https://your-dev-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-dev-token
```

## Step 4: Verify Configuration

The application will automatically validate Redis configuration on startup via `instrumentation.ts`.

### Manual Verification:
```bash
# Test Redis connection
curl -X POST "https://your-db-name.upstash.io/set/test-key/test-value" \
  -H "Authorization: Bearer your-rest-token"

# Should return: "OK"
```

## Step 5: Rate Limiting Configuration

Your rate limiter is already configured with these limits:

### Webhook Rate Limiting:
- **Window**: 1 minute
- **Max Requests**: 100 per minute
- **Identifier**: Webhook endpoint

### API Rate Limiting:
- **Window**: 1 minute  
- **Max Requests**: 1000 per minute
- **Identifier**: User IP or API key

## Step 6: Monitoring & Alerts

### Upstash Console Monitoring:
1. Go to your database in Upstash Console
2. Check "Metrics" tab for:
   - Request count
   - Error rate
   - Response time
   - Memory usage

### Application Monitoring:
The rate limiter logs all Redis operations. Check your application logs for:
- `[rate-limiter] Redis unavailable in production` - Configuration issue
- `Redis rate limiting failed, falling back to in-memory` - Redis connectivity issue

## Step 7: Backup & Recovery

### Automatic Backups:
Upstash provides automatic daily backups for Regional databases.

### Manual Backup:
```bash
# Export all keys (if needed)
upstash backup mintenance-production
```

## Troubleshooting

### Common Issues:

1. **"Redis unavailable in production" error**
   - Check environment variables are set correctly
   - Verify Redis URL and token are valid
   - Ensure database is active in Upstash console

2. **Rate limiting not working**
   - Check Redis connectivity
   - Verify rate limiter is being called
   - Check application logs for errors

3. **High Redis usage**
   - Monitor key expiration settings
   - Check for memory leaks in rate limiter
   - Consider upgrading to higher tier

### Debug Commands:
```bash
# Check Redis connection
curl -X GET "https://your-db-name.upstash.io/ping" \
  -H "Authorization: Bearer your-rest-token"

# List all keys (be careful in production)
curl -X GET "https://your-db-name.upstash.io/keys/*" \
  -H "Authorization: Bearer your-rest-token"
```

## Cost Optimization

### Free Tier Limits:
- **10,000 requests/day**
- **256MB memory**
- **Single region**

### Production Recommendations:
- **Pro Plan**: $0.2 per 100K requests
- **Regional**: Better performance
- **Monitoring**: Track usage to optimize

## Security Best Practices

1. **Token Security**:
   - Never commit Redis tokens to version control
   - Use environment variables only
   - Rotate tokens regularly

2. **Network Security**:
   - Enable TLS (UPSTASH_REDIS_REST_TLS=true)
   - Use HTTPS endpoints only
   - Restrict access by IP if possible

3. **Data Security**:
   - Don't store sensitive data in Redis
   - Use appropriate key expiration
   - Monitor for unusual access patterns

## Next Steps

After Redis is configured:
1. Deploy your application
2. Monitor Redis usage in Upstash console
3. Set up alerts for high usage
4. Test rate limiting functionality
5. Monitor application logs for Redis errors

## Support

- **Upstash Documentation**: https://docs.upstash.com/
- **Upstash Support**: https://upstash.com/support
- **Mintenance Issues**: Check application logs and GitHub issues
