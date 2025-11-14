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

  // Determine status badge color and text
  const statusColor = modelHealth?.valid ? '#4CC38A' : '#E74C3C';
  const statusText = modelHealth?.valid ? 'Configured' : 'Misconfigured';
  const statusIcon = modelHealth?.valid ? 'checkCircle' : 'alert';

  // Build endpoint URL
  const endpointUrl = modelHealth
    ? `${modelHealth.baseUrl}/${modelHealth.modelId}/${modelHealth.modelVersion}`
    : 'Unknown';

  return (
    <div className="rounded-[16px] border border-slate-200 bg-white shadow-[0_8px_24px_rgba(0,0,0,0.06)] p-6 relative transition-all duration-300 hover:shadow-[0_12px_32px_rgba(0,0,0,0.1)]">
      {/* Status Badge - Top Right */}
      <div className="absolute top-4 right-4">
        <div
          className={cn(
            'flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold',
            modelHealth?.valid
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          )}
        >
          <Icon name={statusIcon} size={14} color={statusColor} />
          {statusText}
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 mb-6 pr-20">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
          <Icon name="activity" size={22} color="#6366F1" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900 mb-1">
            Model Version Health
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Roboflow Object Detection
          </p>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="p-4 text-center text-slate-500">
          Loading...
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2">
          {/* Model Info */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex justify-between items-center">
              <span className="text-xs uppercase text-slate-500 tracking-wide">
                Model ID:
              </span>
              <span className="text-xs text-slate-900 font-mono">
                {modelHealth?.modelId || 'Unknown'}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-xs uppercase text-slate-500 tracking-wide">
                Version:
              </span>
              <span className="text-xs font-semibold text-slate-900">
                v{modelHealth?.modelVersion || 'Unknown'}
              </span>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-slate-100 my-2"></div>

          {/* Endpoint */}
          <div className="flex justify-between items-start gap-2">
            <span className="text-xs uppercase text-slate-500 tracking-wide shrink-0">
              Endpoint:
            </span>
            <span
              className="text-xs text-slate-600 font-mono truncate text-right max-w-[180px]"
              title={endpointUrl}
            >
              {endpointUrl}
            </span>
          </div>

          {/* Validation Error Message */}
          {modelHealth?.validationError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-xs text-red-700 m-0 leading-relaxed font-medium">
                {modelHealth.validationError}
              </p>
            </div>
          )}

          {/* Error Message (if fetch failed) */}
          {error && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
              <p className="text-xs text-amber-600 m-0">
                Failed to load model health: {error}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

