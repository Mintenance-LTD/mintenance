export interface ProductionReadinessStatus {
  overall: 'ready' | 'warning' | 'not_ready';
  score: number;
  timestamp: number;
  components: {
    webPlatform: ComponentStatus;
    monitoring: ComponentStatus;
    performance: ComponentStatus;
    errorTracking: ComponentStatus;
    security: ComponentStatus;
  };
  recommendations: string[];
  blockers: string[];
}

export interface ComponentStatus {
  status: 'healthy' | 'warning' | 'error';
  score: number;
  message: string;
  lastCheck: number;
  metrics?: Record<string, unknown>;
}

export interface DeploymentReport {
  deploymentId: string;
  environment: 'development' | 'staging' | 'production';
  timestamp: number;
  readinessCheck: ProductionReadinessStatus;
  securityAudit?: unknown;
  performanceBaseline?: unknown;
  webCompatibility?: unknown;
  deploymentApproved: boolean;
  approvalReasons: string[];
  blockers?: string[];
}
