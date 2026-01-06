#!/bin/bash
# Script to apply consolidated migrations properly

echo "=== APPLYING CONSOLIDATED MIGRATIONS ==="

# Step 1: Stop Supabase
echo "1. Stopping Supabase..."
npx supabase stop

# Step 2: Temporarily move old migrations
echo "2. Moving old migrations temporarily..."
if [ ! -d "supabase/migrations_old_temp" ]; then
    mv supabase/migrations supabase/migrations_old_temp
fi

# Step 3: Create new migrations directory with consolidated files
echo "3. Setting up consolidated migrations..."
mkdir -p supabase/migrations
cp supabase/migrations_consolidated/*.sql supabase/migrations/ 2>/dev/null || true

# Remove the documentation file
rm -f supabase/migrations/DUPLICATE_ANALYSIS.md

# Step 4: Start Supabase fresh
echo "4. Starting Supabase with consolidated migrations..."
npx supabase start

# Step 5: Verify tables
echo ""
echo "5. Verifying tables created..."
sleep 5  # Give database time to initialize

npx supabase db query --local "
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('profiles', 'companies', 'jobs', 'bids', 'payments', 'notifications')
ORDER BY table_name;"

echo ""
echo "=== MIGRATION APPLICATION COMPLETE ===
echo ""
echo "Note: To restore original migrations, run:"
echo "  mv supabase/migrations_old_temp supabase/migrations"