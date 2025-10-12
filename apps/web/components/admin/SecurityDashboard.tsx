'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

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

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Security Dashboard</h1>
        <div className="flex space-x-2">
          {(['1h', '24h', '7d', '30d'] as const).map((tf) => (
            <Button
              key={tf}
              variant={timeframe === tf ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setTimeframe(tf)}
            >
              {tf}
            </Button>
          ))}
        </div>
      </div>

      {/* Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-2xl font-bold text-blue-600">{metrics.total_events}</div>
            <div className="text-sm text-gray-600">Total Events</div>
          </Card>
          
          <Card className="p-4">
            <div className="text-2xl font-bold text-red-600">{metrics.critical_events}</div>
            <div className="text-sm text-gray-600">Critical Events</div>
          </Card>
          
          <Card className="p-4">
            <div className="text-2xl font-bold text-orange-600">{metrics.high_severity_events}</div>
            <div className="text-sm text-gray-600">High Severity</div>
          </Card>
          
          <Card className="p-4">
            <div className="text-2xl font-bold text-purple-600">{metrics.unique_ips}</div>
            <div className="text-sm text-gray-600">Unique IPs</div>
          </Card>
        </div>
      )}

      {/* Top Offending IPs */}
      {topIPs.length > 0 && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Top Offending IPs</h2>
          <div className="space-y-2">
            {topIPs.slice(0, 10).map((item, index) => (
              <div key={item.ip} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-mono">{item.ip}</span>
                  <span className="text-xs text-gray-500">#{index + 1}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-semibold">{item.count} events</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => blockIP(item.ip)}
                    className="text-red-600 hover:text-red-700"
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
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Security Events</h2>
        <div className="space-y-3">
          {recentEvents.slice(0, 20).map((event) => (
            <div
              key={event.id}
              className={`p-3 rounded-lg border-l-4 ${
                event.resolved ? 'bg-gray-50 opacity-60' : 'bg-white'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-lg">{getEventTypeIcon(event.event_type)}</span>
                    <span className="font-medium">{event.event_type.replace('_', ' ')}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(event.severity)}`}>
                      {event.severity}
                    </span>
                    {event.resolved && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-600">
                        Resolved
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-1">{event.details}</p>
                  <div className="text-xs text-gray-500">
                    <span className="font-mono">{event.ip_address}</span>
                    <span className="mx-2">•</span>
                    <span>{event.method}</span>
                    <span className="mx-2">•</span>
                    <span>{event.endpoint}</span>
                    <span className="mx-2">•</span>
                    <span>{new Date(event.created_at).toLocaleString()}</span>
                  </div>
                </div>
                {!event.resolved && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => resolveEvent(event.id)}
                    className="ml-4"
                  >
                    Resolve
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Event Types Breakdown */}
      {metrics && Object.keys(metrics.top_event_types).length > 0 && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Event Types Breakdown</h2>
          <div className="space-y-2">
            {Object.entries(metrics.top_event_types)
              .sort(([,a], [,b]) => b - a)
              .map(([type, count]) => (
                <div key={type} className="flex justify-between items-center">
                  <span className="text-sm">{type.replace('_', ' ')}</span>
                  <span className="text-sm font-semibold">{count}</span>
                </div>
              ))}
          </div>
        </Card>
      )}
    </div>
  );
}
