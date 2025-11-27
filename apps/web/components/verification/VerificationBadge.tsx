import React from 'react';
import { Icon } from '@/components/ui/Icon';
import { theme } from '@/lib/theme';

interface VerificationBadgeProps {
  verified?: boolean;
  size?: number;
  showTooltip?: boolean;
}

/**
 * VerificationBadge Component
 * 
 * Displays a mint leaf icon badge to indicate admin-verified contractors.
 * This builds trust with homeowners by showing verified business credentials.
 */
export function VerificationBadge({ verified = false, size = 20, showTooltip = true }: VerificationBadgeProps) {
  if (!verified) {
    return null;
  }

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
      title={showTooltip ? 'Verified Contractor - License and company verified by admin' : undefined}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: size + 4,
          height: size + 4,
          borderRadius: '50%',
          backgroundColor: '#10B981', // Mint/emerald green
          padding: '2px',
        }}
      >
        <Icon
          name="mintLeaf"
          size={size}
          color="white"
          title="Verified Contractor"
        />
      </div>
    </div>
  );
}

