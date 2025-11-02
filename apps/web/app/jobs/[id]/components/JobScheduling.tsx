'use client';

import React, { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { theme } from '@/lib/theme';

interface JobSchedulingProps {
  jobId: string;
  userRole: 'homeowner' | 'contractor';
  userId: string;
  currentSchedule?: {
    scheduled_start_date: string | null;
    scheduled_end_date: string | null;
    scheduled_duration_hours: number | null;
  };
  contractStatus?: 'none' | 'pending' | 'accepted';
}

export function JobScheduling({ jobId, userRole, userId, currentSchedule, contractStatus = 'none' }: JobSchedulingProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [startDate, setStartDate] = useState(
    currentSchedule?.scheduled_start_date 
      ? new Date(currentSchedule.scheduled_start_date).toISOString().slice(0, 16)
      : ''
  );
  const [endDate, setEndDate] = useState(
    currentSchedule?.scheduled_end_date 
      ? new Date(currentSchedule.scheduled_end_date).toISOString().slice(0, 16)
      : ''
  );
  const [durationHours, setDurationHours] = useState(
    currentSchedule?.scheduled_duration_hours?.toString() || ''
  );

  const handleSave = async () => {
    if (!startDate) {
      setError('Start date is required');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const scheduleData: any = {
        scheduled_start_date: new Date(startDate).toISOString(),
      };

      if (endDate) {
        scheduleData.scheduled_end_date = new Date(endDate).toISOString();
      }

      if (durationHours) {
        scheduleData.scheduled_duration_hours = parseInt(durationHours, 10);
      }

      const response = await fetch(`/api/jobs/${jobId}/schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(scheduleData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to schedule job');
      }

      const data = await response.json();
      setIsEditing(false);
      alert('Job scheduled successfully! Both parties will be notified.');
      
      // Refresh the page to show updated schedule
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule job');
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not scheduled';
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const hasSchedule = currentSchedule?.scheduled_start_date;

  // Block scheduling if contract is not fully signed
  if (contractStatus !== 'accepted') {
    return (
      <div style={{
        backgroundColor: theme.colors.surface,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing[6],
        textAlign: 'center',
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: theme.spacing[4],
        }}>
          <Icon name="lock" size={48} color={theme.colors.textTertiary} />
          <div>
            <h3 style={{
              margin: 0,
              fontSize: theme.typography.fontSize.lg,
              fontWeight: theme.typography.fontWeight.semibold,
              color: theme.colors.textPrimary,
              marginBottom: theme.spacing[2],
            }}>
              Scheduling Locked
            </h3>
            <p style={{
              margin: 0,
              fontSize: theme.typography.fontSize.base,
              color: theme.colors.textSecondary,
              marginBottom: contractStatus === 'none' ? theme.spacing[1] : 0,
            }}>
              Contract must be signed by both parties before scheduling
            </p>
            {contractStatus === 'none' && (
              <p style={{
                margin: theme.spacing[2],
                fontSize: theme.typography.fontSize.sm,
                color: theme.colors.textTertiary,
              }}>
                Please create a contract first
              </p>
            )}
            {contractStatus === 'pending' && (
              <p style={{
                margin: theme.spacing[2],
                fontSize: theme.typography.fontSize.sm,
                color: theme.colors.textTertiary,
              }}>
                Waiting for signatures...
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: theme.colors.surface,
      border: `1px solid ${theme.colors.border}`,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing[6],
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: theme.spacing[4],
      }}>
        <h3 style={{
          margin: 0,
          fontSize: theme.typography.fontSize.xl,
          fontWeight: theme.typography.fontWeight.semibold,
          color: theme.colors.textPrimary,
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing[2],
        }}>
          <Icon name="calendar" size={24} color={theme.colors.primary} />
          Schedule
        </h3>
        {!isEditing && hasSchedule && (
          <button
            onClick={() => setIsEditing(true)}
            style={{
              padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
              backgroundColor: 'transparent',
              color: theme.colors.primary,
              border: `1px solid ${theme.colors.primary}`,
              borderRadius: theme.borderRadius.md,
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.medium,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing[1],
            }}
          >
            <Icon name="edit" size={16} color={theme.colors.primary} />
            Edit
          </button>
        )}
      </div>

      {error && (
        <div style={{
          padding: theme.spacing[3],
          backgroundColor: theme.colors.error + '20',
          borderRadius: theme.borderRadius.md,
          color: theme.colors.error,
          fontSize: theme.typography.fontSize.sm,
          marginBottom: theme.spacing[4],
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing[2],
        }}>
          <Icon name="alertCircle" size={20} color={theme.colors.error} />
          {error}
        </div>
      )}

      {!isEditing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[4] }}>
          {hasSchedule ? (
            <>
              <div>
                <div style={{
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.medium,
                  color: theme.colors.textSecondary,
                  marginBottom: theme.spacing[1],
                }}>
                  Start Date & Time
                </div>
                <div style={{
                  fontSize: theme.typography.fontSize.base,
                  color: theme.colors.textPrimary,
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing[2],
                }}>
                  <Icon name="clock" size={16} color={theme.colors.textSecondary} />
                  {formatDate(currentSchedule?.scheduled_start_date || null)}
                </div>
              </div>

              {currentSchedule?.scheduled_end_date && (
                <div>
                  <div style={{
                    fontSize: theme.typography.fontSize.sm,
                    fontWeight: theme.typography.fontWeight.medium,
                    color: theme.colors.textSecondary,
                    marginBottom: theme.spacing[1],
                  }}>
                    End Date & Time
                  </div>
                  <div style={{
                    fontSize: theme.typography.fontSize.base,
                    color: theme.colors.textPrimary,
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing[2],
                  }}>
                    <Icon name="clock" size={16} color={theme.colors.textSecondary} />
                    {formatDate(currentSchedule.scheduled_end_date)}
                  </div>
                </div>
              )}

              {currentSchedule?.scheduled_duration_hours && (
                <div>
                  <div style={{
                    fontSize: theme.typography.fontSize.sm,
                    fontWeight: theme.typography.fontWeight.medium,
                    color: theme.colors.textSecondary,
                    marginBottom: theme.spacing[1],
                  }}>
                    Estimated Duration
                  </div>
                  <div style={{
                    fontSize: theme.typography.fontSize.base,
                    color: theme.colors.textPrimary,
                  }}>
                    {currentSchedule.scheduled_duration_hours} {currentSchedule.scheduled_duration_hours === 1 ? 'hour' : 'hours'}
                  </div>
                </div>
              )}

              <div style={{
                padding: theme.spacing[3],
                backgroundColor: theme.colors.info + '20',
                borderRadius: theme.borderRadius.md,
                color: theme.colors.info,
                fontSize: theme.typography.fontSize.sm,
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing[2],
              }}>
                <Icon name="info" size={20} color={theme.colors.info} />
                This schedule appears on both your and the {userRole === 'contractor' ? "homeowner's" : "contractor's"} calendar.
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: theme.spacing[4] }}>
              <Icon name="calendar" size={48} color={theme.colors.textTertiary} />
              <p style={{
                marginTop: theme.spacing[4],
                marginBottom: theme.spacing[4],
                color: theme.colors.textSecondary,
                fontSize: theme.typography.fontSize.base,
              }}>
                No schedule set yet. Set a start date to coordinate with the {userRole === 'contractor' ? 'homeowner' : 'contractor'}.
              </p>
              <button
                onClick={() => setIsEditing(true)}
                style={{
                  padding: `${theme.spacing[3]} ${theme.spacing[6]}`,
                  backgroundColor: theme.colors.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: theme.borderRadius.md,
                  fontSize: theme.typography.fontSize.base,
                  fontWeight: theme.typography.fontWeight.semibold,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing[2],
                  margin: '0 auto',
                }}
              >
                <Icon name="calendar" size={20} color="white" />
                Set Schedule
              </button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[4] }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.medium,
              color: theme.colors.textSecondary,
              marginBottom: theme.spacing[1],
            }}>
              Start Date & Time *
            </label>
            <input
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{
                width: '100%',
                padding: theme.spacing[2],
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.borderRadius.md,
                fontSize: theme.typography.fontSize.base,
                backgroundColor: theme.colors.surface,
                color: theme.colors.textPrimary,
              }}
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.medium,
              color: theme.colors.textSecondary,
              marginBottom: theme.spacing[1],
            }}>
              End Date & Time (Optional)
            </label>
            <input
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{
                width: '100%',
                padding: theme.spacing[2],
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.borderRadius.md,
                fontSize: theme.typography.fontSize.base,
                backgroundColor: theme.colors.surface,
                color: theme.colors.textPrimary,
              }}
              min={startDate || new Date().toISOString().slice(0, 16)}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.medium,
              color: theme.colors.textSecondary,
              marginBottom: theme.spacing[1],
            }}>
              Estimated Duration (hours, Optional)
            </label>
            <input
              type="number"
              value={durationHours}
              onChange={(e) => setDurationHours(e.target.value)}
              placeholder="e.g., 8"
              min="1"
              style={{
                width: '100%',
                padding: theme.spacing[2],
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.borderRadius.md,
                fontSize: theme.typography.fontSize.base,
                backgroundColor: theme.colors.surface,
                color: theme.colors.textPrimary,
              }}
            />
          </div>

          <div style={{
            display: 'flex',
            gap: theme.spacing[3],
          }}>
            <button
              onClick={handleSave}
              disabled={isSaving || !startDate}
              style={{
                flex: 1,
                padding: theme.spacing[3],
                backgroundColor: theme.colors.primary,
                color: 'white',
                border: 'none',
                borderRadius: theme.borderRadius.md,
                fontSize: theme.typography.fontSize.base,
                fontWeight: theme.typography.fontWeight.semibold,
                cursor: isSaving || !startDate ? 'not-allowed' : 'pointer',
                opacity: isSaving || !startDate ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: theme.spacing[2],
              }}
            >
              {isSaving ? (
                <>
                  <Icon name="loader" size={20} color="white" />
                  Saving...
                </>
              ) : (
                <>
                  <Icon name="check" size={20} color="white" />
                  Save Schedule
                </>
              )}
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                setError(null);
                // Reset form
                setStartDate(currentSchedule?.scheduled_start_date 
                  ? new Date(currentSchedule.scheduled_start_date).toISOString().slice(0, 16)
                  : '');
                setEndDate(currentSchedule?.scheduled_end_date 
                  ? new Date(currentSchedule.scheduled_end_date).toISOString().slice(0, 16)
                  : '');
                setDurationHours(currentSchedule?.scheduled_duration_hours?.toString() || '');
              }}
              disabled={isSaving}
              style={{
                padding: `${theme.spacing[3]} ${theme.spacing[6]}`,
                backgroundColor: 'transparent',
                color: theme.colors.textSecondary,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.borderRadius.md,
                fontSize: theme.typography.fontSize.base,
                fontWeight: theme.typography.fontWeight.medium,
                cursor: isSaving ? 'not-allowed' : 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

