'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { theme } from '@/lib/theme';

interface DeleteJobButtonProps {
  jobId: string;
  jobTitle: string;
}

export function DeleteJobButton({ jobId, jobTitle }: DeleteJobButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete job');
      }

      // Redirect to jobs list after successful deletion
      router.push('/jobs');
      router.refresh();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete job. Please try again.';
      setError(errorMessage);
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  if (showConfirm) {
    return (
      <div style={{
        backgroundColor: theme.colors.error + '15',
        border: `1px solid ${theme.colors.error}`,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing[4],
        marginTop: theme.spacing[4],
      }}>
        <div style={{
          fontSize: theme.typography.fontSize.base,
          fontWeight: theme.typography.fontWeight.semibold,
          color: theme.colors.error,
          marginBottom: theme.spacing[2],
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing[2],
        }}>
          <Icon name="alertTriangle" size={20} color={theme.colors.error} />
          Confirm Deletion
        </div>
        <p style={{
          margin: 0,
          marginBottom: theme.spacing[4],
          fontSize: theme.typography.fontSize.sm,
          color: theme.colors.textPrimary,
          lineHeight: 1.6,
        }}>
          Are you sure you want to delete "{jobTitle}"? This action cannot be undone and will remove all associated bids, photos, and data.
        </p>
        {error && (
          <div style={{
            padding: theme.spacing[2],
            backgroundColor: theme.colors.error + '20',
            borderRadius: theme.borderRadius.sm,
            color: theme.colors.error,
            fontSize: theme.typography.fontSize.sm,
            marginBottom: theme.spacing[3],
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing[2],
          }}>
            <Icon name="xCircle" size={16} color={theme.colors.error} />
            {error}
          </div>
        )}
        <div style={{
          display: 'flex',
          gap: theme.spacing[3],
        }}>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            style={{
              padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
              backgroundColor: isDeleting ? theme.colors.textTertiary : theme.colors.error,
              color: 'white',
              border: 'none',
              borderRadius: theme.borderRadius.md,
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.semibold,
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              opacity: isDeleting ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing[2],
              transition: 'all 0.2s',
            }}
            type="button"
          >
            {isDeleting ? (
              <>
                <Icon name="loader" size={16} color="white" className="animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Icon name="trash" size={16} color="white" />
                Delete Job
              </>
            )}
          </button>
          <button
            onClick={() => {
              setShowConfirm(false);
              setError(null);
            }}
            disabled={isDeleting}
            style={{
              padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
              backgroundColor: 'transparent',
              color: theme.colors.textSecondary,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: theme.borderRadius.md,
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.medium,
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              opacity: isDeleting ? 0.6 : 1,
              transition: 'all 0.2s',
            }}
            type="button"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        style={{
          padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
          backgroundColor: 'transparent',
          color: theme.colors.error,
          border: `1px solid ${theme.colors.error}`,
          borderRadius: theme.borderRadius.md,
          fontSize: theme.typography.fontSize.sm,
          fontWeight: theme.typography.fontWeight.medium,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing[2],
          transition: 'all 0.2s',
        }}
        type="button"
      >
        <Icon name="trash" size={16} color={theme.colors.error} />
        Delete Job
      </button>
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .animate-spin {
            animation: spin 1s linear infinite;
          }
        `
      }} />
    </>
  );
}

