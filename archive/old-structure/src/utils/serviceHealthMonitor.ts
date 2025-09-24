import { logger } from './logger';

// ============================================================================
// SERVICE HEALTH MONITORING TYPES
// ============================================================================

export interface ServiceHealthStatus {
  serviceName: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  lastCheck: string;
  responseTime: number;
  errorRate: number;
  uptime: number;
  metadata?: {
    version?: string;
    dependencies?: string[];
    errorCount?: number;
    requestCount?: number;
  };
}

export interface ServiceHealthCheck {
  serviceName: string;
  healthCheckUrl?: string;
  timeout: number;
  healthCheckFunction?: () => Promise<boolean>;
  dependencies?: string[];
}

export interface HealthThresholds {
  responseTimeWarning: number; // ms
  responseTimeError: number; // ms
  errorRateWarning: number; // percentage
  errorRateError: number; // percentage
  uptimeWarning: number; // percentage
}

export interface SystemHealthReport {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: ServiceHealthStatus[];
  summary: {
    totalServices: number;
    healthyServices: number;
    degradedServices: number;
    unhealthyServices: number;
  };
}

// ============================================================================
// SERVICE HEALTH MONITOR CLASS
// ============================================================================

export class ServiceHealthMonitor {
  private static instance: ServiceHealthMonitor;
  private healthStatuses: Map<string, ServiceHealthStatus> = new Map();
  private healthChecks: Map<string, ServiceHealthCheck> = new Map();
  private monitoringInterval?: NodeJS.Timeout;
  private isMonitoring = false;

  private readonly defaultThresholds: HealthThresholds = {
    responseTimeWarning: 1000, // 1 second
    responseTimeError: 3000,   // 3 seconds
    errorRateWarning: 5,       // 5%
    errorRateError: 15,        // 15%
    uptimeWarning: 99,         // 99%
  };

  static getInstance(): ServiceHealthMonitor {
    if (!ServiceHealthMonitor.instance) {
      ServiceHealthMonitor.instance = new ServiceHealthMonitor();
    }
    return ServiceHealthMonitor.instance;
  }

  // ========================================================================
  // SERVICE REGISTRATION
  // ========================================================================

  registerService(serviceCheck: ServiceHealthCheck): void {
    this.healthChecks.set(serviceCheck.serviceName, serviceCheck);

    // Initialize health status
    this.healthStatuses.set(serviceCheck.serviceName, {
      serviceName: serviceCheck.serviceName,
      status: 'unknown',
      lastCheck: new Date().toISOString(),
      responseTime: 0,
      errorRate: 0,
      uptime: 100,
      metadata: {
        errorCount: 0,
        requestCount: 0,
      }
    });

    logger.info(`Registered service for health monitoring: ${serviceCheck.serviceName}`);
  }

  unregisterService(serviceName: string): void {
    this.healthChecks.delete(serviceName);
    this.healthStatuses.delete(serviceName);
    logger.info(`Unregistered service from health monitoring: ${serviceName}`);
  }

  // ========================================================================
  // HEALTH CHECKING
  // ========================================================================

  async checkServiceHealth(serviceName: string): Promise<ServiceHealthStatus> {
    const serviceCheck = this.healthChecks.get(serviceName);
    if (!serviceCheck) {
      throw new Error(`Service ${serviceName} not registered`);
    }

    const startTime = Date.now();
    let isHealthy = false;
    let error: Error | null = null;

    try {
      if (serviceCheck.healthCheckFunction) {
        isHealthy = await Promise.race([
          serviceCheck.healthCheckFunction(),
          this.createTimeoutPromise(serviceCheck.timeout)
        ]);
      } else if (serviceCheck.healthCheckUrl) {
        isHealthy = await this.checkUrlHealth(serviceCheck.healthCheckUrl, serviceCheck.timeout);
      } else {
        // Default health check - just assume healthy if no specific check
        isHealthy = true;
      }
    } catch (err) {
      error = err as Error;
      isHealthy = false;
    }

    const responseTime = Date.now() - startTime;
    const currentStatus = this.healthStatuses.get(serviceName)!;

    // Update request and error counts
    const newRequestCount = (currentStatus.metadata?.requestCount || 0) + 1;
    const newErrorCount = isHealthy
      ? (currentStatus.metadata?.errorCount || 0)
      : (currentStatus.metadata?.errorCount || 0) + 1;

    const errorRate = (newErrorCount / newRequestCount) * 100;

    // Determine health status based on thresholds
    const status = this.determineHealthStatus(responseTime, errorRate, isHealthy);

    const updatedStatus: ServiceHealthStatus = {
      serviceName,
      status,
      lastCheck: new Date().toISOString(),
      responseTime,
      errorRate,
      uptime: ((newRequestCount - newErrorCount) / newRequestCount) * 100,
      metadata: {
        ...currentStatus.metadata,
        errorCount: newErrorCount,
        requestCount: newRequestCount,
      }
    };

    this.healthStatuses.set(serviceName, updatedStatus);

    // Log health status changes
    if (currentStatus.status !== status) {
      logger.warn(`Service ${serviceName} status changed: ${currentStatus.status} → ${status}`, {
        responseTime,
        errorRate,
        error: error?.message
      });
    }

    return updatedStatus;
  }

  async checkAllServices(): Promise<ServiceHealthStatus[]> {
    const healthChecks = Array.from(this.healthChecks.keys());
    const results = await Promise.allSettled(
      healthChecks.map(serviceName => this.checkServiceHealth(serviceName))
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        const serviceName = healthChecks[index];
        logger.error(`Health check failed for ${serviceName}:`, result.reason);

        // Return unhealthy status
        const failedStatus: ServiceHealthStatus = {
          serviceName,
          status: 'unhealthy',
          lastCheck: new Date().toISOString(),
          responseTime: -1,
          errorRate: 100,
          uptime: 0
        };

        this.healthStatuses.set(serviceName, failedStatus);
        return failedStatus;
      }
    });
  }

  // ========================================================================
  // MONITORING CONTROL
  // ========================================================================

  startMonitoring(intervalMs: number = 30000): void {
    if (this.isMonitoring) {
      logger.warn('Service health monitoring is already running');
      return;
    }

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.checkAllServices();
      } catch (error) {
        logger.error('Error during health monitoring check:', error);
      }
    }, intervalMs);

    logger.info(`Started service health monitoring with ${intervalMs}ms interval`);
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    this.isMonitoring = false;
    logger.info('Stopped service health monitoring');
  }

  // ========================================================================
  // HEALTH REPORTS
  // ========================================================================

  getSystemHealthReport(): SystemHealthReport {
    const services = Array.from(this.healthStatuses.values());
    const healthyCount = services.filter(s => s.status === 'healthy').length;
    const degradedCount = services.filter(s => s.status === 'degraded').length;
    const unhealthyCount = services.filter(s => s.status === 'unhealthy').length;

    let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (unhealthyCount > 0) {
      overall = 'unhealthy';
    } else if (degradedCount > 0) {
      overall = 'degraded';
    }

    return {
      overall,
      timestamp: new Date().toISOString(),
      services,
      summary: {
        totalServices: services.length,
        healthyServices: healthyCount,
        degradedServices: degradedCount,
        unhealthyServices: unhealthyCount,
      }
    };
  }

  getServiceStatus(serviceName: string): ServiceHealthStatus | null {
    return this.healthStatuses.get(serviceName) || null;
  }

  getAllServiceStatuses(): ServiceHealthStatus[] {
    return Array.from(this.healthStatuses.values());
  }

  // ========================================================================
  // METRICS TRACKING
  // ========================================================================

  recordServiceOperation(
    serviceName: string,
    operationName: string,
    responseTime: number,
    success: boolean
  ): void {
    const currentStatus = this.healthStatuses.get(serviceName);
    if (!currentStatus) return;

    const newRequestCount = (currentStatus.metadata?.requestCount || 0) + 1;
    const newErrorCount = success
      ? (currentStatus.metadata?.errorCount || 0)
      : (currentStatus.metadata?.errorCount || 0) + 1;

    const errorRate = (newErrorCount / newRequestCount) * 100;
    const status = this.determineHealthStatus(responseTime, errorRate, success);

    this.healthStatuses.set(serviceName, {
      ...currentStatus,
      status,
      lastCheck: new Date().toISOString(),
      responseTime,
      errorRate,
      uptime: ((newRequestCount - newErrorCount) / newRequestCount) * 100,
      metadata: {
        ...currentStatus.metadata,
        errorCount: newErrorCount,
        requestCount: newRequestCount,
      }
    });

    logger.debug(`Recorded operation for ${serviceName}.${operationName}`, {
      responseTime,
      success,
      errorRate,
      status
    });
  }

  // ========================================================================
  // PRIVATE HELPER METHODS
  // ========================================================================

  private async checkUrlHealth(url: string, timeout: number): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        signal: controller.signal,
        method: 'HEAD'
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  private createTimeoutPromise<T>(timeoutMs: number): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Health check timeout')), timeoutMs);
    });
  }

  private determineHealthStatus(
    responseTime: number,
    errorRate: number,
    operationSuccessful: boolean
  ): 'healthy' | 'degraded' | 'unhealthy' {
    if (!operationSuccessful ||
        responseTime > this.defaultThresholds.responseTimeError ||
        errorRate > this.defaultThresholds.errorRateError) {
      return 'unhealthy';
    }

    if (responseTime > this.defaultThresholds.responseTimeWarning ||
        errorRate > this.defaultThresholds.errorRateWarning) {
      return 'degraded';
    }

    return 'healthy';
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const serviceHealthMonitor = ServiceHealthMonitor.getInstance();

// ============================================================================
// BUILT-IN SERVICE HEALTH CHECKS
// ============================================================================

// Register core application services
export function initializeCoreServiceHealthChecks(): void {
  // Database health check
  serviceHealthMonitor.registerService({
    serviceName: 'Database',
    timeout: 5000,
    healthCheckFunction: async () => {
      try {
        // Simple Supabase connection test
        const { supabase } = await import('../config/supabase');
        const { data, error } = await supabase.from('health_check').select('1').limit(1);
        return !error;
      } catch {
        return false;
      }
    },
    dependencies: ['supabase']
  });

  // Authentication service
  serviceHealthMonitor.registerService({
    serviceName: 'AuthService',
    timeout: 3000,
    healthCheckFunction: async () => {
      try {
        const { supabase } = await import('../config/supabase');
        const { data } = await supabase.auth.getSession();
        return true; // If we can check session, auth service is working
      } catch {
        return false;
      }
    },
    dependencies: ['Database']
  });

  // Start monitoring with 30-second intervals
  serviceHealthMonitor.startMonitoring(30000);

  logger.info('Initialized core service health checks');
}