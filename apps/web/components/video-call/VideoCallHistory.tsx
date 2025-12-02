import React, { useState, useEffect } from 'react';
import { theme } from '@/lib/theme';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { VideoCallService } from '@/lib/services/VideoCallService';
import type { VideoCall } from '@mintenance/types';
import { logger } from '@mintenance/shared';

interface VideoCallHistoryProps {
  userId: string;
  jobId?: string;
  onScheduleNew?: () => void;
  onJoinCall?: (call: VideoCall) => void;
}

export const VideoCallHistory: React.FC<VideoCallHistoryProps> = ({
  userId,
  jobId,
  onScheduleNew,
  onJoinCall
}) => {
  const [calls, setCalls] = useState<VideoCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed' | 'missed'>('all');

  useEffect(() => {
    loadCalls();
  }, [userId, jobId, filter]);

  const loadCalls = async () => {
    try {
      setLoading(true);
      const callHistory = await VideoCallService.getCallHistory(userId, {
        limit: 20,
        offset: 0
      });
      setCalls(callHistory);
    } catch (error) {
      logger.error('Failed to load call history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinCall = async (call: VideoCall) => {
    if (call.status === 'scheduled' || call.status === 'pending') {
      onJoinCall?.(call);
    }
  };

  const handleCancelCall = async (callId: string) => {
    try {
      await VideoCallService.cancelCall(callId);
      loadCalls(); // Refresh the list
    } catch (error) {
      logger.error('Failed to cancel call:', error);
      alert('Failed to cancel call. Please try again.');
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getStatusIcon = (status: VideoCall['status']) => {
    switch (status) {
      case 'scheduled': return '📅';
      case 'pending': return '⏳';
      case 'active': return '📹';
      case 'ended': return '✅';
      case 'missed': return '❌';
      case 'cancelled': return '🚫';
      default: return '❓';
    }
  };

  const getStatusColor = (status: VideoCall['status']) => {
    switch (status) {
      case 'scheduled': return theme.colors.info;
      case 'pending': return theme.colors.warning;
      case 'active': return theme.colors.success;
      case 'ended': return theme.colors.success;
      case 'missed': return theme.colors.error;
      case 'cancelled': return theme.colors.textSecondary;
      default: return theme.colors.textSecondary;
    }
  };

  const getTypeIcon = (type: VideoCall['type']) => {
    switch (type) {
      case 'consultation': return '💬';
      case 'assessment': return '🔍';
      case 'project_review': return '📋';
      case 'emergency': return '🚨';
      case 'follow_up': return '📞';
      default: return '📹';
    }
  };

  const getPriorityColor = (priority: VideoCall['priority']) => {
    switch (priority) {
      case 'low': return theme.colors.success;
      case 'medium': return theme.colors.warning;
      case 'high': return theme.colors.error;
      case 'urgent': return theme.colors.error;
      default: return theme.colors.textSecondary;
    }
  };

  const isUpcoming = (call: VideoCall) => {
    if (!call.scheduledAt) return false;
    return new Date(call.scheduledAt) > new Date() && (call.status === 'scheduled' || call.status === 'pending');
  };

  const canJoin = (call: VideoCall) => {
    if (call.status === 'active') return true;
    if (call.status === 'scheduled' && call.scheduledAt) {
      const scheduledTime = new Date(call.scheduledAt);
      const now = new Date();
      const timeDiff = scheduledTime.getTime() - now.getTime();
      return timeDiff <= 15 * 60 * 1000 && timeDiff >= -30 * 60 * 1000; // 15 minutes before to 30 minutes after
    }
    return false;
  };

  const filterOptions = [
    { value: 'all', label: 'All Calls', icon: '📹' },
    { value: 'upcoming', label: 'Upcoming', icon: '📅' },
    { value: 'completed', label: 'Completed', icon: '✅' },
    { value: 'missed', label: 'Missed', icon: '❌' }
  ];

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.xl,
        color: theme.colors.textSecondary
      }}>
        Loading call history...
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.lg
      }}>
        <h2 style={{
          fontSize: theme.typography.fontSize.xl,
          fontWeight: theme.typography.fontWeight.bold,
          color: theme.colors.text,
          margin: 0
        }}>
          📹 Video Calls
        </h2>
        {onScheduleNew && (
          <Button
            variant="primary"
            onClick={onScheduleNew}
            size="sm"
          >
            📅 Schedule New Call
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div style={{
        display: 'flex',
        gap: theme.spacing.xs,
        marginBottom: theme.spacing.lg,
        borderBottom: `1px solid ${theme.colors.border}`,
        paddingBottom: theme.spacing.sm
      }}>
        {filterOptions.map(option => (
          <button
            key={option.value}
            onClick={() => setFilter(option.value as any)}
            style={{
              padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
              borderRadius: theme.borderRadius.md,
              border: 'none',
              backgroundColor: filter === option.value
                ? `${theme.colors.primary}15`
                : 'transparent',
              color: filter === option.value
                ? theme.colors.primary
                : theme.colors.textSecondary,
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.medium,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {option.icon} {option.label}
          </button>
        ))}
      </div>

      {/* Call List */}
      {calls.length === 0 ? (
        <Card style={{
          padding: theme.spacing.xl,
          textAlign: 'center',
          color: theme.colors.textSecondary
        }}>
          <div style={{
            fontSize: theme.typography.fontSize.lg,
            marginBottom: theme.spacing.sm
          }}>
            📹
          </div>
          <div style={{
            fontSize: theme.typography.fontSize.md,
            fontWeight: theme.typography.fontWeight.medium,
            marginBottom: theme.spacing.xs
          }}>
            No video calls found
          </div>
          <div style={{ fontSize: theme.typography.fontSize.sm }}>
            {filter === 'all'
              ? 'No video calls have been scheduled yet'
              : `No ${filter} video calls found`
            }
          </div>
        </Card>
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing.md
        }}>
          {calls.map(call => (
            <Card key={call.id} style={{ padding: theme.spacing.lg }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr auto',
                gap: theme.spacing.md,
                alignItems: 'center'
              }}>
                {/* Call Icon & Status */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: theme.spacing.xs
                }}>
                  <div style={{
                    fontSize: theme.typography.fontSize['2xl']
                  }}>
                    {getTypeIcon(call.type)}
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing.xs,
                    color: getStatusColor(call.status),
                    fontSize: theme.typography.fontSize.xs
                  }}>
                    {getStatusIcon(call.status)}
                    <span style={{ textTransform: 'capitalize' }}>
                      {call.status}
                    </span>
                  </div>
                </div>

                {/* Call Details */}
                <div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing.sm,
                    marginBottom: theme.spacing.xs
                  }}>
                    <h3 style={{
                      fontSize: theme.typography.fontSize.md,
                      fontWeight: theme.typography.fontWeight.bold,
                      color: theme.colors.text,
                      margin: 0
                    }}>
                      {call.title}
                    </h3>
                    <div style={{
                      padding: `2px ${theme.spacing.xs}`,
                      borderRadius: theme.borderRadius.sm,
                      backgroundColor: `${getPriorityColor(call.priority)}20`,
                      color: getPriorityColor(call.priority),
                      fontSize: theme.typography.fontSize.xs,
                      fontWeight: theme.typography.fontWeight.medium,
                      textTransform: 'capitalize'
                    }}>
                      {call.priority}
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing.md,
                    fontSize: theme.typography.fontSize.sm,
                    color: theme.colors.textSecondary,
                    marginBottom: theme.spacing.xs
                  }}>
                    {call.participant && (
                      <span>
                        👤 {call.participant.first_name} {call.participant.last_name}
                      </span>
                    )}
                    {call.job && (
                      <span>
                        📋 {call.job.title}
                      </span>
                    )}
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing.md,
                    fontSize: theme.typography.fontSize.sm,
                    color: theme.colors.textSecondary
                  }}>
                    {call.scheduledAt && (
                      <span>
                        📅 {formatDateTime(call.scheduledAt)}
                      </span>
                    )}
                    {call.duration && (
                      <span>
                        ⏱️ {formatDuration(call.duration)}
                      </span>
                    )}
                    {call.recordingUrl && (
                      <span style={{ color: theme.colors.info }}>
                        📼 Recorded
                      </span>
                    )}
                  </div>

                  {call.description && (
                    <div style={{
                      fontSize: theme.typography.fontSize.sm,
                      color: theme.colors.textSecondary,
                      marginTop: theme.spacing.xs,
                      fontStyle: 'italic'
                    }}>
                      {call.description}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: theme.spacing.xs
                }}>
                  {canJoin(call) && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleJoinCall(call)}
                      style={{
                        backgroundColor: theme.colors.success,
                        borderColor: theme.colors.success
                      }}
                    >
                      🚀 Join
                    </Button>
                  )}

                  {isUpcoming(call) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCancelCall(call.id)}
                      style={{ color: theme.colors.error }}
                    >
                      Cancel
                    </Button>
                  )}

                  {call.recordingUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(call.recordingUrl, '_blank')}
                    >
                      📼 View Recording
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};