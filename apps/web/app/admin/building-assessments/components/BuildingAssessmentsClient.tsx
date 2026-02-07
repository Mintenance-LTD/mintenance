'use client';

import React, { useState, useEffect } from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { AdminCard } from '@/components/admin/AdminCard';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminMetricCard } from '@/components/admin/AdminMetricCard';
import { logger } from '@mintenance/shared';
import type { Assessment, Statistics, CorrectionStats } from './BuildingAssessmentsTypes';
import { BuildingAssessmentsYOLO } from './BuildingAssessmentsYOLO';
import { BuildingAssessmentsAutoValidation } from './BuildingAssessmentsAutoValidation';
import { BuildingAssessmentsTimeline } from './BuildingAssessmentsTimeline';
import { BuildingAssessmentsCard } from './BuildingAssessmentsCard';
import { BuildingAssessmentsReviewDialog } from './BuildingAssessmentsReviewDialog';
interface BuildingAssessmentsClientProps {
  initialAssessments: Assessment[];
  initialStatistics: Statistics;
}

export function BuildingAssessmentsClient(props: BuildingAssessmentsClientProps) {
  const {
    initialAssessments = [],
    initialStatistics = {
      total: 0, pending: 0, validated: 0, rejected: 0,
      bySeverity: { early: 0, midway: 0, full: 0 },
      byDamageType: {}, canAutoValidate: false,
    },
  } = props || {};

  const [assessments, setAssessments] = useState<Assessment[]>(initialAssessments);
  const [statistics, setStatistics] = useState<Statistics>(initialStatistics);
  const [loading, setLoading] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [validationNotes, setValidationNotes] = useState('');
  const [filterStatus, setFilterStatus] = useState<'pending' | 'validated' | 'rejected' | 'all'>('pending');
  const [errorDialog, setErrorDialog] = useState<{ open: boolean; message: string }>({ open: false, message: '' });
  const [correctionStats, setCorrectionStats] = useState<CorrectionStats | null>(null);

  const refreshAssessments = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/building-assessments?status=${filterStatus === 'all' ? '' : filterStatus}`);
      const data = await response.json();
      setAssessments(data.assessments || []);
      setStatistics(data.statistics || statistics);
    } catch (error) {
      logger.error('Error refreshing assessments', error, { service: 'building-assessments' });
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async (assessmentId: string, validated: boolean) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/building-assessments/${assessmentId}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ validated, notes: validationNotes }),
      });
      if (!response.ok) throw new Error('Validation failed');
      await refreshAssessments();
      setSelectedAssessment(null);
      setValidationNotes('');
    } catch (error) {
      logger.error('Error validating assessment', error, { service: 'building-assessments' });
      setErrorDialog({ open: true, message: 'Failed to validate assessment. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refreshAssessments(); }, [filterStatus]);

  useEffect(() => {
    async function fetchCorrectionStats() {
      try {
        const response = await fetch('/api/building-surveyor/retrain/status');
        if (response.ok) {
          const data = await response.json();
          setCorrectionStats({
            total: data.correctionsCount?.total || 0,
            approved: data.correctionsCount?.approved || 0,
            pending: data.correctionsCount?.pending || 0,
            needed: data.retrainingStatus?.correctionsNeeded || 100,
          });
        }
      } catch (error) {
        logger.error('Failed to fetch correction stats', error, { service: 'building-assessments' });
      }
    }
    fetchCorrectionStats();
    const interval = setInterval(fetchCorrectionStats, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-8 md:p-10 max-w[1440px] mx-auto bg-slate-50 min-h-screen flex flex-col gap-6">
      <AdminPageHeader
        title="Building Assessments"
        subtitle={`Review and validate AI building damage assessments for training data collection.${statistics.canAutoValidate ? ' Auto-validation is active for high-confidence assessments.' : ''}`}
        quickStats={[
          { label: 'total', value: statistics.total, icon: 'fileText' as const, color: theme.colors.primary },
          { label: 'pending', value: statistics.pending, icon: 'clock' as const, color: '#F59E0B' },
          { label: 'validated', value: statistics.validated, icon: 'checkCircle' as const, color: theme.colors.success },
        ]}
      />

      {/* Statistics Dashboard */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: theme.spacing[4] }}>
        <AdminMetricCard label="Total Assessments" value={statistics.total} icon="fileText" iconColor={theme.colors.primary} />
        <AdminMetricCard label="Pending Review" value={statistics.pending} icon="clock" iconColor="#F59E0B" />
        <AdminMetricCard label="Validated" value={statistics.validated} icon="checkCircle" iconColor={theme.colors.success} />
        <AdminMetricCard label="Rejected" value={statistics.rejected} icon="xCircle" iconColor={theme.colors.error} />
      </div>

      {correctionStats && <BuildingAssessmentsYOLO correctionStats={correctionStats} hasAssessments={assessments.length > 0} />}
      {statistics.autoValidation && <BuildingAssessmentsAutoValidation statistics={statistics} />}

      {/* Auto-Validation Status */}
      {statistics.canAutoValidate !== undefined && (
        <AdminCard padding="sm" className="mb-6" style={{
          borderLeft: statistics.canAutoValidate ? `4px solid ${theme.colors.success}` : `4px solid ${theme.colors.border}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2] }}>
            <Icon name={statistics.canAutoValidate ? 'checkCircle' : 'clock'} size={20} color={statistics.canAutoValidate ? theme.colors.success : theme.colors.textSecondary} />
            <div>
              <div style={{ fontSize: theme.typography.fontSize.base, fontWeight: theme.typography.fontWeight.semibold, color: theme.colors.textPrimary }}>
                Auto-Validation: {statistics.canAutoValidate ? 'Active' : 'Inactive'}
              </div>
              {!statistics.canAutoValidate && statistics.minValidatedForAutoValidation && (
                <div style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary, marginTop: theme.spacing[1] }}>
                  Need {statistics.minValidatedForAutoValidation - statistics.validated} more validated assessments
                </div>
              )}
            </div>
          </div>
        </AdminCard>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: theme.spacing[2], flexWrap: 'wrap' }}>
        {(['all', 'pending', 'validated', 'rejected'] as const).map((status) => {
          const isActive = filterStatus === status;
          return (
            <button key={status} onClick={() => setFilterStatus(status)} style={{
              padding: `${theme.spacing[2]} ${theme.spacing[4]}`, borderRadius: theme.borderRadius.full,
              fontSize: theme.typography.fontSize.sm, fontWeight: theme.typography.fontWeight.medium,
              border: 'none', cursor: 'pointer', transition: 'all 0.2s',
              backgroundColor: isActive ? (status === 'pending' ? '#F59E0B' : status === 'validated' ? theme.colors.success : status === 'rejected' ? theme.colors.error : theme.colors.primary) : theme.colors.backgroundSecondary,
              color: isActive ? theme.colors.white : theme.colors.textPrimary,
            }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = theme.colors.backgroundTertiary; }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary; }}
            >{status.charAt(0).toUpperCase() + status.slice(1)}</button>
          );
        })}
      </div>

      {assessments.length > 0 && <BuildingAssessmentsTimeline assessments={assessments} />}

      {/* Assessments List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[5] }}>
        {loading && assessments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: theme.spacing[8], color: theme.colors.textSecondary }}>Loading assessments...</div>
        ) : assessments.length === 0 ? (
          <AdminCard padding="lg">
            <div style={{ textAlign: 'center', color: theme.colors.textSecondary }}>
              <Icon name="document" size={48} color={theme.colors.border} />
              <p style={{ marginTop: theme.spacing[4] }}>No assessments found</p>
            </div>
          </AdminCard>
        ) : (
          assessments.map((assessment) => (
            <BuildingAssessmentsCard key={assessment.id} assessment={assessment} loading={loading} onReview={setSelectedAssessment} onValidate={handleValidate} />
          ))
        )}
      </div>

      <BuildingAssessmentsReviewDialog
        selectedAssessment={selectedAssessment}
        validationNotes={validationNotes}
        loading={loading}
        onClose={() => { setSelectedAssessment(null); setValidationNotes(''); }}
        onNotesChange={setValidationNotes}
        onValidate={handleValidate}
      />

      <AlertDialog open={errorDialog.open} onOpenChange={(open: boolean) => setErrorDialog({ ...errorDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Error</AlertDialogTitle>
            <AlertDialogDescription>{errorDialog.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setErrorDialog({ open: false, message: '' })}>OK</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
