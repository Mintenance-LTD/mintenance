'use client';

/**
 * YOLO Learning Status Card
 * 
 * Displays YOLO continuous learning status, correction counts, and retraining progress
 */

import React, { useState, useEffect } from 'react';
import { logger } from '@mintenance/shared';
import { AdminCard } from './AdminCard';
import { Icon } from '@/components/ui/Icon';
import Link from 'next/link';

interface YOLOLearningStatus {
  correctionsCount: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  retrainingStatus: {
    lastJob?: {
      status: 'pending' | 'running' | 'completed' | 'failed';
      modelVersion?: string;
      correctionsCount: number;
      startedAt?: string;
      completedAt?: string;
    };
    nextRetrainThreshold: number;
    correctionsNeeded: number;
  };
  continuousLearningEnabled: boolean;
}

export function YOLOLearningStatusCard() {
  const [status, setStatus] = useState<YOLOLearningStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStatus() {
      try {
        setLoading(true);
        const response = await fetch('/api/building-surveyor/retrain/status');
        
        if (!response.ok) {
          throw new Error('Failed to fetch YOLO learning status');
        }

        const data = await response.json();
        logger.info('YOLO Learning Status API Response:', data);
        logger.info('continuousLearningEnabled:', data.continuousLearningEnabled);
        setStatus(data);
      } catch (err) {
        logger.error('Error fetching YOLO learning status:', err);
        setStatus(null);
      } finally {
        setLoading(false);
      }
    }

    fetchStatus();
    // Refresh every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <AdminCard padding="lg" className="h-full">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
            <Icon name="brain" size={20} color="#3B82F6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900">YOLO Learning</h3>
        </div>
        <p className="text-sm text-slate-500">Loading...</p>
      </AdminCard>
    );
  }

  if (!status) {
    return (
      <AdminCard padding="lg" className="h-full">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
            <Icon name="brain" size={20} color="#3B82F6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900">YOLO Learning</h3>
        </div>
        <p className="text-sm text-slate-500">Status unavailable</p>
      </AdminCard>
    );
  }

  const { correctionsCount, retrainingStatus, continuousLearningEnabled } = status;
  const progress = Math.min(100, (correctionsCount.approved / retrainingStatus.nextRetrainThreshold) * 100);
  const statusColor = continuousLearningEnabled ? '#10B981' : '#6B7280';
  const statusText = continuousLearningEnabled ? 'Active' : 'Inactive';

  return (
    <AdminCard padding="lg" className="h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
            <Icon name="brain" size={20} color="#3B82F6" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">YOLO Learning</h3>
            <p className="text-xs text-slate-500">Continuous model improvement</p>
          </div>
        </div>
        <span
          className="px-2 py-1 rounded-full text-xs font-semibold"
          style={{
            backgroundColor: statusColor + '20',
            color: statusColor,
          }}
        >
          {statusText}
        </span>
      </div>

      <div className="space-y-4">
        {/* Correction Stats */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-600">Corrections</span>
            <Link
              href="/admin/building-assessments"
              className="text-xs text-blue-600 hover:text-blue-700"
            >
              View all
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-lg font-semibold text-slate-900">{correctionsCount.approved}</div>
              <div className="text-xs text-slate-500">Approved</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-slate-900">{correctionsCount.pending}</div>
              <div className="text-xs text-slate-500">Pending</div>
            </div>
          </div>
        </div>

        {/* Retraining Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-600">Next Retrain</span>
            <span className="text-xs text-slate-500">
              {correctionsCount.approved} / {retrainingStatus.nextRetrainThreshold}
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          {retrainingStatus.correctionsNeeded > 0 && (
            <p className="text-xs text-slate-500 mt-1">
              Need {retrainingStatus.correctionsNeeded} more approved corrections
            </p>
          )}
        </div>

        {/* Last Retraining Job */}
        {retrainingStatus.lastJob && (
          <div className="pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-slate-600">Last Retrain</span>
              <span
                className="px-2 py-0.5 rounded-full text-xs font-semibold"
                style={{
                  backgroundColor:
                    retrainingStatus.lastJob.status === 'completed'
                      ? '#10B98120'
                      : retrainingStatus.lastJob.status === 'running'
                      ? '#3B82F620'
                      : retrainingStatus.lastJob.status === 'failed'
                      ? '#EF444420'
                      : '#6B728020',
                  color:
                    retrainingStatus.lastJob.status === 'completed'
                      ? '#10B981'
                      : retrainingStatus.lastJob.status === 'running'
                      ? '#3B82F6'
                      : retrainingStatus.lastJob.status === 'failed'
                      ? '#EF4444'
                      : '#6B7280',
                }}
              >
                {retrainingStatus.lastJob.status}
              </span>
            </div>
            {retrainingStatus.lastJob.modelVersion && (
              <p className="text-xs text-slate-500">
                Model: {retrainingStatus.lastJob.modelVersion}
              </p>
            )}
            {retrainingStatus.lastJob.completedAt && (
              <p className="text-xs text-slate-500">
                {new Date(retrainingStatus.lastJob.completedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="pt-2 border-t border-slate-200">
          <Link
            href="/admin/building-assessments"
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            Correct Detections →
          </Link>
        </div>
      </div>
    </AdminCard>
  );
}

