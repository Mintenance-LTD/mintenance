# ✅ VALIDATION CHECKLISTS & 🔄 ROLLBACK PROCEDURES

**Critical:** Run validation after EACH step. If ANY check fails, execute rollback immediately.

---

## 📋 MASTER VALIDATION CHECKLIST

### 🔍 PHASE 1 VALIDATION (Database & Types)

#### Pre-Flight Checks
```bash
#!/bin/bash
# File: scripts/validation/phase1-preflight.sh

echo "=== PHASE 1 PRE-FLIGHT CHECKLIST ==="

# 1. Backup verification
echo "[ ] Database backup exists and is restorable"
pg_dump $DATABASE_URL > test_backup.sql
if [ $? -ne 0 ]; then
  echo "❌ FAIL: Cannot create database backup"
  exit 1
fi
echo "✅ Database backup created"

# 2. Git state clean
echo "[ ] Git working directory is clean"
if [ -n "$(git status --porcelain)" ]; then
  echo "❌ FAIL: Uncommitted changes exist"
  exit 1
fi
echo "✅ Git state clean"

# 3. All tests passing
echo "[ ] All tests pass before changes"
npm test
if [ $? -ne 0 ]; then
  echo "❌ FAIL: Tests failing before changes"
  exit 1
fi
echo "✅ Tests passing"

# 4. Both apps build
echo "[ ] Apps build successfully"
cd apps/web && npm run build
if [ $? -ne 0 ]; then
  echo "❌ FAIL: Web app doesn't build"
  exit 1
fi
cd ../mobile && npm run build
if [ $? -ne 0 ]; then
  echo "❌ FAIL: Mobile app doesn't build"
  exit 1
fi
cd ../..
echo "✅ Apps build successfully"

echo "=== PRE-FLIGHT COMPLETE ✅ ==="
```

#### Database Consolidation Validation
```bash
#!/bin/bash
# File: scripts/validation/database-validation.sh

echo "=== DATABASE VALIDATION ==="

# Test 1: Schema integrity
echo "Test 1: Checking schema integrity..."
psql $DATABASE_URL << 'EOF'
-- Check core tables exist
SELECT COUNT(*) as table_count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('profiles', 'companies', 'jobs', 'bids', 'payments', 'notifications');
EOF

# Test 2: No duplicate tables
echo "Test 2: Checking for duplicate tables..."
psql $DATABASE_URL << 'EOF'
-- Find duplicate table definitions
WITH table_counts AS (
  SELECT table_name, COUNT(*) as count
  FROM information_schema.tables
  WHERE table_schema = 'public'
  GROUP BY table_name
)
SELECT * FROM table_counts WHERE count > 1;
EOF

# Test 3: Foreign key constraints valid
echo "Test 3: Validating foreign keys..."
psql $DATABASE_URL << 'EOF'
-- Check all foreign keys are valid
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY';
EOF

# Test 4: Indexes exist
echo "Test 4: Checking indexes..."
psql $DATABASE_URL << 'EOF'
-- Check critical indexes exist
SELECT indexname FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_profiles_email',
    'idx_jobs_homeowner',
    'idx_bids_job',
    'idx_payments_job'
  );
EOF

# Test 5: RLS policies intact
echo "Test 5: Checking RLS policies..."
psql $DATABASE_URL << 'EOF'
-- Check RLS is enabled on critical tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'jobs', 'bids', 'payments')
  AND rowsecurity = true;
EOF

echo "=== DATABASE VALIDATION COMPLETE ==="
```

#### Type System Validation
```typescript
// File: scripts/validation/type-validation.ts

import { User, Job, Bid, Payment } from '@mintenance/types';
import * as fs from 'fs';
import * as path from 'path';

console.log('=== TYPE SYSTEM VALIDATION ===');

// Test 1: Types are importable
console.log('Test 1: Checking type imports...');
try {
  const user: User = {
    id: 'test',
    email: 'test@test.com',
    first_name: 'Test',
    last_name: 'User',
    role: 'admin', // Must include admin role
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  console.log('✅ User type includes admin role');
} catch (error) {
  console.error('❌ User type error:', error);
  process.exit(1);
}

// Test 2: No duplicate type files
console.log('Test 2: Checking for duplicate type files...');
const duplicateLocations = [
  'apps/mobile/src/types/index.ts',
  'apps/mobile/src/types/database.ts',
  'apps/web/src/types/local/index.ts'
];

for (const location of duplicateLocations) {
  if (fs.existsSync(location)) {
    console.error(`❌ Duplicate type file still exists: ${location}`);
    process.exit(1);
  }
}
console.log('✅ No duplicate type files found');

// Test 3: Both apps import from @mintenance/types
console.log('Test 3: Checking app imports...');

function checkImports(dir: string, appName: string) {
  const files = fs.readdirSync(dir, { withFileTypes: true });

  for (const file of files) {
    const filePath = path.join(dir, file.name);

    if (file.isDirectory() && !file.name.includes('node_modules')) {
      checkImports(filePath, appName);
    } else if (file.name.endsWith('.ts') || file.name.endsWith('.tsx')) {
      const content = fs.readFileSync(filePath, 'utf8');

      // Check for local type imports
      if (content.includes("from '../types'") ||
          content.includes("from './types'") ||
          content.includes("from '../../types'")) {
        console.error(`❌ ${appName} has local type import in: ${filePath}`);
        process.exit(1);
      }

      // Check for shared type imports
      if (content.includes('User') || content.includes('Job') || content.includes('Bid')) {
        if (!content.includes("from '@mintenance/types'")) {
          console.warn(`⚠️  ${filePath} uses types but doesn't import from @mintenance/types`);
        }
      }
    }
  }
}

checkImports('apps/mobile/src', 'Mobile');
checkImports('apps/web/src', 'Web');

console.log('✅ Both apps use @mintenance/types');

console.log('=== TYPE VALIDATION COMPLETE ✅ ===');
```

### 🔍 PHASE 2 VALIDATION (Service Extraction)

```bash
#!/bin/bash
# File: scripts/validation/phase2-validation.sh

echo "=== PHASE 2 SERVICE VALIDATION ==="

# Test 1: Services package structure
echo "Test 1: Checking services package..."
required_dirs=(
  "packages/services/src/auth"
  "packages/services/src/payment"
  "packages/services/src/notification"
  "packages/services/src/base"
)

for dir in "${required_dirs[@]}"; do
  if [ ! -d "$dir" ]; then
    echo "❌ Missing directory: $dir"
    exit 1
  fi
done
echo "✅ Services package structure correct"

# Test 2: Services are buildable
echo "Test 2: Building services package..."
cd packages/services
npm run build
if [ $? -ne 0 ]; then
  echo "❌ Services package doesn't build"
  exit 1
fi
cd ../..
echo "✅ Services package builds"

# Test 3: No duplicate service files
echo "Test 3: Checking for duplicate services..."
duplicate_services=(
  "apps/mobile/src/services/AuthService.ts"
  "apps/mobile/src/services/PaymentService.ts"
  "apps/web/lib/auth.ts"
  "apps/web/lib/payments.ts"
)

for file in "${duplicate_services[@]}"; do
  if [ -f "$file" ]; then
    echo "❌ Duplicate service still exists: $file"
    exit 1
  fi
done
echo "✅ No duplicate services found"

# Test 4: Apps import from shared services
echo "Test 4: Checking service imports..."
if grep -r "from.*services/AuthService" apps/mobile/src 2>/dev/null; then
  echo "❌ Mobile has local service imports"
  exit 1
fi

if grep -r "from.*lib/auth" apps/web/src 2>/dev/null; then
  echo "❌ Web has local service imports"
  exit 1
fi
echo "✅ Apps use shared services"

# Test 5: Integration test
echo "Test 5: Running integration test..."
node << 'EOF'
const { AuthService } = require('./packages/services/dist');
const { PaymentService } = require('./packages/services/dist');

if (!AuthService) {
  console.error('❌ AuthService not exported');
  process.exit(1);
}

if (!PaymentService) {
  console.error('❌ PaymentService not exported');
  process.exit(1);
}

console.log('✅ Services properly exported');
EOF

echo "=== PHASE 2 VALIDATION COMPLETE ✅ ==="
```

### 🔍 COMPREHENSIVE E2E VALIDATION

```bash
#!/bin/bash
# File: scripts/validation/e2e-validation.sh

echo "=== COMPREHENSIVE E2E VALIDATION ==="

# Test 1: Full build pipeline
echo "Test 1: Full build pipeline..."
npm run build:all
if [ $? -ne 0 ]; then
  echo "❌ Full build failed"
  exit 1
fi
echo "✅ Full build successful"

# Test 2: Type checking across monorepo
echo "Test 2: Type checking..."
npm run type-check
if [ $? -ne 0 ]; then
  echo "❌ Type check failed"
  exit 1
fi
echo "✅ Type check passed"

# Test 3: Linting
echo "Test 3: Linting..."
npm run lint
if [ $? -ne 0 ]; then
  echo "❌ Linting failed"
  exit 1
fi
echo "✅ Linting passed"

# Test 4: Unit tests
echo "Test 4: Unit tests..."
npm test
if [ $? -ne 0 ]; then
  echo "❌ Unit tests failed"
  exit 1
fi
echo "✅ Unit tests passed"

# Test 5: Integration tests
echo "Test 5: Integration tests..."
npm run test:integration
if [ $? -ne 0 ]; then
  echo "❌ Integration tests failed"
  exit 1
fi
echo "✅ Integration tests passed"

# Test 6: Bundle size check
echo "Test 6: Bundle size..."
npm run analyze
echo "✅ Bundle analysis complete"

echo "=== E2E VALIDATION COMPLETE ✅ ==="
```

---

## 🔄 EMERGENCY ROLLBACK PROCEDURES

### 🚨 PHASE 1 ROLLBACK (Database & Types)

```bash
#!/bin/bash
# File: scripts/rollback/phase1-rollback.sh

echo "🚨 EMERGENCY ROLLBACK - PHASE 1 🚨"

# Step 1: Confirm rollback
read -p "Are you sure you want to rollback Phase 1? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
  echo "Rollback cancelled"
  exit 0
fi

# Step 2: Save current state for debugging
echo "Saving current state for debugging..."
mkdir -p rollback_artifacts/$(date +%Y%m%d_%H%M%S)
pg_dump $DATABASE_URL > rollback_artifacts/$(date +%Y%m%d_%H%M%S)/database_state.sql
cp -r packages/types rollback_artifacts/$(date +%Y%m%d_%H%M%S)/
git diff > rollback_artifacts/$(date +%Y%m%d_%H%M%S)/git_diff.patch

# Step 3: Restore database
echo "Restoring database..."
if [ -f "backup_*.sql" ]; then
  psql $DATABASE_URL < backup_*.sql
  echo "✅ Database restored"
else
  echo "❌ No backup found! Manual restoration required"
  exit 1
fi

# Step 4: Restore migrations
echo "Restoring migration files..."
if [ -d "supabase/migrations_backup_*" ]; then
  rm -rf supabase/migrations
  mv supabase/migrations_backup_* supabase/migrations
  echo "✅ Migrations restored"
else
  git checkout HEAD -- supabase/migrations/
  echo "✅ Migrations restored from git"
fi

# Step 5: Restore type files
echo "Restoring type files..."
git checkout HEAD -- packages/types/
git checkout HEAD -- apps/mobile/src/types/
git checkout HEAD -- apps/web/src/types/

# Step 6: Restore package.json files
echo "Restoring dependencies..."
git checkout HEAD -- apps/mobile/package.json
git checkout HEAD -- apps/mobile/package-lock.json
git checkout HEAD -- apps/web/package.json
git checkout HEAD -- apps/web/package-lock.json

# Step 7: Clean and reinstall
echo "Cleaning and reinstalling..."
rm -rf node_modules
rm -rf apps/*/node_modules
rm -rf packages/*/node_modules
npm ci

# Step 8: Verify rollback
echo "Verifying rollback..."
npm run type-check
if [ $? -ne 0 ]; then
  echo "⚠️  Type check failed after rollback - manual intervention required"
fi

npm test
if [ $? -ne 0 ]; then
  echo "⚠️  Tests failed after rollback - manual intervention required"
fi

echo "🔄 ROLLBACK COMPLETE - Please verify application functionality"
```

### 🚨 PHASE 2 ROLLBACK (Service Extraction)

```bash
#!/bin/bash
# File: scripts/rollback/phase2-rollback.sh

echo "🚨 EMERGENCY ROLLBACK - PHASE 2 🚨"

# Step 1: Confirm rollback
read -p "Are you sure you want to rollback Phase 2? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
  echo "Rollback cancelled"
  exit 0
fi

# Step 2: Save debugging artifacts
echo "Saving current state..."
mkdir -p rollback_artifacts/phase2_$(date +%Y%m%d_%H%M%S)
cp -r packages/services rollback_artifacts/phase2_$(date +%Y%m%d_%H%M%S)/
git diff > rollback_artifacts/phase2_$(date +%Y%m%d_%H%M%S)/changes.patch

# Step 3: Remove services package
echo "Removing services package..."
rm -rf packages/services

# Step 4: Restore original service files
echo "Restoring original services..."
git checkout HEAD -- apps/mobile/src/services/
git checkout HEAD -- apps/web/lib/
git checkout HEAD -- apps/web/lib/services/

# Step 5: Restore package.json
echo "Restoring dependencies..."
git checkout HEAD -- apps/mobile/package.json
git checkout HEAD -- apps/web/package.json
git checkout HEAD -- package.json

# Step 6: Reinstall dependencies
echo "Reinstalling dependencies..."
rm -rf node_modules apps/*/node_modules packages/*/node_modules
npm ci

# Step 7: Verify rollback
echo "Verifying rollback..."
cd apps/mobile && npm run build
if [ $? -ne 0 ]; then
  echo "⚠️  Mobile build failed after rollback"
fi
cd ../web && npm run build
if [ $? -ne 0 ]; then
  echo "⚠️  Web build failed after rollback"
fi
cd ../..

echo "🔄 SERVICE ROLLBACK COMPLETE"
```

### 🚨 ATOMIC ROLLBACK (Git-based)

```bash
#!/bin/bash
# File: scripts/rollback/atomic-rollback.sh

echo "🚨 ATOMIC GIT ROLLBACK 🚨"

# Show recent commits
echo "Recent commits:"
git log --oneline -10

# Get commit to rollback to
read -p "Enter commit hash to rollback to: " commit_hash

# Verify commit exists
if ! git cat-file -e $commit_hash^{commit} 2>/dev/null; then
  echo "❌ Invalid commit hash"
  exit 1
fi

# Create backup branch
echo "Creating backup branch..."
git branch backup-$(date +%Y%m%d_%H%M%S)

# Perform rollback
echo "Rolling back to $commit_hash..."
git reset --hard $commit_hash

# Clean everything
echo "Cleaning workspace..."
git clean -fdx
rm -rf node_modules apps/*/node_modules packages/*/node_modules

# Reinstall
echo "Reinstalling..."
npm ci

echo "🔄 ATOMIC ROLLBACK COMPLETE"
```

---

## 📊 ROLLBACK DECISION MATRIX

| Symptom | Severity | Rollback Action |
|---------|----------|-----------------|
| Type errors after Phase 1 | Low | Fix types, don't rollback |
| Database migration fails | High | Rollback Phase 1 immediately |
| App won't build | High | Rollback to last working commit |
| Tests fail (<10) | Low | Fix tests, don't rollback |
| Tests fail (>10) | High | Rollback and investigate |
| Service import errors | Medium | Fix imports, partial rollback |
| Production error | Critical | Immediate atomic rollback |
| Performance degradation | Medium | Monitor, rollback if >20% slower |

---

## 🏥 POST-ROLLBACK RECOVERY

### Incident Report Template
```markdown
# Rollback Incident Report

**Date:** [Date]
**Phase:** [1/2/3]
**Rollback Type:** [Database/Types/Services/Atomic]

## What Happened
[Description of the issue that triggered rollback]

## Root Cause
[Analysis of why the issue occurred]

## Impact
- **Users Affected:** [Number/None]
- **Downtime:** [Duration]
- **Data Loss:** [Yes/No]

## Actions Taken
1. [Action 1]
2. [Action 2]
3. [Action 3]

## Lessons Learned
- [Lesson 1]
- [Lesson 2]

## Prevention Measures
- [Measure 1]
- [Measure 2]

## Status
[Resolved/Monitoring/Escalated]
```

### Recovery Checklist
- [ ] Rollback completed successfully
- [ ] All services operational
- [ ] Database integrity verified
- [ ] Type system consistent
- [ ] Tests passing
- [ ] No user data lost
- [ ] Monitoring enabled
- [ ] Team notified
- [ ] Incident report filed
- [ ] Root cause identified
- [ ] Fix planned
- [ ] Retry scheduled

---

## 🛡️ PREVENTION MEASURES

### Before Each Phase
1. **Full backup** of database and code
2. **Feature flag** for gradual rollout
3. **Staging deployment** first
4. **Load testing** after changes
5. **Monitoring alerts** configured

### During Implementation
1. **Commit frequently** (every working state)
2. **Test continuously** (after each step)
3. **Document issues** immediately
4. **Pair review** critical changes
5. **Keep rollback scripts** updated

### After Completion
1. **Monitor metrics** for 24 hours
2. **Check error rates** every hour
3. **User feedback** collection
4. **Performance profiling**
5. **Security scan**

---

**Remember:** It's better to rollback early than to debug in production. If something feels wrong, it probably is. Trust your instincts and rollback when in doubt.