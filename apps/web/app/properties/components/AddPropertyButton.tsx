'use client';

import React, { useState } from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { AddPropertyModal } from './AddPropertyModal';
import { useRouter } from 'next/navigation';

export function AddPropertyButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  const handleSuccess = () => {
    // Refresh the page to show the new property
    router.refresh();
  };

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        style={{
          height: '40px',
          padding: `0 ${theme.spacing[4]}`,
          borderRadius: theme.borderRadius.lg,
          border: 'none',
          backgroundColor: theme.colors.primary,
          color: 'white',
          fontSize: theme.typography.fontSize.sm,
          fontWeight: theme.typography.fontWeight.semibold,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing[2],
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#374151';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = theme.colors.primary;
        }}
      >
        <Icon name="plus" size={16} color="white" />
        Add Property
      </button>

      <AddPropertyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSuccess}
      />
    </>
  );
}

