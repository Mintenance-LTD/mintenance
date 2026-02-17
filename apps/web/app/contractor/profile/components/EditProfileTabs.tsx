'use client';

import React from 'react';
import { theme } from '@/lib/theme';

export type EditProfileTabId = 'basic' | 'location' | 'business' | 'skills';

interface EditProfileTabsProps {
  activeTab: EditProfileTabId;
  setActiveTab: (tab: EditProfileTabId) => void;
}

const tabs: Array<{ id: EditProfileTabId; label: string }> = [
  { id: 'basic', label: 'Basic Info' },
  { id: 'location', label: 'Location & Contact' },
  { id: 'business', label: 'Business Info' },
  { id: 'skills', label: 'Skills' },
];

/**
 * EditProfileTabs Component
 *
 * Horizontal tab navigation bar for the Edit Profile modal.
 * Renders 4 tabs: Basic Info, Location & Contact, Business Info, Skills.
 */
export function EditProfileTabs({ activeTab, setActiveTab }: EditProfileTabsProps) {
  return (
    <div style={{
      borderBottom: `1px solid ${theme.colors.border}`,
      backgroundColor: theme.colors.surface,
      paddingLeft: theme.spacing[6],
      paddingRight: theme.spacing[6],
    }}>
      <div style={{
        display: 'flex',
        gap: theme.spacing[8],
      }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            style={{
              background: 'none',
              border: 'none',
              padding: `${theme.spacing[4]} 0`,
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.semibold,
              color: activeTab === tab.id ? theme.colors.primary : theme.colors.textSecondary,
              cursor: 'pointer',
              borderBottom: activeTab === tab.id ? `3px solid ${theme.colors.primary}` : '3px solid transparent',
              marginBottom: '-1px',
              transition: 'color 0.2s',
              letterSpacing: '0.015em',
            }}
            onMouseEnter={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.color = theme.colors.textPrimary;
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.color = theme.colors.textSecondary;
              }
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
