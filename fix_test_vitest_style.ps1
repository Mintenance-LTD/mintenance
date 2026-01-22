# Fix Vitest Imports and Mocking in Tests
$ErrorActionPreference = "Continue"

$files = Get-ChildItem -Path "packages/api-services/src/**/__tests__/*.test.ts" -Recurse

foreach ($file in $files) {
    Write-Host "Checking $($file.FullName)"
    $c = Get-Content $file.FullName -Raw
    
    $changed = $false
    
    if ($c -match "vi as jest") {
        Write-Host "Updating vitest imports in $($file.Name)"
        $c = $c -replace "import \{ ([\w\s,]+), vi as jest \} from 'vitest';", "import { $1, vi } from 'vitest';"
        $c = $c -replace "import \{ vi as jest, ([\w\s,]+) \} from 'vitest';", "import { vi, $1 } from 'vitest';"
        $c = $c -replace "jest\.clearAllMocks\(\);", "vi.restoreAllMocks();"
        $changed = $true
    }
    
    if ($changed) {
        Set-Content -Path $file.FullName -Value $c -NoNewline
    }
}
