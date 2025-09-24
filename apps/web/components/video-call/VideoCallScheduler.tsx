import React, { useState } from 'react';
import { theme } from '@/lib/theme';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { VideoCallService } from '@/lib/services/VideoCallService';
import type { VideoCall } from '@mintenance/types';

interface VideoCallSchedulerProps {
  jobId?: string;
  participantId: string;
  participantName: string;
  onScheduled?: (call: VideoCall) => void;
  onCancel?: () => void;
  isVisible: boolean;
}

export const VideoCallScheduler: React.FC<VideoCallSchedulerProps> = ({
  jobId,
  participantId,
  participantName,
  onScheduled,
  onCancel,
  isVisible
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [callType, setCallType] = useState<VideoCall['type']>('consultation');
  const [priority, setPriority] = useState<VideoCall['priority']>('medium');
  const [isScheduling, setIsScheduling] = useState(false);

  if (!isVisible) return null;

  const handleScheduleCall = async () => {
    if (!title || !scheduledDate || !scheduledTime) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setIsScheduling(true);

      const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();

      const callData = {
        jobId,
        participantId,
        title,
        description: description || undefined,
        type: callType,
        priority,
        scheduledAt
      };

      const call = await VideoCallService.scheduleCall(callData);
      onScheduled?.(call);

    } catch (error) {
      console.error('Failed to schedule call:', error);
      alert('Failed to schedule call. Please try again.');
    } finally {
      setIsScheduling(false);
    }
  };

  const handleInstantCall = async () => {
    try {
      setIsScheduling(true);

      const callData = {
        jobId,
        participantId,
        title: title || `Instant call with ${participantName}`,
        description: description || undefined,
        type: callType,
        priority: 'high' as const
      };

      const call = await VideoCallService.createCall(callData);
      onScheduled?.(call);

    } catch (error) {
      console.error('Failed to create instant call:', error);
      alert('Failed to start call. Please try again.');
    } finally {
      setIsScheduling(false);
    }
  };

  const callTypeOptions = [
    { value: 'consultation', label: '💬 Consultation', description: 'General discussion about the project' },
    { value: 'assessment', label: '🔍 Assessment', description: 'Property or work assessment' },
    { value: 'project_review', label: '📋 Project Review', description: 'Review completed or ongoing work' },
    { value: 'emergency', label: '🚨 Emergency', description: 'Urgent issue requiring immediate attention' },
    { value: 'follow_up', label: '📞 Follow-up', description: 'Post-work follow-up or check-in' }
  ];

  const priorityOptions = [
    { value: 'low', label: '🟢 Low', color: theme.colors.success },
    { value: 'medium', label: '🟡 Medium', color: theme.colors.warning },
    { value: 'high', label: '🟠 High', color: theme.colors.error },
    { value: 'urgent', label: '🔴 Urgent', color: theme.colors.error }
  ];

  // Get current datetime for min attribute
  const now = new Date();
  const currentDate = now.toISOString().split('T')[0];
  const currentTime = now.toTimeString().split(' ')[0].substring(0, 5);

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
        maxWidth: '600px',
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
              📹 Schedule Video Call
            </h2>
            <p style={{
              fontSize: theme.typography.fontSize.md,
              color: theme.colors.textSecondary,
              margin: `${theme.spacing.xs} 0 0 0`
            }}>
              with {participantName}
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

        {/* Call Title */}
        <div style={{ marginBottom: theme.spacing.lg }}>
          <label style={{
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.medium,
            color: theme.colors.text,
            marginBottom: theme.spacing.xs,
            display: 'block'
          }}>
            Call Title *
          </label>
          <Input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Kitchen renovation consultation"
            style={{ width: '100%' }}
          />
        </div>

        {/* Call Type */}
        <div style={{ marginBottom: theme.spacing.lg }}>
          <label style={{
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.medium,
            color: theme.colors.text,
            marginBottom: theme.spacing.xs,
            display: 'block'
          }}>
            Call Type
          </label>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: theme.spacing.sm
          }}>
            {callTypeOptions.map(option => (
              <button
                key={option.value}
                onClick={() => setCallType(option.value)}
                style={{
                  padding: theme.spacing.md,
                  borderRadius: theme.borderRadius.md,
                  border: `2px solid ${
                    callType === option.value ? theme.colors.primary : theme.colors.border
                  }`,
                  backgroundColor: callType === option.value
                    ? `${theme.colors.primary}15`
                    : theme.colors.white,
                  color: callType === option.value
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
        <div style={{ marginBottom: theme.spacing.lg }}>
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
                onClick={() => setPriority(option.value)}
                style={{
                  padding: theme.spacing.sm,
                  borderRadius: theme.borderRadius.md,
                  border: `2px solid ${
                    priority === option.value ? option.color : theme.colors.border
                  }`,
                  backgroundColor: priority === option.value
                    ? `${option.color}15`
                    : theme.colors.white,
                  color: priority === option.value
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

        {/* Schedule DateTime */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: theme.spacing.md,
          marginBottom: theme.spacing.lg
        }}>
          <div>
            <label style={{
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.medium,
              color: theme.colors.text,
              marginBottom: theme.spacing.xs,
              display: 'block'
            }}>
              Date
            </label>
            <Input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              min={currentDate}
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label style={{
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.medium,
              color: theme.colors.text,
              marginBottom: theme.spacing.xs,
              display: 'block'
            }}>
              Time
            </label>
            <Input
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
        </div>

        {/* Description */}
        <div style={{ marginBottom: theme.spacing.xl }}>
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
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add any notes or agenda items for this call..."
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

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: theme.spacing.lg,
          borderTop: `1px solid ${theme.colors.border}`
        }}>
          <Button
            variant="ghost"
            onClick={onCancel}
            disabled={isScheduling}
          >
            Cancel
          </Button>

          <div style={{
            display: 'flex',
            gap: theme.spacing.sm
          }}>
            <Button
              variant="outline"
              onClick={handleInstantCall}
              disabled={isScheduling || !title}
              style={{
                color: theme.colors.success,
                borderColor: theme.colors.success
              }}
            >
              🚀 Start Now
            </Button>
            <Button
              variant="primary"
              onClick={handleScheduleCall}
              disabled={isScheduling || !title || !scheduledDate || !scheduledTime}
            >
              {isScheduling ? 'Scheduling...' : '📅 Schedule Call'}
            </Button>
          </div>
        </div>

        {/* Helper Text */}
        <div style={{
          marginTop: theme.spacing.md,
          padding: theme.spacing.sm,
          backgroundColor: `${theme.colors.info}10`,
          borderRadius: theme.borderRadius.sm,
          border: `1px solid ${theme.colors.info}`
        }}>
          <div style={{
            fontSize: theme.typography.fontSize.xs,
            color: theme.colors.info,
            textAlign: 'center'
          }}>
            💡 Both participants will receive notifications about the scheduled call
          </div>
        </div>
      </Card>
    </div>
  );
};