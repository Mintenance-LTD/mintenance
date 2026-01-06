#!/bin/bash
# Phase 1: Database Audit Script

echo "=== DATABASE AUDIT STARTING ==="

# Check if we're using local Supabase
echo "1. Checking Supabase configuration..."
if [ -f ".env.local" ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
fi

# List all migrations in order
echo "2. Listing all migrations..."
ls -la supabase/migrations/ > migrations_list.txt
echo "Found $(ls supabase/migrations/*.sql 2>/dev/null | wc -l) migration files"

# Find duplicate table definitions
echo "3. Finding duplicate table definitions..."
grep -r "CREATE TABLE" supabase/migrations/ | \
  awk -F: '{print $2}' | \
  sed 's/CREATE TABLE IF NOT EXISTS//g' | \
  sed 's/CREATE TABLE//g' | \
  sed 's/(.*//g' | \
  sed 's/[[:space:]]//g' | \
  sed 's/"//g' | \
  sed 's/public\.//g' | \
  sort | uniq -d > duplicate_tables.txt

echo "Duplicate tables found:"
if [ -s duplicate_tables.txt ]; then
    cat duplicate_tables.txt
else
    echo "No duplicate tables found"
fi

# Find conflicting column definitions
echo "4. Checking for conflicting columns..."
if [ -s duplicate_tables.txt ]; then
    while IFS= read -r table; do
        echo "Analyzing table: $table"
        grep -A 20 "CREATE TABLE.*$table" supabase/migrations/*.sql 2>/dev/null | \
            grep -E "^\s+\w+\s+" > temp_${table}_columns.txt 2>/dev/null || true
    done < duplicate_tables.txt
fi

echo "=== AUDIT COMPLETE ==="
echo "Results saved to: migrations_list.txt, duplicate_tables.txt"