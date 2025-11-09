'use client';

import React, { useState, useEffect } from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { Card } from '@/components/ui/Card.unified';
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
}

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

  return (
    <div
      style={{
        maxWidth: '1440px',
        margin: '0 auto',
        padding: theme.spacing[6],
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing[6],
      }}
    >
      {/* Header */}
      <div>
        <h1
          style={{
            fontSize: theme.typography.fontSize['3xl'],
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.textPrimary,
            marginBottom: theme.spacing[2],
          }}
        >
          Building Assessments
        </h1>
        <p
          style={{
            fontSize: theme.typography.fontSize.base,
            color: theme.colors.textSecondary,
          }}
        >
          Review and validate AI building damage assessments for training data collection.
          {statistics.canAutoValidate && (
            <span style={{ color: '#10B981', fontWeight: 600 }}>
              {' '}Auto-validation is active for high-confidence assessments.
            </span>
          )}
        </p>
      </div>

      {/* Statistics */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: theme.spacing[4],
        }}
      >
        <Card variant="default" padding="md">
          <div style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary }}>
            Total Assessments
          </div>
          <div
            style={{
              fontSize: theme.typography.fontSize['2xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary,
              marginTop: theme.spacing[1],
            }}
          >
            {statistics.total}
          </div>
        </Card>
        <Card variant="default" padding="md">
          <div style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary }}>
            Pending Review
          </div>
          <div
            style={{
              fontSize: theme.typography.fontSize['2xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: '#F59E0B',
              marginTop: theme.spacing[1],
            }}
          >
            {statistics.pending}
          </div>
        </Card>
        <Card variant="default" padding="md">
          <div style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary }}>
            Validated
          </div>
          <div
            style={{
              fontSize: theme.typography.fontSize['2xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: '#10B981',
              marginTop: theme.spacing[1],
            }}
          >
            {statistics.validated}
          </div>
        </Card>
        <Card variant="default" padding="md">
          <div style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary }}>
            Rejected
          </div>
          <div
            style={{
              fontSize: theme.typography.fontSize['2xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: '#EF4444',
              marginTop: theme.spacing[1],
            }}
          >
            {statistics.rejected}
          </div>
        </Card>
        {statistics.canAutoValidate !== undefined && (
          <Card variant="default" padding="md" className={statistics.canAutoValidate ? 'border-l-4 border-l-green-500' : ''}>
            <div style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary }}>
              Auto-Validation
            </div>
            <div
              style={{
                fontSize: theme.typography.fontSize.base,
                fontWeight: theme.typography.fontWeight.semibold,
                color: statistics.canAutoValidate ? '#10B981' : '#6B7280',
                marginTop: theme.spacing[1],
              }}
            >
              {statistics.canAutoValidate ? 'Active' : 'Inactive'}
            </div>
            {!statistics.canAutoValidate && statistics.minValidatedForAutoValidation && (
              <div style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary, marginTop: theme.spacing[1] }}>
                Need {statistics.minValidatedForAutoValidation - statistics.validated} more validated
              </div>
            )}
          </Card>
        )}
      </div>

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
            <Button
              key={status}
              variant={isActive ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus(status)}
              className="capitalize"
            >
              {status}
            </Button>
          );
        })}
      </div>

      {/* Assessments List */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing[4],
        }}
      >
        {loading && assessments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: theme.spacing[8], color: theme.colors.textSecondary }}>
            Loading assessments...
          </div>
        ) : assessments.length === 0 ? (
          <Card variant="default" padding="lg">
            <div style={{ textAlign: 'center', color: theme.colors.textSecondary }}>
              <Icon name="document" size={48} color={theme.colors.border} />
              <p style={{ marginTop: theme.spacing[4] }}>No assessments found</p>
            </div>
          </Card>
        ) : (
          assessments.map((assessment) => (
            <Card key={assessment.id} variant="default" padding="md" hover>
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
                    <span
                      style={{
                        padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
                        borderRadius: theme.borderRadius.full,
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
                        fontSize: theme.typography.fontSize.xs,
                        fontWeight: theme.typography.fontWeight.semibold,
                        textTransform: 'uppercase',
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
                    {assessment.validation_status === 'validated' && !assessment.validated_by && (
                      <span
                        style={{
                          marginLeft: theme.spacing[2],
                          padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
                          backgroundColor: '#D1FAE5',
                          color: '#065F46',
                          borderRadius: theme.borderRadius.full,
                          fontSize: theme.typography.fontSize.xs,
                          fontWeight: theme.typography.fontWeight.semibold,
                        }}
                      >
                        Auto-Validated
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
                  {assessment.validation_status === 'pending' && (
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
            </Card>
          ))
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
              <BuildingAssessmentDisplay assessment={selectedAssessment.assessment_data} />

              {selectedAssessment.validation_status === 'pending' && (
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

