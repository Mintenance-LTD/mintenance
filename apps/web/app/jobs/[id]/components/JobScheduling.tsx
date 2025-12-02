'use client';

import React, { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
      interface JobScheduleData {
        scheduled_start_date: string;
        scheduled_end_date?: string;
        scheduled_duration_hours?: number;
      }

      const scheduleData: JobScheduleData = {
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
      setSuccessMessage('Job scheduled successfully! Both parties will be notified.');
      setError(null);

      // Refresh the page to show updated schedule after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule job');
      setSuccessMessage(null);
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not scheduled';

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';

      // Format consistently to avoid hydration mismatches
      // Use manual formatting to ensure server and client produce identical output
      const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

      const weekday = weekdays[date.getDay()];
      const day = date.getDate();
      const month = months[date.getMonth()];
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');

      // Always use the same format: "Sunday 28 December 2025 at 09:30" (no comma)
      return `${weekday} ${day} ${month} ${year} at ${hours}:${minutes}`;
    } catch {
      return 'Invalid date';
    }
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
          >
            <Icon name="edit" size={16} color={theme.colors.primary} />
            Edit
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert className="mb-4 border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">{successMessage}</AlertDescription>
        </Alert>
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
              <Button
                onClick={() => setIsEditing(true)}
                variant="primary"
              >
                <Icon name="calendar" size={20} color="white" />
                Set Schedule
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[4] }}>
          <div className="space-y-2">
            <Label htmlFor="start-date">Start Date & Time *</Label>
            <Input
              id="start-date"
              type={"datetime-local" as any}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="end-date">End Date & Time (Optional)</Label>
            <Input
              id="end-date"
              type={"datetime-local" as any}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate || new Date().toISOString().slice(0, 16)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration-hours">Estimated Duration (hours, Optional)</Label>
            <Input
              id="duration-hours"
              type="number"
              value={durationHours}
              onChange={(e) => setDurationHours(e.target.value)}
              placeholder="e.g., 8"
              min="1"
            />
          </div>

          <div style={{
            display: 'flex',
            gap: theme.spacing[3],
          }}>
            <Button
              onClick={handleSave}
              disabled={isSaving || !startDate}
              variant="primary"
              className="flex-1"
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
            </Button>
            <Button
              onClick={() => {
                setIsEditing(false);
                setError(null);
                setSuccessMessage(null);
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
              variant="outline"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

