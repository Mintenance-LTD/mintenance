'use client';

import React, { useState, useEffect } from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { AdminCard } from '@/components/admin/AdminCard';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AdminMetricCard } from '@/components/admin/AdminMetricCard';
import { logger } from '@mintenance/shared';
import { getCsrfHeaders } from '@/lib/csrf-client';
import type {
  Assessment,
  Statistics,
  CorrectionStats,
} from './BuildingAssessmentsTypes';
import { BuildingAssessmentsYOLO } from './BuildingAssessmentsYOLO';
import { BuildingAssessmentsAutoValidation } from './BuildingAssessmentsAutoValidation';
import { BuildingAssessmentsTimeline } from './BuildingAssessmentsTimeline';
import { BuildingAssessmentsCard } from './BuildingAssessmentsCard';
import { BuildingAssessmentsReviewDialog } from './BuildingAssessmentsReviewDialog';
interface BuildingAssessmentsClientProps {
  initialAssessments: Assessment[];
  initialStatistics: Statistics;
}

export function BuildingAssessmentsClient(
  props: BuildingAssessmentsClientProps
) {
  const {
    initialAssessments = [],
    initialStatistics = {
      total: 0,
      pending: 0,
      validated: 0,
      rejected: 0,
      bySeverity: { early: 0, developing: 0, significant: 0, dangerous: 0 },
      byDamageType: {},
      canAutoValidate: false,
    },
  } = props || {};

  const [assessments, setAssessments] =
    useState<Assessment[]>(initialAssessments);
  const [statistics, setStatistics] = useState<Statistics>(initialStatistics);
  const [loading, setLoading] = useState(false);
  const [selectedAssessment, setSelectedAssessment] =
    useState<Assessment | null>(null);
  const [validationNotes, setValidationNotes] = useState('');
  const [filterStatus, setFilterStatus] = useState<
    'pending' | 'validated' | 'rejected' | 'all'
  >('pending');
  const [errorDialog, setErrorDialog] = useState<{
    open: boolean;
    message: string;
  }>({ open: false, message: '' });
  const [correctionStats, setCorrectionStats] =
    useState<CorrectionStats | null>(null);

  const refreshAssessments = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/building-assessments?status=${filterStatus === 'all' ? '' : filterStatus}`
      );
      const data = await response.json();
      setAssessments(data.assessments || []);
      setStatistics(data.statistics || statistics);
    } catch (error) {
      logger.error('Error refreshing assessments', error, {
        service: 'building-assessments',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async (assessmentId: string, validated: boolean) => {
    setLoading(true);
    try {
      const csrfHeaders = await getCsrfHeaders();
      const response = await fetch(
        `/api/admin/building-assessments/${assessmentId}/validate`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', ...csrfHeaders },
          body: JSON.stringify({ validated, notes: validationNotes }),
        }
      );
      if (!response.ok) throw new Error('Validation failed');
      await refreshAssessments();
      setSelectedAssessment(null);
      setValidationNotes('');
    } catch (error) {
      logger.error('Error validating assessment', error, {
        service: 'building-assessments',
      });
      setErrorDialog({
        open: true,
        message: 'Failed to validate assessment. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAssessments();
  }, [filterStatus]);

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
        logger.error('Failed to fetch correction stats', error, {
          service: 'building-assessments',
        });
      }
    }
    fetchCorrectionStats();
    const interval = setInterval(fetchCorrectionStats, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className='min-h-screen bg-[#f7f9fb] px-6 md:px-10 py-8 max-w-[1440px] mx-auto space-y-8'>
      {/* Page Header */}
      <div className='flex justify-between items-end'>
        <div>
          <h2 className='text-[2.75rem] font-extrabold tracking-tight text-[#2a3439] leading-tight'>
            Building Assessments
          </h2>
          <p className='text-[#566166] text-lg mt-2'>
            YOLO Continuous Learning &amp; AI Monitoring Ecosystem
          </p>
        </div>
        <div className='flex gap-3'>
          <button className='px-5 py-2.5 bg-[#d3e4fe] text-[#435368] rounded-xl font-medium text-sm hover:brightness-95 transition-all flex items-center gap-2'>
            <Icon name='clock' size={16} color='#435368' /> Model History
          </button>
          <button
            onClick={refreshAssessments}
            className='px-5 py-2.5 bg-[#565e74] text-white rounded-xl font-medium text-sm hover:brightness-110 transition-all flex items-center gap-2 shadow-lg shadow-[#565e74]/20'
          >
            <Icon name='refresh' size={16} color='#fff' /> Refresh
          </button>
        </div>
      </div>

      {/* Bento Grid — 4/8 split matching mockup */}
      <div className='grid grid-cols-12 gap-6'>
        {/* Model Health Card (4 cols) */}
        <div className='col-span-12 lg:col-span-4 bg-white rounded-[1.5rem] p-6 flex flex-col justify-between border border-[#a9b4b9]/5'>
          <div className='flex justify-between items-start'>
            <div>
              <span className='text-[#717c82] text-[10px] font-bold tracking-[0.05em] uppercase'>
                Total Assessments
              </span>
              <h3 className='text-3xl font-bold text-[#2a3439] mt-1'>
                {statistics.total.toLocaleString()}
              </h3>
            </div>
            <span className='bg-[#e3dbfd] text-[#514d68] px-3 py-1 rounded-full text-xs font-semibold'>
              {statistics.canAutoValidate ? 'Auto-Active' : 'Manual'}
            </span>
          </div>
          <div className='mt-6 grid grid-cols-3 gap-3'>
            <div>
              <p className='text-2xl font-bold text-[#2a3439]'>
                {statistics.pending}
              </p>
              <p className='text-[10px] text-[#717c82] font-bold uppercase'>
                Pending
              </p>
            </div>
            <div>
              <p className='text-2xl font-bold text-[#2a3439]'>
                {statistics.validated}
              </p>
              <p className='text-[10px] text-[#717c82] font-bold uppercase'>
                Validated
              </p>
            </div>
            <div>
              <p className='text-2xl font-bold text-[#9f403d]'>
                {statistics.rejected}
              </p>
              <p className='text-[10px] text-[#717c82] font-bold uppercase'>
                Rejected
              </p>
            </div>
          </div>
        </div>

        {/* Learning Progress Card (8 cols) */}
        <div className='col-span-12 lg:col-span-8 bg-white rounded-[1.5rem] p-6 border border-[#a9b4b9]/5'>
          <div className='flex justify-between items-center mb-6'>
            <h3 className='text-lg font-bold text-[#2a3439]'>
              Continuous Learning Progress
            </h3>
            <span className='text-sm text-[#566166]'>
              {correctionStats
                ? `${correctionStats.approved} / ${correctionStats.approved + correctionStats.needed} corrections`
                : 'Loading...'}
            </span>
          </div>
          <div className='grid grid-cols-3 gap-8'>
            <div className='space-y-2'>
              <div className='flex items-center gap-2'>
                <Icon name='checkCircle' size={18} color='#565e74' />
                <span className='text-sm font-medium text-[#566166]'>
                  Approved
                </span>
              </div>
              <p className='text-3xl font-bold text-[#2a3439]'>
                {correctionStats?.approved ?? 0}
              </p>
            </div>
            <div className='space-y-2'>
              <div className='flex items-center gap-2'>
                <Icon name='clock' size={18} color='#605c78' />
                <span className='text-sm font-medium text-[#566166]'>
                  Pending Review
                </span>
              </div>
              <p className='text-3xl font-bold text-[#2a3439]'>
                {correctionStats?.pending ?? 0}
              </p>
            </div>
            <div className='space-y-2'>
              <div className='flex items-center gap-2'>
                <Icon name='refresh' size={18} color='#506076' />
                <span className='text-sm font-medium text-[#566166]'>
                  Needed for Retrain
                </span>
              </div>
              <p className='text-3xl font-bold text-[#2a3439]'>
                {correctionStats?.needed ?? 100}
              </p>
            </div>
          </div>
        </div>
      </div>

      {correctionStats && (
        <BuildingAssessmentsYOLO
          correctionStats={correctionStats}
          hasAssessments={assessments.length > 0}
        />
      )}
      {statistics.autoValidation && (
        <BuildingAssessmentsAutoValidation statistics={statistics} />
      )}

      {/* Auto-Validation Status */}
      {statistics.canAutoValidate !== undefined && (
        <AdminCard
          padding='sm'
          className='mb-6'
          style={{
            borderLeft: statistics.canAutoValidate
              ? `4px solid ${theme.colors.success}`
              : `4px solid ${theme.colors.border}`,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing[2],
            }}
          >
            <Icon
              name={statistics.canAutoValidate ? 'checkCircle' : 'clock'}
              size={20}
              color={
                statistics.canAutoValidate
                  ? theme.colors.success
                  : theme.colors.textSecondary
              }
            />
            <div>
              <div
                style={{
                  fontSize: theme.typography.fontSize.base,
                  fontWeight: theme.typography.fontWeight.semibold,
                  color: theme.colors.textPrimary,
                }}
              >
                Auto-Validation:{' '}
                {statistics.canAutoValidate ? 'Active' : 'Inactive'}
              </div>
              {!statistics.canAutoValidate &&
                statistics.minValidatedForAutoValidation && (
                  <div
                    style={{
                      fontSize: theme.typography.fontSize.sm,
                      color: theme.colors.textSecondary,
                      marginTop: theme.spacing[1],
                    }}
                  >
                    {statistics.validated >=
                    statistics.minValidatedForAutoValidation
                      ? 'Minimum validations met — auto-validation can be enabled'
                      : `Need ${statistics.minValidatedForAutoValidation - statistics.validated} more validated assessments`}
                  </div>
                )}
            </div>
          </div>
        </AdminCard>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: theme.spacing[2], flexWrap: 'wrap' }}>
        {(['all', 'pending', 'validated', 'rejected'] as const).map(
          (status) => {
            const isActive = filterStatus === status;
            return (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                style={{
                  padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
                  borderRadius: theme.borderRadius.full,
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.medium,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  backgroundColor: isActive
                    ? status === 'pending'
                      ? '#F59E0B'
                      : status === 'validated'
                        ? theme.colors.success
                        : status === 'rejected'
                          ? theme.colors.error
                          : theme.colors.primary
                    : theme.colors.backgroundSecondary,
                  color: isActive
                    ? theme.colors.white
                    : theme.colors.textPrimary,
                }}
                onMouseEnter={(e) => {
                  if (!isActive)
                    e.currentTarget.style.backgroundColor =
                      theme.colors.backgroundTertiary;
                }}
                onMouseLeave={(e) => {
                  if (!isActive)
                    e.currentTarget.style.backgroundColor =
                      theme.colors.backgroundSecondary;
                }}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            );
          }
        )}
      </div>

      {assessments.length > 0 && (
        <BuildingAssessmentsTimeline assessments={assessments} />
      )}

      {/* Assessments List */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing[5],
        }}
      >
        {loading && assessments.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: theme.spacing[8],
              color: theme.colors.textSecondary,
            }}
          >
            Loading assessments...
          </div>
        ) : assessments.length === 0 ? (
          <AdminCard padding='lg'>
            <div
              style={{ textAlign: 'center', color: theme.colors.textSecondary }}
            >
              <Icon name='document' size={48} color={theme.colors.border} />
              <p style={{ marginTop: theme.spacing[4] }}>
                No assessments found
              </p>
            </div>
          </AdminCard>
        ) : (
          assessments.map((assessment) => (
            <BuildingAssessmentsCard
              key={assessment.id}
              assessment={assessment}
              loading={loading}
              onReview={setSelectedAssessment}
              onValidate={handleValidate}
            />
          ))
        )}
      </div>

      <BuildingAssessmentsReviewDialog
        selectedAssessment={selectedAssessment}
        validationNotes={validationNotes}
        loading={loading}
        onClose={() => {
          setSelectedAssessment(null);
          setValidationNotes('');
        }}
        onNotesChange={setValidationNotes}
        onValidate={handleValidate}
      />

      <AlertDialog
        open={errorDialog.open}
        onOpenChange={(open: boolean) =>
          setErrorDialog({ ...errorDialog, open })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Error</AlertDialogTitle>
            <AlertDialogDescription>
              {errorDialog.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setErrorDialog({ open: false, message: '' })}
            >
              OK
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
