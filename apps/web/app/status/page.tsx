'use client';

import { useState, useEffect, useCallback } from 'react';

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
}

const STATUS_CONFIG = {
  healthy: { label: 'All Systems Operational', color: '#16a34a', bg: '#f0fdf4' },
  degraded: { label: 'Partial System Outage', color: '#ca8a04', bg: '#fefce8' },
  unhealthy: { label: 'Major System Outage', color: '#dc2626', bg: '#fef2f2' },
} as const;

const SERVICES = [
  { name: 'Web Application', description: 'Next.js frontend and API routes' },
  { name: 'Database', description: 'PostgreSQL via Supabase' },
  { name: 'Authentication', description: 'User login and session management' },
  { name: 'Payments', description: 'Stripe payment processing' },
  { name: 'AI Assessment', description: 'Building damage analysis' },
  { name: 'Storage', description: 'File and image storage' },
] as const;

export default function StatusPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/health', { cache: 'no-store' });
      const data: HealthResponse = await res.json();
      setHealth(data);
      setLastChecked(new Date());
    } catch {
      setHealth({ status: 'unhealthy', timestamp: new Date().toISOString(), version: 'unknown' });
      setLastChecked(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 60000); // Refresh every 60s
    return () => clearInterval(interval);
  }, [checkHealth]);

  const config = health ? STATUS_CONFIG[health.status] : STATUS_CONFIG.healthy;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px' }}>
        {/* Header */}
        <div style={{ marginBottom: 48 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
            Mintenance System Status
          </h1>
          <p style={{ fontSize: 14, color: '#6b7280' }}>
            Current status of all Mintenance platform services.
          </p>
        </div>

        {/* Overall Status Banner */}
        <div style={{
          padding: '20px 24px',
          borderRadius: 12,
          backgroundColor: loading ? '#f3f4f6' : config.bg,
          border: `1px solid ${loading ? '#e5e7eb' : config.color}20`,
          marginBottom: 32,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: loading ? '#9ca3af' : config.color,
              animation: loading ? 'pulse 2s infinite' : undefined,
            }} />
            <span style={{ fontSize: 18, fontWeight: 600, color: loading ? '#6b7280' : config.color }}>
              {loading ? 'Checking systems...' : config.label}
            </span>
          </div>
        </div>

        {/* Services List */}
        <div style={{
          borderRadius: 12,
          border: '1px solid #e5e7eb',
          backgroundColor: 'white',
          overflow: 'hidden',
        }}>
          {SERVICES.map((service, index) => (
            <div
              key={service.name}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 20px',
                borderBottom: index < SERVICES.length - 1 ? '1px solid #f3f4f6' : undefined,
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>
                  {service.name}
                </div>
                <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                  {service.description}
                </div>
              </div>
              <div style={{
                fontSize: 12,
                fontWeight: 500,
                color: loading ? '#9ca3af' : (health?.status === 'healthy' ? '#16a34a' : '#ca8a04'),
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                <div style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: loading ? '#d1d5db' : (health?.status === 'healthy' ? '#16a34a' : '#ca8a04'),
                }} />
                {loading ? 'Checking' : (health?.status === 'healthy' ? 'Operational' : 'Degraded')}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ marginTop: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: 12, color: '#9ca3af' }}>
            {lastChecked
              ? `Last checked: ${lastChecked.toLocaleTimeString()}`
              : 'Checking...'
            }
            {health?.version ? ` · API v${health.version}` : ''}
          </p>
          <button
            onClick={checkHealth}
            disabled={loading}
            style={{
              fontSize: 12,
              color: '#6b7280',
              background: 'none',
              border: '1px solid #e5e7eb',
              borderRadius: 6,
              padding: '6px 12px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1,
            }}
          >
            Refresh
          </button>
        </div>

        <p style={{ fontSize: 11, color: '#d1d5db', marginTop: 24, textAlign: 'center' }}>
          For incidents and maintenance updates, contact support@mintenance.co.uk
        </p>
      </div>
    </div>
  );
}
