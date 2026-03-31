'use client';

import React, { useState } from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { CheckCircle2 } from 'lucide-react';
import { AdminAnnouncement } from '@/lib/services/admin/AdminCommunicationService';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { getCsrfHeaders } from '@/lib/csrf-client';
import { logger } from '@mintenance/shared';

import { MarkdownEditor } from './MarkdownEditor';
import { AnnouncementCard } from './AnnouncementCard';

interface CommunicationsClientProps {
  initialAnnouncements: AdminAnnouncement[];
  adminId: string;
}

export function CommunicationsClient({
  initialAnnouncements,
  adminId,
}: CommunicationsClientProps) {
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [alertDialog, setAlertDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
  }>({ open: false, title: '', message: '' });
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    id: string | null;
  }>({ open: false, id: null });
  const [successAlert, setSuccessAlert] = useState<{
    show: boolean;
    message: string;
  }>({ show: false, message: '' });

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
      const csrfHeaders = await getCsrfHeaders();
      const response = await fetch('/api/admin/announcements', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders },
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
      setAnnouncements((prev) => [newAnnouncement, ...prev]);
      setShowCreateModal(false);
      resetForm();
      setSuccessAlert({
        show: true,
        message: 'Announcement created successfully!',
      });
      setTimeout(() => setSuccessAlert({ show: false, message: '' }), 3000);
    } catch (error) {
      logger.error('Error creating announcement:', error);
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
      const csrfHeaders = await getCsrfHeaders();
      const response = await fetch(`/api/admin/announcements/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders },
        body: JSON.stringify({ is_published: true }),
      });

      if (!response.ok) {
        throw new Error('Failed to publish announcement');
      }

      const updated = await response.json();
      setAnnouncements((prev) => prev.map((a) => (a.id === id ? updated : a)));
      setSuccessAlert({
        show: true,
        message: 'Announcement published successfully!',
      });
      setTimeout(() => setSuccessAlert({ show: false, message: '' }), 3000);
    } catch (error) {
      logger.error('Error publishing announcement:', error);
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
      const csrfHeaders = await getCsrfHeaders();
      const response = await fetch(
        `/api/admin/announcements/${deleteDialog.id}`,
        {
          method: 'DELETE',
          credentials: 'include',
          headers: { ...csrfHeaders },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete announcement');
      }

      setAnnouncements((prev) => prev.filter((a) => a.id !== deleteDialog.id));
      setDeleteDialog({ open: false, id: null });
      setSuccessAlert({
        show: true,
        message: 'Announcement deleted successfully!',
      });
      setTimeout(() => setSuccessAlert({ show: false, message: '' }), 3000);
    } catch (error) {
      logger.error('Error deleting announcement:', error);
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

  const handleEditToggle = (id: string) => {
    setEditingId(editingId === id ? null : id);
  };

  const publishedCount = announcements.filter((a) => a.is_published).length;
  const draftCount = announcements.filter((a) => !a.is_published).length;

  return (
    <div className='min-h-screen bg-[#f7f9fb] px-6 md:px-10 py-8 max-w-[1440px] mx-auto'>
      {/* Page Header */}
      <div className='flex justify-between items-end mb-10'>
        <div>
          <h2 className='text-[2.75rem] font-extrabold tracking-tight text-[#2a3439] leading-tight'>
            Communications
          </h2>
          <p className='text-[#566166] text-lg mt-2 max-w-lg'>
            Broadcast announcements and manage system-wide notifications for the
            ecosystem.
          </p>
        </div>
        <Button
          variant='primary'
          onClick={() => setShowCreateModal(true)}
          className='bg-[#565e74] hover:bg-[#4a5268] text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 shadow-lg shadow-[#565e74]/20 transition-all'
        >
          <Icon name='plus' size={16} aria-hidden='true' /> New Announcement
        </Button>
      </div>

      {/* Success Alert */}
      {successAlert.show && (
        <Alert
          role='alert'
          aria-live='assertive'
          className='mb-4 border-green-200 bg-green-50'
        >
          <CheckCircle2 className='h-4 w-4 text-green-600' />
          <AlertTitle className='text-green-800'>Success</AlertTitle>
          <AlertDescription className='text-green-700'>
            {successAlert.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Announcements List */}
      <div
        role='list'
        aria-label='Announcements'
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing[5],
        }}
      >
        {announcements.map((announcement) => (
          <AnnouncementCard
            key={announcement.id}
            announcement={announcement}
            editingId={editingId}
            loading={loading}
            onPublish={handlePublish}
            onEdit={handleEditToggle}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {/* Create Dialog */}
      <Dialog
        open={showCreateModal}
        onOpenChange={(open: boolean) => {
          setShowCreateModal(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>Create Announcement</DialogTitle>
            <DialogDescription>
              Create a new announcement to communicate with platform users
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='announcement-title'>Title</Label>
              <Input
                id='announcement-title'
                aria-required='true'
                value={formData.title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder='Announcement title'
              />
            </div>

            <MarkdownEditor
              content={formData.content}
              onContentChange={(newContent: string) =>
                setFormData((prev) => ({ ...prev, content: newContent }))
              }
            />

            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='announcement-type'>Type</Label>
                <Select
                  value={formData.announcement_type}
                  onValueChange={(value: string) =>
                    setFormData((prev) => ({
                      ...prev,
                      announcement_type: value as typeof prev.announcement_type,
                    }))
                  }
                >
                  <SelectTrigger id='announcement-type'>
                    <SelectValue placeholder='Select type' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='general'>General</SelectItem>
                    <SelectItem value='feature'>Feature</SelectItem>
                    <SelectItem value='maintenance'>Maintenance</SelectItem>
                    <SelectItem value='security'>Security</SelectItem>
                    <SelectItem value='feedback_request'>
                      Feedback Request
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='target-audience'>Target Audience</Label>
                <Select
                  value={formData.target_audience}
                  onValueChange={(value: string) =>
                    setFormData((prev) => ({
                      ...prev,
                      target_audience: value as typeof prev.target_audience,
                    }))
                  }
                >
                  <SelectTrigger id='target-audience'>
                    <SelectValue placeholder='Select audience' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>All Users</SelectItem>
                    <SelectItem value='contractors'>Contractors</SelectItem>
                    <SelectItem value='homeowners'>Homeowners</SelectItem>
                    <SelectItem value='verified_contractors'>
                      Verified Contractors
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => {
                setShowCreateModal(false);
                resetForm();
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant='primary'
              onClick={handleCreate}
              disabled={loading || !formData.title || !formData.content}
            >
              {loading ? 'Creating...' : 'Create Announcement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog */}
      <AlertDialog
        open={alertDialog.open}
        onOpenChange={(open: boolean) =>
          setAlertDialog({ ...alertDialog, open })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{alertDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {alertDialog.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() =>
                setAlertDialog({ open: false, title: '', message: '' })
              }
            >
              OK
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open: boolean) =>
          setDeleteDialog({ ...deleteDialog, open })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this announcement? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setDeleteDialog({ open: false, id: null })}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
