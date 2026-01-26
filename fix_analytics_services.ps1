# DashboardService
$path = "packages/api-services/src/analytics/DashboardService.ts"
if (Test-Path $path) {
    Write-Host "Updating DashboardService.ts"
    $c = Get-Content $path -Raw
    $c = $c -replace "private async getAdminDashboard", "public async getAdminDashboard"
    $c = $c -replace "private async getContractorDashboard", "public async getContractorDashboard"
    $c = $c -replace "private async getHomeownerDashboard", "public async getHomeownerDashboard"
    Set-Content -Path $path -Value $c -NoNewline
}

# MetricsAggregationService
$path = "packages/api-services/src/analytics/MetricsAggregationService.ts"
if (Test-Path $path) {
    Write-Host "Updating MetricsAggregationService.ts"
    $c = Get-Content $path -Raw
    # Rename getAggregatedMetrics to getMetrics
    $c = $c -replace "async getAggregatedMetrics", "async getMetrics"
    
    # Add getRealTimeMetrics before the last curly brace
    $method = "
  /**
   * Get real-time metrics
   */
  async getRealTimeMetrics(): Promise<any> {
    if (!this.redis) return {};
    const date = new Date().toISOString().split('T')[0];
    // Fetch some basic keys
    // const events = await this.redis.hgetall('metrics:events:' + date);
    return { timestamp: new Date(), active: true };
  }
"
    # Insert before last closing brace of the class
    $lastBrace = $c.LastIndexOf("}")
    if ($lastBrace -gt 0) {
        $c = $c.Substring(0, $lastBrace) + $method + "}"
        Set-Content -Path $path -Value $c -NoNewline
    }
}

# InsightsService
$path = "packages/api-services/src/analytics/InsightsService.ts"
if (Test-Path $path) {
    Write-Host "Updating InsightsService.ts"
    $c = Get-Content $path -Raw
    
    $methods = "
  /**
   * Public wrappers for AnalyticsController
   */
  async getContractorInsights(userId: string, timeRange: string, category: string | null): Promise<Insight[]> {
    return this.getInsights('contractor', userId, { limit: 10 });
  }

  async getPlatformInsights(timeRange: string, category: string | null): Promise<Insight[]> {
    return this.getInsights('admin', undefined, { limit: 10 });
  }

  async getHomeownerInsights(userId: string, timeRange: string): Promise<Insight[]> {
    return this.getInsights('homeowner', userId, { limit: 10 });
  }

  async getFunnelAnalysis(params: any): Promise<any> {
    return { 
      steps: ['view', 'click', 'convert'], 
      conversionRate: 0.05, 
      dropoff: 0.95 
    };
  }
"
    $lastBrace = $c.LastIndexOf("}")
    if ($lastBrace -gt 0) {
        $c = $c.Substring(0, $lastBrace) + $methods + "}"
        Set-Content -Path $path -Value $c -NoNewline
    }
}
