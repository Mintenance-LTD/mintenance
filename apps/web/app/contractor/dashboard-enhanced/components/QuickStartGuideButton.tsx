'use client';

import React, { useState } from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { QuickStartGuide } from '@/components/onboarding/QuickStartGuide';

interface QuickStartGuideButtonProps {
  userRole: 'homeowner' | 'contractor';
}

export function QuickStartGuideButton({ userRole }: QuickStartGuideButtonProps) {
  const [showQuickStartGuide, setShowQuickStartGuide] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowQuickStartGuide(true)}
        style={{
          position: 'fixed',
          bottom: theme.spacing[6],
          right: theme.spacing[6],
          zIndex: 1000,
          borderRadius: theme.borderRadius.full,
          width: '56px',
          height: '56px',
          padding: 0,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          backgroundColor: theme.colors.surface,
          border: `1px solid ${theme.colors.border}`,
        }}
        aria-label="Open quick start guide"
        title="Quick Start Guide"
      >
        <Icon name="book" size={24} color={theme.colors.primary} />
      </Button>

      <QuickStartGuide
        userRole={userRole}
        isOpen={showQuickStartGuide}
        onClose={() => setShowQuickStartGuide(false)}
      />
    </>
  );
}

