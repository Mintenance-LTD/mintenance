# Repair Broken Vitest Imports
$ErrorActionPreference = "Continue"

$files = Get-ChildItem -Path "packages/api-services/src/**/__tests__/*.test.ts" -Recurse

foreach ($file in $files) {
    $lines = Get-Content $file.FullName
    if ($lines.Count -gt 0 -and $lines[0] -match "from 'vitest';") {
        Write-Host "Repairing $($file.Name)"
        $lines[0] = "import { describe, it, expect, beforeEach, vi } from 'vitest';"
        Set-Content -Path $file.FullName -Value $lines
    }
}
