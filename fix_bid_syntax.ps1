# BidService.ts
$bidPath = "packages/api-services/src/bids/BidService.ts"
if (Test-Path $bidPath) {
    Write-Host "Updating BidService.ts"
    $c = Get-Content $bidPath -Raw
    $c = $c -replace "} as any\);", "});"
    Set-Content -Path $bidPath -Value $c -NoNewline
}
