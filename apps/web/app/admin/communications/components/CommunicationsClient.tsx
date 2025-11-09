'use client';

import React, { useState } from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { Card } from '@/components/ui/Card.unified';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
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
  const [alertDialog, setAlertDialog] = useState<{ open: boolean; title: string; message: string }>({ open: false, title: '', message: '' });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [successAlert, setSuccessAlert] = useState<{ show: boolean; message: string }>({ show: false, message: '' });

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
      setSuccessAlert({ show: true, message: 'Announcement created successfully!' });
      setTimeout(() => setSuccessAlert({ show: false, message: '' }), 3000);
    } catch (error) {
      console.error('Error creating announcement:', error);
      setAlertDialog({
        open: true,
        title: 'Error',
        message: 'Failed to create announcement',
      });
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
      setSuccessAlert({ show: true, message: 'Announcement published successfully!' });
      setTimeout(() => setSuccessAlert({ show: false, message: '' }), 3000);
    } catch (error) {
      console.error('Error publishing announcement:', error);
      setAlertDialog({
        open: true,
        title: 'Error',
        message: 'Failed to publish announcement',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleteDialog({ open: true, id });
  };

  const confirmDelete = async () => {
    if (!deleteDialog.id) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/announcements/${deleteDialog.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete announcement');
      }

      setAnnouncements(prev => prev.filter(a => a.id !== deleteDialog.id));
      setDeleteDialog({ open: false, id: null });
      setSuccessAlert({ show: true, message: 'Announcement deleted successfully!' });
      setTimeout(() => setSuccessAlert({ show: false, message: '' }), 3000);
    } catch (error) {
      console.error('Error deleting announcement:', error);
      setDeleteDialog({ open: false, id: null });
      setAlertDialog({
        open: true,
        title: 'Error',
        message: 'Failed to delete announcement',
      });
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

      {/* Success Alert */}
      {successAlert.show && (
        <Alert className="mb-4 border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Success</AlertTitle>
          <AlertDescription className="text-green-700">
            {successAlert.message}
          </AlertDescription>
        </Alert>
      )}

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

      {/* Create Dialog */}
      <Dialog open={showCreateModal} onOpenChange={(open: boolean) => {
        setShowCreateModal(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Announcement</DialogTitle>
            <DialogDescription>
              Create a new announcement to communicate with platform users
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="announcement-title">Title</Label>
              <Input
                id="announcement-title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Announcement title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="announcement-content">Content</Label>
              <Textarea
                id="announcement-content"
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Announcement content..."
                rows={6}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="announcement-type">Type</Label>
                <Select
                  value={formData.announcement_type}
                  onValueChange={(value: string) => setFormData(prev => ({ ...prev, announcement_type: value as any }))}
                >
                  <SelectTrigger id="announcement-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="feature">Feature</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="security">Security</SelectItem>
                    <SelectItem value="feedback_request">Feedback Request</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="target-audience">Target Audience</Label>
                <Select
                  value={formData.target_audience}
                  onValueChange={(value: string) => setFormData(prev => ({ ...prev, target_audience: value as any }))}
                >
                  <SelectTrigger id="target-audience">
                    <SelectValue placeholder="Select audience" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="contractors">Contractors</SelectItem>
                    <SelectItem value="homeowners">Homeowners</SelectItem>
                    <SelectItem value="verified_contractors">Verified Contractors</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
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
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog */}
      <AlertDialog open={alertDialog.open} onOpenChange={(open: boolean) => setAlertDialog({ ...alertDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{alertDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{alertDialog.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setAlertDialog({ open: false, title: '', message: '' })}>
              OK
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open: boolean) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this announcement? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialog({ open: false, id: null })}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

