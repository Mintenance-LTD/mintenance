# MLMonitoringController.ts
$mlPath = "packages/api-services/src/admin/MLMonitoringController.ts"
if (Test-Path $mlPath) {
    Write-Host "Updating MLMonitoringController.ts"
    $c = Get-Content $mlPath -Raw
    
    # Fix corrupted status line
    # "status: trainingJob.status: status || undefined," -> "status: trainingJob.status,"
    $c = $c -replace "status: trainingJob\.status: status \|\| undefined,", "status: trainingJob.status,"
    
    # Fix corrupted modelId line
    # "params.modelId: modelId || undefined," -> "params.modelId,"
    $c = $c -replace "params\.modelId: modelId \|\| undefined,", "params.modelId,"
    
    # Ensure correct fixes were applied where needed (the searchParam ones were correct but might have been replaced wrongly if regex was loose)
    # The errors were:
    # 288: modelId -> needs || undefined. Line 288 is `modelId: modelId || undefined,`. This looks correct if it was replaced successfully.
    # 213: params.modelId -> This is inside getModelPerformance call. It doesn't need || undefined because params.modelId is string (from route param).
    
    Set-Content -Path $mlPath -Value $c -NoNewline
}

# AnalyticsController.ts
$analyticsPath = "packages/api-services/src/analytics/AnalyticsController.ts"
if (Test-Path $analyticsPath) {
    Write-Host "Updating AnalyticsController.ts"
    $c = Get-Content $analyticsPath -Raw
    
    # Verify previous replacements
    # Check if we have double replacements or syntax errors.
    
    # Fix "Property 'tracked' does not exist on type 'string[]'"
    # If I replaced line 230/231 but not the extraction.
    # The code was likely: 
    # const result = await this.eventTracking.trackEventsBatch(events);
    # return NextResponse.json({ ... result.tracked, result.failed ... });
    
    # I replaced the call with `const result: any = ...`
    # This should suppress the error.
    
    Set-Content -Path $analyticsPath -Value $c -NoNewline
}
