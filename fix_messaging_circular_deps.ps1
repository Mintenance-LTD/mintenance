# Fix Messaging Circular Dependencies
$ErrorActionPreference = "Continue"

$files = Get-ChildItem -Path "packages/api-services/src/messaging/*.ts"

foreach ($file in $files) {
    if ($file.Name -eq "MessageController.ts" -or $file.Name -eq "types.ts") { continue }
    
    Write-Host "Checking $($file.FullName)"
    $c = Get-Content $file.FullName -Raw
    
    if ($c -match "from './MessageController'") {
        Write-Host "Updating imports in $($file.Name)"
        # Update imports to use ./types
        $c = $c -replace "import \{ ([\w\s,]+) \} from './MessageController';", "import { $1 } from './types';"
        Set-Content -Path $file.FullName -Value $c -NoNewline
    }
}
