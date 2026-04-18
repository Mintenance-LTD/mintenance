'use client';

/**
 * InspectionChecklist — self-contained inspection block for the homeowner
 * approval flow. Extracted to keep HomeownerApprovalClient under the
 * 500-line pre-commit limit.
 */

import React from 'react';
import { theme } from '@/lib/theme';
import { Card } from '@/components/ui/Card.unified';
import { Button } from '@/components/ui/Button';

interface Props {
  completed: boolean;
  actionLoading: boolean;
  onInspectionChange: (checked: boolean) => void;
  onMarkCompleted: () => void;
}

const labelRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.sm,
};

export function InspectionChecklist({
  completed,
  actionLoading,
  onInspectionChange,
  onMarkCompleted,
}: Props) {
  return (
    <Card style={{ padding: theme.spacing.lg, marginBottom: theme.spacing.lg }}>
      <h2
        style={{
          fontSize: theme.typography.fontSize.xl,
          fontWeight: theme.typography.fontWeight.semibold,
          marginBottom: theme.spacing.md,
        }}
      >
        Inspection Checklist
      </h2>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing.sm,
        }}
      >
        <label style={labelRowStyle}>
          <input
            type='checkbox'
            checked={completed}
            onChange={(e) => onInspectionChange(e.target.checked)}
          />
          <span>I have inspected the completed work</span>
        </label>
        <label style={labelRowStyle}>
          <input type='checkbox' />
          <span>The work matches what was agreed upon</span>
        </label>
        <label style={labelRowStyle}>
          <input type='checkbox' />
          <span>The work area is clean and tidy</span>
        </label>
        <label style={labelRowStyle}>
          <input type='checkbox' />
          <span>I am satisfied with the quality of work</span>
        </label>
      </div>
      <Button
        variant='outline'
        onClick={onMarkCompleted}
        disabled={actionLoading || completed}
        style={{ marginTop: theme.spacing.md }}
      >
        {completed ? 'Inspection Completed ✓' : 'Mark Inspection Completed'}
      </Button>
    </Card>
  );
}

export default InspectionChecklist;
