import React, { useState } from 'react';
import { theme } from '@/lib/theme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { ProjectMilestone, ProjectTimeline } from '@mintenance/types';

interface MilestoneEditorProps {
  timeline: ProjectTimeline;
  milestone?: ProjectMilestone;
  isVisible: boolean;
  onSave: (milestoneData: MilestoneFormData) => Promise<void>;
  onCancel: () => void;
}

export interface MilestoneFormData {
  title: string;
  description?: string;
  targetDate: string;
  priority: ProjectMilestone['priority'];
  type: ProjectMilestone['type'];
  estimatedHours?: number;
  paymentAmount?: number;
  assignedTo?: string;
}

export const MilestoneEditor: React.FC<MilestoneEditorProps> = ({
  timeline,
  milestone,
  isVisible,
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState<MilestoneFormData>({
    title: milestone?.title || '',
    description: milestone?.description || '',
    targetDate: milestone?.targetDate ? milestone.targetDate.split('T')[0] : '',
    priority: milestone?.priority || 'medium',
    type: milestone?.type || 'task',
    estimatedHours: milestone?.estimatedHours,
    paymentAmount: milestone?.paymentAmount,
    assignedTo: milestone?.assignedTo
  });

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isVisible) return null;

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.targetDate) {
      newErrors.targetDate = 'Target date is required';
    } else {
      const targetDate = new Date(formData.targetDate);
      const timelineStart = new Date(timeline.startDate);
      const timelineEnd = new Date(timeline.estimatedEndDate);

      if (targetDate < timelineStart) {
        newErrors.targetDate = 'Target date cannot be before timeline start';
      }
      if (targetDate > timelineEnd) {
        newErrors.targetDate = 'Target date cannot be after timeline end';
      }
    }

    if (formData.estimatedHours && formData.estimatedHours < 0) {
      newErrors.estimatedHours = 'Estimated hours must be positive';
    }

    if (formData.paymentAmount && formData.paymentAmount < 0) {
      newErrors.paymentAmount = 'Payment amount must be positive';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);
      await onSave(formData);
    } catch (error) {
      console.error('Failed to save milestone:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateFormData = (field: keyof MilestoneFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when field is updated
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const typeOptions = [
    { value: 'task', label: '📝 Task', description: 'General work item' },
    { value: 'checkpoint', label: '🎯 Checkpoint', description: 'Review or approval point' },
    { value: 'payment', label: '💰 Payment', description: 'Payment milestone' },
    { value: 'inspection', label: '🔍 Inspection', description: 'Quality inspection' },
    { value: 'delivery', label: '📦 Delivery', description: 'Material or completion delivery' }
  ];

  const priorityOptions = [
    { value: 'low', label: '🟢 Low', color: theme.colors.info },
    { value: 'medium', label: '🟡 Medium', color: theme.colors.warning },
    { value: 'high', label: '🟠 High', color: theme.colors.error },
    { value: 'urgent', label: '🔴 Urgent', color: theme.colors.error }
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
        maxWidth: '700px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        padding: theme.spacing.xl
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: theme.spacing.xl
        }}>
          <div>
            <h2 style={{
              fontSize: theme.typography.fontSize['2xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.text,
              margin: 0
            }}>
              {milestone ? '✏️ Edit Milestone' : '➕ Add Milestone'}
            </h2>
            <p style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary,
              margin: `${theme.spacing.xs} 0 0 0`
            }}>
              for {timeline.title}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            style={{ fontSize: theme.typography.fontSize.lg }}
          >
            ✕
          </Button>
        </div>

        {/* Form */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing.lg
        }}>
          {/* Title */}
          <div>
            <label style={{
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.medium,
              color: theme.colors.text,
              marginBottom: theme.spacing.xs,
              display: 'block'
            }}>
              Milestone Title *
            </label>
            <Input
              type="text"
              value={formData.title}
              onChange={(e) => updateFormData('title', e.target.value)}
              placeholder="e.g., Complete foundation work"
              style={{
                width: '100%',
                borderColor: errors.title ? theme.colors.error : undefined
              }}
            />
            {errors.title && (
              <div style={{
                fontSize: theme.typography.fontSize.xs,
                color: theme.colors.error,
                marginTop: theme.spacing.xs
              }}>
                {errors.title}
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label style={{
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.medium,
              color: theme.colors.text,
              marginBottom: theme.spacing.xs,
              display: 'block'
            }}>
              Description (Optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => updateFormData('description', e.target.value)}
              placeholder="Detailed description of the milestone..."
              style={{
                width: '100%',
                minHeight: '80px',
                padding: theme.spacing.sm,
                borderRadius: theme.borderRadius.md,
                border: `1px solid ${theme.colors.border}`,
                fontSize: theme.typography.fontSize.sm,
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Type Selection */}
          <div>
            <label style={{
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.medium,
              color: theme.colors.text,
              marginBottom: theme.spacing.xs,
              display: 'block'
            }}>
              Milestone Type
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: theme.spacing.sm
            }}>
              {typeOptions.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateFormData('type', option.value)}
                  style={{
                    padding: theme.spacing.md,
                    borderRadius: theme.borderRadius.md,
                    border: `2px solid ${
                      formData.type === option.value ? theme.colors.primary : theme.colors.border
                    }`,
                    backgroundColor: formData.type === option.value
                      ? `${theme.colors.primary}15`
                      : theme.colors.white,
                    color: formData.type === option.value
                      ? theme.colors.primary
                      : theme.colors.text,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{
                    fontSize: theme.typography.fontSize.sm,
                    fontWeight: theme.typography.fontWeight.medium,
                    marginBottom: theme.spacing.xs
                  }}>
                    {option.label}
                  </div>
                  <div style={{
                    fontSize: theme.typography.fontSize.xs,
                    color: theme.colors.textSecondary
                  }}>
                    {option.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div>
            <label style={{
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.medium,
              color: theme.colors.text,
              marginBottom: theme.spacing.xs,
              display: 'block'
            }}>
              Priority Level
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: theme.spacing.sm
            }}>
              {priorityOptions.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateFormData('priority', option.value)}
                  style={{
                    padding: theme.spacing.sm,
                    borderRadius: theme.borderRadius.md,
                    border: `2px solid ${
                      formData.priority === option.value ? option.color : theme.colors.border
                    }`,
                    backgroundColor: formData.priority === option.value
                      ? `${option.color}15`
                      : theme.colors.white,
                    color: formData.priority === option.value
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

          {/* Date and Details */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: theme.spacing.md
          }}>
            {/* Target Date */}
            <div>
              <label style={{
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.medium,
                color: theme.colors.text,
                marginBottom: theme.spacing.xs,
                display: 'block'
              }}>
                Target Date *
              </label>
              <Input
                type="date"
                value={formData.targetDate}
                onChange={(e) => updateFormData('targetDate', e.target.value)}
                style={{
                  width: '100%',
                  borderColor: errors.targetDate ? theme.colors.error : undefined
                }}
              />
              {errors.targetDate && (
                <div style={{
                  fontSize: theme.typography.fontSize.xs,
                  color: theme.colors.error,
                  marginTop: theme.spacing.xs
                }}>
                  {errors.targetDate}
                </div>
              )}
            </div>

            {/* Estimated Hours */}
            <div>
              <label style={{
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.medium,
                color: theme.colors.text,
                marginBottom: theme.spacing.xs,
                display: 'block'
              }}>
                Estimated Hours
              </label>
              <Input
                type="number"
                value={formData.estimatedHours?.toString() || ''}
                onChange={(e) => updateFormData('estimatedHours', e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="0"
                min="0"
                step="0.5"
                style={{
                  width: '100%',
                  borderColor: errors.estimatedHours ? theme.colors.error : undefined
                }}
              />
              {errors.estimatedHours && (
                <div style={{
                  fontSize: theme.typography.fontSize.xs,
                  color: theme.colors.error,
                  marginTop: theme.spacing.xs
                }}>
                  {errors.estimatedHours}
                </div>
              )}
            </div>

            {/* Payment Amount */}
            {formData.type === 'payment' && (
              <div>
                <label style={{
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.medium,
                  color: theme.colors.text,
                  marginBottom: theme.spacing.xs,
                  display: 'block'
                }}>
                  Payment Amount ($)
                </label>
                <Input
                  type="number"
                  value={formData.paymentAmount?.toString() || ''}
                  onChange={(e) => updateFormData('paymentAmount', e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  style={{
                    width: '100%',
                    borderColor: errors.paymentAmount ? theme.colors.error : undefined
                  }}
                />
                {errors.paymentAmount && (
                  <div style={{
                    fontSize: theme.typography.fontSize.xs,
                    color: theme.colors.error,
                    marginTop: theme.spacing.xs
                  }}>
                    {errors.paymentAmount}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: theme.spacing.xl,
          paddingTop: theme.spacing.lg,
          borderTop: `1px solid ${theme.colors.border}`
        }}>
          <div style={{
            fontSize: theme.typography.fontSize.xs,
            color: theme.colors.textSecondary
          }}>
            * Required fields
          </div>

          <div style={{
            display: 'flex',
            gap: theme.spacing.sm
          }}>
            <Button
              variant="ghost"
              onClick={onCancel}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={saving}
            >
              {saving ? 'Saving...' : milestone ? '💾 Update Milestone' : '➕ Add Milestone'}
            </Button>
          </div>
        </div>

        {/* Info */}
        <div style={{
          marginTop: theme.spacing.md,
          padding: theme.spacing.sm,
          backgroundColor: `${theme.colors.info}10`,
          borderRadius: theme.borderRadius.sm,
          border: `1px solid ${theme.colors.info}20`
        }}>
          <div style={{
            fontSize: theme.typography.fontSize.xs,
            color: theme.colors.info,
            textAlign: 'center'
          }}>
            💡 Timeline: {new Date(timeline.startDate).toLocaleDateString()} → {new Date(timeline.estimatedEndDate).toLocaleDateString()}
          </div>
        </div>
      </Card>
    </div>
  );
};