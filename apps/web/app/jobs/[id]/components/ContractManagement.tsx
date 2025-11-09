'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from '@/components/ui/Icon';
import { theme } from '@/lib/theme';

interface Contract {
  id: string;
  job_id: string;
  contractor_id: string;
  homeowner_id: string;
  status: 'draft' | 'pending_contractor' | 'pending_homeowner' | 'accepted' | 'rejected' | 'cancelled';
  title: string | null;
  description: string | null;
  amount: number;
  start_date: string | null;
  end_date: string | null;
  contractor_signed_at: string | null;
  homeowner_signed_at: string | null;
  terms: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface ContractManagementProps {
  jobId: string;
  userRole: 'homeowner' | 'contractor';
  userId: string;
}

export function ContractManagement({ jobId, userRole, userId }: ContractManagementProps) {
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSigning, setIsSigning] = useState(false);

  const fetchContract = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/contracts?job_id=${jobId}`);
      if (!response.ok) {
        if (response.status === 404) {
          setContract(null);
          setLoading(false);
          return;
        }
        throw new Error('Failed to fetch contract');
      }
      const data = await response.json();
      setContract(data.contracts?.[0] || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contract');
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchContract();
  }, [fetchContract]);

  const handleSignContract = async () => {
    if (!contract || isSigning) return;

    setIsSigning(true);
    setError(null);
    try {
      const response = await fetch(`/api/contracts/${contract.id}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to sign contract: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Refetch the contract to get the latest state
      await fetchContract();
      
      // Show success message
      if (data.message) {
        alert(data.message);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign contract. Please try again.';
      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setIsSigning(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return theme.colors.success;
      case 'pending_contractor':
      case 'pending_homeowner':
        return theme.colors.warning;
      case 'rejected':
      case 'cancelled':
        return theme.colors.error;
      default:
        return theme.colors.textSecondary;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft':
        return 'Draft';
      case 'pending_contractor':
        return 'Pending Contractor Signature';
      case 'pending_homeowner':
        return 'Pending Homeowner Signature';
      case 'accepted':
        return 'Accepted';
      case 'rejected':
        return 'Rejected';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const canSign = contract && (
    (userRole === 'contractor' && !contract.contractor_signed_at && contract.status !== 'accepted') ||
    (userRole === 'homeowner' && !contract.homeowner_signed_at && contract.status !== 'accepted')
  );

  const needsSignature = contract && (
    (userRole === 'contractor' && contract.status === 'pending_contractor') ||
    (userRole === 'homeowner' && contract.status === 'pending_homeowner')
  );

  if (loading) {
    return (
      <div style={{
        backgroundColor: theme.colors.surface,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing[6],
      }}>
        <div style={{ textAlign: 'center', color: theme.colors.textSecondary }}>
          Loading contract...
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div style={{
        backgroundColor: theme.colors.surface,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing[6],
      }}>
        <div style={{ textAlign: 'center', color: theme.colors.textSecondary }}>
          <Icon name="fileText" size={48} color={theme.colors.textTertiary} />
          <p style={{ marginTop: theme.spacing[4], marginBottom: 0 }}>
            {userRole === 'contractor' 
              ? 'No contract created yet. Create a contract from the accepted bid.'
              : 'No contract available yet. Contractor will create one after accepting the bid.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: theme.colors.surface,
      border: `1px solid ${theme.colors.border}`,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing[6],
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: theme.spacing[4],
      }}>
        <h3 style={{
          margin: 0,
          fontSize: theme.typography.fontSize.xl,
          fontWeight: theme.typography.fontWeight.semibold,
          color: theme.colors.textPrimary,
        }}>
          Contract
        </h3>
        <span style={{
          padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
          borderRadius: theme.borderRadius.full,
          backgroundColor: getStatusColor(contract.status) + '20',
          color: getStatusColor(contract.status),
          fontSize: theme.typography.fontSize.sm,
          fontWeight: theme.typography.fontWeight.medium,
        }}>
          {getStatusLabel(contract.status)}
        </span>
      </div>

      {contract.title && (
        <div style={{ marginBottom: theme.spacing[4] }}>
          <div style={{
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.medium,
            color: theme.colors.textSecondary,
            marginBottom: theme.spacing[1],
          }}>
            Title
          </div>
          <div style={{
            fontSize: theme.typography.fontSize.base,
            color: theme.colors.textPrimary,
          }}>
            {contract.title}
          </div>
        </div>
      )}

      {contract.description && (
        <div style={{ marginBottom: theme.spacing[4] }}>
          <div style={{
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.medium,
            color: theme.colors.textSecondary,
            marginBottom: theme.spacing[1],
          }}>
            Description
          </div>
          <div style={{
            fontSize: theme.typography.fontSize.base,
            color: theme.colors.textPrimary,
            lineHeight: 1.6,
          }}>
            {contract.description}
          </div>
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: theme.spacing[4],
        marginBottom: theme.spacing[4],
      }}>
        <div>
          <div style={{
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.medium,
            color: theme.colors.textSecondary,
            marginBottom: theme.spacing[1],
          }}>
            Amount
          </div>
          <div style={{
            fontSize: theme.typography.fontSize.lg,
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.primary,
          }}>
            £{Number(contract.amount).toLocaleString()}
          </div>
        </div>

        {contract.start_date && (
          <div>
            <div style={{
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.medium,
              color: theme.colors.textSecondary,
              marginBottom: theme.spacing[1],
            }}>
              Start Date
            </div>
            <div style={{
              fontSize: theme.typography.fontSize.base,
              color: theme.colors.textPrimary,
            }}>
              {new Date(contract.start_date).toLocaleDateString('en-GB', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </div>
          </div>
        )}

        {contract.end_date && (
          <div>
            <div style={{
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.medium,
              color: theme.colors.textSecondary,
              marginBottom: theme.spacing[1],
            }}>
              End Date
            </div>
            <div style={{
              fontSize: theme.typography.fontSize.base,
              color: theme.colors.textPrimary,
            }}>
              {new Date(contract.end_date).toLocaleDateString('en-GB', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </div>
          </div>
        )}
      </div>

      {/* Signatures */}
      <div style={{
        padding: theme.spacing[4],
        backgroundColor: theme.colors.backgroundSecondary,
        borderRadius: theme.borderRadius.md,
        marginBottom: theme.spacing[4],
      }}>
        <div style={{
          fontSize: theme.typography.fontSize.sm,
          fontWeight: theme.typography.fontWeight.semibold,
          color: theme.colors.textSecondary,
          marginBottom: theme.spacing[3],
        }}>
          Signatures
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[2] }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2] }}>
            <Icon 
              name={contract.contractor_signed_at ? "checkCircle" : "circle"} 
              size={20} 
              color={contract.contractor_signed_at ? theme.colors.success : theme.colors.textTertiary} 
            />
            <span style={{
              fontSize: theme.typography.fontSize.sm,
              color: contract.contractor_signed_at ? theme.colors.textPrimary : theme.colors.textSecondary,
            }}>
              Contractor {contract.contractor_signed_at ? 'signed' : 'pending'}
              {contract.contractor_signed_at && (
                <span style={{ marginLeft: theme.spacing[2], color: theme.colors.textTertiary }}>
                  {new Date(contract.contractor_signed_at).toLocaleDateString()}
                </span>
              )}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2] }}>
            <Icon 
              name={contract.homeowner_signed_at ? "checkCircle" : "circle"} 
              size={20} 
              color={contract.homeowner_signed_at ? theme.colors.success : theme.colors.textTertiary} 
            />
            <span style={{
              fontSize: theme.typography.fontSize.sm,
              color: contract.homeowner_signed_at ? theme.colors.textPrimary : theme.colors.textSecondary,
            }}>
              Homeowner {contract.homeowner_signed_at ? 'signed' : 'pending'}
              {contract.homeowner_signed_at && (
                <span style={{ marginLeft: theme.spacing[2], color: theme.colors.textTertiary }}>
                  {new Date(contract.homeowner_signed_at).toLocaleDateString()}
                </span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          padding: theme.spacing[3],
          backgroundColor: theme.colors.error + '20',
          borderRadius: theme.borderRadius.md,
          color: theme.colors.error,
          fontSize: theme.typography.fontSize.sm,
          marginBottom: theme.spacing[4],
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing[2],
        }}>
          <Icon name="xCircle" size={20} color={theme.colors.error} />
          {error}
        </div>
      )}

      {/* Action Buttons */}
      {needsSignature && canSign && (
        <button
          onClick={handleSignContract}
          disabled={isSigning || !contract}
          style={{
            width: '100%',
            padding: theme.spacing[3],
            backgroundColor: (isSigning || !contract) ? theme.colors.textTertiary : theme.colors.primary,
            color: 'white',
            border: 'none',
            borderRadius: theme.borderRadius.md,
            fontSize: theme.typography.fontSize.base,
            fontWeight: theme.typography.fontWeight.semibold,
            cursor: (isSigning || !contract) ? 'not-allowed' : 'pointer',
            opacity: (isSigning || !contract) ? 0.6 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: theme.spacing[2],
            transition: 'all 0.2s',
          }}
          type="button"
        >
          {isSigning ? (
            <>
              <Icon name="loader" size={20} color="white" />
              Signing...
            </>
          ) : (
            <>
              <Icon name="checkCircle" size={20} color="white" />
              Sign Contract
            </>
          )}
        </button>
      )}

      {contract.status === 'accepted' && (
        <div style={{
          padding: theme.spacing[3],
          backgroundColor: theme.colors.success + '20',
          borderRadius: theme.borderRadius.md,
          color: theme.colors.success,
          fontSize: theme.typography.fontSize.sm,
          textAlign: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: theme.spacing[2],
        }}>
          <Icon name="checkCircle" size={20} color={theme.colors.success} />
          Contract accepted! Both parties have signed.
        </div>
      )}
    </div>
  );
}

