'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';

interface BulkActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: 'approve' | 'reject' | null;
  selectedCount: number;
  onConfirm: (action: 'approve' | 'reject', reason?: string) => Promise<void>;
  loading?: boolean;
}

export function BulkActionDialog({ 
  open, 
  onOpenChange, 
  action, 
  selectedCount, 
  onConfirm, 
  loading = false 
}: BulkActionDialogProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!action) return;
    
    if (action === 'reject' && !reason.trim()) {
      setError('Reason is required when rejecting verification');
      return;
    }

    setError(null);
    try {
      await onConfirm(action, reason.trim() || undefined);
      setReason('');
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process bulk action');
    }
  };

  const handleCancel = () => {
    setReason('');
    setError(null);
    onOpenChange(false);
  };

  if (!action) return null;

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Bulk {action === 'approve' ? 'Approve' : 'Reject'} Verifications
          </DialogTitle>
          <DialogDescription>
            You are about to {action} {selectedCount} contractor verification{selectedCount > 1 ? 's' : ''}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {action === 'reject' && (
            <div className="space-y-2">
              <Label htmlFor="bulk-reject-reason">
                Rejection Reason (Required)
              </Label>
              <Textarea
                id="bulk-reject-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter reason for rejection..."
                rows={4}
              />
            </div>
          )}
        </div>

        <div className="flex gap-3 justify-end pt-4 border-t border-border">
          <Button
            variant="secondary"
            onClick={handleCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant={action === 'approve' ? 'primary' : 'destructive'}
            onClick={handleConfirm}
            disabled={loading || (action === 'reject' && !reason.trim())}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              `Confirm ${action === 'approve' ? 'Approval' : 'Rejection'}`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

