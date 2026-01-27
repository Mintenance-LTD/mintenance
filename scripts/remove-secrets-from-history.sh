#!/bin/bash

# CRITICAL SECURITY: Remove exposed secrets from Git history
# This script uses BFG Repo-Cleaner to remove sensitive files from Git history
# Run this AFTER rotating all secrets

echo "================================================"
echo "SENSITIVE DATA REMOVAL FROM GIT HISTORY"
echo "================================================"
echo ""
echo "⚠️  WARNING: This will rewrite Git history!"
echo "⚠️  Ensure all team members are aware before proceeding"
echo "⚠️  Make sure you have rotated ALL secrets first!"
echo ""
read -p "Have you rotated all secrets? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "❌ Please rotate all secrets first!"
    echo "Visit:"
    echo "  - Supabase: https://supabase.com/dashboard/project/[PROJECT_ID]/settings/api"
    echo "  - Stripe: https://dashboard.stripe.com/apikeys"
    echo "  - OpenAI: https://platform.openai.com/api-keys"
    echo "  - SendGrid: https://app.sendgrid.com/settings/api_keys"
    echo "  - Twilio: https://console.twilio.com/"
    echo "  - Google Maps: https://console.cloud.google.com/apis/credentials"
    exit 1
fi

# Check if BFG is installed
if ! command -v bfg &> /dev/null && ! test -f bfg.jar; then
    echo "❌ BFG Repo-Cleaner not found!"
    echo ""
    echo "Install BFG first:"
    echo "  Mac: brew install bfg"
    echo "  Or download: wget https://repo1.maven.org/maven2/com/madgag/bfg/1.14.0/bfg-1.14.0.jar"
    exit 1
fi

# Backup current branch
current_branch=$(git rev-parse --abbrev-ref HEAD)
echo "📦 Creating backup of current branch: $current_branch"
git branch backup-before-cleanup-$(date +%Y%m%d-%H%M%S)

# Step 1: Remove sensitive files from current working directory
echo ""
echo "Step 1: Removing sensitive files from working directory..."
echo "================================================"

# Remove .env.local if it exists
if [ -f ".env.local" ]; then
    echo "❌ Removing .env.local from working directory..."
    rm -f .env.local
    git rm --cached .env.local 2>/dev/null || true
fi

# Remove hardcoded secrets script if it exists
if [ -f "scripts/apply-migration-direct.js" ]; then
    echo "❌ Removing apply-migration-direct.js..."
    rm -f scripts/apply-migration-direct.js
    git rm --cached scripts/apply-migration-direct.js 2>/dev/null || true
fi

# Commit the removals
git add .
git commit -m "security: remove exposed secrets from repository" 2>/dev/null || echo "✅ Working directory already clean"

# Step 2: Create file with sensitive filenames to remove
echo ""
echo "Step 2: Creating list of sensitive files to remove from history..."
echo "================================================"

cat > sensitive-files.txt << EOF
.env.local
.env.production
.env.staging
.env.development.local
.env.test.local
.env.production.local
apply-migration-direct.js
secrets.json
credentials.json
EOF

echo "✅ Created sensitive-files.txt"

# Step 3: Create file with sensitive strings to replace
echo ""
echo "Step 3: Creating list of sensitive strings to replace..."
echo "================================================"

cat > sensitive-strings.txt << EOF


echo "✅ Created sensitive-strings.txt"

# Step 4: Clone repository with --mirror flag
echo ""
echo "Step 4: Creating mirror clone for history cleaning..."
echo "================================================"

repo_url=$(git config --get remote.origin.url)
temp_dir="temp-mirror-$(date +%Y%m%d-%H%M%S)"

echo "Cloning $repo_url to $temp_dir..."
git clone --mirror "$repo_url" "$temp_dir"
cd "$temp_dir"

# Step 5: Run BFG to remove files
echo ""
echo "Step 5: Running BFG to remove sensitive files from history..."
echo "================================================"

if command -v bfg &> /dev/null; then
    bfg --delete-files sensitive-files.txt
    bfg --replace-text ../sensitive-strings.txt
elif test -f ../bfg.jar; then
    java -jar ../bfg.jar --delete-files ../sensitive-files.txt
    java -jar ../bfg.jar --replace-text ../sensitive-strings.txt
else
    echo "❌ BFG not found!"
    exit 1
fi

# Step 6: Clean up the repository
echo ""
echo "Step 6: Running garbage collection..."
echo "================================================"

git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Step 7: Push changes
echo ""
echo "Step 7: Ready to push cleaned history..."
echo "================================================"
echo ""
echo "⚠️  FINAL WARNING: This will rewrite the entire repository history!"
echo "⚠️  All collaborators will need to re-clone the repository!"
echo ""
read -p "Push cleaned history to origin? (yes/no): " push_confirm

if [ "$push_confirm" = "yes" ]; then
    echo "🚀 Force pushing cleaned history..."
    git push --force --all
    git push --force --tags
    echo "✅ History cleaned and pushed!"
else
    echo "⏸️  Skipping push. To push later, run:"
    echo "    cd $temp_dir && git push --force --all && git push --force --tags"
fi

# Step 8: Clean up
cd ..
echo ""
echo "Step 8: Cleanup..."
echo "================================================"

rm -f sensitive-files.txt sensitive-strings.txt

echo ""
echo "✅ COMPLETE! Next steps:"
echo ""
echo "1. Verify secrets are rotated on all services"
echo "2. Update local .env.local with NEW credentials"
echo "3. Inform all team members to:"
echo "   - Delete their local repository"
echo "   - Re-clone the repository"
echo "   - Update their .env.local with new credentials"
echo "4. Monitor services for any unauthorized access"
echo "5. Enable 2FA on all service accounts"
echo ""
echo "📝 Security incident response completed at $(date)"
