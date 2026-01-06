# 🚀 PHASE 1 IMPLEMENTATION SCRIPTS - STOP THE BLEEDING

**⚠️ WARNING: Create full backup before running any scripts**

```bash
# BACKUP FIRST!
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
git checkout -b phase-1-fixes
git add . && git commit -m "Pre-Phase 1 backup checkpoint"
```

---

## 📊 STEP 1: DATABASE AUDIT & CONSOLIDATION

### 1.1 Audit Current Database State

```bash
#!/bin/bash
# File: scripts/phase1/audit-database.sh

echo "=== DATABASE AUDIT STARTING ==="

# Check local vs production schema differences
echo "1. Checking schema differences..."
npx supabase db diff --local > schema_diff_$(date +%Y%m%d).txt

# List all migrations in order
echo "2. Listing all migrations..."
ls -la supabase/migrations/ > migrations_list.txt

# Find duplicate table definitions
echo "3. Finding duplicate table definitions..."
grep -r "CREATE TABLE" supabase/migrations/ | \
  awk -F: '{print $2}' | \
  sed 's/CREATE TABLE IF NOT EXISTS//g' | \
  sed 's/CREATE TABLE//g' | \
  sed 's/(.*//g' | \
  sed 's/[[:space:]]//g' | \
  sort | uniq -d > duplicate_tables.txt

echo "Duplicate tables found:"
cat duplicate_tables.txt

# Find conflicting column definitions
echo "4. Checking for conflicting columns..."
for table in $(cat duplicate_tables.txt); do
  echo "Analyzing table: $table"
  grep -A 20 "CREATE TABLE.*$table" supabase/migrations/*.sql | \
    grep -E "^\s+\w+\s+" > temp_${table}_columns.txt
done

echo "=== AUDIT COMPLETE ==="
echo "Results saved to: schema_diff_*.txt, migrations_list.txt, duplicate_tables.txt"
```

### 1.2 Consolidate Migrations

```bash
#!/bin/bash
# File: scripts/phase1/consolidate-migrations.sh

# Create new consolidated migrations directory
mkdir -p supabase/migrations_consolidated

# Create consolidated migration files
cat > supabase/migrations_consolidated/001_core_tables.sql << 'EOF'
-- Consolidated Core Tables Migration
-- Generated: $(date)
-- This replaces multiple conflicting migrations

-- Users and Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role TEXT CHECK (role IN ('homeowner', 'contractor', 'admin')) NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Companies (Contractors)
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  license_number TEXT,
  insurance_number TEXT,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Addresses
CREATE TABLE IF NOT EXISTS public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  street TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT DEFAULT 'USA',
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT address_owner CHECK (
    (profile_id IS NOT NULL AND company_id IS NULL) OR
    (profile_id IS NULL AND company_id IS NOT NULL)
  )
);

-- Create indexes
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_companies_owner ON public.companies(owner_id);
CREATE INDEX idx_addresses_profile ON public.addresses(profile_id);
CREATE INDEX idx_addresses_company ON public.addresses(company_id);
EOF

cat > supabase/migrations_consolidated/002_job_system.sql << 'EOF'
-- Consolidated Job System Migration
-- This is the SINGLE source of truth for jobs and bids

-- Jobs table (CANONICAL VERSION)
CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homeowner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'in_progress', 'completed', 'cancelled')),
  budget_min DECIMAL(10,2),
  budget_max DECIMAL(10,2),
  urgency TEXT CHECK (urgency IN ('low', 'medium', 'high', 'emergency')),
  location JSONB,
  images TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Bids table (CANONICAL VERSION)
CREATE TABLE IF NOT EXISTS public.bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  contractor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
  estimated_duration_days INTEGER,
  materials_included BOOLEAN DEFAULT true,
  warranty_months INTEGER DEFAULT 12,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, contractor_id)
);

-- Job milestones
CREATE TABLE IF NOT EXISTS public.job_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  bid_id UUID REFERENCES public.bids(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'approved')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Saved jobs (SINGLE VERSION - includes notes field)
CREATE TABLE IF NOT EXISTS public.saved_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  notes TEXT,
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, job_id)
);

-- Job views (SINGLE VERSION)
CREATE TABLE IF NOT EXISTS public.job_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- Create indexes
CREATE INDEX idx_jobs_homeowner ON public.jobs(homeowner_id);
CREATE INDEX idx_jobs_status ON public.jobs(status);
CREATE INDEX idx_jobs_created ON public.jobs(created_at DESC);
CREATE INDEX idx_bids_job ON public.bids(job_id);
CREATE INDEX idx_bids_contractor ON public.bids(contractor_id);
CREATE INDEX idx_milestones_job ON public.job_milestones(job_id);
CREATE INDEX idx_saved_jobs_user ON public.saved_jobs(user_id);
CREATE INDEX idx_job_views_job ON public.job_views(job_id);
EOF

cat > supabase/migrations_consolidated/003_verify_consolidation.sql << 'EOF'
-- Verification queries to ensure consolidation worked

DO $$
DECLARE
  table_count INTEGER;
BEGIN
  -- Check that all required tables exist
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('profiles', 'companies', 'jobs', 'bids', 'saved_jobs', 'job_views');

  IF table_count < 6 THEN
    RAISE EXCEPTION 'Missing tables. Expected 6, found %', table_count;
  END IF;

  RAISE NOTICE 'All core tables created successfully';
END $$;
EOF
```

### 1.3 Migration Execution Script

```bash
#!/bin/bash
# File: scripts/phase1/execute-migration.sh

set -e  # Exit on error

echo "=== PHASE 1: DATABASE CONSOLIDATION ==="

# Step 1: Backup existing migrations
echo "1. Backing up existing migrations..."
cp -r supabase/migrations supabase/migrations_backup_$(date +%Y%m%d)

# Step 2: Create fresh database
echo "2. Creating fresh test database..."
npx supabase db reset --local

# Step 3: Apply consolidated migrations
echo "3. Applying consolidated migrations..."
for migration in supabase/migrations_consolidated/*.sql; do
  echo "Applying: $migration"
  npx supabase db push --local < "$migration"
done

# Step 4: Verify schema
echo "4. Verifying schema..."
npx supabase db diff --local

# Step 5: Test with sample data
echo "5. Testing with sample data..."
psql $DATABASE_URL << 'EOF'
-- Insert test data
INSERT INTO profiles (id, email, first_name, last_name, role)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'homeowner@test.com', 'John', 'Doe', 'homeowner'),
  ('22222222-2222-2222-2222-222222222222', 'contractor@test.com', 'Jane', 'Smith', 'contractor');

INSERT INTO jobs (homeowner_id, title, description, category, status)
VALUES ('11111111-1111-1111-1111-111111111111', 'Fix Roof', 'Leaking roof needs repair', 'roofing', 'open');

-- Verify data
SELECT COUNT(*) as profile_count FROM profiles;
SELECT COUNT(*) as job_count FROM jobs;
EOF

echo "=== DATABASE CONSOLIDATION COMPLETE ==="
```

---

## 🎯 STEP 2: TYPE SYSTEM UNIFICATION

### 2.1 Analyze Current Type Chaos

```bash
#!/bin/bash
# File: scripts/phase1/audit-types.sh

echo "=== TYPE SYSTEM AUDIT ==="

# Find all type definition files
echo "1. Finding all type definition files..."
find . -name "*.ts" -o -name "*.tsx" | xargs grep -l "interface.*User\|type.*User" > user_type_files.txt
find . -name "*.ts" -o -name "*.tsx" | xargs grep -l "interface.*Job\|type.*Job" > job_type_files.txt
find . -name "*.ts" -o -name "*.tsx" | xargs grep -l "interface.*Bid\|type.*Bid" > bid_type_files.txt

echo "Files defining User type: $(wc -l < user_type_files.txt)"
echo "Files defining Job type: $(wc -l < job_type_files.txt)"
echo "Files defining Bid type: $(wc -l < bid_type_files.txt)"

# Check if mobile uses shared types
echo "2. Checking mobile's use of @mintenance/types..."
grep -r "@mintenance/types" apps/mobile/ || echo "WARNING: Mobile app doesn't import @mintenance/types!"

# Find duplicate type definitions
echo "3. Analyzing type differences..."
node scripts/phase1/compare-types.js
```

### 2.2 Type Comparison Script

```javascript
// File: scripts/phase1/compare-types.js

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

function extractInterfaces(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true
  );

  const interfaces = {};

  function visit(node) {
    if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) {
      const name = node.name.text;
      const members = [];

      if (node.members) {
        node.members.forEach(member => {
          if (ts.isPropertySignature(member)) {
            const propName = member.name.text;
            const optional = member.questionToken ? '?' : '';
            members.push(`${propName}${optional}`);
          }
        });
      }

      interfaces[name] = members.sort();
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return interfaces;
}

// Compare type definitions
const locations = [
  'packages/types/src/index.ts',
  'apps/mobile/src/types/index.ts',
  'apps/web/src/types/index.ts'
];

const allInterfaces = {};

locations.forEach(loc => {
  if (fs.existsSync(loc)) {
    console.log(`\nAnalyzing: ${loc}`);
    const interfaces = extractInterfaces(loc);
    allInterfaces[loc] = interfaces;

    Object.keys(interfaces).forEach(name => {
      console.log(`  ${name}: ${interfaces[name].length} properties`);
    });
  }
});

// Find differences
console.log('\n=== DIFFERENCES FOUND ===');
const typeNames = new Set();
Object.values(allInterfaces).forEach(interfaces => {
  Object.keys(interfaces).forEach(name => typeNames.add(name));
});

typeNames.forEach(typeName => {
  const definitions = [];
  Object.keys(allInterfaces).forEach(location => {
    if (allInterfaces[location][typeName]) {
      definitions.push({
        location,
        properties: allInterfaces[location][typeName]
      });
    }
  });

  if (definitions.length > 1) {
    // Check if they're different
    const firstDef = JSON.stringify(definitions[0].properties);
    const hasDifferences = definitions.some(def =>
      JSON.stringify(def.properties) !== firstDef
    );

    if (hasDifferences) {
      console.log(`\n${typeName} has different definitions:`);
      definitions.forEach(def => {
        console.log(`  ${def.location}: ${def.properties.join(', ')}`);
      });
    }
  }
});
```

### 2.3 Unify Types Script

```typescript
// File: scripts/phase1/unified-types.ts
// This will become packages/types/src/index.ts

// ============================================
// SINGLE SOURCE OF TRUTH FOR ALL TYPES
// ============================================

// Core User Types
export type UserRole = 'homeowner' | 'contractor' | 'admin';

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;  // Now includes admin
  phone?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;

  // Profile extensions
  profile?: UserProfile;
  company?: Company;
}

export interface UserProfile {
  bio?: string;
  skills?: string[];
  certifications?: Certification[];
  rating?: number;
  total_reviews?: number;
  verified?: boolean;
  background_check_status?: 'pending' | 'passed' | 'failed';
  background_check_date?: string;
}

// Job Types
export interface Job {
  id: string;
  homeowner_id: string;
  title: string;
  description: string;
  category: JobCategory;
  status: JobStatus;
  budget_min?: number;
  budget_max?: number;
  urgency?: 'low' | 'medium' | 'high' | 'emergency';
  location?: Location;
  images?: string[];
  created_at: string;
  updated_at: string;
  published_at?: string;
  completed_at?: string;

  // Relations (populated by joins)
  homeowner?: User;
  bids?: Bid[];
  selected_bid?: Bid;
  milestones?: JobMilestone[];
}

export type JobStatus = 'draft' | 'open' | 'in_progress' | 'completed' | 'cancelled';
export type JobCategory = 'plumbing' | 'electrical' | 'roofing' | 'painting' | 'landscaping' | 'general' | 'hvac' | 'flooring' | 'other';

// Bid Types
export interface Bid {
  id: string;
  job_id: string;
  contractor_id: string;
  amount: number;
  message?: string;
  status: BidStatus;
  estimated_duration_days?: number;
  materials_included: boolean;
  warranty_months: number;
  created_at: string;
  updated_at: string;

  // Relations
  job?: Job;
  contractor?: User;
}

export type BidStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn';

// Payment Types
export interface Payment {
  id: string;
  job_id: string;
  bid_id: string;
  amount: number;
  status: PaymentStatus;
  stripe_payment_intent_id?: string;
  stripe_charge_id?: string;
  escrow_released_at?: string;
  created_at: string;
  updated_at: string;
}

export type PaymentStatus = 'pending' | 'processing' | 'in_escrow' | 'released' | 'completed' | 'failed' | 'refunded';

// Helper type for database field conversion
export type SnakeCase<T> = {
  [K in keyof T as K extends string ? CamelToSnake<K> : K]: T[K]
};

type CamelToSnake<S extends string> = S extends `${infer T}${infer U}` ?
  U extends Uncapitalize<U> ? `${Lowercase<T>}${CamelToSnake<U>}` :
  `${Lowercase<T>}_${CamelToSnake<U>}` : S;

// Export all types from single location
export * from './auth';
export * from './database';
export * from './api';
export * from './ui';
```

### 2.4 Update Both Apps to Use Unified Types

```bash
#!/bin/bash
# File: scripts/phase1/update-imports.sh

echo "=== UPDATING TYPE IMPORTS ==="

# Step 1: Update mobile package.json
echo "1. Adding @mintenance/types to mobile dependencies..."
cd apps/mobile
npm install @mintenance/types@file:../../packages/types
cd ../..

# Step 2: Update all mobile imports
echo "2. Updating mobile imports..."
find apps/mobile/src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i.bak \
  "s|from '\.\./types'|from '@mintenance/types'|g" {} \;
find apps/mobile/src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i.bak \
  "s|from '\.\./\.\./types'|from '@mintenance/types'|g" {} \;

# Step 3: Delete duplicate type files
echo "3. Removing duplicate type definitions..."
rm -rf apps/mobile/src/types/index.ts
rm -rf apps/mobile/src/types/database.ts
rm -rf apps/mobile/src/types/database.refactored.ts
# Keep database/ subdirectory temporarily for gradual migration

# Step 4: Update web imports
echo "4. Updating web imports..."
find apps/web -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i.bak \
  "s|from '\.\./types/local'|from '@mintenance/types'|g" {} \;

# Step 5: Type check both apps
echo "5. Running type check..."
npm run type-check

echo "=== TYPE IMPORT UPDATE COMPLETE ==="
```

---

## 🧹 STEP 3: CLEANUP SCRIPT

```bash
#!/bin/bash
# File: scripts/phase1/cleanup.sh

echo "=== CLEANUP STARTING ==="

# Remove backup files
echo "1. Removing backup files..."
find . -name "*.backup" -type f -delete
find . -name "*.bak" -type f -delete
find . -name "*.old" -type f -delete
find . -name "*.refactored.*" -type f -delete

# Remove from git
echo "2. Removing from git history..."
git rm -r --cached $(find . -name "*.backup")
git rm -r --cached $(find . -name "*.refactored.*")

# Clean node_modules
echo "3. Cleaning node_modules..."
rm -rf node_modules
rm -rf apps/web/node_modules
rm -rf apps/mobile/node_modules
rm -rf packages/*/node_modules

# Reinstall with fresh lock
echo "4. Fresh install..."
npm ci

echo "=== CLEANUP COMPLETE ==="
```

---

## ✅ VALIDATION SCRIPT

```bash
#!/bin/bash
# File: scripts/phase1/validate.sh

set -e

echo "=== PHASE 1 VALIDATION ==="

# Database validation
echo "1. Validating database..."
psql $DATABASE_URL << 'EOF'
-- Check all tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('profiles', 'companies', 'jobs', 'bids', 'saved_jobs', 'job_views');

-- Check no duplicate tables
SELECT table_name, COUNT(*)
FROM information_schema.tables
WHERE table_schema = 'public'
GROUP BY table_name
HAVING COUNT(*) > 1;
EOF

# Type validation
echo "2. Validating types..."
npm run type-check

# Import validation
echo "3. Checking imports..."
if grep -r "from.*\/types\/index" apps/mobile/src; then
  echo "ERROR: Mobile still has local type imports!"
  exit 1
fi

if grep -r "from.*\/types\/local" apps/web/src; then
  echo "ERROR: Web still has local type imports!"
  exit 1
fi

# Build validation
echo "4. Testing builds..."
cd apps/web && npm run build
cd ../mobile && npm run build
cd ../..

# Cleanup validation
echo "5. Checking for backup files..."
if find . -name "*.backup" -o -name "*.refactored.*" | grep .; then
  echo "ERROR: Backup files still exist!"
  exit 1
fi

echo "=== ✅ PHASE 1 VALIDATION PASSED ==="
```

---

## 🔄 ROLLBACK SCRIPT

```bash
#!/bin/bash
# File: scripts/phase1/rollback.sh

echo "=== EMERGENCY ROLLBACK ==="

# Restore database migrations
echo "1. Restoring database..."
rm -rf supabase/migrations
mv supabase/migrations_backup_* supabase/migrations
npx supabase db reset --local

# Restore type files
echo "2. Restoring types..."
git checkout HEAD -- apps/mobile/src/types/
git checkout HEAD -- apps/web/src/types/
git checkout HEAD -- packages/types/

# Restore package.json
echo "3. Restoring dependencies..."
git checkout HEAD -- apps/mobile/package.json
git checkout HEAD -- apps/web/package.json

# Reinstall
echo "4. Reinstalling..."
npm ci

echo "=== ROLLBACK COMPLETE ==="
```

---

## 📝 EXECUTION CHECKLIST

### Pre-execution
- [ ] Create full database backup
- [ ] Create git branch for changes
- [ ] Notify team of maintenance window
- [ ] Test rollback script works

### Database Consolidation
- [ ] Run audit-database.sh
- [ ] Review duplicate_tables.txt
- [ ] Run consolidate-migrations.sh
- [ ] Run execute-migration.sh
- [ ] Verify with psql queries

### Type Unification
- [ ] Run audit-types.sh
- [ ] Run compare-types.js
- [ ] Update packages/types/src/index.ts
- [ ] Run update-imports.sh
- [ ] Fix any type errors

### Cleanup
- [ ] Run cleanup.sh
- [ ] Verify no .backup files remain
- [ ] Check git status is clean

### Validation
- [ ] Run validate.sh
- [ ] Test both apps compile
- [ ] Test both apps run
- [ ] Run existing test suites

### Post-execution
- [ ] Commit changes
- [ ] Document any issues found
- [ ] Update team on completion
- [ ] Monitor for 24 hours

---

## ⚠️ COMMON ISSUES & FIXES

### Issue 1: Type errors after unification
```typescript
// Fix: Add type assertions temporarily
const user = apiResponse as unknown as User;

// Then fix the actual API response type
```

### Issue 2: Database migration fails
```bash
# Reset and try again
npx supabase db reset --local
# Apply one migration at a time
```

### Issue 3: Import paths not found
```bash
# Rebuild packages
cd packages/types && npm run build
# Clear cache
npm cache clean --force
```

### Issue 4: Tests fail after changes
```bash
# Update test mocks to use new types
# Update test database seeds
```

---

## 📊 SUCCESS METRICS

After Phase 1 completion, verify:

1. **Single type definition per entity** ✓
2. **No duplicate database tables** ✓
3. **Both apps compile without errors** ✓
4. **All tests pass** ✓
5. **No .backup files in repo** ✓
6. **Mobile imports @mintenance/types** ✓
7. **Database migrations reduced from 143 to ~10** ✓

---

**Ready to execute Phase 1?** Start with the database audit script.