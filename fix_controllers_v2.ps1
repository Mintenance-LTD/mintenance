# AnalyticsController
$path = "packages/api-services/src/analytics/AnalyticsController.ts"
if (Test-Path $path) {
    Write-Host "Updating AnalyticsController.ts"
    $c = Get-Content $path -Raw
    
    # Update getMetrics call
    # Using regex to match the call
    $newCall = "const dateRange = this.parseTimeRange(timeRange);
      const metrics = await this.metricsAggregation.getMetrics(
        [metric],
        {
            startDate: dateRange.start,
            endDate: dateRange.end,
            groupBy: groupBy as any,
            metrics: [metric],
            ...filters
        }
      );"
    
    $c = $c -replace "(?ms)const metrics = await this.metricsAggregation.getMetrics\(\{.*?\}\);", $newCall

    # Add parseTimeRange method
    $method = "
  private parseTimeRange(range: string): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date();
    const match = range.match(/(\d+)([dhm])/);
    if (!match) {
        start.setDate(start.getDate() - 7);
        return { start, end };
    }
    const [, value, unit] = match;
    const num = parseInt(value);
    switch (unit) {
      case 'd': start.setDate(start.getDate() - num); break;
      case 'h': start.setHours(start.getHours() - num); break;
      case 'm': start.setMinutes(start.getMinutes() - num); break;
      default: start.setDate(start.getDate() - 7);
    }
    return { start, end };
  }
"
    # Insert before isRealTimeEvent
    $c = $c.Replace("private isRealTimeEvent", "$method`n  private isRealTimeEvent")
    Set-Content -Path $path -Value $c -NoNewline
}

# MLMonitoringController
$path = "packages/api-services/src/admin/MLMonitoringController.ts"
if (Test-Path $path) {
    Write-Host "Updating MLMonitoringController.ts"
    $c = Get-Content $path -Raw
    # Handle specific cases to avoid over-replacing if user.id is already user!.id (though simple replace is idempotent if not present)
    # But better to match user.id
    $c = $c -replace "triggeredBy: user\.id", "triggeredBy: user!.id"
    # user.id in arguments list
    $c = $c -replace "user\.id,", "user!.id,"
    
    Set-Content -Path $path -Value $c -NoNewline
}
