#!/bin/bash
# Script to fix critical mobile type errors

echo "=== FIXING MOBILE TYPE ERRORS ==="

# 1. Fix missing type exports
echo "1. Adding missing type exports to mobile..."

# Create a type re-export file for backward compatibility
cat > apps/mobile/src/types/compat.ts << 'EOF'
// Compatibility exports for gradual migration
// Re-export from @mintenance/types but add mobile-specific additions

export {
  User,
  Job,
  CreateUserData,
  AuthResult,
  LoginCredentials,
  RegisterData,
  ApiResponse,
  RateLimitInfo,
  JWTPayload
} from '@mintenance/types';

// Mobile-specific type additions (temporary until fully migrated)
export interface UserProfile extends User {
  // Additional mobile-specific fields
  latitude?: number;
  longitude?: number;
  address?: string;
  profileImageUrl?: string;
  isAvailable?: boolean;
  isVerified?: boolean;
  totalJobsCompleted?: number;
}

// Add any other mobile-specific types here temporarily
EOF

# 2. Update the main types index to re-export from compat
echo "2. Updating types index for compatibility..."
cat > apps/mobile/src/types/index.ts << 'EOF'
// Main types export file - using shared types from @mintenance/types
// This file provides backward compatibility during migration

export * from '@mintenance/types';
export * from './compat';

// Re-export database types if they exist
export * from './database';
EOF

# 3. Fix Sentry import errors in App.tsx
echo "3. Fixing Sentry imports in App.tsx..."
sed -i.bak \
  -e "s/ReactNativeTracing/reactNativeTracingIntegration/g" \
  -e "s/ReactNavigationInstrumentation/reactNavigationIntegration/g" \
  apps/mobile/App.tsx

# 4. Fix test mock issues
echo "4. Fixing test mock logger issues..."
# Add logger to test mocks
sed -i.bak \
  "/Cannot find name 'logger'/d" \
  apps/mobile/src/__tests__/mocks/index.ts

# Add console.log as logger fallback
sed -i.bak \
  "1i const logger = console;" \
  apps/mobile/src/__tests__/mocks/index.ts

# 5. Fix React Query cache time issue
echo "5. Fixing React Query cacheTime deprecation..."
find apps/mobile/src/__tests__ -name "*.tsx" -o -name "*.ts" | while read file; do
  sed -i.bak "s/cacheTime:/gcTime:/g" "$file"
done

# 6. Clean up backup files
echo "6. Cleaning up backup files..."
find apps/mobile -name "*.bak" -delete

echo ""
echo "=== INITIAL FIXES COMPLETE ==="
echo ""
echo "Next: Run type check to see remaining errors"