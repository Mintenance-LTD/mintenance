'use client';

import React, { useState, useEffect } from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { AdminCard } from '@/components/admin/AdminCard';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { BuildingAssessmentDisplay } from '@/components/building-surveyor';
import { X } from 'lucide-react';
import type { Phase1BuildingAssessment } from '@/lib/services/building-surveyor/types';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminMetricCard } from '@/components/admin/AdminMetricCard';
import { CircularProgress } from '@/components/ui/CircularProgress';

interface Assessment {
  id: string;
  user_id: string;
  damage_type: string;
  severity: 'early' | 'midway' | 'full';
  confidence: number;
  safety_score: number;
  compliance_score: number;
  insurance_risk_score: number;
  urgency: string;
  assessment_data: Phase1BuildingAssessment;
  validation_status: 'pending' | 'validated' | 'rejected' | 'needs_review';
  validated_by?: string;
  validated_at?: string;
  validation_notes?: string;
  created_at: string;
  user?: {
    id: string;
    first_name?: string;
    last_name?: string;
    email: string;
  };
  images?: Array<{
    image_url: string;
    image_index: number;
  }>;
  auto_validated?: boolean;
  auto_validated_at?: string;
  auto_validation_reason?: string;
  auto_validation_confidence?: number | null;
  auto_validation_review_status?: 'not_applicable' | 'pending_review' | 'confirmed' | 'overturned';
}

interface Statistics {
  total: number;
  pending: number;
  validated: number;
  rejected: number;
  bySeverity: {
    early: number;
    midway: number;
    full: number;
  };
  byDamageType: Record<string, number>;
  autoValidationEnabled?: boolean;
  minValidatedForAutoValidation?: number;
  canAutoValidate?: boolean;
  autoValidation?: {
    total: number;
    pendingReview: number;
    confirmed: number;
    overturned: number;
    precision: number | null;
    recall: number | null;
    coverage: number | null;
     pendingRate?: number | null;
  };
}

const formatPercentage = (value: number | null | undefined): string => {
  if (value === null || value === undefined) {
    return '—';
  }
  return `${(value * 100).toFixed(1)}%`;
};

interface BuildingAssessmentsClientProps {
  initialAssessments: Assessment[];
  initialStatistics: Statistics;
}

export function BuildingAssessmentsClient({
  initialAssessments,
  initialStatistics,
}: BuildingAssessmentsClientProps) {
  const [assessments, setAssessments] = useState<Assessment[]>(initialAssessments);
  const [statistics, setStatistics] = useState<Statistics>(initialStatistics);
  const [loading, setLoading] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [validationNotes, setValidationNotes] = useState('');
  const [filterStatus, setFilterStatus] = useState<'pending' | 'validated' | 'rejected' | 'all'>('pending');
  const [errorDialog, setErrorDialog] = useState<{ open: boolean; message: string }>({ open: false, message: '' });
  const [correctionStats, setCorrectionStats] = useState<{
    total: number;
    approved: number;
    pending: number;
    needed: number;
  } | null>(null);

  const getAutoValidationBadge = (assessment: Assessment) => {
    if (!assessment.auto_validated) {
      return null;
    }

    const status = assessment.auto_validation_review_status || 'pending_review';
    if (status === 'pending_review') {
      return {
        label: 'Auto-Validated (Pending Review)',
        background: '#DBEAFE',
        color: '#1E3A8A',
      };
    }
    if (status === 'confirmed') {
      return {
        label: 'Auto-Validated ✓',
        background: '#D1FAE5',
        color: '#065F46',
      };
    }
    if (status === 'overturned') {
      return {
        label: 'Auto-Validation Overturned',
        background: '#FEE2E2',
        color: '#991B1B',
      };
    }
    return {
      label: 'Auto-Validated',
      background: '#E5E7EB',
      color: '#374151',
    };
  };

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
      console.error('Error refreshing assessments:', error);
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
        body: JSON.stringify({
          validated,
          notes: validationNotes,
        }),
      });

      if (!response.ok) {
        throw new Error('Validation failed');
      }

      await refreshAssessments();
      setSelectedAssessment(null);
      setValidationNotes('');
    } catch (error) {
      console.error('Error validating assessment:', error);
      setErrorDialog({ open: true, message: 'Failed to validate assessment. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAssessments();
  }, [filterStatus]);

  // Fetch correction stats
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
        console.error('Failed to fetch correction stats:', error);
      }
    }
    fetchCorrectionStats();
    const interval = setInterval(fetchCorrectionStats, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-8 md:p-10 max-w-[1440px] mx-auto bg-slate-50 min-h-screen flex flex-col gap-6">
      <AdminPageHeader
        title="Building Assessments"
        subtitle={`Review and validate AI building damage assessments for training data collection.${statistics.canAutoValidate ? ' Auto-validation is active for high-confidence assessments.' : ''}`}
        quickStats={[
          {
            label: 'total',
            value: statistics.total,
            icon: 'fileText',
            color: theme.colors.primary,
          },
          {
            label: 'pending',
            value: statistics.pending,
            icon: 'clock',
            color: '#F59E0B',
          },
          {
            label: 'validated',
            value: statistics.validated,
            icon: 'checkCircle',
            color: theme.colors.success,
          },
        ]}
      />

      {/* Statistics Dashboard */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: theme.spacing[4],
        }}
      >
        <AdminMetricCard
          label="Total Assessments"
          value={statistics.total}
          icon="fileText"
          iconColor={theme.colors.primary}
        />
        <AdminMetricCard
          label="Pending Review"
          value={statistics.pending}
          icon="clock"
          iconColor="#F59E0B"
        />
        <AdminMetricCard
          label="Validated"
          value={statistics.validated}
          icon="checkCircle"
          iconColor={theme.colors.success}
        />
        <AdminMetricCard
          label="Rejected"
          value={statistics.rejected}
          icon="xCircle"
          iconColor={theme.colors.error}
        />
      </div>

      {/* YOLO Corrections Section */}
      {correctionStats && (
        <AdminCard padding="lg" className="mb-6">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing[3],
              marginBottom: theme.spacing[4],
            }}
          >
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: '#EFF6FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Icon name="brain" size={24} color="#3B82F6" />
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{
                fontSize: '18px',
                fontWeight: 700,
                color: '#0F172A',
                margin: 0,
                marginBottom: '4px',
              }}>
                YOLO Continuous Learning
              </h2>
              <p style={{
                fontSize: '13px',
                color: '#64748B',
                margin: 0,
              }}>
                Help improve the AI model by correcting detections. {correctionStats.approved} approved corrections collected.
              </p>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: theme.spacing[4],
              marginBottom: theme.spacing[4],
            }}
          >
            <AdminMetricCard
              label="Approved Corrections"
              value={correctionStats.approved}
              icon="checkCircle"
              iconColor="#10B981"
            />
            <AdminMetricCard
              label="Pending Review"
              value={correctionStats.pending}
              icon="clock"
              iconColor="#F59E0B"
            />
            <AdminMetricCard
              label="Needed for Retrain"
              value={correctionStats.needed}
              icon="target"
              iconColor="#3B82F6"
            />
          </div>

          {/* Progress Bar */}
          <div style={{ marginBottom: theme.spacing[4] }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: theme.spacing[2],
            }}>
              <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748B' }}>
                Progress to Next Retrain
              </span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                {correctionStats.approved} / 100
              </span>
            </div>
            <div style={{
              width: '100%',
              height: '8px',
              backgroundColor: '#E2E8F0',
              borderRadius: '4px',
              overflow: 'hidden',
            }}>
              <div
                style={{
                  width: `${Math.min(100, (correctionStats.approved / 100) * 100)}%`,
                  height: '100%',
                  backgroundColor: '#3B82F6',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>

          {/* Call to Action */}
          {assessments.length > 0 && (
            <div style={{
              padding: theme.spacing[4],
              backgroundColor: '#F0F9FF',
              borderRadius: '12px',
              border: '1px solid #BAE6FD',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div>
                  <p style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#0F172A',
                    margin: 0,
                    marginBottom: '4px',
                  }}>
                    Start Improving the AI Model
                  </p>
                  <p style={{
                    fontSize: '13px',
                    color: '#64748B',
                    margin: 0,
                  }}>
                    Click "Correct Detections" on any assessment to fix AI errors and help train better models.
                  </p>
                </div>
                <Icon name="arrowRight" size={20} color="#3B82F6" />
              </div>
            </div>
          )}
        </AdminCard>
      )}

      {statistics.autoValidation && (
        <AdminCard padding="lg" className="mb-6">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing[3],
              marginBottom: theme.spacing[6],
              paddingBottom: theme.spacing[4],
              borderBottom: '1px solid #E2E8F0',
            }}
          >
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: '#EFF6FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Icon name="target" size={24} color="#4A67FF" />
            </div>
            <div>
              <h2 style={{
                fontSize: '18px',
                fontWeight: 700,
                color: '#0F172A',
                margin: 0,
                marginBottom: '4px',
              }}>
                Auto-Validation Performance
              </h2>
              <p style={{
                fontSize: '13px',
                color: '#64748B',
                margin: 0,
              }}>
                {statistics.autoValidation.total} auto-validated • {statistics.autoValidation.confirmed} confirmed • {statistics.autoValidation.overturned} overturned
              </p>
            </div>
          </div>
          
          {/* Gauge Indicators */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: theme.spacing[6],
              marginBottom: theme.spacing[6],
            }}
          >
            {statistics.autoValidation.precision !== null && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: theme.spacing[3],
              }}>
                <CircularProgress
                  value={(statistics.autoValidation.precision || 0) * 100}
                  size={120}
                  strokeWidth={10}
                  label="Precision"
                  showPercentage={true}
                />
              </div>
            )}
            {statistics.autoValidation.recall !== null && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: theme.spacing[3],
              }}>
                <CircularProgress
                  value={(statistics.autoValidation.recall || 0) * 100}
                  size={120}
                  strokeWidth={10}
                  label="Recall"
                  showPercentage={true}
                />
              </div>
            )}
            {statistics.autoValidation.coverage !== null && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: theme.spacing[3],
              }}>
                <CircularProgress
                  value={(statistics.autoValidation.coverage || 0) * 100}
                  size={120}
                  strokeWidth={10}
                  label="Coverage"
                  showPercentage={true}
                />
              </div>
            )}
          </div>

          {/* Additional Metrics */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: theme.spacing[4],
              paddingTop: theme.spacing[4],
              borderTop: '1px solid #E2E8F0',
            }}
          >
            <AdminMetricCard
              label="Pending Rate"
              value={formatPercentage(statistics.autoValidation.pendingRate)}
              icon="progress"
              iconColor="#F59E0B"
            />
            <AdminMetricCard
              label="Confirmed"
              value={statistics.autoValidation.confirmed}
              icon="checkCircle"
              iconColor={theme.colors.success}
            />
            <AdminMetricCard
              label="Overturned"
              value={statistics.autoValidation.overturned}
              icon="alertTriangle"
              iconColor={theme.colors.error}
            />
          </div>
        </AdminCard>
      )}

      {/* Auto-Validation Status */}
      {statistics.canAutoValidate !== undefined && (
        <AdminCard padding="sm" className="mb-6" style={{ 
          borderLeft: statistics.canAutoValidate ? `4px solid ${theme.colors.success}` : `4px solid ${theme.colors.border}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2] }}>
            <Icon 
              name={statistics.canAutoValidate ? 'checkCircle' : 'clock'} 
              size={20} 
              color={statistics.canAutoValidate ? theme.colors.success : theme.colors.textSecondary} 
            />
            <div>
              <div style={{ 
                fontSize: theme.typography.fontSize.base,
                fontWeight: theme.typography.fontWeight.semibold,
                color: theme.colors.textPrimary,
              }}>
                Auto-Validation: {statistics.canAutoValidate ? 'Active' : 'Inactive'}
              </div>
              {!statistics.canAutoValidate && statistics.minValidatedForAutoValidation && (
                <div style={{ 
                  fontSize: theme.typography.fontSize.sm, 
                  color: theme.colors.textSecondary, 
                  marginTop: theme.spacing[1] 
                }}>
                  Need {statistics.minValidatedForAutoValidation - statistics.validated} more validated assessments
                </div>
              )}
            </div>
          </div>
        </AdminCard>
      )}

      {/* Filters */}
      <div
        style={{
          display: 'flex',
          gap: theme.spacing[2],
          flexWrap: 'wrap',
        }}
      >
        {(['all', 'pending', 'validated', 'rejected'] as const).map((status) => {
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
                  ? (status === 'pending' ? '#F59E0B' : status === 'validated' ? theme.colors.success : status === 'rejected' ? theme.colors.error : theme.colors.primary)
                  : theme.colors.backgroundSecondary,
                color: isActive ? theme.colors.white : theme.colors.textPrimary,
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = theme.colors.backgroundTertiary;
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
                }
              }}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          );
        })}
      </div>

      {/* Timeline of Recent Assessments */}
      {assessments.length > 0 && (
        <AdminCard padding="lg" className="mb-6">
          <h2 style={{
            fontSize: '18px',
            fontWeight: 700,
            color: '#0F172A',
            marginBottom: theme.spacing[6],
          }}>
            Recent Assessment Timeline
          </h2>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing[4],
            position: 'relative',
            paddingLeft: theme.spacing[6],
          }}>
            {assessments.slice(0, 5).map((assessment, index) => (
              <div key={assessment.id} style={{
                position: 'relative',
                paddingBottom: index < Math.min(assessments.length, 5) - 1 ? theme.spacing[4] : 0,
              }}>
                {/* Timeline Line */}
                {index < Math.min(assessments.length, 5) - 1 && (
                  <div style={{
                    position: 'absolute',
                    left: '-20px',
                    top: '24px',
                    bottom: '-16px',
                    width: '2px',
                    backgroundColor: '#E2E8F0',
                  }} />
                )}
                {/* Timeline Dot */}
                <div style={{
                  position: 'absolute',
                  left: '-26px',
                  top: '4px',
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: assessment.validation_status === 'validated' ? '#4CC38A' :
                                   assessment.validation_status === 'rejected' ? '#E74C3C' :
                                   '#F59E0B',
                  border: '2px solid #FFFFFF',
                  boxShadow: '0 0 0 2px #E2E8F0',
                  zIndex: 1,
                }} />
                {/* Timeline Content */}
                <div style={{
                  padding: theme.spacing[4],
                  backgroundColor: '#F8FAFC',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing[2],
                    marginBottom: theme.spacing[2],
                    flexWrap: 'wrap',
                  }}>
                    <span style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#0F172A',
                    }}>
                      {assessment.damage_type.replace(/_/g, ' ')}
                    </span>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      ...(assessment.validation_status === 'validated' ? {
                        backgroundColor: '#D1FAE5',
                        color: '#065F46',
                        border: '1px solid #86EFAC',
                      } : assessment.validation_status === 'rejected' ? {
                        backgroundColor: '#FEE2E2',
                        color: '#991B1B',
                        border: '1px solid #FCA5A5',
                      } : {
                        backgroundColor: '#FEF3C7',
                        color: '#92400E',
                        border: '1px solid #FCD34D',
                      }),
                    }}>
                      {assessment.validation_status}
                    </span>
                  </div>
                  <p style={{
                    fontSize: '13px',
                    color: '#64748B',
                    margin: 0,
                  }}>
                    {new Date(assessment.created_at).toLocaleString()} • {assessment.user?.email || 'Unknown user'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </AdminCard>
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
          <div style={{ textAlign: 'center', padding: theme.spacing[8], color: theme.colors.textSecondary }}>
            Loading assessments...
          </div>
        ) : assessments.length === 0 ? (
          <AdminCard padding="lg">
            <div style={{ textAlign: 'center', color: theme.colors.textSecondary }}>
              <Icon name="document" size={48} color={theme.colors.border} />
              <p style={{ marginTop: theme.spacing[4] }}>No assessments found</p>
            </div>
          </AdminCard>
        ) : (
          assessments.map((assessment) => {
            const autoBadgeStyle = getAutoValidationBadge(assessment);

            return (
              <AdminCard key={assessment.id} padding="lg" hover className="mb-4">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: theme.spacing[4],
                }}
              >
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: theme.spacing[2],
                      marginBottom: theme.spacing[2],
                    }}
                  >
                    {/* Validation Status Chip */}
                    <span
                      style={{
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        border: '1px solid',
                        ...(assessment.validation_status === 'validated' ? {
                          backgroundColor: '#D1FAE5',
                          color: '#065F46',
                          borderColor: '#86EFAC',
                        } : assessment.validation_status === 'rejected' ? {
                          backgroundColor: '#FEE2E2',
                          color: '#991B1B',
                          borderColor: '#FCA5A5',
                        } : {
                          backgroundColor: '#FEF3C7',
                          color: '#92400E',
                          borderColor: '#FCD34D',
                        }),
                      }}
                    >
                      {assessment.validation_status === 'validated' ? '✓ Validated' : 
                       assessment.validation_status === 'rejected' ? '✕ Rejected' : 
                       '⏳ Pending'}
                    </span>
                    {/* Severity Chip */}
                    <span
                      style={{
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        border: '1px solid',
                        backgroundColor:
                          assessment.severity === 'full'
                            ? '#FEE2E2'
                            : assessment.severity === 'midway'
                            ? '#FEF3C7'
                            : '#D1FAE5',
                        color:
                          assessment.severity === 'full'
                            ? '#991B1B'
                            : assessment.severity === 'midway'
                            ? '#92400E'
                            : '#065F46',
                        borderColor:
                          assessment.severity === 'full'
                            ? '#FCA5A5'
                            : assessment.severity === 'midway'
                            ? '#FCD34D'
                            : '#86EFAC',
                      }}
                    >
                      {assessment.severity}
                    </span>
                    <span
                      style={{
                        fontSize: theme.typography.fontSize.sm,
                        color: theme.colors.textSecondary,
                      }}
                    >
                      {assessment.damage_type.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: theme.typography.fontSize.base,
                      fontWeight: theme.typography.fontWeight.semibold,
                      color: theme.colors.textPrimary,
                      marginBottom: theme.spacing[1],
                    }}
                  >
                    {assessment.user?.first_name} {assessment.user?.last_name} ({assessment.user?.email})
                  </div>
                  <div
                    style={{
                      fontSize: theme.typography.fontSize.sm,
                      color: theme.colors.textSecondary,
                    }}
                  >
                    Confidence: {assessment.confidence}% | Safety: {assessment.safety_score}/100 | Urgency:{' '}
                    {assessment.urgency}
                    {autoBadgeStyle && (
                      <span
                        style={{
                          marginLeft: theme.spacing[2],
                          padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
                          backgroundColor: autoBadgeStyle.background,
                          color: autoBadgeStyle.color,
                          borderRadius: theme.borderRadius.full,
                          fontSize: theme.typography.fontSize.xs,
                          fontWeight: theme.typography.fontWeight.semibold,
                        }}
                      >
                        {autoBadgeStyle.label}
                      </span>
                    )}
                  </div>
                  {assessment.images && assessment.images.length > 0 && (
                    <div
                      style={{
                        display: 'flex',
                        gap: theme.spacing[2],
                        marginTop: theme.spacing[3],
                      }}
                    >
                      {assessment.images.slice(0, 4).map((img, idx) => (
                        <img
                          key={idx}
                          src={img.image_url}
                          alt={`Assessment ${idx + 1}`}
                          style={{
                            width: '80px',
                            height: '80px',
                            objectFit: 'cover',
                            borderRadius: theme.borderRadius.lg,
                            border: `1px solid ${theme.colors.border}`,
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: theme.spacing[2],
                  }}
                >
                  <Button
                    variant="primary"
                    onClick={() => setSelectedAssessment(assessment)}
                  >
                    Review
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => window.open(`/building-assessments/${assessment.id}/correct`, '_blank')}
                  >
                    Correct Detections
                  </Button>
                  {(assessment.validation_status === 'pending' ||
                    (assessment.auto_validated &&
                      assessment.auto_validation_review_status === 'pending_review')) && (
                    <>
                      <Button
                        variant="secondary"
                        onClick={() => handleValidate(assessment.id, true)}
                        disabled={loading}
                      >
                        Validate
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleValidate(assessment.id, false)}
                        disabled={loading}
                      >
                        Reject
                      </Button>
                    </>
                  )}
                </div>
              </div>
              </AdminCard>
            );
          })
        )}
      </div>

      {/* Review Dialog */}
      <Dialog open={!!selectedAssessment} onOpenChange={(open: boolean) => {
        if (!open) {
          setSelectedAssessment(null);
          setValidationNotes('');
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Assessment</DialogTitle>
            <DialogDescription>
              Review and validate this building damage assessment
            </DialogDescription>
          </DialogHeader>

          {selectedAssessment && (
            <>
              {selectedAssessment.auto_validated && (
                <AdminCard padding="md" className="mb-6">
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="font-semibold text-foreground">
                      Auto-Validation Details
                    </div>
                    <div>
                      Status:{' '}
                      <strong>
                        {getAutoValidationBadge(selectedAssessment)?.label || 'Auto-Validated'}
                      </strong>
                    </div>
                    <div>
                      Confidence at time of auto-validation:{' '}
                      <strong>
                        {selectedAssessment.auto_validation_confidence ?? selectedAssessment.confidence}%
                      </strong>
                    </div>
                    {selectedAssessment.auto_validated_at && (
                      <div>
                        Auto-validated at:{' '}
                        {new Date(selectedAssessment.auto_validated_at).toLocaleString()}
                      </div>
                    )}
                    {selectedAssessment.auto_validation_reason && (
                      <div>Reason: {selectedAssessment.auto_validation_reason}</div>
                    )}
                  </div>
                </AdminCard>
              )}
              <BuildingAssessmentDisplay assessment={selectedAssessment.assessment_data} />

              {(selectedAssessment.validation_status === 'pending' ||
                (selectedAssessment.auto_validated &&
                  selectedAssessment.auto_validation_review_status === 'pending_review')) && (
                <div className="mt-6 pt-6 border-t border-border space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="validation-notes">Validation Notes (Optional)</Label>
                    <Textarea
                      id="validation-notes"
                      value={validationNotes}
                      onChange={(e) => setValidationNotes(e.target.value)}
                      placeholder="Add notes about this assessment..."
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-3 justify-end">
                    <Button
                      variant="secondary"
                      onClick={() => handleValidate(selectedAssessment.id, true)}
                      disabled={loading}
                    >
                      Validate
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleValidate(selectedAssessment.id, false)}
                      disabled={loading}
                    >
                      Reject
                    </Button>
                    <Button variant="ghost" onClick={() => {
                      setSelectedAssessment(null);
                      setValidationNotes('');
                    }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Error Dialog */}
      <AlertDialog open={errorDialog.open} onOpenChange={(open: boolean) => setErrorDialog({ ...errorDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Error</AlertDialogTitle>
            <AlertDialogDescription>{errorDialog.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setErrorDialog({ open: false, message: '' })}>
              OK
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

