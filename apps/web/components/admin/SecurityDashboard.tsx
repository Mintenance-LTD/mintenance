'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card.unified';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { theme } from '@/lib/theme';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import styles from '../../app/admin/admin.module.css';

interface SecurityMetrics {
  total_events: number;
  critical_events: number;
  high_severity_events: number;
  unique_ips: number;
  top_event_types: Record<string, number>;
  recent_critical_events: Array<{
    id: string;
    event_type: string;
    details: string;
    ip_address: string;
    created_at: string;
  }>;
}

interface SecurityEvent {
  id: string;
  event_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  user_id?: string;
  ip_address: string;
  user_agent: string;
  endpoint: string;
  method: string;
  details: string;
  resolved: boolean;
  created_at: string;
}

interface SecurityDashboardProps {
  className?: string;
}

export function SecurityDashboard({ className }: SecurityDashboardProps) {
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [recentEvents, setRecentEvents] = useState<SecurityEvent[]>([]);
  const [topIPs, setTopIPs] = useState<Array<{ ip: string; count: number }>>([]);
  const [timeframe, setTimeframe] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSecurityData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/security-dashboard?timeframe=${timeframe}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch security data');
      }
      
      const data = await response.json();
      setMetrics(data.metrics);
      setRecentEvents(data.recent_events);
      setTopIPs(data.top_offending_ips);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityData();
  }, [timeframe]);

  const resolveEvent = async (eventId: string) => {
    try {
      const response = await fetch('/api/admin/security-dashboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'resolve_event',
          eventId,
        }),
      });

      if (response.ok) {
        await fetchSecurityData(); // Refresh data
      }
    } catch (err) {
      console.error('Failed to resolve event:', err);
    }
  };

  const blockIP = async (ipAddress: string) => {
    const reason = prompt('Reason for blocking this IP:');
    if (!reason) return;

    try {
      const response = await fetch('/api/admin/security-dashboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'block_ip',
          ipAddress,
          reason,
        }),
      });

      if (response.ok) {
        await fetchSecurityData(); // Refresh data
        alert(`IP ${ipAddress} has been blocked`);
      }
    } catch (err) {
      console.error('Failed to block IP:', err);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getEventTypeIcon = (eventType: string) => {
    switch (eventType) {
      case 'auth_failure': return '🔐';
      case 'rate_limit': return '⏱️';
      case 'xss_attempt': return '🛡️';
      case 'injection_attempt': return '💉';
      case 'suspicious_activity': return '👁️';
      case 'webhook_failure': return '🔗';
      case 'gdpr_access': return '📋';
      case 'admin_action': return '👤';
      default: return '⚠️';
    }
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card className="p-6">
          <div className="text-center">
            <div className="text-red-600 text-xl mb-2">⚠️ Security Dashboard Error</div>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={fetchSecurityData} variant="outline">
              Retry
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Prepare chart data
  const eventTypeChartData = metrics
    ? Object.entries(metrics.top_event_types)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([type, count]) => ({
          name: type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
          value: count,
        }))
    : [];

  const severityColors = {
    critical: '#EF4444',
    high: '#F59E0B',
    medium: '#FCD34D',
    low: '#10B981',
  };

  const severityChartData = metrics
    ? [
        { name: 'Critical', value: metrics.critical_events, color: severityColors.critical },
        { name: 'High', value: metrics.high_severity_events, color: severityColors.high },
        { name: 'Medium', value: metrics.total_events - metrics.critical_events - metrics.high_severity_events, color: severityColors.medium },
      ].filter(item => item.value > 0)
    : [];

  return (
    <div style={{ padding: theme.spacing[8], maxWidth: '1440px', margin: '0 auto' }} className={className}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing[8],
      }}>
        <div>
          <h1 style={{
            fontSize: theme.typography.fontSize['3xl'],
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.textPrimary,
            marginBottom: theme.spacing[2],
          }}>
            Security Dashboard
          </h1>
          <p style={{
            fontSize: theme.typography.fontSize.base,
            color: theme.colors.textSecondary,
          }}>
            Monitor security events, threats, and system health
          </p>
        </div>
        <div style={{ display: 'flex', gap: theme.spacing[2] }}>
          {(['1h', '24h', '7d', '30d'] as const).map((tf) => (
            <Button
              key={tf}
              variant={timeframe === tf ? 'primary' : 'secondary'}
              onClick={() => setTimeframe(tf)}
              style={{ fontSize: theme.typography.fontSize.sm }}
            >
              {tf}
            </Button>
          ))}
        </div>
      </div>

      {/* Metrics Cards */}
      {metrics && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: theme.spacing[4],
          marginBottom: theme.spacing[8],
        }}>
          <Card className={styles.metricCard} style={{ padding: theme.spacing[6] }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[3], marginBottom: theme.spacing[2] }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: theme.borderRadius.full,
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Icon name="activity" size={24} color={theme.colors.primary} />
              </div>
              <h3 style={{
                fontSize: theme.typography.fontSize.lg,
                fontWeight: theme.typography.fontWeight.semibold,
                color: theme.colors.textPrimary,
              }}>
                Total Events
              </h3>
            </div>
            <p style={{
              fontSize: theme.typography.fontSize['3xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.primary,
            }}>
              {metrics.total_events.toLocaleString()}
            </p>
          </Card>
          
          <Card className={styles.metricCard} style={{ padding: theme.spacing[6] }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[3], marginBottom: theme.spacing[2] }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: theme.borderRadius.full,
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Icon name="alert" size={24} color="#EF4444" />
              </div>
              <h3 style={{
                fontSize: theme.typography.fontSize.lg,
                fontWeight: theme.typography.fontWeight.semibold,
                color: theme.colors.textPrimary,
              }}>
                Critical Events
              </h3>
            </div>
            <p style={{
              fontSize: theme.typography.fontSize['3xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: '#EF4444',
            }}>
              {metrics.critical_events.toLocaleString()}
            </p>
          </Card>
          
          <Card className={styles.metricCard} style={{ padding: theme.spacing[6] }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[3], marginBottom: theme.spacing[2] }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: theme.borderRadius.full,
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Icon name="warning" size={24} color="#F59E0B" />
              </div>
              <h3 style={{
                fontSize: theme.typography.fontSize.lg,
                fontWeight: theme.typography.fontWeight.semibold,
                color: theme.colors.textPrimary,
              }}>
                High Severity
              </h3>
            </div>
            <p style={{
              fontSize: theme.typography.fontSize['3xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: '#F59E0B',
            }}>
              {metrics.high_severity_events.toLocaleString()}
            </p>
          </Card>
          
          <Card className={styles.metricCard} style={{ padding: theme.spacing[6] }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[3], marginBottom: theme.spacing[2] }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: theme.borderRadius.full,
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Icon name="shield" size={24} color="#8B5CF6" />
              </div>
              <h3 style={{
                fontSize: theme.typography.fontSize.lg,
                fontWeight: theme.typography.fontWeight.semibold,
                color: theme.colors.textPrimary,
              }}>
                Unique IPs
              </h3>
            </div>
            <p style={{
              fontSize: theme.typography.fontSize['3xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: '#8B5CF6',
            }}>
              {metrics.unique_ips.toLocaleString()}
            </p>
          </Card>
        </div>
      )}

      {/* Charts Section */}
      {metrics && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: theme.spacing[6],
          marginBottom: theme.spacing[8],
        }}>
          {/* Event Types Chart */}
          {eventTypeChartData.length > 0 && (
            <Card style={{ padding: theme.spacing[6] }}>
              <h3 style={{
                fontSize: theme.typography.fontSize.xl,
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.textPrimary,
                marginBottom: theme.spacing[4],
              }}>
                Top Event Types
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={eventTypeChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#6B7280"
                    style={{ fontSize: theme.typography.fontSize.xs }}
                  />
                  <YAxis 
                    stroke="#6B7280"
                    style={{ fontSize: theme.typography.fontSize.xs }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      border: `1px solid ${theme.colors.border}`,
                      borderRadius: theme.borderRadius.md,
                    }}
                  />
                  <Bar 
                    dataKey="value" 
                    fill="#3B82F6"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Severity Distribution */}
          {severityChartData.length > 0 && (
            <Card style={{ padding: theme.spacing[6] }}>
              <h3 style={{
                fontSize: theme.typography.fontSize.xl,
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.textPrimary,
                marginBottom: theme.spacing[4],
              }}>
                Severity Distribution
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={severityChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry: any) => `${entry.name} ${(entry.percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {severityChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          )}
        </div>
      )}

      {/* Top Offending IPs */}
      {topIPs.length > 0 && (
        <Card style={{ padding: theme.spacing[6], marginBottom: theme.spacing[6] }}>
          <h2 style={{
            fontSize: theme.typography.fontSize.xl,
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.textPrimary,
            marginBottom: theme.spacing[4],
          }}>
            Top Offending IPs
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[2] }}>
            {topIPs.slice(0, 10).map((item, index) => (
              <div
                key={item.ip}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: theme.spacing[3],
                  backgroundColor: theme.colors.backgroundSecondary,
                  borderRadius: theme.borderRadius.md,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.colors.backgroundTertiary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2] }}>
                  <span style={{
                    fontSize: theme.typography.fontSize.sm,
                    fontFamily: 'monospace',
                    color: theme.colors.textPrimary,
                  }}>
                    {item.ip}
                  </span>
                  <span style={{
                    fontSize: theme.typography.fontSize.xs,
                    color: theme.colors.textTertiary,
                  }}>
                    #{index + 1}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2] }}>
                  <span style={{
                    fontSize: theme.typography.fontSize.sm,
                    fontWeight: theme.typography.fontWeight.semibold,
                    color: theme.colors.textPrimary,
                  }}>
                    {item.count} events
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => blockIP(item.ip)}
                    style={{
                      fontSize: theme.typography.fontSize.sm,
                      color: '#EF4444',
                    }}
                  >
                    Block
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recent Events */}
      <Card style={{ padding: theme.spacing[6] }}>
        <h2 style={{
          fontSize: theme.typography.fontSize.xl,
          fontWeight: theme.typography.fontWeight.bold,
          color: theme.colors.textPrimary,
          marginBottom: theme.spacing[4],
        }}>
          Recent Security Events
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[3] }}>
          {recentEvents.slice(0, 20).map((event) => {
            const severityBorderColor = {
              critical: '#EF4444',
              high: '#F59E0B',
              medium: '#FCD34D',
              low: '#10B981',
            }[event.severity] || theme.colors.border;

            return (
              <div
                key={event.id}
                style={{
                  padding: theme.spacing[4],
                  borderRadius: theme.borderRadius.md,
                  borderLeft: `4px solid ${severityBorderColor}`,
                  backgroundColor: event.resolved ? theme.colors.backgroundSecondary : '#FFFFFF',
                  opacity: event.resolved ? 0.6 : 1,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (!event.resolved) {
                    e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!event.resolved) {
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                  }
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: theme.spacing[2],
                      marginBottom: theme.spacing[1],
                      flexWrap: 'wrap',
                    }}>
                      <Icon name="shield" size={20} color={severityBorderColor} />
                      <span style={{
                        fontSize: theme.typography.fontSize.sm,
                        fontWeight: theme.typography.fontWeight.semibold,
                        color: theme.colors.textPrimary,
                      }}>
                        {event.event_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                      <span style={{
                        padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
                        borderRadius: theme.borderRadius.full,
                        fontSize: theme.typography.fontSize.xs,
                        fontWeight: theme.typography.fontWeight.medium,
                        backgroundColor: `${severityBorderColor}20`,
                        color: severityBorderColor,
                      }}>
                        {event.severity}
                      </span>
                      {event.resolved && (
                        <span style={{
                          padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
                          borderRadius: theme.borderRadius.full,
                          fontSize: theme.typography.fontSize.xs,
                          fontWeight: theme.typography.fontWeight.medium,
                          backgroundColor: 'rgba(16, 185, 129, 0.1)',
                          color: theme.colors.success,
                        }}>
                          Resolved
                        </span>
                      )}
                    </div>
                    <p style={{
                      fontSize: theme.typography.fontSize.sm,
                      color: theme.colors.textSecondary,
                      marginBottom: theme.spacing[1],
                    }}>
                      {event.details}
                    </p>
                    <div style={{
                      fontSize: theme.typography.fontSize.xs,
                      color: theme.colors.textTertiary,
                    }}>
                      <span style={{ fontFamily: 'monospace' }}>{event.ip_address}</span>
                      <span style={{ margin: `0 ${theme.spacing[2]}` }}>•</span>
                      <span>{event.method}</span>
                      <span style={{ margin: `0 ${theme.spacing[2]}` }}>•</span>
                      <span>{event.endpoint}</span>
                      <span style={{ margin: `0 ${theme.spacing[2]}` }}>•</span>
                      <span>{new Date(event.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                  {!event.resolved && (
                    <Button
                      variant="outline"
                      onClick={() => resolveEvent(event.id)}
                      style={{
                        marginLeft: theme.spacing[4],
                        fontSize: theme.typography.fontSize.sm,
                      }}
                    >
                      Resolve
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
