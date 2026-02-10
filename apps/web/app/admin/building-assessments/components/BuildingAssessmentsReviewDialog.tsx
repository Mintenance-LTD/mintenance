'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BuildingAssessmentDisplay } from '@/components/building-surveyor';
import { AdminCard } from '@/components/admin/AdminCard';
import type { Assessment } from './BuildingAssessmentsTypes';
import { getAutoValidationBadge } from './BuildingAssessmentsTypes';

interface BuildingAssessmentsReviewDialogProps {
  selectedAssessment: Assessment | null;
  validationNotes: string;
  loading: boolean;
  onClose: () => void;
  onNotesChange: (notes: string) => void;
  onValidate: (assessmentId: string, validated: boolean) => void;
}

export function BuildingAssessmentsReviewDialog({ selectedAssessment, validationNotes, loading, onClose, onNotesChange, onValidate }: BuildingAssessmentsReviewDialogProps) {
  return (
    <Dialog open={!!selectedAssessment} onOpenChange={(open: boolean) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review Assessment</DialogTitle>
          <DialogDescription>Review and validate this building damage assessment</DialogDescription>
        </DialogHeader>
        {selectedAssessment && (
          <>
            {selectedAssessment.auto_validated && (
              <AdminCard padding="md" className="mb-6">
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="font-semibold text-foreground">Auto-Validation Details</div>
                  <div>Status: <strong>{getAutoValidationBadge(selectedAssessment)?.label || 'Auto-Validated'}</strong></div>
                  <div>Confidence at time of auto-validation: <strong>{selectedAssessment.auto_validation_confidence ?? selectedAssessment.confidence}%</strong></div>
                  {selectedAssessment.auto_validated_at && (<div>Auto-validated at: {new Date(selectedAssessment.auto_validated_at).toLocaleString()}</div>)}
                  {selectedAssessment.auto_validation_reason && (<div>Reason: {selectedAssessment.auto_validation_reason}</div>)}
                </div>
              </AdminCard>
            )}
            <BuildingAssessmentDisplay assessment={selectedAssessment.assessment_data} />
            {(selectedAssessment.validation_status === 'pending' || (selectedAssessment.auto_validated && selectedAssessment.auto_validation_review_status === 'pending_review')) && (
              <div className="mt-6 pt-6 border-t border-border space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="validation-notes">Validation Notes (Optional)</Label>
                  <Textarea id="validation-notes" value={validationNotes} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onNotesChange(e.target.value)} placeholder="Add notes about this assessment..." rows={3} />
                </div>
                <div className="flex gap-3 justify-end">
                  <Button variant="secondary" onClick={() => onValidate(selectedAssessment.id, true)} disabled={loading}>Validate</Button>
                  <Button variant="outline" onClick={() => onValidate(selectedAssessment.id, false)} disabled={loading}>Reject</Button>
                  <Button variant="ghost" onClick={onClose}>Cancel</Button>
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
