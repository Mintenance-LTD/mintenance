#!/bin/bash

# MFA Setup Script for Mintenance Application
# This script automates the installation and setup of MFA

set -e

echo "=========================================="
echo "MFA Setup Script for Mintenance"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running from project root
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Please run this script from the project root directory${NC}"
    exit 1
fi

echo -e "${GREEN}Step 1: Installing NPM dependencies...${NC}"
cd apps/web
npm install speakeasy qrcode
npm install --save-dev @types/speakeasy @types/qrcode
cd ../..
echo -e "${GREEN}Dependencies installed successfully!${NC}"
echo ""

echo -e "${GREEN}Step 2: Checking database connection...${NC}"
if command -v npx &> /dev/null; then
    echo "Supabase CLI detected"
    # Check if Supabase is set up
    if [ -f "supabase/config.toml" ]; then
        echo -e "${GREEN}Supabase configuration found${NC}"
    else
        echo -e "${YELLOW}Warning: No Supabase configuration found. Please set up Supabase CLI first.${NC}"
    fi
else
    echo -e "${YELLOW}Warning: Supabase CLI not found. Please install it with: npm install -g supabase${NC}"
fi
echo ""

echo -e "${GREEN}Step 3: Database Migration${NC}"
echo "You need to apply the MFA migration to your database."
echo ""
echo "Choose an option:"
echo "1) Apply migration using Supabase CLI (local)"
echo "2) Apply migration using Supabase CLI (production)"
echo "3) Skip migration (I'll do it manually)"
echo ""
read -p "Enter your choice (1-3): " choice

case $choice in
    1)
        echo "Applying migration to local database..."
        npx supabase db diff --local
        npx supabase db push
        echo -e "${GREEN}Local migration applied!${NC}"
        ;;
    2)
        echo -e "${YELLOW}Warning: This will modify your production database!${NC}"
        read -p "Are you sure? (yes/no): " confirm
        if [ "$confirm" = "yes" ]; then
            npx supabase db push
            echo -e "${GREEN}Production migration applied!${NC}"
        else
            echo "Migration cancelled"
        fi
        ;;
    3)
        echo -e "${YELLOW}Skipping migration. Remember to apply it manually!${NC}"
        echo "Migration file: supabase/migrations/20251202000001_add_mfa_support.sql"
        ;;
    *)
        echo -e "${RED}Invalid choice. Skipping migration.${NC}"
        ;;
esac
echo ""

echo -e "${GREEN}Step 4: Updating MFA Service${NC}"
echo "The MFA service needs to be updated to use real implementations."
echo ""
echo "Please manually update the following in apps/web/lib/mfa/mfa-service.ts:"
echo "1. Uncomment lines 15-16 (import speakeasy and qrcode)"
echo "2. Replace mock implementations on lines 68-77, 83-86, 230-237, 652-659"
echo ""
read -p "Press Enter when you've made these changes, or Ctrl+C to exit..."
echo ""

echo -e "${GREEN}Step 5: Setting up cron job for cleanup${NC}"
echo "You need to set up a daily cron job to clean up expired MFA records."
echo ""
echo "Create a cron endpoint at: apps/web/app/api/cron/mfa-cleanup/route.ts"
echo ""
echo "Example code:"
echo "=============================================="
cat << 'EOF'
import { serverSupabase } from '@/lib/api/supabaseServer';

export async function GET() {
  await serverSupabase.rpc('cleanup_expired_mfa_records');
  return new Response('OK');
}
EOF
echo "=============================================="
echo ""
echo "Then configure Vercel Cron (vercel.json):"
echo "=============================================="
cat << 'EOF'
{
  "crons": [
    {
      "path": "/api/cron/mfa-cleanup",
      "schedule": "0 2 * * *"
    }
  ]
}
EOF
echo "=============================================="
echo ""
read -p "Press Enter to continue..."
echo ""

echo -e "${GREEN}Step 6: Testing the implementation${NC}"
echo ""
echo "To test MFA:"
echo "1. Start the development server: npm run dev"
echo "2. Navigate to: http://localhost:3000/settings/security/mfa"
echo "3. Enable MFA and scan QR code with authenticator app"
echo "4. Save backup codes"
echo "5. Log out and test login with MFA"
echo ""
read -p "Press Enter to continue..."
echo ""

echo -e "${GREEN}=========================================="
echo "MFA Setup Complete!"
echo "==========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Review MFA_IMPLEMENTATION_SUMMARY.md for detailed documentation"
echo "2. Test the MFA flow thoroughly"
echo "3. Set up monitoring for MFA events"
echo "4. Configure production encryption for TOTP secrets"
echo ""
echo -e "${YELLOW}Important Security Notes:${NC}"
echo "- Implement app-level encryption for TOTP secrets in production"
echo "- Set up monitoring for failed MFA attempts"
echo "- Review audit logs regularly"
echo "- Test account recovery flows"
echo ""
echo -e "${GREEN}Setup script completed successfully!${NC}"
