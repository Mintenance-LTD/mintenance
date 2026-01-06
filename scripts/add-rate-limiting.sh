#!/bin/bash
# Script to add rate limiting to critical API routes

echo "=== ADDING RATE LIMITING TO CRITICAL API ROUTES ==="

# Critical route patterns that need strict rate limiting
CRITICAL_PATTERNS=(
  "*/admin/*"
  "*/ai/*"
  "*/payments/*"
  "*/escrow/*"
  "*/auth/*"
  "*/stripe/*"
  "*/openai/*"
)

# Find and update critical routes
echo "Finding critical API routes..."
CRITICAL_ROUTES=$(find apps/web/app/api -name "route.ts" | grep -E "(admin|ai|payments|escrow|auth|stripe|openai)" | head -20)

echo "Found $(echo "$CRITICAL_ROUTES" | wc -l) critical routes to update"

# Create a template for rate limiting
cat > /tmp/rate-limit-template.txt << 'EOF'
import { rateLimiter } from '@/lib/rate-limiter';

// Add rate limiting check at the beginning of each handler
const rateLimitResult = await rateLimiter.checkRateLimit({
  identifier: `ENDPOINT_NAME:${userId || request.headers.get('x-forwarded-for') || 'anonymous'}`,
  windowMs: 60000,
  maxRequests: 10
});

if (!rateLimitResult.allowed) {
  return NextResponse.json(
    { error: 'Too many requests' },
    {
      status: 429,
      headers: {
        'Retry-After': String(rateLimitResult.retryAfter),
        'X-RateLimit-Limit': String(rateLimitResult.limit),
        'X-RateLimit-Remaining': String(rateLimitResult.remaining),
        'X-RateLimit-Reset': new Date(rateLimitResult.reset).toISOString()
      }
    }
  );
}
EOF

echo ""
echo "Critical routes that need immediate rate limiting:"
echo "$CRITICAL_ROUTES" | head -10

echo ""
echo "=== RATE LIMITING CONFIGURATION NEEDED ==="
echo ""
echo "1. Update each route to import rateLimiter:"
echo "   import { rateLimiter } from '@/lib/rate-limiter';"
echo ""
echo "2. Add rate limit check at start of each handler (GET, POST, etc.)"
echo ""
echo "3. Suggested limits:"
echo "   - Admin routes: 10 requests/minute"
echo "   - AI routes: 5 requests/minute (expensive!)"
echo "   - Payment routes: 20 requests/minute"
echo "   - Auth routes: 5 requests/minute"
echo "   - General routes: 30 requests/minute"
echo ""
echo "Template saved to: /tmp/rate-limit-template.txt"