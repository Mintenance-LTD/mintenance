/**
 * Production Monitoring Dashboard Component
 *
 * A simple dashboard to view production system status, performance metrics,
 * security status, and error analytics in real-time.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import {
  dashboardData,
  systemMonitoring,
  performanceTracking,
  errorTracking,
  webPlatform
} from '../utils/productionSetupGuide';

interface DashboardStatus {
  overall: {
    status: string;
    score: number;
    lastCheck: number;
  };
  performance: any;
  errors: any;
  security: any;
  health: any;
}

export function ProductionMonitoringDashboard() {
  const [status, setStatus] = useState<DashboardStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  useEffect(() => {
    loadDashboardData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadDashboardData();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      const data = await dashboardData.getCompleteStatus();
      setStatus(data);
      setLastRefresh(Date.now());
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      errorTracking.trackError(error as Error, { context: 'dashboard_load_failure' });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    loadDashboardData();
  };

  const runQuickHealthCheck = async () => {
    try {
      Alert.alert('Health Check', 'Running quick health check...', [{ text: 'OK' }]);

      const healthStatus = await systemMonitoring.checkHealth();
      const readinessStatus = await systemMonitoring.checkReadiness('development');

      Alert.alert(
        'Health Check Results',
        `System Health: ${healthStatus.status}\nReadiness Score: ${readinessStatus.score}/100\nOverall Status: ${readinessStatus.overall}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Health Check Failed', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const getStatusColor = (status: string, score?: number) => {
    if (status === 'healthy' || status === 'ready') return '#4CAF50';
    if (status === 'warning' || (score && score < 80)) return '#FF9800';
    if (status === 'error' || status === 'not_ready') return '#F44336';
    return '#9E9E9E';
  };

  const formatTimestamp = (timestamp: number) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const formatBytes = (bytes: number | undefined) => {
    if (!bytes) return 'N/A';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  if (loading && !status) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading production dashboard...</Text>
      </View>
    );
  }

  if (!status) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Failed to load dashboard data</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
          <Text style={styles.refreshButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🚀 Production Monitoring</Text>
        <Text style={styles.subtitle}>Last updated: {formatTimestamp(lastRefresh)}</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.healthButton} onPress={runQuickHealthCheck}>
            <Text style={styles.healthButtonText}>Health Check</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Overall Status */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📊 Overall Status</Text>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>System Status:</Text>
          <Text style={[styles.statusValue, { color: getStatusColor(status.overall.status) }]}>
            {status.overall.status.toUpperCase()}
          </Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Health Score:</Text>
          <Text style={[styles.statusValue, { color: getStatusColor('', status.overall.score) }]}>
            {status.overall.score}/100
          </Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Last Check:</Text>
          <Text style={styles.statusValue}>{formatTimestamp(status.overall.lastCheck)}</Text>
        </View>
      </View>

      {/* Performance Metrics */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>⚡ Performance Metrics</Text>
        <View style={styles.metricsGrid}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Startup Time</Text>
            <Text style={styles.metricValue}>
              {status.performance.startupTime ? `${status.performance.startupTime}ms` : 'N/A'}
            </Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Memory Usage</Text>
            <Text style={styles.metricValue}>
              {formatBytes(status.performance.memoryUsage)}
            </Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Navigation Time</Text>
            <Text style={styles.metricValue}>
              {status.performance.navigationTime ? `${status.performance.navigationTime}ms` : 'N/A'}
            </Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>API Response</Text>
            <Text style={styles.metricValue}>
              {status.performance.apiResponseTime ? `${status.performance.apiResponseTime}ms` : 'N/A'}
            </Text>
          </View>
        </View>
      </View>

      {/* Error Analytics */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🐛 Error Analytics</Text>
        <View style={styles.metricsGrid}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Error Rate</Text>
            <Text style={[styles.metricValue, { color: status.errors.errorRate > 0.01 ? '#F44336' : '#4CAF50' }]}>
              {(status.errors.errorRate * 100).toFixed(2)}%
            </Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Total Errors</Text>
            <Text style={styles.metricValue}>{status.errors.totalErrors}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Unique Errors</Text>
            <Text style={styles.metricValue}>{status.errors.uniqueErrors}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Critical Errors</Text>
            <Text style={[styles.metricValue, { color: status.errors.criticalErrors > 0 ? '#F44336' : '#4CAF50' }]}>
              {status.errors.criticalErrors}
            </Text>
          </View>
        </View>
      </View>

      {/* Security Status */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🔒 Security Status</Text>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Last Audit:</Text>
          <Text style={styles.statusValue}>
            {status.security.lastAudit ? formatTimestamp(status.security.lastAudit) : 'Never'}
          </Text>
        </View>
        <View style={styles.vulnerabilitiesGrid}>
          <View style={styles.vulnerability}>
            <Text style={styles.vulnerabilityLabel}>Critical</Text>
            <Text style={[styles.vulnerabilityValue, { color: status.security.vulnerabilities.critical > 0 ? '#F44336' : '#4CAF50' }]}>
              {status.security.vulnerabilities.critical}
            </Text>
          </View>
          <View style={styles.vulnerability}>
            <Text style={styles.vulnerabilityLabel}>High</Text>
            <Text style={[styles.vulnerabilityValue, { color: status.security.vulnerabilities.high > 0 ? '#FF9800' : '#4CAF50' }]}>
              {status.security.vulnerabilities.high}
            </Text>
          </View>
          <View style={styles.vulnerability}>
            <Text style={styles.vulnerabilityLabel}>Medium</Text>
            <Text style={styles.vulnerabilityValue}>{status.security.vulnerabilities.medium}</Text>
          </View>
          <View style={styles.vulnerability}>
            <Text style={styles.vulnerabilityLabel}>Low</Text>
            <Text style={styles.vulnerabilityValue}>{status.security.vulnerabilities.low}</Text>
          </View>
        </View>
      </View>

      {/* Web Platform Status (if running on web) */}
      {webPlatform.isWeb() && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🌐 Web Platform Status</Text>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Optimizations:</Text>
            <Text style={[styles.statusValue, { color: webPlatform.isOptimized() ? '#4CAF50' : '#FF9800' }]}>
              {webPlatform.isOptimized() ? 'Active' : 'Inactive'}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Core Web Vitals:</Text>
            <Text style={styles.statusValue}>
              {webPlatform.getCoreWebVitals() ? 'Monitoring Active' : 'Not Available'}
            </Text>
          </View>
        </View>
      )}

      {/* System Health */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>💚 System Health</Text>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Health Status:</Text>
          <Text style={[styles.statusValue, { color: getStatusColor(status.health.status) }]}>
            {status.health.status.toUpperCase()}
          </Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Uptime:</Text>
          <Text style={styles.statusValue}>
            {Math.floor(status.health.uptime / (1000 * 60 * 60))}h {Math.floor((status.health.uptime % (1000 * 60 * 60)) / (1000 * 60))}m
          </Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Last Check:</Text>
          <Text style={styles.statusValue}>{formatTimestamp(status.health.lastCheck)}</Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Production monitoring system active. All metrics are updated in real-time.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  refreshButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  healthButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  healthButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metric: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  vulnerabilitiesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  vulnerability: {
    alignItems: 'center',
  },
  vulnerabilityLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  vulnerabilityValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  footer: {
    marginTop: 20,
    marginBottom: 40,
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 50,
  },
  errorText: {
    fontSize: 16,
    color: '#F44336',
    textAlign: 'center',
    marginTop: 50,
    marginBottom: 20,
  },
});

export default ProductionMonitoringDashboard;