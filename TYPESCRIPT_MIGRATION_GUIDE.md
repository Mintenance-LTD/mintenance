# TypeScript Migration Guide

## Overview
This guide helps you migrate from mixed naming conventions to standardized, consistent TypeScript types and data mapping.

## Issues Fixed

### 1. ✅ MCP Server TypeScript Compilation
- **Problem**: Top-level await not supported with CommonJS output
- **Solution**: Created separate `tsconfig.mcp.json` with ES2022 target and proper module resolution
- **Files**: `tsconfig.mcp.json`, `mcp-server.ts`

### 2. ✅ Missing Dependencies
- **Problem**: Missing Stripe dependency causing compilation errors
- **Solution**: Installed `stripe` package
- **Files**: `package.json`

### 3. ✅ Map Iteration Issues
- **Problem**: Map iteration not supported with current TypeScript target
- **Solution**: Replaced `for...of` loops with `forEach` methods
- **Files**: `src/utils/circuitBreaker.ts`

### 4. 🔄 Database Field Naming Standardization
- **Problem**: Mixed snake_case (database) and camelCase (application) naming
- **Solution**: Created standardized field mapping utilities
- **Files**: `src/utils/fieldMapper.ts`, `src/types/standardized.ts`

## Migration Steps

### Step 1: Update Service Files
Replace existing mapping functions with standardized ones:

**Before:**
```typescript
// In ContractorService.ts
private static mapDatabaseToContractorProfile(data: any): ContractorProfile {
  return {
    id: data.user_id,
    email: data.user?.email || '',
    first_name: data.user?.first_name || '',
    // ... mixed naming
  };
}
```

**After:**
```typescript
import { mapDatabaseUserToUser } from '../utils/fieldMapper';

// Use standardized mapping
const user = mapDatabaseUserToUser(data);
```

### Step 2: Update Type Imports
Replace mixed types with standardized ones:

**Before:**
```typescript
import { User, Job, Bid } from '../types/index';
```

**After:**
```typescript
import { User, Job, Bid } from '../types/standardized';
```

### Step 3: Update Database Queries
Use field mapping for consistent naming:

**Before:**
```typescript
const { data, error } = await supabase
  .from('users')
  .select('id, email, first_name, last_name, created_at');
```

**After:**
```typescript
import { DATABASE_FIELDS } from '../utils/fieldMapper';

const { data, error } = await supabase
  .from('users')
  .select('id, email, first_name, last_name, created_at');

// Map to application format
const users = data?.map(mapDatabaseUserToUser) || [];
```

### Step 4: Update Component Props
Ensure consistent prop naming:

**Before:**
```typescript
interface UserCardProps {
  user: {
    first_name: string;
    last_name: string;
    created_at: string;
  };
}
```

**After:**
```typescript
import { User } from '../types/standardized';

interface UserCardProps {
  user: User;
}
```

## Field Mapping Reference

### Database → Application
| Database Field | Application Field |
|----------------|-------------------|
| `first_name` | `firstName` |
| `last_name` | `lastName` |
| `created_at` | `createdAt` |
| `updated_at` | `updatedAt` |
| `homeowner_id` | `homeownerId` |
| `contractor_id` | `contractorId` |
| `profile_image_url` | `profileImageUrl` |
| `total_jobs_completed` | `totalJobsCompleted` |
| `is_available` | `isAvailable` |

### Application → Database
| Application Field | Database Field |
|-------------------|----------------|
| `firstName` | `first_name` |
| `lastName` | `last_name` |
| `createdAt` | `created_at` |
| `updatedAt` | `updated_at` |
| `homeownerId` | `homeowner_id` |
| `contractorId` | `contractor_id` |
| `profileImageUrl` | `profile_image_url` |
| `totalJobsCompleted` | `total_jobs_completed` |
| `isAvailable` | `is_available` |

## Utility Functions

### Field Conversion
```typescript
import { 
  toCamelCase, 
  toSnakeCase, 
  keysToCamelCase, 
  keysToSnakeCase 
} from '../utils/fieldMapper';

// Convert individual strings
const camelCase = toCamelCase('first_name'); // 'firstName'
const snakeCase = toSnakeCase('firstName'); // 'first_name'

// Convert object keys
const camelObject = keysToCamelCase({ first_name: 'John' }); // { firstName: 'John' }
const snakeObject = keysToSnakeCase({ firstName: 'John' }); // { first_name: 'John' }
```

### Entity Mapping
```typescript
import { 
  mapDatabaseUserToUser,
  mapUserToDatabaseUser,
  mapDatabaseJobToJob,
  mapJobToDatabaseJob
} from '../utils/fieldMapper';

// Database to Application
const user = mapDatabaseUserToUser(dbUser);
const job = mapDatabaseJobToJob(dbJob);

// Application to Database
const dbUser = mapUserToDatabaseUser(user);
const dbJob = mapJobToDatabaseJob(job);
```

### Validation
```typescript
import { 
  validateRequiredFields,
  sanitizeString,
  sanitizeNumber,
  sanitizeBoolean
} from '../utils/fieldMapper';

// Validate required fields
const validation = validateRequiredFields(user, ['id', 'email', 'firstName']);
if (!validation.isValid) {
  console.log('Missing fields:', validation.missingFields);
}

// Sanitize data
const cleanName = sanitizeString(user.firstName);
const cleanAge = sanitizeNumber(user.age);
const cleanActive = sanitizeBoolean(user.isActive);
```

## Testing the Migration

### 1. Run TypeScript Check
```bash
npm run type-check
```

### 2. Test MCP Server
```bash
npm run mcp:server:ts
```

### 3. Run Tests
```bash
npm test
```

## Benefits of Migration

1. **Consistency**: All field names follow consistent conventions
2. **Maintainability**: Centralized mapping logic reduces duplication
3. **Type Safety**: Better TypeScript coverage and error detection
4. **Performance**: Optimized mapping functions
5. **Documentation**: Clear field mapping reference

## Next Steps

1. **Phase 1**: Update core services (UserService, JobService, BidService)
2. **Phase 2**: Update components to use standardized types
3. **Phase 3**: Remove old mixed naming from `src/types/index.ts`
4. **Phase 4**: Update tests to use new mapping functions
5. **Phase 5**: Add comprehensive type coverage

## Rollback Plan

If issues arise:
1. Keep `src/types/index.ts` as backup
2. Gradually migrate services one by one
3. Use feature flags for new vs old mapping
4. Monitor for breaking changes

## Support

For questions or issues:
1. Check the field mapping reference above
2. Review the utility functions in `src/utils/fieldMapper.ts`
3. Test with the provided validation functions
4. Use TypeScript strict mode for better error detection
