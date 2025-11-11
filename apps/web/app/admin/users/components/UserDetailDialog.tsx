'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Icon } from '@/components/ui/Icon';
import { VerificationBadge } from './VerificationBadge';
import { Loader2, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { theme } from '@/lib/theme';

interface VerificationCheck {
  name: string;
  passed: boolean;
  message?: string;
}

interface VerificationData {
  passed: boolean;
  checks: VerificationCheck[];
  requiresManualReview: boolean;
  verificationScore: number;
  history: Array<{
    id: string;
    admin_id: string | null;
    action: string;
    reason: string | null;
    verification_score: number | null;
    created_at: string;
    checks_passed: any;
  }>;
  companyName?: string;
  licenseNumber?: string;
  businessAddress?: string;
  latitude?: number;
  longitude?: number;
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  insuranceExpiryDate?: string;
  yearsExperience?: number;
  adminVerified: boolean;
}

interface UserDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onVerificationUpdate?: () => void;
}

export function UserDetailDialog({ open, onOpenChange, userId, onVerificationUpdate }: UserDetailDialogProps) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [verification, setVerification] = useState<VerificationData | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && userId) {
      fetchUserDetails();
    }
  }, [open, userId]);

  const fetchUserDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      const response = await fetch(`/api/admin/users/${userId}`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch user details' }));
        throw new Error(errorData.error || 'Failed to fetch user details');
      }
      const data = await response.json();
      setUser(data.user);
      setVerification(data.verification);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Request timed out. Please try again.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load user details');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerificationAction = async () => {
    if (!action) return;
    if (action === 'reject' && !reason.trim()) {
      setError('Reason is required when rejecting verification');
      return;
    }

    setVerifying(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/users/${userId}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          reason: reason.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update verification');
      }

      // Refresh user data
      await fetchUserDetails();
      if (onVerificationUpdate) {
        onVerificationUpdate();
      }
      setAction(null);
      setReason('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update verification');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>User Details</DialogTitle>
          <DialogDescription>
            View and manage user information and verification status
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading && (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!loading && user && (
            <>
              {/* User Info */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-text-primary">
                  Basic Information
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-text-secondary">Name:</span>
                    <span className="ml-2 text-text-primary">
                      {user.first_name} {user.last_name}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-secondary">Email:</span>
                    <span className="ml-2 text-text-primary">
                      {user.email}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-secondary">Role:</span>
                    <span className="ml-2 text-text-primary capitalize">
                      {user.role}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-secondary">Joined:</span>
                    <span className="ml-2 text-text-primary">
                      {new Date(user.created_at).toLocaleDateString('en-GB')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Contractor Verification Section */}
              {user.role === 'contractor' && verification && (
                <>
                  <div className="border-t border-border pt-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-text-primary m-0">
                        Verification Status
                      </h3>
                      <VerificationBadge
                        status={verification.adminVerified ? 'verified' : 'pending'}
                        size="md"
                      />
                    </div>

                    {/* Verification Score */}
                    <div className="mb-4 p-3 bg-background-secondary rounded-md">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-text-secondary text-sm">
                          Verification Score
                        </span>
                        <span
                          className={`text-xl font-bold ${
                            verification.verificationScore >= 90
                              ? 'text-success'
                              : verification.verificationScore >= 70
                              ? 'text-warning'
                              : 'text-error'
                          }`}
                        >
                          {verification.verificationScore}/100
                        </span>
                      </div>
                      <div className="w-full h-2 bg-border rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            verification.verificationScore >= 90
                              ? 'bg-success'
                              : verification.verificationScore >= 70
                              ? 'bg-warning'
                              : 'bg-error'
                          }`}
                          style={{ width: `${verification.verificationScore}%` }}
                        />
                      </div>
                    </div>

                    {/* Automated Checks */}
                    <div className="mb-4">
                      <h4 className="text-base font-semibold mb-2 text-text-primary">
                        Automated Checks
                      </h4>
                      <div className="flex flex-col gap-2">
                        {verification.checks.map((check, index) => (
                          <div
                            key={index}
                            className={`flex items-center gap-2 p-2 rounded-md ${
                              check.passed ? 'bg-green-50' : 'bg-red-50'
                            }`}
                          >
                            {check.passed ? (
                              <CheckCircle2 className="w-4 h-4 text-success" />
                            ) : (
                              <XCircle className="w-4 h-4 text-error" />
                            )}
                            <span className="text-sm text-text-primary flex-1">
                              {check.name}
                            </span>
                            {check.message && (
                              <span className="text-xs text-text-secondary">
                                {check.message}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Verification Details */}
                    <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                      {verification.companyName && (
                        <div>
                          <span className="text-text-secondary">Company:</span>
                          <span className="ml-2 text-text-primary">
                            {verification.companyName}
                          </span>
                        </div>
                      )}
                      {verification.licenseNumber && (
                        <div>
                          <span className="text-text-secondary">License:</span>
                          <span className="ml-2 text-text-primary">
                            {verification.licenseNumber}
                          </span>
                        </div>
                      )}
                      {verification.businessAddress && (
                        <div className="col-span-2">
                          <span className="text-text-secondary">Business Address:</span>
                          <div className="mt-1 text-text-primary">
                            {verification.businessAddress}
                            {verification.latitude && verification.longitude && (
                              <a
                                href={`https://www.google.com/maps?q=${verification.latitude},${verification.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-2 text-primary underline"
                              >
                                View on Map
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                      {verification.insuranceExpiryDate && (
                        <div>
                          <span className="text-text-secondary">Insurance Expires:</span>
                          <span className="ml-2 text-text-primary">
                            {new Date(verification.insuranceExpiryDate).toLocaleDateString('en-GB')}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Verification Actions */}
                    {!verification.adminVerified && (
                      <div className="border-t border-border pt-4">
                        <h4 className="text-base font-semibold mb-3 text-text-primary">
                          Verification Actions
                        </h4>
                        {action === null ? (
                          <div className="flex gap-3">
                            <Button
                              variant="primary"
                              onClick={() => setAction('approve')}
                              className="flex-1"
                            >
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Approve
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={() => setAction('reject')}
                              className="flex-1"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-3">
                            {action === 'reject' && (
                              <div className="space-y-2">
                                <Label htmlFor="rejection-reason">
                                  Rejection Reason (Required)
                                </Label>
                                <Textarea
                                  id="rejection-reason"
                                  value={reason}
                                  onChange={(e) => setReason(e.target.value)}
                                  placeholder="Enter reason for rejection..."
                                  rows={3}
                                />
                              </div>
                            )}
                            <div className="flex gap-3">
                              <Button
                                variant="secondary"
                                onClick={() => {
                                  setAction(null);
                                  setReason('');
                                  setError(null);
                                }}
                                disabled={verifying}
                                className="flex-1"
                              >
                                Cancel
                              </Button>
                              <Button
                                variant={action === 'approve' ? 'primary' : 'destructive'}
                                onClick={handleVerificationAction}
                                disabled={verifying || (action === 'reject' && !reason.trim())}
                                className="flex-1"
                              >
                                {verifying ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Processing...
                                  </>
                                ) : action === 'approve' ? (
                                  'Confirm Approval'
                                ) : (
                                  'Confirm Rejection'
                                )}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Verification History */}
                    {verification.history && verification.history.length > 0 && (
                      <div className="border-t border-border pt-4">
                        <h4 className="text-base font-semibold mb-3 text-text-primary">
                          Verification History
                        </h4>
                        <div className="flex flex-col gap-2">
                          {verification.history.map((entry) => (
                            <div
                              key={entry.id}
                              className="p-2 bg-background-secondary rounded-md text-sm"
                            >
                              <div className="flex justify-between mb-1">
                                <span className="font-semibold text-text-primary capitalize">
                                  {entry.action.replace('_', ' ')}
                                </span>
                                <span className="text-text-secondary">
                                  {new Date(entry.created_at).toLocaleDateString('en-GB')}
                                </span>
                              </div>
                              {entry.reason && (
                                <div className="text-text-secondary mt-1">
                                  Reason: {entry.reason}
                                </div>
                              )}
                              {entry.verification_score !== null && (
                                <div className="text-text-secondary mt-1">
                                  Score: {entry.verification_score}/100
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border pt-4 flex justify-end">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

