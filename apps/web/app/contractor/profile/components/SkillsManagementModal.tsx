'use client';

import React, { useState } from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { getSkillIcon, AVAILABLE_SKILL_ICONS } from '@/lib/skills/skill-icon-mapping';

interface SkillWithIcon {
  skill_name: string;
  skill_icon?: string | null;
}

interface SkillsManagementModalProps {
  currentSkills: Array<SkillWithIcon>;
  onClose: () => void;
  onSave: (skills: Array<{ skill_name: string; skill_icon: string }>) => Promise<void>;
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
  // Store skills with their icons
  const [skillIcons, setSkillIcons] = useState<Record<string, string>>(
    currentSkills.reduce((acc, skill) => {
      acc[skill.skill_name] = skill.skill_icon || getSkillIcon(skill.skill_name);
      return acc;
    }, {} as Record<string, string>)
  );
  
  const [selectedSkills, setSelectedSkills] = useState<string[]>(
    currentSkills.map(s => s.skill_name)
  );
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);
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
      setExpandedSkill(null);
    } else {
      if (selectedSkills.length >= 15) {
        setError('Maximum 15 skills allowed');
        return;
      }
      setSelectedSkills([...selectedSkills, skill]);
      // Set default icon if not already set
      if (!skillIcons[skill]) {
        setSkillIcons({ ...skillIcons, [skill]: getSkillIcon(skill) });
      }
      setError(null);
    }
  };

  const handleIconChange = (skill: string, icon: string) => {
    setSkillIcons({ ...skillIcons, [skill]: icon });
    setExpandedSkill(null);
  };

  const handleSubmit = async () => {
    if (selectedSkills.length === 0) {
      setError('Please select at least one skill');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const skillsWithIcons = selectedSkills.map(skillName => ({
        skill_name: skillName,
        skill_icon: skillIcons[skillName] || getSkillIcon(skillName),
      }));
      await onSave(skillsWithIcons);
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
                const currentIcon = skillIcons[skill] || getSkillIcon(skill);
                const isExpanded = expandedSkill === skill;
                
                return (
                  <div key={skill} style={{ position: 'relative' }}>
                    <button
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
                        width: '100%',
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2] }}>
                        {isSelected && (
                          <Icon 
                            name={currentIcon} 
                            size={16} 
                            color={isSelected ? 'white' : theme.colors.textSecondary} 
                          />
                        )}
                        <span>{skill}</span>
                      </div>
                      {isSelected && (
                        <div
                          role="button"
                          tabIndex={0}
                          aria-label="Change icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedSkill(isExpanded ? null : skill);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              e.stopPropagation();
                              setExpandedSkill(isExpanded ? null : skill);
                            }
                          }}
                          style={{
                            background: 'rgba(255, 255, 255, 0.2)',
                            border: 'none',
                            borderRadius: theme.borderRadius.md,
                            padding: theme.spacing[1],
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            outline: 'none',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                          }}
                        >
                          <Icon name="chevronDown" size={12} color="white" />
                        </div>
                      )}
                    </button>
                    
                    {/* Icon Selection Dropdown */}
                    {isSelected && isExpanded && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          marginTop: theme.spacing[1],
                          backgroundColor: theme.colors.background,
                          border: `1px solid ${theme.colors.border}`,
                          borderRadius: theme.borderRadius.lg,
                          padding: theme.spacing[2],
                          zIndex: 1000,
                          boxShadow: theme.shadows.lg,
                          display: 'grid',
                          gridTemplateColumns: 'repeat(4, 1fr)',
                          gap: theme.spacing[2],
                        }}
                      >
                        {AVAILABLE_SKILL_ICONS.map((icon) => (
                          <button
                            key={icon}
                            type="button"
                            onClick={() => handleIconChange(skill, icon)}
                            style={{
                              padding: theme.spacing[2],
                              backgroundColor: currentIcon === icon ? theme.colors.primary : theme.colors.backgroundSecondary,
                              border: `1px solid ${currentIcon === icon ? theme.colors.primary : theme.colors.border}`,
                              borderRadius: theme.borderRadius.md,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s',
                            }}
                            title={icon}
                          >
                            <Icon 
                              name={icon} 
                              size={18} 
                              color={currentIcon === icon ? 'white' : theme.colors.textSecondary} 
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
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


