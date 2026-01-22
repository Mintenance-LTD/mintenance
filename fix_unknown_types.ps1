$files = Get-ChildItem -Path "packages/api-services/src" -Recurse -Filter "*.ts"
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    # Replace (arg: unknown) with (arg: any)
    # Also handles (arg: unknown[]) -> (arg: any[])
    $newContent = $content -replace ": unknown\)", ": any)"
    $newContent = $newContent -replace ": unknown\[\]", ": any[]"
    
    if ($content -ne $newContent) {
        Write-Host "Updating $($file.FullName)"
        Set-Content -Path $file.FullName -Value $newContent -NoNewline
    }
}
