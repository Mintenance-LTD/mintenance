'use client';

import React from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

interface Alert {
  id: string;
  createdAt: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  type: string;
  message: string;
}

interface SafetyAlertsListProps {
  alerts: Alert[];
  loading: boolean;
}

/**
 * Safety Alerts List
 *
 * Displays recent safety alerts from the A/B test monitoring system.
 */
export function SafetyAlertsList({ alerts, loading }: SafetyAlertsListProps) {
  const getSeverityColor = (severity: Alert['severity']) => {
    switch (severity) {
      case 'CRITICAL':
        return '#E74C3C';
      case 'WARNING':
        return '#F59E0B';
      case 'INFO':
        return '#4A67FF';
      default:
        return '#64748B';
    }
  };

  const getSeverityBgColor = (severity: Alert['severity']) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-50 border-red-200';
      case 'WARNING':
        return 'bg-amber-50 border-amber-200';
      case 'INFO':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-slate-50 border-slate-200';
    }
  };

  const getSeverityTextColor = (severity: Alert['severity']) => {
    switch (severity) {
      case 'CRITICAL':
        return 'text-red-700';
      case 'WARNING':
        return 'text-amber-700';
      case 'INFO':
        return 'text-blue-700';
      default:
        return 'text-slate-700';
    }
  };

  const getSeverityIcon = (severity: Alert['severity']) => {
    switch (severity) {
      case 'CRITICAL':
        return 'alert';
      case 'WARNING':
        return 'alert';
      case 'INFO':
        return 'info';
      default:
        return 'info';
    }
  };

  const formatTimeAgo = (createdAt: string): string => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (loading) {
    return (
      <div className="rounded-[16px] border border-slate-200 bg-white shadow-[0_8px_24px_rgba(0,0,0,0.06)] p-6">
        <div className="p-4 text-center text-slate-500">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[16px] border border-slate-200 bg-white shadow-[0_8px_24px_rgba(0,0,0,0.06)] p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
          <Icon name="bell" size={22} color="#E74C3C" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-bold text-slate-900 mb-1">
            Recent Safety Alerts
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            {alerts.length} alert{alerts.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Alerts List */}
      {alerts.length === 0 ? (
        <div className="p-4 text-center text-slate-500 text-sm">
          No alerts
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {alerts.map((alert) => {
            const severityColor = getSeverityColor(alert.severity);
            return (
              <div
                key={alert.id}
                className={cn(
                  'p-4 rounded-xl border transition-all duration-200 hover:shadow-md',
                  getSeverityBgColor(alert.severity)
                )}
              >
                <div className="flex items-start gap-2 mb-1">
                  <Icon
                    name={getSeverityIcon(alert.severity)}
                    size={16}
                    color={severityColor}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <span
                        className={cn(
                          'text-xs font-semibold uppercase',
                          getSeverityTextColor(alert.severity)
                        )}
                      >
                        {alert.severity}
                      </span>
                      <span className="text-xs text-slate-400">
                        {formatTimeAgo(alert.createdAt)}
                      </span>
                    </div>
                    <div className="text-sm text-slate-900 leading-relaxed">
                      {alert.message}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 font-mono">
                      {alert.type}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

