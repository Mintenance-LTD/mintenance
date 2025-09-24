# Security Architecture Overview

This document outlines the security improvements implemented and the architectural decisions for this hybrid React Native/Next.js application.

## Architecture Decision

This repository contains both a **React Native mobile app** and a **Next.js web app**:

- **Mobile App (React Native/Expo)**: Uses Supabase authentication with client SDK
- **Web App (Next.js)**: Uses custom JWT authentication with server-side API routes

## Critical Security Fixes Implemented

### ✅ 1. Real Authentication System
- **REPLACED** mock authentication with proper database integration
- **IMPLEMENTED** bcrypt password hashing with salt rounds of 12
- **INTEGRATED** with Supabase database for user storage
- **ADDED** comprehensive input validation and sanitization

### ✅ 2. Strong JWT Secret Management
- **ENFORCED** strong JWT_SECRET requirement (minimum 32 characters)
- **IMPLEMENTED** fail-fast configuration validation
- **REMOVED** default/weak secret values
- **ADDED** environment variable validation at startup

### ✅ 3. Rate Limiting Protection
- **IMPLEMENTED** sophisticated rate limiting for auth endpoints
- **CONFIGURED** 5 attempts per 15 minutes for login
- **ADDED** 30-minute blocking after limit exceeded
- **INCLUDED** IP and device-based tracking
- **IMPLEMENTED** progressive penalties for abuse

### ✅ 4. Secure Cookie Configuration
- **ENFORCED** `secure: true` in production
- **CONFIGURED** `sameSite: 'strict'` in production, `'lax'` in development
- **MAINTAINED** `httpOnly: true` for all auth cookies
- **ADDED** proper cookie expiration (24 hours)

### ✅ 5. Unified Authentication Manager
- **CREATED** centralized AuthManager class for web authentication
- **IMPLEMENTED** consistent error handling and validation
- **ADDED** comprehensive logging and monitoring
- **INCLUDED** user-safe error messages (no internal details exposed)

## Security Features

### Password Security
- **Minimum Requirements**: 8 characters, uppercase, lowercase, numbers, special characters
- **Hashing**: bcrypt with 12 salt rounds
- **Storage**: Only password hashes stored, never plaintext
- **Validation**: Server-side password strength enforcement

### Rate Limiting
```typescript
// Login endpoint protection
- 5 attempts per 15 minutes per IP/device
- 30-minute lockout after exceeded limits
- Successful logins don't count against limit
- Progressive penalties for repeated abuse

// General API protection
- 100 requests per minute per IP/device
- 5-minute cooldown after exceeded limits
- Comprehensive request tracking
```

### JWT Security
- **Strong Secret**: Minimum 32 characters, cryptographically secure
- **Short Expiration**: 24 hours (configurable)
- **Proper Verification**: Full signature validation
- **Secure Headers**: Proper algorithm specification (HS256)

### Input Validation
- **Email**: Format validation with regex
- **Passwords**: Strength requirements enforced
- **Roles**: Whitelist validation (homeowner|contractor|admin)
- **Names**: Required field validation and sanitization
- **SQL Injection**: Parameterized queries via Supabase ORM

### Error Handling
- **No Information Disclosure**: Generic error messages to client
- **Detailed Logging**: Full error details in server logs only
- **Consistent Responses**: Uniform error format across endpoints
- **Timing Attack Prevention**: Consistent response times for auth failures

## Architecture Recommendations

### Current State
- **Mixed Platform Repository**: Contains both mobile and web apps
- **Shared Components**: Some UI components used by both platforms
- **Separate Authentication**: Mobile uses Supabase, web uses custom JWT

### Recommended Improvements
1. **Consider Monorepo Structure**:
   ```
   apps/
   ├── mobile/          # React Native app
   ├── web/             # Next.js app
   └── shared/          # Shared utilities and types
   packages/
   ├── ui/              # Shared UI components
   ├── auth/            # Authentication utilities
   └── database/        # Database schemas and utilities
   ```

2. **Unified Authentication**:
   - Consider using Supabase for both platforms
   - Or implement OAuth2/OpenID Connect for both
   - Maintain single user database across platforms

3. **Environment Separation**:
   - Separate environment configurations
   - Platform-specific feature flags
   - Independent deployment pipelines

## Environment Variables Required

### Production Requirements
```bash
# CRITICAL - Must be set for production
JWT_SECRET=your-very-strong-secret-minimum-32-characters-long
NODE_ENV=production
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Database
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co

# Optional but recommended
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### Development Setup
```bash
# Copy and customize
cp .env.example .env.local

# Generate strong JWT secret
openssl rand -base64 32
```

## Security Checklist

### ✅ Implemented
- [x] Real authentication with password hashing
- [x] Strong JWT secret enforcement
- [x] Comprehensive rate limiting
- [x] Secure cookie configuration
- [x] Input validation and sanitization
- [x] Error handling without information disclosure
- [x] Configuration validation at startup

### 🔄 In Progress
- [ ] CSRF protection for form submissions
- [ ] Request logging and monitoring
- [ ] Security headers (HSTS, CSP, etc.)
- [ ] API versioning and deprecation strategy

### 📋 Recommended
- [ ] OAuth2/OpenID Connect integration
- [ ] Multi-factor authentication (2FA)
- [ ] Account lockout policies
- [ ] Security audit logging
- [ ] Penetration testing
- [ ] Dependency vulnerability scanning

## Testing Security

### Authentication Testing
```bash
# Test rate limiting
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"wrong"}' \
  -i

# Test with valid credentials
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"valid@example.com","password":"validpassword"}' \
  -i
```

### Configuration Testing
```bash
# Test without JWT_SECRET (should fail)
unset JWT_SECRET
npm run dev  # Should exit with error

# Test with weak secret (should fail)
JWT_SECRET=weak npm run dev  # Should exit with error
```

## Monitoring and Alerting

### Key Metrics to Monitor
- Authentication failure rates
- Rate limiting triggers
- JWT validation failures
- Database connection errors
- Response time anomalies

### Recommended Alerts
- High authentication failure rate (>50% over 5 minutes)
- Repeated rate limiting from same IP
- JWT secret misconfiguration
- Database connectivity issues
- Unusual response time spikes

## Compliance Notes

### GDPR/Privacy
- User passwords are properly hashed (not reversible)
- User data is stored securely in Supabase
- Account deletion capabilities exist
- Data export functionality available

### Security Standards
- Follows OWASP authentication guidelines
- Implements defense in depth
- Uses industry-standard cryptography
- Maintains audit trail in logs

---

**Last Updated**: January 2025
**Security Review**: Required every 3 months
**Penetration Testing**: Recommended annually