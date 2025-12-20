'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Icon } from '@/components/ui/Icon';
import { getSkillIcon, AVAILABLE_SKILL_ICONS } from '@/lib/skills/skill-icon-mapping';
import { AlertCircle, Loader2 } from 'lucide-react';
import { theme } from '@/lib/theme';

interface SkillWithIcon {
  skill_name: string;
  skill_icon?: string | null;
}

interface SkillsManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentSkills: Array<SkillWithIcon>;
  onSave: (skills: Array<{ skill_name: string; skill_icon: string }>) => Promise<void>;
}

/**
 * SkillsManagementDialog Component
 * 
 * Dialog for adding/removing contractor skills.
 * Following Single Responsibility Principle - only handles skills management.
 */
export function SkillsManagementDialog({ open, onOpenChange, currentSkills, onSave }: SkillsManagementDialogProps) {
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
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update skills');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Skills</DialogTitle>
          <DialogDescription>
            Select skills that best represent your expertise ({selectedSkills.length}/15)
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Error Message */}
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Skills Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {availableSkills.map((skill) => {
              const isSelected = selectedSkills.includes(skill);
              const currentIcon = skillIcons[skill] || getSkillIcon(skill);
              const isExpanded = expandedSkill === skill;
              
              return (
                <div key={skill} className="relative">
                  <button
                    type="button"
                    onClick={() => handleToggleSkill(skill)}
                    className={`
                      w-full px-4 py-3 rounded-lg text-sm font-medium transition-all text-left
                      flex items-center justify-between
                      ${isSelected 
                        ? 'bg-primary text-white border-2 border-primary' 
                        : 'bg-background-secondary text-text border-2 border-border hover:border-primary hover:-translate-y-0.5'
                      }
                    `}
                  >
                    <div className="flex items-center gap-2">
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
                        className="bg-white/20 hover:bg-white/30 rounded-md p-1 cursor-pointer transition-colors"
                      >
                        <Icon name="chevronDown" size={12} color="white" />
                      </div>
                    )}
                  </button>
                  
                  {/* Icon Selection Dropdown */}
                  {isSelected && isExpanded && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg p-2 z-[1000] shadow-lg grid grid-cols-4 gap-2">
                      {AVAILABLE_SKILL_ICONS.map((icon) => (
                        <button
                          key={icon}
                          type="button"
                          onClick={() => handleIconChange(skill, icon)}
                          className={`
                            p-2 rounded-md cursor-pointer transition-all flex items-center justify-center
                            ${currentIcon === icon 
                              ? 'bg-primary border-primary' 
                              : 'bg-background-secondary border-border'
                            } border
                          `}
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

        {/* Footer */}
        <div className="border-t border-border p-6 flex gap-4 justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={handleSubmit}
            disabled={loading || selectedSkills.length === 0}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              `Save ${selectedSkills.length} Skills`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

