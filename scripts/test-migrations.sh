#!/bin/bash
# Script to test consolidated database migrations

echo "=== TESTING CONSOLIDATED MIGRATIONS ==="

# Step 1: Reset database to clean state
echo "1. Resetting database..."
npx supabase db reset --local

# Step 2: Apply consolidated migrations one by one
echo ""
echo "2. Applying consolidated migrations..."
for migration in supabase/migrations_consolidated/*.sql; do
    if [[ "$migration" == *"DUPLICATE_ANALYSIS.md" ]]; then
        continue
    fi
    echo "Applying: $(basename $migration)"
    npx supabase db push --local < "$migration"
    if [ $? -ne 0 ]; then
        echo "❌ Failed to apply migration: $migration"
        exit 1
    fi
done

# Step 3: Verify tables exist
echo ""
echo "3. Verifying tables..."
npx supabase db query --local "
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;" > tables_list.txt

echo "Tables created:"
cat tables_list.txt

# Step 4: Count tables
TABLE_COUNT=$(grep -c "│" tables_list.txt || echo 0)
echo ""
echo "Total tables created: $TABLE_COUNT"

# Step 5: Test critical tables
echo ""
echo "4. Testing critical tables..."
npx supabase db query --local "
-- Check profiles table
SELECT COUNT(*) as profiles_count FROM public.profiles;

-- Check jobs table
SELECT COUNT(*) as jobs_count FROM public.jobs;

-- Check bids table
SELECT COUNT(*) as bids_count FROM public.bids;

-- Check payments table
SELECT COUNT(*) as payments_count FROM public.payments;"

echo ""
echo "=== MIGRATION TEST COMPLETE ==="