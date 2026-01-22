# Fix Notification Circular Dependencies
$ErrorActionPreference = "Continue"

$files = Get-ChildItem -Path "packages/api-services/src/notifications/*.ts"

foreach ($file in $files) {
    if ($file.Name -eq "NotificationController.ts" -or $file.Name -eq "types.ts") { continue }
    
    Write-Host "Checking $($file.FullName)"
    $c = Get-Content $file.FullName -Raw
    
    if ($c -match "from './NotificationController'") {
        Write-Host "Updating imports in $($file.Name)"
        # Update imports to use ./types
        $c = $c -replace "import \{ NotificationType \} from './NotificationController';", "import { NotificationType } from './types';"
        $c = $c -replace "import \{ NotificationType, ([\w\s,]+) \} from './NotificationController';", "import { NotificationType, $1 } from './types';"
        
        Set-Content -Path $file.FullName -Value $c -NoNewline
    }
}
