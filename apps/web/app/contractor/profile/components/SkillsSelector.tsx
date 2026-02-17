'use client';

import React, { useState } from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { getSkillIcon } from '@/lib/skills/skill-icon-mapping';

interface SkillsSelectorProps {
  selectedSkills: string[];
  setSelectedSkills: (skills: string[]) => void;
  setError: (error: string | null) => void;
}

/**
 * Predefined skill list matching SkillsManagementModal.
 */
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

/**
 * SkillsSelector Component
 *
 * Renders the skills tab content: count display, selected skill chips
 * with remove buttons, dropdown button, and the dropdown skill list.
 */
export function SkillsSelector({
  selectedSkills,
  setSelectedSkills,
  setError,
}: SkillsSelectorProps) {
  const [showSkillDropdown, setShowSkillDropdown] = useState(false);

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

  return (
    <div>
      {/* Skills & Professions */}
      <div style={{ marginBottom: theme.spacing[6] }}>
        <label style={{
          display: 'block',
          fontSize: theme.typography.fontSize.sm,
          fontWeight: theme.typography.fontWeight.semibold,
          color: theme.colors.textPrimary,
          marginBottom: theme.spacing[2],
        }}>
          Skills & Professions ({selectedSkills.length}/15)
        </label>
        <p style={{
          fontSize: theme.typography.fontSize.sm,
          color: theme.colors.textSecondary,
          margin: `0 0 ${theme.spacing[4]} 0`,
          lineHeight: '1.6',
        }}>
          Select skills that match your expertise. Jobs requiring these skills will appear in your &quot;Jobs Near You&quot; feed.
        </p>

        {/* Selected Skills Chips */}
        {selectedSkills.length > 0 && (
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: theme.spacing[2],
            marginBottom: theme.spacing[4],
          }}>
            {selectedSkills.map((skill) => (
              <div
                key={skill}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing[1],
                  padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
                  backgroundColor: `${theme.colors.primary}15`,
                  color: theme.colors.primary,
                  borderRadius: theme.borderRadius.full,
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.semibold,
                  border: `1px solid ${theme.colors.primary}30`,
                }}
              >
                <Icon name={getSkillIcon(skill)} size={16} color={theme.colors.primary} />
                <span>{skill}</span>
                <button
                  type="button"
                  onClick={() => handleToggleSkill(skill)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    borderRadius: theme.borderRadius.full,
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    padding: 0,
                    marginLeft: theme.spacing[1],
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = `${theme.colors.primary}20`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <Icon name="x" size={14} color={theme.colors.primary} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Skill Selection Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setShowSkillDropdown(!showSkillDropdown)}
            disabled={selectedSkills.length >= 15}
            style={{
              width: '100%',
              padding: theme.spacing[3],
              fontSize: theme.typography.fontSize.base,
              borderRadius: theme.borderRadius.md,
              border: `1px solid ${theme.colors.border}`,
              backgroundColor: theme.colors.white,
              color: theme.colors.textPrimary,
              cursor: selectedSkills.length >= 15 ? 'not-allowed' : 'pointer',
              opacity: selectedSkills.length >= 15 ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => {
              if (selectedSkills.length < 15) {
                e.currentTarget.style.borderColor = theme.colors.primary;
              }
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = theme.colors.border;
            }}
          >
            <span>{selectedSkills.length >= 15 ? 'Maximum skills reached' : 'Add Skill'}</span>
            <Icon name="chevronDown" size={16} color={theme.colors.textSecondary} />
          </button>

          {showSkillDropdown && (
            <>
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: theme.spacing[1],
                  backgroundColor: theme.colors.surface,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.borderRadius.lg,
                  boxShadow: theme.shadows.lg,
                  maxHeight: '300px',
                  overflowY: 'auto',
                  zIndex: 1000,
                  padding: theme.spacing[2],
                }}
              >
                {availableSkills
                  .filter(skill => !selectedSkills.includes(skill))
                  .map((skill) => (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => {
                        handleToggleSkill(skill);
                        setShowSkillDropdown(false);
                      }}
                      style={{
                        width: '100%',
                        padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
                        textAlign: 'left',
                        backgroundColor: 'transparent',
                        border: 'none',
                        borderRadius: theme.borderRadius.md,
                        fontSize: theme.typography.fontSize.sm,
                        color: theme.colors.textPrimary,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: theme.spacing[2],
                        transition: 'background-color 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <Icon name={getSkillIcon(skill)} size={16} color={theme.colors.textSecondary} />
                      <span>{skill}</span>
                    </button>
                  ))}
                {availableSkills.filter(skill => !selectedSkills.includes(skill)).length === 0 && (
                  <div style={{
                    padding: theme.spacing[4],
                    textAlign: 'center',
                    color: theme.colors.textSecondary,
                    fontSize: theme.typography.fontSize.sm,
                  }}>
                    All available skills selected
                  </div>
                )}
              </div>
              {/* Backdrop to close dropdown */}
              <div
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 999,
                }}
                onClick={() => setShowSkillDropdown(false)}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
