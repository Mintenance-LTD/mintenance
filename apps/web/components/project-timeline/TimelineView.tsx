import React, { useState } from 'react';
import { theme } from '@/lib/theme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { ProjectTimeline, ProjectMilestone, ProjectProgress } from '@mintenance/types';

interface TimelineViewProps {
  timeline: ProjectTimeline;
  progress: ProjectProgress;
  onEditTimeline?: () => void;
  onAddMilestone?: () => void;
  onEditMilestone?: (milestone: ProjectMilestone) => void;
  onCompleteMilestone?: (milestoneId: string) => void;
  canEdit?: boolean;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  timeline,
  progress,
  onEditTimeline,
  onAddMilestone,
  onEditMilestone,
  onCompleteMilestone,
  canEdit = false
}) => {
  const [selectedMilestone, setSelectedMilestone] = useState<ProjectMilestone | null>(null);

  const getStatusColor = (status: ProjectTimeline['status'] | ProjectMilestone['status']) => {
    switch (status) {
      case 'planning': return theme.colors.info;
      case 'active': case 'in_progress': return theme.colors.warning;
      case 'completed': return theme.colors.success;
      case 'paused': return theme.colors.textSecondary;
      case 'cancelled': return theme.colors.error;
      case 'pending': return theme.colors.info;
      case 'overdue': return theme.colors.error;
      default: return theme.colors.textSecondary;
    }
  };

  const getStatusIcon = (status: ProjectTimeline['status'] | ProjectMilestone['status']) => {
    switch (status) {
      case 'planning': return '📋';
      case 'active': case 'in_progress': return '🔄';
      case 'completed': return '✅';
      case 'paused': return '⏸️';
      case 'cancelled': return '❌';
      case 'pending': return '⏳';
      case 'overdue': return '🚨';
      default: return '❓';
    }
  };

  const getTypeIcon = (type: ProjectMilestone['type']) => {
    switch (type) {
      case 'task': return '📝';
      case 'checkpoint': return '🎯';
      case 'payment': return '💰';
      case 'inspection': return '🔍';
      case 'delivery': return '📦';
      default: return '📋';
    }
  };

  const getPriorityColor = (priority: 'low' | 'medium' | 'high' | 'urgent') => {
    switch (priority) {
      case 'low': return theme.colors.info;
      case 'medium': return theme.colors.warning;
      case 'high': return theme.colors.error;
      case 'urgent': return theme.colors.error;
      default: return theme.colors.textSecondary;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const isOverdue = (milestone: ProjectMilestone) => {
    return milestone.status !== 'completed' && new Date(milestone.targetDate) < new Date();
  };

  const sortedMilestones = [...(timeline.milestones || [])].sort(
    (a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime()
  );

  return (
    <div>
      {/* Timeline Header */}
      <Card style={{ padding: theme.spacing.xl, marginBottom: theme.spacing.lg }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: theme.spacing.lg
        }}>
          <div style={{ flex: 1 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.md,
              marginBottom: theme.spacing.md
            }}>
              <h1 style={{
                fontSize: theme.typography.fontSize['2xl'],
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.text,
                margin: 0
              }}>
                {timeline.title}
              </h1>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.xs,
                padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                borderRadius: theme.borderRadius.full,
                backgroundColor: `${getStatusColor(timeline.status)}20`,
                color: getStatusColor(timeline.status),
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.medium
              }}>
                {getStatusIcon(timeline.status)}
                {timeline.status.toUpperCase()}
              </div>
            </div>

            {timeline.description && (
              <p style={{
                fontSize: theme.typography.fontSize.md,
                color: theme.colors.textSecondary,
                margin: `0 0 ${theme.spacing.md} 0`,
                lineHeight: 1.5
              }}>
                {timeline.description}
              </p>
            )}

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: theme.spacing.md,
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary
            }}>
              <div>
                <strong>Start Date:</strong> {formatDate(timeline.startDate)}
              </div>
              <div>
                <strong>Est. End:</strong> {formatDate(timeline.estimatedEndDate)}
              </div>
              {timeline.actualEndDate && (
                <div>
                  <strong>Actual End:</strong> {formatDate(timeline.actualEndDate)}
                </div>
              )}
              <div>
                <strong>Priority:</strong> {timeline.priority.toUpperCase()}
              </div>
            </div>
          </div>

          {canEdit && (
            <div style={{
              display: 'flex',
              gap: theme.spacing.sm
            }}>
              <Button
                variant="outline"
                size="sm"
                onClick={onEditTimeline}
              >
                ✏️ Edit Timeline
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={onAddMilestone}
              >
                ➕ Add Milestone
              </Button>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div style={{
          marginTop: theme.spacing.lg,
          padding: theme.spacing.md,
          backgroundColor: theme.colors.backgroundSecondary,
          borderRadius: theme.borderRadius.md
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: theme.spacing.sm
          }}>
            <h3 style={{
              fontSize: theme.typography.fontSize.md,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.text,
              margin: 0
            }}>
              Progress: {progress.progressPercentage.toFixed(1)}%
            </h3>
            <div style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary
            }}>
              {progress.completedMilestones} of {progress.totalMilestones} milestones
            </div>
          </div>

          {/* Progress bar */}
          <div style={{
            width: '100%',
            height: '12px',
            backgroundColor: theme.colors.border,
            borderRadius: '6px',
            overflow: 'hidden',
            marginBottom: theme.spacing.sm
          }}>
            <div style={{
              width: `${progress.progressPercentage}%`,
              height: '100%',
              backgroundColor: progress.isOnTrack ? theme.colors.success : theme.colors.warning,
              transition: 'width 0.3s ease'
            }} />
          </div>

          {/* Progress stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: theme.spacing.md,
            fontSize: theme.typography.fontSize.xs,
            color: theme.colors.textSecondary
          }}>
            <div>✅ Completed: {progress.completedMilestones}</div>
            <div>⏳ Upcoming: {progress.upcomingMilestones}</div>
            {progress.overdueMilestones > 0 && (
              <div style={{ color: theme.colors.error }}>
                🚨 Overdue: {progress.overdueMilestones}
              </div>
            )}
            {progress.daysRemaining && (
              <div>📅 Days left: {progress.daysRemaining}</div>
            )}
            {progress.daysOverdue && (
              <div style={{ color: theme.colors.error }}>
                📉 Days overdue: {progress.daysOverdue}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Timeline Visual */}
      <Card style={{ padding: theme.spacing.xl }}>
        <h2 style={{
          fontSize: theme.typography.fontSize.xl,
          fontWeight: theme.typography.fontWeight.bold,
          color: theme.colors.text,
          marginBottom: theme.spacing.lg
        }}>
          📋 Milestone Timeline
        </h2>

        {sortedMilestones.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: theme.spacing.xl,
            color: theme.colors.textSecondary
          }}>
            <div style={{
              fontSize: theme.typography.fontSize.lg,
              marginBottom: theme.spacing.md
            }}>
              📋
            </div>
            <p>No milestones have been added yet.</p>
            {canEdit && (
              <Button
                variant="primary"
                onClick={onAddMilestone}
                style={{ marginTop: theme.spacing.md }}
              >
                ➕ Add First Milestone
              </Button>
            )}
          </div>
        ) : (
          <div style={{ position: 'relative' }}>
            {/* Timeline line */}
            <div style={{
              position: 'absolute',
              left: '20px',
              top: '30px',
              bottom: '30px',
              width: '2px',
              backgroundColor: theme.colors.border
            }} />

            {/* Milestones */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: theme.spacing.lg
            }}>
              {sortedMilestones.map((milestone, index) => {
                const overdue = isOverdue(milestone);
                const statusColor = overdue ? theme.colors.error : getStatusColor(milestone.status);

                return (
                  <div
                    key={milestone.id}
                    style={{
                      position: 'relative',
                      paddingLeft: '60px',
                      cursor: canEdit ? 'pointer' : 'default'
                    }}
                    onClick={() => canEdit && onEditMilestone?.(milestone)}
                  >
                    {/* Timeline dot */}
                    <div style={{
                      position: 'absolute',
                      left: '12px',
                      top: '10px',
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      backgroundColor: statusColor,
                      border: `2px solid ${theme.colors.white}`,
                      boxShadow: '0 0 0 2px ' + statusColor
                    }} />

                    {/* Milestone card */}
                    <Card style={{
                      padding: theme.spacing.lg,
                      border: `2px solid ${statusColor}20`,
                      backgroundColor: `${statusColor}05`
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: theme.spacing.md
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: theme.spacing.sm,
                            marginBottom: theme.spacing.xs
                          }}>
                            <div style={{
                              fontSize: theme.typography.fontSize.lg,
                              color: statusColor
                            }}>
                              {getTypeIcon(milestone.type)}
                            </div>
                            <h3 style={{
                              fontSize: theme.typography.fontSize.md,
                              fontWeight: theme.typography.fontWeight.bold,
                              color: theme.colors.text,
                              margin: 0
                            }}>
                              {milestone.title}
                            </h3>
                            <div style={{
                              padding: `2px ${theme.spacing.xs}`,
                              borderRadius: theme.borderRadius.sm,
                              backgroundColor: `${getPriorityColor(milestone.priority)}20`,
                              color: getPriorityColor(milestone.priority),
                              fontSize: theme.typography.fontSize.xs,
                              fontWeight: theme.typography.fontWeight.medium,
                              textTransform: 'uppercase'
                            }}>
                              {milestone.priority}
                            </div>
                          </div>

                          {milestone.description && (
                            <p style={{
                              fontSize: theme.typography.fontSize.sm,
                              color: theme.colors.textSecondary,
                              margin: `0 0 ${theme.spacing.sm} 0`,
                              lineHeight: 1.4
                            }}>
                              {milestone.description}
                            </p>
                          )}

                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                            gap: theme.spacing.sm,
                            fontSize: theme.typography.fontSize.xs,
                            color: theme.colors.textSecondary
                          }}>
                            <div>
                              <strong>Target:</strong> {formatDate(milestone.targetDate)}
                            </div>
                            {milestone.completedDate && (
                              <div>
                                <strong>Completed:</strong> {formatDate(milestone.completedDate)}
                              </div>
                            )}
                            {milestone.estimatedHours && (
                              <div>
                                <strong>Est. Hours:</strong> {milestone.estimatedHours}
                              </div>
                            )}
                            {milestone.actualHours && (
                              <div>
                                <strong>Actual Hours:</strong> {milestone.actualHours}
                              </div>
                            )}
                            {milestone.paymentAmount && (
                              <div>
                                <strong>Payment:</strong> ${milestone.paymentAmount}
                              </div>
                            )}
                            {milestone.assignee && (
                              <div>
                                <strong>Assigned:</strong> {milestone.assignee.first_name} {milestone.assignee.last_name}
                              </div>
                            )}
                          </div>
                        </div>

                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-end',
                          gap: theme.spacing.xs
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: theme.spacing.xs,
                            padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                            borderRadius: theme.borderRadius.sm,
                            backgroundColor: `${statusColor}20`,
                            color: statusColor,
                            fontSize: theme.typography.fontSize.xs,
                            fontWeight: theme.typography.fontWeight.medium
                          }}>
                            {getStatusIcon(overdue ? 'overdue' : milestone.status)}
                            {overdue ? 'OVERDUE' : milestone.status.toUpperCase()}
                          </div>

                          {canEdit && milestone.status !== 'completed' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onCompleteMilestone?.(milestone.id);
                              }}
                              style={{
                                fontSize: theme.typography.fontSize.xs,
                                color: theme.colors.success,
                                borderColor: theme.colors.success
                              }}
                            >
                              ✅ Complete
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      {/* Milestone Detail Modal */}
      {selectedMilestone && (
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
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: theme.spacing.lg
            }}>
              <h2 style={{
                fontSize: theme.typography.fontSize.lg,
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.text,
                margin: 0
              }}>
                {selectedMilestone.title}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedMilestone(null)}
                style={{ fontSize: theme.typography.fontSize.lg }}
              >
                ✕
              </Button>
            </div>

            {/* Milestone details would go here */}
            <p style={{ color: theme.colors.textSecondary }}>
              Detailed milestone view coming soon...
            </p>
          </Card>
        </div>
      )}
    </div>
  );
};