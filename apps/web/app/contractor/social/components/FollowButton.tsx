'use client';

import React, { useState, useEffect } from 'react';
import { theme } from '@/lib/theme';
import { logger } from '@mintenance/shared';
import { Button } from '@/components/ui/Button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserCheck, UserPlus, AlertCircle } from 'lucide-react';

interface FollowButtonProps {
  contractorId: string;
  currentUserId?: string;
  onFollowChange?: (following: boolean) => void;
  variant?: 'default' | 'small' | 'minimal';
}

export function FollowButton({ contractorId, currentUserId, onFollowChange, variant = 'default' }: FollowButtonProps) {
  const [following, setFollowing] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Don't show follow button for own profile
  if (contractorId === currentUserId) {
    return null;
  }

  useEffect(() => {
    if (!currentUserId || !contractorId) {
      return;
    }

    // Check if current user is following this contractor
    const checkFollowStatus = async () => {
      try {
        const response = await fetch(`/api/contractor/following?contractor_id=${contractorId}`);
        if (response.ok) {
          const data = await response.json();
          setFollowing(data.following || false);
        }
      } catch (error) {
        logger.error('Error checking follow status:', error);
      }
    };

    checkFollowStatus();
  }, [contractorId, currentUserId]);

  const handleToggleFollow = async () => {
    if (!currentUserId || loading) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/contractor/follow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contractor_id: contractorId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update follow status');
      }

      const data = await response.json();
      setFollowing(data.following);
      onFollowChange?.(data.following);
    } catch (error) {
      logger.error('Error toggling follow:', error);
      setError(error instanceof Error ? error.message : 'Failed to update follow status');
    } finally {
      setLoading(false);
    }
  };

  if (following === null) {
    // Loading state
    return (
      <Button
        variant="secondary"
        disabled
        style={variant === 'small' ? { fontSize: theme.typography.fontSize.xs, padding: `${theme.spacing[1]} ${theme.spacing[2]}` } : {}}
      >
        Loading...
      </Button>
    );
  }

  if (variant === 'minimal') {
    return (
      <>
        <Button
          type="button"
          variant="ghost"
          onClick={handleToggleFollow}
          disabled={loading}
          className="p-0 h-auto"
          leftIcon={following ? <UserCheck className="h-3.5 w-3.5 text-primary" /> : <UserPlus className="h-3.5 w-3.5" />}
        >
          {following ? 'Following' : 'Follow'}
        </Button>
        {error && (
          <Alert variant="destructive" className="mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </>
    );
  }

  if (variant === 'small') {
    return (
      <>
        <Button
          variant={following ? 'secondary' : 'primary'}
          onClick={handleToggleFollow}
          disabled={loading}
          size="sm"
          leftIcon={following ? <UserCheck className="h-3 w-3" /> : <UserPlus className="h-3 w-3" />}
        >
          {loading ? '...' : following ? 'Following' : 'Follow'}
        </Button>
        {error && (
          <Alert variant="destructive" className="mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </>
    );
  }

  return (
    <>
      <Button
        variant={following ? 'secondary' : 'primary'}
        onClick={handleToggleFollow}
        disabled={loading}
        leftIcon={following ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
      >
        {loading ? 'Updating...' : following ? 'Following' : 'Follow'}
      </Button>
      {error && (
        <Alert variant="destructive" className="mt-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </>
  );
}

