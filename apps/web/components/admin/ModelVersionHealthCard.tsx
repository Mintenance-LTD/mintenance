'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

interface ModelHealthInfo {
  modelId: string;
  modelVersion: string;
  baseUrl: string;
  valid: boolean;
  validationError: string | null;
}

/**
 * Model Version Health Card
 *
 * Displays Roboflow model configuration and validation status.
 * Read-only informational card for admin dashboard.
 */
export function ModelVersionHealthCard() {
  const [modelHealth, setModelHealth] = useState<ModelHealthInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchModelHealth() {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/model-health');

        if (!response.ok) {
          throw new Error('Failed to fetch model health');
        }

        const data = await response.json();
        setModelHealth(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        // Set fallback data on error
        setModelHealth({
          modelId: 'Unknown',
          modelVersion: 'Unknown',
          baseUrl: 'Unknown',
          valid: false,
          validationError: 'Failed to fetch model health',
        });
      } finally {
        setLoading(false);
      }
    }

    fetchModelHealth();
  }, []);

  const statusColor = modelHealth?.valid ? '#10B981' : '#EF4444';
  const statusText = modelHealth?.valid ? 'Configured' : 'Misconfigured';
  const statusIcon = modelHealth?.valid ? 'checkCircle' : 'alert';

  const endpointUrl = modelHealth
    ? `${modelHealth.baseUrl}/${modelHealth.modelId}/${modelHealth.modelVersion}`
    : 'Unknown';

  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4 relative h-full">
      <div className="absolute top-4 right-4">
        <span
          className={cn(
            'px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1.5',
            modelHealth?.valid ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
          )}
        >
          <Icon name={statusIcon} size={14} color={statusColor} />
          {statusText}
        </span>
      </div>

      <div className="flex items-center gap-3 mb-4 pr-16">
        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
          <Icon name="activity" size={20} color="#2563EB" className="text-slate-600" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Model Version Health</h3>
          <p className="text-xs text-slate-500">Roboflow configuration</p>
        </div>
      </div>

      {loading ? (
        <div className="p-4 text-center text-slate-500 text-sm">Loading...</div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Model ID</p>
              <p className="text-sm font-medium text-slate-900 mt-1">{modelHealth?.modelId || 'Unknown'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Version</p>
              <p className="text-sm font-medium text-slate-900 mt-1">v{modelHealth?.modelVersion || 'Unknown'}</p>
            </div>
          </div>

          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Endpoint</p>
            <p className="text-xs text-slate-500 font-mono truncate mt-1" title={endpointUrl}>
              {endpointUrl}
            </p>
          </div>

          {modelHealth?.validationError && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200">
              <p className="text-xs text-rose-700">{modelHealth.validationError}</p>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200">
              <p className="text-xs text-amber-700">Failed to load model health: {error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

