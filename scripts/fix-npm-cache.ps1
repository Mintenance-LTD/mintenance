# Fix npm Cache and Dependency Issues
# Run this script to clean npm cache and regenerate package-lock.json
# PowerShell version for Windows

Write-Host "🔧 Fixing npm Cache and Dependencies..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Clean npm cache
Write-Host "📦 [1/5] Cleaning npm cache..." -ForegroundColor Yellow
npm cache clean --force
npm cache verify

# Step 2: Remove all node_modules
Write-Host ""
Write-Host "🗑️  [2/5] Removing all node_modules..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Remove-Item -Recurse -Force "node_modules"
}
if (Test-Path "apps/web/node_modules") {
    Remove-Item -Recurse -Force "apps/web/node_modules"
}
if (Test-Path "apps/mobile/node_modules") {
    Remove-Item -Recurse -Force "apps/mobile/node_modules"
}
Get-ChildItem -Path "packages" -Filter "node_modules" -Recurse -Directory | Remove-Item -Recurse -Force

# Step 3: Remove package-lock.json
Write-Host ""
Write-Host "🗑️  [3/5] Removing package-lock.json..." -ForegroundColor Yellow
if (Test-Path "package-lock.json") {
    Remove-Item -Force "package-lock.json"
}

# Step 4: Reinstall dependencies
Write-Host ""
Write-Host "📥 [4/5] Installing dependencies with --legacy-peer-deps..." -ForegroundColor Yellow
Write-Host "   This may take 5-10 minutes..." -ForegroundColor Gray
npm install --legacy-peer-deps

# Step 5: Verify installation
Write-Host ""
Write-Host "✅ [5/5] Verifying installation..." -ForegroundColor Yellow

# Check TypeScript
Write-Host "   Checking TypeScript..." -ForegroundColor Gray
$tscVersion = npx tsc --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ TypeScript: $tscVersion" -ForegroundColor Green
} else {
    Write-Host "   ❌ TypeScript not found!" -ForegroundColor Red
}

# Check if package-lock.json was created
if (Test-Path "package-lock.json") {
    Write-Host "   ✅ package-lock.json created" -ForegroundColor Green
} else {
    Write-Host "   ❌ package-lock.json not created!" -ForegroundColor Red
}

Write-Host ""
Write-Host "✅ Done! Next steps:" -ForegroundColor Green
Write-Host "   1. Run: npm run type-check" -ForegroundColor White
Write-Host "   2. Run: npm run build:packages" -ForegroundColor White
Write-Host "   3. If successful, commit package-lock.json:" -ForegroundColor White
Write-Host "      git add package-lock.json" -ForegroundColor Gray
Write-Host "      git commit -m 'fix: regenerate package-lock.json to fix npm ci timeouts'" -ForegroundColor Gray
Write-Host "      git push" -ForegroundColor Gray

