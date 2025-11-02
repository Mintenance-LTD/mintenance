'use client';

import React, { useState, useEffect } from 'react';
import { theme } from '@/lib/theme';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

interface FollowButtonProps {
  contractorId: string;
  currentUserId?: string;
  onFollowChange?: (following: boolean) => void;
  variant?: 'default' | 'small' | 'minimal';
}

export function FollowButton({ contractorId, currentUserId, onFollowChange, variant = 'default' }: FollowButtonProps) {
  const [following, setFollowing] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

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
        console.error('Error checking follow status:', error);
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
      console.error('Error toggling follow:', error);
      alert(error instanceof Error ? error.message : 'Failed to update follow status');
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
      <button
        type="button"
        onClick={handleToggleFollow}
        disabled={loading}
        style={{
          background: 'transparent',
          border: 'none',
          color: following ? theme.colors.primary : theme.colors.textSecondary,
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: theme.typography.fontSize.sm,
          fontWeight: theme.typography.fontWeight.medium,
          padding: 0,
          display: 'inline-flex',
          alignItems: 'center',
          gap: theme.spacing[1],
        }}
      >
        <Icon name={following ? 'userCheck' : 'userPlus'} size={14} color={following ? theme.colors.primary : theme.colors.textSecondary} />
        {following ? 'Following' : 'Follow'}
      </button>
    );
  }

  if (variant === 'small') {
    return (
      <Button
        variant={following ? 'secondary' : 'primary'}
        onClick={handleToggleFollow}
        disabled={loading}
        style={{
          fontSize: theme.typography.fontSize.xs,
          padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
          minWidth: 'auto',
        }}
      >
        {loading ? '...' : following ? 'Following' : 'Follow'}
      </Button>
    );
  }

  return (
    <Button
      variant={following ? 'secondary' : 'primary'}
      onClick={handleToggleFollow}
      disabled={loading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: theme.spacing[2],
      }}
    >
      <Icon name={following ? 'userCheck' : 'userPlus'} size={16} color={following ? theme.colors.primary : theme.colors.white} />
      {loading ? 'Updating...' : following ? 'Following' : 'Follow'}
    </Button>
  );
}

