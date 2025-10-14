'use client';

import React, { useState } from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';

interface SkillsManagementModalProps {
  currentSkills: Array<{ skill_name: string }>;
  onClose: () => void;
  onSave: (skills: string[]) => Promise<void>;
}

/**
 * SkillsManagementModal Component
 * 
 * Modal for adding/removing contractor skills.
 * Following Single Responsibility Principle - only handles skills management.
 * 
 * @filesize Target: <350 lines
 */
export function SkillsManagementModal({ currentSkills, onClose, onSave }: SkillsManagementModalProps) {
  const [selectedSkills, setSelectedSkills] = useState<string[]>(
    currentSkills.map(s => s.skill_name)
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Predefined skill list
  const availableSkills = [
    'General Contracting',
    'Kitchen Remodeling',
    'Bathroom Renovation',
    'Plumbing',
    'Electrical Work',
    'Carpentry',
    'Tiling',
    'Painting',
    'Flooring',
    'Roofing',
    'HVAC',
    'Landscaping',
    'Masonry',
    'Drywall',
    'Window Installation',
    'Door Installation',
    'Deck Building',
    'Fence Installation',
    'Concrete Work',
    'Insulation',
    'Siding',
    'Gutters',
    'General Maintenance',
    'Home Inspection',
    'Demolition',
  ].sort();

  const handleToggleSkill = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter(s => s !== skill));
    } else {
      if (selectedSkills.length >= 15) {
        setError('Maximum 15 skills allowed');
        return;
      }
      setSelectedSkills([...selectedSkills, skill]);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    if (selectedSkills.length === 0) {
      setError('Please select at least one skill');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onSave(selectedSkills);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update skills');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: theme.spacing[4],
        }}
        onClick={onClose}
      >
        {/* Modal */}
        <div
          style={{
            backgroundColor: theme.colors.background,
            borderRadius: theme.borderRadius.xl,
            maxWidth: '700px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: theme.shadows.xl,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div style={{
            padding: theme.spacing[6],
            borderBottom: `1px solid ${theme.colors.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            backgroundColor: theme.colors.background,
            zIndex: 10,
          }}>
            <div>
              <h2 style={{
                fontSize: theme.typography.fontSize['2xl'],
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.text,
                margin: 0,
                marginBottom: theme.spacing[1],
              }}>
                Manage Skills
              </h2>
              <p style={{
                fontSize: theme.typography.fontSize.sm,
                color: theme.colors.textSecondary,
                margin: 0,
              }}>
                Select skills that best represent your expertise ({selectedSkills.length}/15)
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: theme.typography.fontSize['2xl'],
                color: theme.colors.textSecondary,
                cursor: 'pointer',
                padding: theme.spacing[2],
              }}
            >
              <Icon name="x" size={18} color={theme.colors.textSecondary} />
            </button>
          </div>

          {/* Modal Body */}
          <div style={{ padding: theme.spacing[6] }}>
            {/* Error Message */}
            {error && (
              <div style={{
                backgroundColor: theme.colors.errorLight,
                color: theme.colors.error,
                padding: theme.spacing[4],
                borderRadius: theme.borderRadius.lg,
                marginBottom: theme.spacing[6],
                fontSize: theme.typography.fontSize.sm,
              }}>
                {error}
              </div>
            )}

            {/* Skills Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: theme.spacing[3],
            }}>
              {availableSkills.map((skill) => {
                const isSelected = selectedSkills.includes(skill);
                return (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => handleToggleSkill(skill)}
                    style={{
                      padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
                      backgroundColor: isSelected ? theme.colors.primary : theme.colors.backgroundSecondary,
                      color: isSelected ? 'white' : theme.colors.text,
                      border: `2px solid ${isSelected ? theme.colors.primary : theme.colors.border}`,
                      borderRadius: theme.borderRadius.lg,
                      fontSize: theme.typography.fontSize.sm,
                      fontWeight: theme.typography.fontWeight.medium,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = theme.colors.primary;
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = theme.colors.border;
                        e.currentTarget.style.transform = 'translateY(0)';
                      }
                    }}
                  >
                    <span>{skill}</span>
                    {isSelected && <Icon name="check" size={16} color="white" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Modal Footer */}
          <div style={{
            padding: theme.spacing[6],
            borderTop: `1px solid ${theme.colors.border}`,
            display: 'flex',
            gap: theme.spacing[4],
            justifyContent: 'flex-end',
            position: 'sticky',
            bottom: 0,
            backgroundColor: theme.colors.background,
          }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: `${theme.spacing[3]} ${theme.spacing[6]}`,
                backgroundColor: theme.colors.backgroundSecondary,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.borderRadius.lg,
                fontSize: theme.typography.fontSize.base,
                fontWeight: theme.typography.fontWeight.medium,
                color: theme.colors.text,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
              }}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || selectedSkills.length === 0}
              style={{
                padding: `${theme.spacing[3]} ${theme.spacing[6]}`,
                backgroundColor: loading || selectedSkills.length === 0 ? theme.colors.primaryLight : theme.colors.primary,
                border: 'none',
                borderRadius: theme.borderRadius.lg,
                fontSize: theme.typography.fontSize.base,
                fontWeight: theme.typography.fontWeight.medium,
                color: 'white',
                cursor: loading || selectedSkills.length === 0 ? 'not-allowed' : 'pointer',
                opacity: loading || selectedSkills.length === 0 ? 0.6 : 1,
              }}
            >
              {loading ? 'Saving...' : `Save ${selectedSkills.length} Skills`}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}


