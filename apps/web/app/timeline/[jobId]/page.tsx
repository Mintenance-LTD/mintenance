'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { ProjectTimelineService } from '@/lib/services/ProjectTimelineService';
import { TimelineView, MilestoneEditor, MilestoneFormData } from '@/components/project-timeline';
import { theme } from '@/lib/theme';
import type { ProjectTimeline, ProjectMilestone, ProjectProgress } from '@mintenance/types';

export default function TimelinePage() {
  const params = useParams();
  const jobId = params.jobId as string;

  const [currentUser, setCurrentUser] = useState(null);
  const [timeline, setTimeline] = useState<ProjectTimeline | null>(null);
  const [progress, setProgress] = useState<ProjectProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMilestoneEditor, setShowMilestoneEditor] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<ProjectMilestone | null>(null);

  useEffect(() => {
    loadTimelineData();
  }, [jobId]);

  const loadTimelineData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }
      setCurrentUser(user);

      // Load timeline
      const timelineData = await ProjectTimelineService.getTimelineByJobId(jobId);
      if (!timelineData) {
        throw new Error('No timeline found for this job');
      }

      // Load progress
      const progressData = await ProjectTimelineService.getProjectProgress(timelineData.id);

      setTimeline(timelineData);
      setProgress(progressData);

    } catch (error) {
      console.error('Failed to load timeline data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load timeline data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMilestone = () => {
    setEditingMilestone(null);
    setShowMilestoneEditor(true);
  };

  const handleEditMilestone = (milestone: ProjectMilestone) => {
    setEditingMilestone(milestone);
    setShowMilestoneEditor(true);
  };

  const handleSaveMilestone = async (milestoneData: MilestoneFormData) => {
    try {
      if (!timeline || !currentUser) return;

      if (editingMilestone) {
        // Update existing milestone
        await ProjectTimelineService.updateMilestone(editingMilestone.id, {
          title: milestoneData.title,
          description: milestoneData.description,
          targetDate: milestoneData.targetDate,
          priority: milestoneData.priority
        });
      } else {
        // Create new milestone
        await ProjectTimelineService.createMilestone({
          timelineId: timeline.id,
          jobId: timeline.jobId,
          title: milestoneData.title,
          description: milestoneData.description,
          targetDate: new Date(milestoneData.targetDate).toISOString(),
          priority: milestoneData.priority,
          type: milestoneData.type,
          estimatedHours: milestoneData.estimatedHours,
          paymentAmount: milestoneData.paymentAmount,
          assignedTo: milestoneData.assignedTo,
          createdBy: currentUser.id
        });
      }

      // Refresh timeline data
      await loadTimelineData();

      // Close editor
      setShowMilestoneEditor(false);
      setEditingMilestone(null);

    } catch (error) {
      console.error('Failed to save milestone:', error);
      alert('Failed to save milestone. Please try again.');
    }
  };

  const handleCompleteMilestone = async (milestoneId: string) => {
    try {
      await ProjectTimelineService.completeMilestone(milestoneId);
      await loadTimelineData(); // Refresh data
    } catch (error) {
      console.error('Failed to complete milestone:', error);
      alert('Failed to complete milestone. Please try again.');
    }
  };

  const handleCancelEditor = () => {
    setShowMilestoneEditor(false);
    setEditingMilestone(null);
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.background
      }}>
        <div style={{
          textAlign: 'center',
          color: theme.colors.textSecondary
        }}>
          <div style={{
            fontSize: theme.typography.fontSize.lg,
            marginBottom: theme.spacing.md
          }}>
            📋
          </div>
          <div>Loading project timeline...</div>
        </div>
      </div>
    );
  }

  if (error || !timeline || !progress) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.background
      }}>
        <div style={{
          textAlign: 'center',
          maxWidth: '400px',
          padding: theme.spacing.xl
        }}>
          <div style={{
            fontSize: theme.typography.fontSize.lg,
            marginBottom: theme.spacing.md,
            color: theme.colors.error
          }}>
            ⚠️
          </div>
          <h2 style={{
            fontSize: theme.typography.fontSize.lg,
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.error,
            marginBottom: theme.spacing.sm
          }}>
            Unable to Load Timeline
          </h2>
          <p style={{
            fontSize: theme.typography.fontSize.sm,
            color: theme.colors.textSecondary,
            marginBottom: theme.spacing.md
          }}>
            {error}
          </p>
          <div style={{
            display: 'flex',
            gap: theme.spacing.sm,
            justifyContent: 'center'
          }}>
            <button
              onClick={() => window.history.back()}
              style={{
                padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                borderRadius: theme.borderRadius.md,
                border: `1px solid ${theme.colors.border}`,
                backgroundColor: theme.colors.white,
                color: theme.colors.text,
                fontSize: theme.typography.fontSize.sm,
                cursor: 'pointer'
              }}
            >
              ← Go Back
            </button>
            <button
              onClick={loadTimelineData}
              style={{
                padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                borderRadius: theme.borderRadius.md,
                border: `1px solid ${theme.colors.primary}`,
                backgroundColor: theme.colors.primary,
                color: theme.colors.white,
                fontSize: theme.typography.fontSize.sm,
                cursor: 'pointer'
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Determine if user can edit (contractor assigned to job or job owner)
  const canEdit = currentUser && (
    currentUser.id === timeline.job?.contractor_id ||
    currentUser.id === timeline.job?.homeowner_id ||
    currentUser.role === 'admin'
  );

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: theme.colors.background
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: theme.spacing.xl
      }}>
        {/* Breadcrumb */}
        <div style={{
          marginBottom: theme.spacing.lg,
          fontSize: theme.typography.fontSize.sm,
          color: theme.colors.textSecondary
        }}>
          <a
            href="/jobs"
            style={{
              color: theme.colors.primary,
              textDecoration: 'none'
            }}
          >
            Jobs
          </a>
          {' → '}
          <a
            href={`/jobs/${jobId}`}
            style={{
              color: theme.colors.primary,
              textDecoration: 'none'
            }}
          >
            {timeline.job?.title || 'Job Details'}
          </a>
          {' → '}
          <span>Project Timeline</span>
        </div>

        {/* Main Timeline View */}
        <TimelineView
          timeline={timeline}
          progress={progress}
          onAddMilestone={handleAddMilestone}
          onEditMilestone={handleEditMilestone}
          onCompleteMilestone={handleCompleteMilestone}
          canEdit={canEdit}
        />

        {/* Milestone Editor Modal */}
        <MilestoneEditor
          timeline={timeline}
          milestone={editingMilestone}
          isVisible={showMilestoneEditor}
          onSave={handleSaveMilestone}
          onCancel={handleCancelEditor}
        />

        {/* Quick Actions */}
        <div style={{
          marginTop: theme.spacing.xl,
          textAlign: 'center'
        }}>
          <div style={{
            display: 'inline-flex',
            gap: theme.spacing.md,
            padding: theme.spacing.lg,
            backgroundColor: theme.colors.white,
            borderRadius: theme.borderRadius.lg,
            border: `1px solid ${theme.colors.border}`
          }}>
            <a
              href={`/jobs/${jobId}`}
              style={{
                padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                borderRadius: theme.borderRadius.md,
                border: `1px solid ${theme.colors.primary}`,
                color: theme.colors.primary,
                textDecoration: 'none',
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.medium
              }}
            >
              📋 View Job Details
            </a>
            <a
              href="/analytics"
              style={{
                padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                borderRadius: theme.borderRadius.md,
                border: `1px solid ${theme.colors.info}`,
                color: theme.colors.info,
                textDecoration: 'none',
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.medium
              }}
            >
              📊 View Analytics
            </a>
            <a
              href="/video-calls"
              style={{
                padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                borderRadius: theme.borderRadius.md,
                border: `1px solid ${theme.colors.success}`,
                color: theme.colors.success,
                textDecoration: 'none',
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.medium
              }}
            >
              📹 Schedule Call
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}