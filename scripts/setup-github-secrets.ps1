#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Setup GitHub Secrets for Mintenance CI/CD Pipeline
    
.DESCRIPTION
    This script helps you add all required GitHub secrets to your repository.
    It supports both GitHub CLI and GitHub API methods.
    
.EXAMPLE
    .\scripts\setup-github-secrets.ps1
#>

param(
    [switch]$UseApi,
    [string]$GitHubToken
)

$ErrorActionPreference = "Stop"

# Repository info
$repo = "Mintenance-LTD/mintenance"
$repoUrl = "https://github.com/$repo"

Write-Host "🔐 GitHub Secrets Setup for $repo" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host ""

# Check if GitHub CLI is installed
$ghInstalled = $false
try {
    $ghVersion = gh --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        $ghInstalled = $true
        Write-Host "✅ GitHub CLI is installed" -ForegroundColor Green
    }
} catch {
    $ghInstalled = $false
}

# Function to add secret via GitHub CLI
function Add-SecretViaCLI {
    param(
        [string]$SecretName,
        [string]$SecretValue,
        [string]$Description = ""
    )
    
    Write-Host "Adding $SecretName..." -ForegroundColor Yellow
    $result = gh secret set $SecretName --body $SecretValue --repo $repo 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ $SecretName added successfully" -ForegroundColor Green
        return $true
    } else {
        Write-Host "  ❌ Failed to add $SecretName" -ForegroundColor Red
        Write-Host "  Error: $result" -ForegroundColor Red
        return $false
    }
}

# Function to add secret via GitHub API
function Add-SecretViaAPI {
    param(
        [string]$SecretName,
        [string]$SecretValue,
        [string]$GitHubToken
    )
    
    Write-Host "Adding $SecretName via API..." -ForegroundColor Yellow
    
    # Get repository public key for encryption
    $headers = @{
        "Authorization" = "Bearer $GitHubToken"
        "Accept" = "application/vnd.github.v3+json"
    }
    
    try {
        # Get public key
        $keyResponse = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/actions/secrets/public-key" -Headers $headers -Method Get
        $publicKey = $keyResponse.key
        $keyId = $keyResponse.key_id
        
        # Encrypt the secret using libsodium (requires libsodium-net or similar)
        # For PowerShell, we'll use a workaround with base64 encoding
        # Note: GitHub requires proper libsodium encryption, so this is a simplified version
        # In production, you'd need to use proper encryption
        
        Write-Host "  ⚠️  API method requires proper libsodium encryption" -ForegroundColor Yellow
        Write-Host "  💡 Please use GitHub CLI method instead (recommended)" -ForegroundColor Yellow
        return $false
        
    } catch {
        Write-Host "  ❌ Failed to add $SecretName via API" -ForegroundColor Red
        Write-Host "  Error: $_" -ForegroundColor Red
        return $false
    }
}

# Function to prompt for secret value
function Get-SecretValue {
    param(
        [string]$SecretName,
        [string]$Description,
        [string]$Example = "",
        [switch]$GenerateRandom = $false
    )
    
    Write-Host ""
    Write-Host "📝 $SecretName" -ForegroundColor Cyan
    if ($Description) {
        Write-Host "   $Description" -ForegroundColor Gray
    }
    if ($Example) {
        Write-Host "   Example: $Example" -ForegroundColor Gray
    }
    
    if ($GenerateRandom) {
        Write-Host "   Generating random value..." -ForegroundColor Yellow
        if ($SecretName -like "*SECRET*" -or $SecretName -like "*JWT*") {
            # Generate a secure random string
            $bytes = New-Object byte[] 64
            [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
            $randomValue = [Convert]::ToBase64String($bytes)
            Write-Host "   Generated: $($randomValue.Substring(0, 20))..." -ForegroundColor Green
            return $randomValue
        } elseif ($SecretName -like "*CRON*") {
            $bytes = New-Object byte[] 32
            [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
            $randomValue = [Convert]::ToHexString($bytes).ToLower()
            Write-Host "   Generated: $($randomValue.Substring(0, 20))..." -ForegroundColor Green
            return $randomValue
        }
    }
    
    $value = Read-Host "   Enter value (or press Enter to skip)"
    if ([string]::IsNullOrWhiteSpace($value)) {
        return $null
    }
    return $value
}

# Main execution
Write-Host ""
Write-Host "Choose your method:" -ForegroundColor Yellow
Write-Host "1. GitHub CLI (recommended - requires 'gh auth login' first)" -ForegroundColor White
Write-Host "2. Manual instructions" -ForegroundColor White
Write-Host ""

$method = Read-Host "Enter choice (1 or 2)"

if ($method -eq "1" -and -not $ghInstalled) {
    Write-Host ""
    Write-Host "⚠️  GitHub CLI is not installed" -ForegroundColor Yellow
    Write-Host "Installing GitHub CLI..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please run this command manually:" -ForegroundColor Cyan
    Write-Host "  winget install --id GitHub.cli" -ForegroundColor White
    Write-Host ""
    Write-Host "Then run this script again." -ForegroundColor Yellow
    exit 1
}

if ($method -eq "1" -and $ghInstalled) {
    # Check if authenticated
    try {
        $authStatus = gh auth status 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Host ""
            Write-Host "⚠️  Not authenticated with GitHub CLI" -ForegroundColor Yellow
            Write-Host "Please run: gh auth login" -ForegroundColor Cyan
            exit 1
        }
    } catch {
        Write-Host ""
        Write-Host "⚠️  Not authenticated with GitHub CLI" -ForegroundColor Yellow
        Write-Host "Please run: gh auth login" -ForegroundColor Cyan
        exit 1
    }
    
    Write-Host ""
    Write-Host "✅ Authenticated with GitHub CLI" -ForegroundColor Green
    Write-Host ""
    
    # Define all secrets with descriptions
    $secrets = @(
        @{
            Name = "VERCEL_TOKEN"
            Description = "Vercel personal access token for deployments"
            Example = "Get from: https://vercel.com/account/tokens"
            Generate = $false
        },
        @{
            Name = "VERCEL_ORG_ID"
            Description = "Vercel organization ID"
            Example = "Run: vercel whoami (after login)"
            Generate = $false
        },
        @{
            Name = "VERCEL_PROJECT_ID"
            Description = "Vercel project ID"
            Example = "Check .vercel/project.json after first deployment"
            Generate = $false
        },
        @{
            Name = "EXPO_TOKEN"
            Description = "Expo access token for mobile app builds"
            Example = "Get from: https://expo.dev/accounts/[username]/settings/access-tokens"
            Generate = $false
        },
        @{
            Name = "SUPABASE_URL"
            Description = "Supabase project URL"
            Example = "https://your-project.supabase.co"
            Generate = $false
        },
        @{
            Name = "SUPABASE_ANON_KEY"
            Description = "Supabase anonymous key"
            Example = "Get from Supabase Dashboard → Settings → API"
            Generate = $false
        },
        @{
            Name = "SUPABASE_SERVICE_ROLE_KEY"
            Description = "Supabase service role key (KEEP SECURE!)"
            Example = "Get from Supabase Dashboard → Settings → API"
            Generate = $false
        },
        @{
            Name = "STRIPE_PUBLISHABLE_KEY"
            Description = "Stripe publishable key"
            Example = "pk_test_... or pk_live_..."
            Generate = $false
        },
        @{
            Name = "STRIPE_SECRET_KEY"
            Description = "Stripe secret key (KEEP SECURE!)"
            Example = "sk_test_... or sk_live_..."
            Generate = $false
        },
        @{
            Name = "STRIPE_WEBHOOK_SECRET"
            Description = "Stripe webhook endpoint secret"
            Example = "whsec_... (from Stripe Dashboard → Webhooks)"
            Generate = $false
        },
        @{
            Name = "SENTRY_DSN"
            Description = "Sentry project DSN for error tracking"
            Example = "Get from Sentry Project Settings → Client Keys"
            Generate = $false
        },
        @{
            Name = "SENTRY_AUTH_TOKEN"
            Description = "Sentry auth token for source maps"
            Example = "Get from Sentry Settings → Auth Tokens"
            Generate = $false
        },
        @{
            Name = "JWT_SECRET"
            Description = "Random 64+ character string for JWT signing"
            Example = "Should be cryptographically secure random string"
            Generate = $true
        },
        @{
            Name = "CRON_SECRET"
            Description = "Random string for cron job authentication"
            Example = "Random hex string"
            Generate = $true
        },
        @{
            Name = "DATABASE_URL"
            Description = "PostgreSQL connection string"
            Example = "postgresql://user:pass@host:port/db"
            Generate = $false
        },
        @{
            Name = "REDIS_URL"
            Description = "Redis/Upstash connection URL"
            Example = "redis://... or https://..."
            Generate = $false
        },
        @{
            Name = "CODECOV_TOKEN"
            Description = "Codecov upload token for coverage reports"
            Example = "Get from Codecov Repository Settings"
            Generate = $false
        }
    )
    
    Write-Host "You'll be prompted for each secret value." -ForegroundColor Yellow
    Write-Host "Press Enter to skip a secret (you can add it later)." -ForegroundColor Yellow
    Write-Host ""
    
    $added = 0
    $skipped = 0
    
    foreach ($secret in $secrets) {
        $value = Get-SecretValue -SecretName $secret.Name -Description $secret.Description -Example $secret.Example -GenerateRandom:$secret.Generate
        
        if ($value) {
            if (Add-SecretViaCLI -SecretName $secret.Name -SecretValue $value) {
                $added++
            }
        } else {
            Write-Host "  ⏭️  Skipped $($secret.Name)" -ForegroundColor Gray
            $skipped++
        }
    }
    
    Write-Host ""
    Write-Host "=" * 60 -ForegroundColor Cyan
    Write-Host "✅ Setup Complete!" -ForegroundColor Green
    Write-Host "   Added: $added secrets" -ForegroundColor Green
    Write-Host "   Skipped: $skipped secrets" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "You can add the skipped secrets later by running this script again." -ForegroundColor Gray
    Write-Host ""
    
} else {
    # Manual instructions
    Write-Host ""
    Write-Host "📋 Manual Setup Instructions" -ForegroundColor Cyan
    Write-Host "=" * 60 -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. Go to: https://github.com/$repo/settings/secrets/actions" -ForegroundColor White
    Write-Host "2. Click 'New repository secret' for each secret below" -ForegroundColor White
    Write-Host ""
    Write-Host "Required Secrets:" -ForegroundColor Yellow
    Write-Host ""
    
    $secrets = @(
        "VERCEL_TOKEN",
        "VERCEL_ORG_ID",
        "VERCEL_PROJECT_ID",
        "EXPO_TOKEN",
        "SUPABASE_URL",
        "SUPABASE_ANON_KEY",
        "SUPABASE_SERVICE_ROLE_KEY",
        "STRIPE_PUBLISHABLE_KEY",
        "STRIPE_SECRET_KEY",
        "STRIPE_WEBHOOK_SECRET",
        "SENTRY_DSN",
        "SENTRY_AUTH_TOKEN",
        "JWT_SECRET",
        "CRON_SECRET",
        "DATABASE_URL",
        "REDIS_URL",
        "CODECOV_TOKEN"
    )
    
    foreach ($secret in $secrets) {
        Write-Host "  • $secret" -ForegroundColor White
    }
    
    Write-Host ""
    Write-Host "For detailed instructions, see: docs/GITHUB_SECRETS_SETUP.md" -ForegroundColor Gray
    Write-Host ""
}
