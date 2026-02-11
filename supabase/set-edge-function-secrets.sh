#!/bin/bash

# Script to set Edge Function environment variables/secrets
# Run this after logging into Supabase CLI with: npx supabase login
#
# REQUIRED: Set these environment variables before running:
#   STRIPE_SECRET_KEY  - Your Stripe secret key
#   SUPABASE_SERVICE_ROLE_KEY - Your Supabase service role key
#   SUPABASE_PROJECT_REF - Your Supabase project reference ID

if [ -z "$STRIPE_SECRET_KEY" ]; then
    echo "ERROR: STRIPE_SECRET_KEY environment variable is not set"
    echo "Set it with: export STRIPE_SECRET_KEY=your_key_here"
    exit 1
fi
if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable is not set"
    echo "Set it with: export SUPABASE_SERVICE_ROLE_KEY=your_key_here"
    exit 1
fi
if [ -z "$SUPABASE_PROJECT_REF" ]; then
    echo "ERROR: SUPABASE_PROJECT_REF environment variable is not set"
    echo "Set it with: export SUPABASE_PROJECT_REF=your_project_ref_here"
    exit 1
fi

echo "Setting Edge Function secrets for setup-contractor-payout..."

# Set secrets one by one
npx supabase secrets set STRIPE_SECRET_KEY="$STRIPE_SECRET_KEY" --project-ref "$SUPABASE_PROJECT_REF"

npx supabase secrets set APP_URL="http://localhost:3000" --project-ref "$SUPABASE_PROJECT_REF"

npx supabase secrets set SUPABASE_URL="https://${SUPABASE_PROJECT_REF}.supabase.co" --project-ref "$SUPABASE_PROJECT_REF"

npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" --project-ref "$SUPABASE_PROJECT_REF"

echo "Secrets set successfully!"
echo ""
echo "Note: Edge Functions will automatically restart to pick up new secrets."
echo "You may need to wait a few seconds before testing again."
