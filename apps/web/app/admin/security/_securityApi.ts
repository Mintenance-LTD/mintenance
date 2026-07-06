import { getCsrfHeaders } from '@/lib/csrf-client';
import type { SecurityEvent } from './components/SecurityEventsList';

/**
 * Data + action helpers for the admin security dashboard, split out of
 * page.tsx (2026-07-04) to keep the page under the 500-line gate.
 */

export interface SecurityDashboardData {
  metrics: {
    totalEvents: number;
    criticalAlerts: number;
    activeThreats: number;
    blockedIps: number;
    securityScore: number;
    twoFactorEnabled: number;
  };
  recentEvents: SecurityEvent[];
  eventsByDay: Array<{
    day: string;
    total: number;
    threats: number;
    blocked: number;
  }>;
  threatsByType: Array<{ type: string; count: number }>;
}

export async function fetchSecurityDashboard(): Promise<SecurityDashboardData> {
  const response = await fetch('/api/admin/security-dashboard');
  if (!response.ok) {
    throw new Error('Failed to fetch security dashboard data');
  }
  return response.json();
}

// Mirrors the server's discriminatedUnion in
// app/api/admin/security-dashboard/route.ts. block_ip requires `ipAddress`
// (NOT `ip`) plus a `reason`; only `resolve_event` is wired to the UI today,
// but keeping this shape correct means block/unblock work when they're added.
export type SecurityActionPayload =
  | { action: 'resolve_event'; eventId: string }
  | {
      action: 'block_ip';
      ipAddress: string;
      reason: string;
      expiresAt?: string;
      securityEventIds?: string[];
    }
  | { action: 'unblock_ip'; ipAddress: string };

export async function postSecurityAction(
  payload: SecurityActionPayload
): Promise<{ success: boolean }> {
  const csrfHeaders = await getCsrfHeaders();
  const response = await fetch('/api/admin/security-dashboard', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...csrfHeaders },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error('Failed to perform security action');
  }
  return response.json();
}
