'use client';

import React, { useState } from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { Card } from '@/components/ui/Card.unified';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AdminAnnouncement, AdminCommunicationService } from '@/lib/services/admin/AdminCommunicationService';

interface CommunicationsClientProps {
  initialAnnouncements: AdminAnnouncement[];
  adminId: string;
}

export function CommunicationsClient({ initialAnnouncements, adminId }: CommunicationsClientProps) {
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    announcement_type: 'general' as const,
    target_audience: 'all' as const,
    priority: 'normal' as const,
    expires_at: '',
  });

  const handleCreate = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          is_published: false,
          created_by: adminId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create announcement');
      }

      const newAnnouncement = await response.json();
      setAnnouncements(prev => [newAnnouncement, ...prev]);
      setShowCreateModal(false);
      resetForm();
    } catch (error) {
      console.error('Error creating announcement:', error);
      alert('Failed to create announcement');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (id: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/announcements/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: true }),
      });

      if (!response.ok) {
        throw new Error('Failed to publish announcement');
      }

      const updated = await response.json();
      setAnnouncements(prev => prev.map(a => a.id === id ? updated : a));
    } catch (error) {
      console.error('Error publishing announcement:', error);
      alert('Failed to publish announcement');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/announcements/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete announcement');
      }

      setAnnouncements(prev => prev.filter(a => a.id !== id));
    } catch (error) {
      console.error('Error deleting announcement:', error);
      alert('Failed to delete announcement');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      announcement_type: 'general',
      target_audience: 'all',
      priority: 'normal',
      expires_at: '',
    });
  };

  return (
    <div style={{
      padding: theme.spacing[8],
      maxWidth: '1440px',
      margin: '0 auto',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing[8] }}>
        <div>
          <h1 style={{
            fontSize: theme.typography.fontSize['3xl'],
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.textPrimary,
            marginBottom: theme.spacing[2],
          }}>
            Admin Communications
          </h1>
          <p style={{
            fontSize: theme.typography.fontSize.base,
            color: theme.colors.textSecondary,
          }}>
            Create announcements and communicate with platform users
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => setShowCreateModal(true)}
        >
          <Icon name="plus" size={16} /> New Announcement
        </Button>
      </div>

      {/* Announcements List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[4] }}>
        {announcements.map((announcement) => (
          <Card key={announcement.id} style={{ padding: theme.spacing[6] }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: theme.spacing[4] }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2], marginBottom: theme.spacing[2] }}>
                  <h3 style={{
                    fontSize: theme.typography.fontSize.xl,
                    fontWeight: theme.typography.fontWeight.bold,
                    color: theme.colors.textPrimary,
                    margin: 0,
                  }}>
                    {announcement.title}
                  </h3>
                  {announcement.is_published && (
                    <span style={{
                      padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
                      backgroundColor: '#10B981',
                      color: 'white',
                      borderRadius: theme.borderRadius.md,
                      fontSize: theme.typography.fontSize.xs,
                      fontWeight: theme.typography.fontWeight.semibold,
                    }}>
                      Published
                    </span>
                  )}
                  <span style={{
                    padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
                    backgroundColor: theme.colors.backgroundSecondary,
                    borderRadius: theme.borderRadius.md,
                    fontSize: theme.typography.fontSize.xs,
                    color: theme.colors.textSecondary,
                    textTransform: 'capitalize',
                  }}>
                    {announcement.announcement_type}
                  </span>
                </div>
                <p style={{
                  fontSize: theme.typography.fontSize.base,
                  color: theme.colors.textSecondary,
                  marginBottom: theme.spacing[2],
                }}>
                  Target: {announcement.target_audience.replace('_', ' ')} • Priority: {announcement.priority}
                </p>
                <div style={{
                  fontSize: theme.typography.fontSize.sm,
                  color: theme.colors.textTertiary,
                  whiteSpace: 'pre-wrap',
                  maxHeight: '150px',
                  overflow: 'hidden',
                }}>
                  {announcement.content.substring(0, 200)}...
                </div>
              </div>
              <div style={{ display: 'flex', gap: theme.spacing[2], marginLeft: theme.spacing[4] }}>
                {!announcement.is_published && (
                  <Button
                    variant="primary"
                    onClick={() => handlePublish(announcement.id)}
                    disabled={loading}
                  >
                    Publish
                  </Button>
                )}
                <Button
                  variant="destructive"
                  onClick={() => handleDelete(announcement.id)}
                  disabled={loading}
                >
                  Delete
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: theme.spacing[4],
          }}
          onClick={() => {
            setShowCreateModal(false);
            resetForm();
          }}
        >
          <div onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <Card
              style={{
                maxWidth: '600px',
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                padding: theme.spacing[6],
              }}
            >
            <h2 style={{
              fontSize: theme.typography.fontSize['2xl'],
              fontWeight: theme.typography.fontWeight.bold,
              marginBottom: theme.spacing[4],
            }}>
              Create Announcement
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[4] }}>
              <div>
                <label style={{ display: 'block', marginBottom: theme.spacing[1], fontWeight: theme.typography.fontWeight.medium }}>
                  Title
                </label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Announcement title"
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: theme.spacing[1], fontWeight: theme.typography.fontWeight.medium }}>
                  Content
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Announcement content..."
                  rows={6}
                  style={{
                    width: '100%',
                    padding: theme.spacing[2],
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: theme.borderRadius.md,
                    fontSize: theme.typography.fontSize.base,
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing[4] }}>
                <div>
                  <label style={{ display: 'block', marginBottom: theme.spacing[1], fontWeight: theme.typography.fontWeight.medium }}>
                    Type
                  </label>
                  <select
                    value={formData.announcement_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, announcement_type: e.target.value as any }))}
                    style={{
                      width: '100%',
                      padding: theme.spacing[2],
                      border: `1px solid ${theme.colors.border}`,
                      borderRadius: theme.borderRadius.md,
                    }}
                  >
                    <option value="general">General</option>
                    <option value="feature">Feature</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="security">Security</option>
                    <option value="feedback_request">Feedback Request</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: theme.spacing[1], fontWeight: theme.typography.fontWeight.medium }}>
                    Target Audience
                  </label>
                  <select
                    value={formData.target_audience}
                    onChange={(e) => setFormData(prev => ({ ...prev, target_audience: e.target.value as any }))}
                    style={{
                      width: '100%',
                      padding: theme.spacing[2],
                      border: `1px solid ${theme.colors.border}`,
                      borderRadius: theme.borderRadius.md,
                    }}
                  >
                    <option value="all">All Users</option>
                    <option value="contractors">Contractors</option>
                    <option value="homeowners">Homeowners</option>
                    <option value="verified_contractors">Verified Contractors</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: theme.spacing[4] }}>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleCreate}
                  disabled={loading || !formData.title || !formData.content}
                >
                  {loading ? 'Creating...' : 'Create Announcement'}
                </Button>
              </div>
            </div>
          </Card>
          </div>
        </div>
      )}
    </div>
  );
}

