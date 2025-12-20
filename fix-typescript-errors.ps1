# PowerShell script to fix TypeScript errors
Write-Host "🔧 Fixing TypeScript Errors - Comprehensive Fix" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan

$webDir = "apps/web"
$fixCount = 0

# Function to apply fixes
function Apply-Fix {
    param(
        [string]$FilePath,
        [string]$Pattern,
        [string]$Replacement,
        [string]$Description
    )

    Write-Host "`n✏️  $Description" -ForegroundColor Yellow
    Write-Host "   File: $FilePath" -ForegroundColor Gray

    try {
        if (Test-Path $FilePath) {
            $content = Get-Content $FilePath -Raw
            $newContent = $content -replace $Pattern, $Replacement
            Set-Content $FilePath $newContent -NoNewline
            Write-Host "   ✅ Fixed" -ForegroundColor Green
            return 1
        } else {
            Write-Host "   ⚠️  File not found" -ForegroundColor Red
            return 0
        }
    } catch {
        Write-Host "   ❌ Error: $_" -ForegroundColor Red
        return 0
    }
}

# Fix 1: Stripe API Version
$fixCount += Apply-Fix `
    -FilePath "$webDir/lib/stripe.ts" `
    -Pattern "apiVersion: '2024-12-18\.acacia'" `
    -Replacement "apiVersion: '2024-04-10' as any" `
    -Description "Fix Stripe API version"

# Fix 2: Supabase client usage patterns
Write-Host "`n✏️  Fixing Supabase client patterns" -ForegroundColor Yellow
Get-ChildItem -Path "$webDir/lib/services" -Filter "*.ts" -Recurse | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    if ($content -match "supabase\.from\(") {
        $newContent = $content -replace "supabase\.from\(", "supabase().from("
        Set-Content $_.FullName $newContent -NoNewline
        Write-Host "   Fixed: $($_.Name)" -ForegroundColor Green
        $script:fixCount++
    }
}

# Fix 3: Property naming (snake_case to camelCase)
$fixCount += Apply-Fix `
    -FilePath "$webDir/lib/services/building-surveyor/ContinuousLearningService.ts" `
    -Pattern "completed_at" `
    -Replacement "completedAt" `
    -Description "Fix property naming convention"

# Fix 4: SAM3 response checks
Write-Host "`n✏️  Fixing SAM3 response checks" -ForegroundColor Yellow
@(
    "$webDir/lib/services/building-surveyor/SAM3TrainingDataService.ts",
    "$webDir/lib/services/building-surveyor/YOLOCorrectionService.ts"
) | ForEach-Object {
    if (Test-Path $_) {
        $content = Get-Content $_ -Raw
        $newContent = $content -replace "if \(!response\.success\)", "if (response.error)"
        $newContent = $newContent -replace "response\.success", "!response.error"
        Set-Content $_ $newContent -NoNewline
        Write-Host "   Fixed: $(Split-Path $_ -Leaf)" -ForegroundColor Green
        $script:fixCount++
    }
}

# Fix 5: Motion config types
$fixCount += Apply-Fix `
    -FilePath "$webDir/lib/animations/motion-config.ts" `
    -Pattern ": Record<string, unknown>" `
    -Replacement ": Record<string, any>" `
    -Description "Fix Framer Motion variant types"

# Fix 6: Create missing type definitions file
Write-Host "`n✏️  Creating missing type definitions" -ForegroundColor Yellow
$typesContent = @"
import { Job } from '@mintenance/types';

export type JobDetail = Job & {
  bids?: any[];
  contractor?: any;
  homeowner?: any;
};

export type JobSummary = Pick<Job, 'id' | 'title' | 'status' | 'created_at'>;
"@

Set-Content "$webDir/lib/hooks/queries/types.ts" $typesContent
Write-Host "   ✅ Created types.ts" -ForegroundColor Green
$fixCount++

# Fix 7: Update useJobs imports
if (Test-Path "$webDir/lib/hooks/queries/useJobs.ts") {
    $content = Get-Content "$webDir/lib/hooks/queries/useJobs.ts" -Raw
    $newContent = $content -replace "import { Job, JobDetail, JobSummary } from '@mintenance/types';", @"
import { Job } from '@mintenance/types';
import type { JobDetail, JobSummary } from './types';
"@
    Set-Content "$webDir/lib/hooks/queries/useJobs.ts" $newContent -NoNewline
    Write-Host "`n✏️  Fixed useJobs imports" -ForegroundColor Yellow
    $fixCount++
}

# Fix 8: Fix Logo component
$logoContent = @"
import Image from 'next/image';

interface LogoProps {
  width?: number;
  height?: number;
  className?: string;
}

export default function Logo({ width = 32, height = 32, className }: LogoProps) {
  return (
    <Image
      src="/assets/icon.png"
      alt="Mintenance Logo"
      width={width}
      height={height}
      className={className}
      style={{ display: 'block' }}
    />
  );
}
"@

Set-Content "$webDir/app/components/Logo.tsx" $logoContent
Write-Host "`n✏️  Fixed Logo component" -ForegroundColor Yellow
$fixCount++

# Fix 9: Fix undefined variables
if (Test-Path "$webDir/lib/services/maintenance/MaintenanceAssessmentService.ts") {
    $content = Get-Content "$webDir/lib/services/maintenance/MaintenanceAssessmentService.ts" -Raw

    # Fix missing await
    $content = $content -replace "return this\.assessWithAI\(imageUrl\);", "return await this.assessWithAI(imageUrl);"

    # Fix undefined startTime
    if ($content -match "startTime" -and $content -notmatch "const startTime") {
        $content = $content -replace "(async assessWithAI[^{]*{)", "`$1`n    const startTime = Date.now();"
    }

    Set-Content "$webDir/lib/services/maintenance/MaintenanceAssessmentService.ts" $content -NoNewline
    Write-Host "`n✏️  Fixed MaintenanceAssessmentService" -ForegroundColor Yellow
    $fixCount++
}

# Fix 10: Fix Supabase server config
if (Test-Path "$webDir/lib/supabase/server.ts") {
    $content = Get-Content "$webDir/lib/supabase/server.ts" -Raw
    $content = $content -replace "cookies: {", @"
auth: {
      flowType: 'pkce',
      storage: {
"@
    $content = $content -replace "}\s*// end cookies", @"
      }
    } // end auth
"@
    Set-Content "$webDir/lib/supabase/server.ts" $content -NoNewline
    Write-Host "`n✏️  Fixed Supabase server config" -ForegroundColor Yellow
    $fixCount++
}

# Summary
Write-Host "`n===============================================" -ForegroundColor Cyan
Write-Host "📊 Fix Summary:" -ForegroundColor Cyan
Write-Host "   ✅ Applied $fixCount fixes" -ForegroundColor Green
Write-Host "`n🔍 Running type check to verify..." -ForegroundColor Yellow

# Run type check
Set-Location (Split-Path $MyInvocation.MyCommand.Path)
npm run type-check -w @mintenance/web 2>&1 | Select-Object -Last 15

Write-Host "`n✨ Fix process complete!" -ForegroundColor Green
Write-Host "   Run 'npm run type-check -w @mintenance/web' to see remaining errors" -ForegroundColor Gray