import React, { useState } from 'react';
import { theme } from '@/lib/theme';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import type { AdvancedSearchFilters, PriceRange, LocationRadius } from '@mintenance/types';

interface AdvancedSearchFiltersProps {
  filters: AdvancedSearchFilters;
  onChange: (filters: AdvancedSearchFilters) => void;
  onApply: () => void;
  onClear: () => void;
  isVisible: boolean;
  onClose: () => void;
}

export const AdvancedSearchFiltersComponent: React.FC<AdvancedSearchFiltersProps> = ({
  filters,
  onChange,
  onApply,
  onClear,
  isVisible,
  onClose
}) => {
  const [localFilters, setLocalFilters] = useState<AdvancedSearchFilters>(filters);

  if (!isVisible) return null;

  const updateFilters = (updates: Partial<AdvancedSearchFilters>) => {
    const newFilters = { ...localFilters, ...updates };
    setLocalFilters(newFilters);
    onChange(newFilters);
  };

  const handlePriceRangeChange = (field: keyof PriceRange, value: string) => {
    const priceRange = localFilters.priceRange || { min: 0, max: 10000, currency: 'USD' };
    const numValue = parseFloat(value) || 0;
    updateFilters({
      priceRange: {
        ...priceRange,
        [field]: numValue
      }
    });
  };

  const handleSkillToggle = (skill: string) => {
    const currentSkills = localFilters.skills || [];
    const newSkills = currentSkills.includes(skill)
      ? currentSkills.filter(s => s !== skill)
      : [...currentSkills, skill];

    updateFilters({ skills: newSkills });
  };

  const handleProjectTypeToggle = (projectType: string) => {
    const currentTypes = localFilters.projectTypes || [];
    const newTypes = currentTypes.includes(projectType)
      ? currentTypes.filter(t => t !== projectType)
      : [...currentTypes, projectType];

    updateFilters({ projectTypes: newTypes });
  };

  const availabilityOptions = [
    { value: 'immediate', label: '🚨 Immediate', color: theme.colors.error },
    { value: 'this_week', label: '📅 This Week', color: theme.colors.warning },
    { value: 'this_month', label: '📆 This Month', color: theme.colors.info },
    { value: 'flexible', label: '⏰ Flexible', color: theme.colors.success }
  ] as const;

  const urgencyOptions = [
    { value: 'emergency', label: '🚨 Emergency', color: theme.colors.error },
    { value: 'urgent', label: '⚡ Urgent', color: theme.colors.warning },
    { value: 'normal', label: '📋 Normal', color: theme.colors.info },
    { value: 'flexible', label: '⏱️ Flexible', color: theme.colors.success }
  ] as const;

  const complexityOptions = [
    { value: 'simple', label: '🟢 Simple', color: theme.colors.success },
    { value: 'medium', label: '🟡 Medium', color: theme.colors.warning },
    { value: 'complex', label: '🔴 Complex', color: theme.colors.error }
  ] as const;

  const popularSkills = [
    'plumbing', 'electrical', 'carpentry', 'painting', 'hvac',
    'landscaping', 'roofing', 'flooring', 'kitchen', 'bathroom',
    'drywall', 'tile', 'appliance repair', 'deck building'
  ];

  const projectCategories = [
    'plumbing', 'electrical', 'carpentry', 'painting', 'hvac',
    'landscaping', 'roofing', 'flooring', 'kitchen', 'bathroom',
    'general maintenance', 'emergency repair'
  ];

  return (
    <div style={{
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
      padding: theme.spacing.lg
    }}>
      <Card style={{
        maxWidth: '800px',
        maxHeight: '90vh',
        width: '100%',
        overflow: 'auto',
        padding: theme.spacing.lg
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: theme.spacing.lg
        }}>
          <h2 style={{
            fontSize: theme.typography.fontSize['2xl'],
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.text,
            margin: 0
          }}>
            🔍 Advanced Search Filters
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            style={{ fontSize: theme.typography.fontSize.lg }}
          >
            ✕
          </Button>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: theme.spacing.lg
        }}>
          {/* Price Range */}
          <div>
            <h3 style={{
              fontSize: theme.typography.fontSize.lg,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.text,
              marginBottom: theme.spacing.md
            }}>
              💰 Price Range
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: theme.spacing.sm
            }}>
              <div>
                <label style={{
                  fontSize: theme.typography.fontSize.sm,
                  color: theme.colors.textSecondary,
                  marginBottom: theme.spacing.xs,
                  display: 'block'
                }}>
                  Min ($)
                </label>
                <Input
                  type="number"
                  value={localFilters.priceRange?.min.toString() || '0'}
                  onChange={(e) => handlePriceRangeChange('min', e.target.value)}
                  placeholder="0"
                  min="0"
                />
              </div>
              <div>
                <label style={{
                  fontSize: theme.typography.fontSize.sm,
                  color: theme.colors.textSecondary,
                  marginBottom: theme.spacing.xs,
                  display: 'block'
                }}>
                  Max ($)
                </label>
                <Input
                  type="number"
                  value={localFilters.priceRange?.max.toString() || '10000'}
                  onChange={(e) => handlePriceRangeChange('max', e.target.value)}
                  placeholder="10000"
                  min="0"
                />
              </div>
            </div>
          </div>

          {/* Availability */}
          <div>
            <h3 style={{
              fontSize: theme.typography.fontSize.lg,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.text,
              marginBottom: theme.spacing.md
            }}>
              📅 Availability
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: theme.spacing.sm
            }}>
              {availabilityOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => updateFilters({ availability: option.value })}
                  style={{
                    padding: theme.spacing.sm,
                    borderRadius: theme.borderRadius.md,
                    border: `2px solid ${
                      localFilters.availability === option.value
                        ? option.color
                        : theme.colors.border
                    }`,
                    backgroundColor: localFilters.availability === option.value
                      ? `${option.color}15`
                      : theme.colors.white,
                    color: localFilters.availability === option.value
                      ? option.color
                      : theme.colors.text,
                    fontSize: theme.typography.fontSize.sm,
                    fontWeight: theme.typography.fontWeight.medium,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Urgency */}
          <div>
            <h3 style={{
              fontSize: theme.typography.fontSize.lg,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.text,
              marginBottom: theme.spacing.md
            }}>
              ⚡ Urgency Level
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: theme.spacing.sm
            }}>
              {urgencyOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => updateFilters({ urgency: option.value })}
                  style={{
                    padding: theme.spacing.sm,
                    borderRadius: theme.borderRadius.md,
                    border: `2px solid ${
                      localFilters.urgency === option.value
                        ? option.color
                        : theme.colors.border
                    }`,
                    backgroundColor: localFilters.urgency === option.value
                      ? `${option.color}15`
                      : theme.colors.white,
                    color: localFilters.urgency === option.value
                      ? option.color
                      : theme.colors.text,
                    fontSize: theme.typography.fontSize.sm,
                    fontWeight: theme.typography.fontWeight.medium,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Project Complexity */}
          <div>
            <h3 style={{
              fontSize: theme.typography.fontSize.lg,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.text,
              marginBottom: theme.spacing.md
            }}>
              🎯 Project Complexity
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: theme.spacing.sm
            }}>
              {complexityOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => updateFilters({ projectComplexity: option.value })}
                  style={{
                    padding: theme.spacing.sm,
                    borderRadius: theme.borderRadius.md,
                    border: `2px solid ${
                      localFilters.projectComplexity === option.value
                        ? option.color
                        : theme.colors.border
                    }`,
                    backgroundColor: localFilters.projectComplexity === option.value
                      ? `${option.color}15`
                      : theme.colors.white,
                    color: localFilters.projectComplexity === option.value
                      ? option.color
                      : theme.colors.text,
                    fontSize: theme.typography.fontSize.xs,
                    fontWeight: theme.typography.fontWeight.medium,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Skills Selection */}
        <div style={{ marginTop: theme.spacing.lg }}>
          <h3 style={{
            fontSize: theme.typography.fontSize.lg,
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.text,
            marginBottom: theme.spacing.md
          }}>
            🛠️ Skills & Specialties
          </h3>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: theme.spacing.xs
          }}>
            {popularSkills.map(skill => (
              <button
                key={skill}
                onClick={() => handleSkillToggle(skill)}
                style={{
                  padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                  borderRadius: theme.borderRadius.full,
                  border: `1px solid ${
                    localFilters.skills.includes(skill)
                      ? theme.colors.primary
                      : theme.colors.border
                  }`,
                  backgroundColor: localFilters.skills.includes(skill)
                    ? `${theme.colors.primary}15`
                    : theme.colors.white,
                  color: localFilters.skills.includes(skill)
                    ? theme.colors.primary
                    : theme.colors.text,
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.medium,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textTransform: 'capitalize'
                }}
              >
                {localFilters.skills.includes(skill) && '✓ '}{skill}
              </button>
            ))}
          </div>
        </div>

        {/* Project Types */}
        <div style={{ marginTop: theme.spacing.lg }}>
          <h3 style={{
            fontSize: theme.typography.fontSize.lg,
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.text,
            marginBottom: theme.spacing.md
          }}>
            📂 Project Categories
          </h3>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: theme.spacing.xs
          }}>
            {projectCategories.map(type => (
              <button
                key={type}
                onClick={() => handleProjectTypeToggle(type)}
                style={{
                  padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                  borderRadius: theme.borderRadius.full,
                  border: `1px solid ${
                    localFilters.projectTypes.includes(type)
                      ? theme.colors.info
                      : theme.colors.border
                  }`,
                  backgroundColor: localFilters.projectTypes.includes(type)
                    ? `${theme.colors.info}15`
                    : theme.colors.white,
                  color: localFilters.projectTypes.includes(type)
                    ? theme.colors.info
                    : theme.colors.text,
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.medium,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textTransform: 'capitalize'
                }}
              >
                {localFilters.projectTypes.includes(type) && '✓ '}{type}
              </button>
            ))}
          </div>
        </div>

        {/* Quality Filters */}
        <div style={{ marginTop: theme.spacing.lg }}>
          <h3 style={{
            fontSize: theme.typography.fontSize.lg,
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.text,
            marginBottom: theme.spacing.md
          }}>
            ⭐ Quality & Trust
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: theme.spacing.sm
          }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={localFilters.hasInsurance || false}
                onChange={(e) => updateFilters({ hasInsurance: e.target.checked })}
                style={{ marginRight: theme.spacing.xs }}
              />
              <span style={{
                fontSize: theme.typography.fontSize.sm,
                color: theme.colors.text
              }}>
                🛡️ Has Insurance
              </span>
            </label>

            <label style={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={localFilters.isBackgroundChecked || false}
                onChange={(e) => updateFilters({ isBackgroundChecked: e.target.checked })}
                style={{ marginRight: theme.spacing.xs }}
              />
              <span style={{
                fontSize: theme.typography.fontSize.sm,
                color: theme.colors.text
              }}>
                ✅ Background Checked
              </span>
            </label>

            <label style={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={localFilters.hasPortfolio || false}
                onChange={(e) => updateFilters({ hasPortfolio: e.target.checked })}
                style={{ marginRight: theme.spacing.xs }}
              />
              <span style={{
                fontSize: theme.typography.fontSize.sm,
                color: theme.colors.text
              }}>
                📸 Has Portfolio
              </span>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{
          marginTop: theme.spacing.xl,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: `1px solid ${theme.colors.border}`,
          paddingTop: theme.spacing.lg
        }}>
          <Button
            variant="ghost"
            onClick={onClear}
            style={{ color: theme.colors.textSecondary }}
          >
            Clear All Filters
          </Button>
          <div style={{
            display: 'flex',
            gap: theme.spacing.sm
          }}>
            <Button
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={onApply}
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};