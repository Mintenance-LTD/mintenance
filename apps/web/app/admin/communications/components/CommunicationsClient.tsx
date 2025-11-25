'use client';

import React, { useState } from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { Card } from '@/components/ui/Card.unified';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';

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
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import styles from '../../admin.module.css';

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

  const publishedCount = announcements.filter(a => a.is_published).length;
  const draftCount = announcements.filter(a => !a.is_published).length;

  return (
    <div style={{
      padding: theme.spacing[8],
      maxWidth: '1440px',
      margin: '0 auto',
      width: '100%',
    }}>
      <AdminPageHeader
        title="Admin Communications"
        subtitle="Create announcements and communicate with platform users"
        quickStats={[
          {
            label: 'total',
            value: announcements.length,
            icon: 'megaphone',
            color: theme.colors.primary,
          },
          {
            label: 'published',
            value: publishedCount,
            icon: 'checkCircle',
            color: theme.colors.success,
          },
          {
            label: 'drafts',
            value: draftCount,
            icon: 'fileText',
            color: theme.colors.warning,
          },
        ]}
        actions={
          <Button
            variant="primary"
            onClick={() => setShowCreateModal(true)}
          >
            <Icon name="plus" size={16} /> New Announcement
          </Button>
        }
      />

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
      <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[5] }}>
        {announcements.map((announcement) => (
          <Card
            key={announcement.id}
            style={{
              padding: theme.spacing[6],
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.2s ease',
              position: 'relative',
              overflow: 'hidden',
            }}
            className="hover:shadow-md"
            onMouseEnter={(e) => {
              const target = e.currentTarget;
              if (target instanceof HTMLElement) {
                target.style.transform = 'translateY(-2px)';
              }
            }}
            onMouseLeave={(e) => {
              const target = e.currentTarget;
              if (target instanceof HTMLElement) {
                target.style.transform = 'translateY(0)';
              }
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: theme.spacing[6] }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Header with Title and Tags */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: theme.spacing[3], marginBottom: theme.spacing[4], flexWrap: 'wrap' }}>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: 700,
                    color: '#0F172A',
                    margin: 0,
                    flex: 1,
                    minWidth: '200px',
                  }}>
                    {announcement.title}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2], flexWrap: 'wrap' }}>
                    {/* Published/Draft Tag */}
                    {announcement.is_published ? (
                      <span style={{
                        padding: '4px 12px',
                        backgroundColor: '#D1FAE5',
                        color: '#065F46',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        border: '1px solid #86EFAC',
                      }}>
                        <Icon name="checkCircle" size={12} color="#065F46" />
                        Published
                      </span>
                    ) : (
                      <span style={{
                        padding: '4px 12px',
                        backgroundColor: '#F1F5F9',
                        color: '#475569',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        border: '1px solid #CBD5E1',
                      }}>
                        Draft
                      </span>
                    )}
                    {/* Priority Tag */}
                    {announcement.priority === 'high' && (
                      <span style={{
                        padding: '4px 12px',
                        backgroundColor: '#FEE2E2',
                        color: '#991B1B',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        border: '1px solid #FCA5A5',
                      }}>
                        Priority
                      </span>
                    )}
                    {/* Type Tag */}
                    <span style={{
                      padding: '4px 12px',
                      backgroundColor: '#EFF6FF',
                      color: '#1E40AF',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 600,
                      textTransform: 'capitalize',
                      border: '1px solid #BFDBFE',
                    }}>
                      {announcement.announcement_type}
                    </span>
                  </div>
                </div>

                {/* Metadata */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing[4],
                  marginBottom: theme.spacing[4],
                  flexWrap: 'wrap',
                }}>
                  <span style={{
                    fontSize: '13px',
                    color: '#64748B',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}>
                    <Icon name="users" size={14} color="#64748B" />
                    Target: {announcement.target_audience.replace('_', ' ')}
                  </span>
                  {announcement.expires_at && (
                    <span style={{
                      fontSize: '13px',
                      color: '#64748B',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}>
                      <Icon name="clock" size={14} color="#64748B" />
                      Expires: {new Date(announcement.expires_at).toLocaleDateString()}
                    </span>
                  )}
                </div>

                {/* Rich Text Preview */}
                <div style={{
                  padding: theme.spacing[4],
                  backgroundColor: '#F8FAFC',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  marginBottom: theme.spacing[4],
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                }}>
                  <div style={{
                    fontSize: '14px',
                    color: '#334155',
                    whiteSpace: 'pre-wrap',
                    lineHeight: '1.6',
                    maxHeight: '120px',
                    overflow: 'hidden',
                    position: 'relative',
                  }}>
                    {announcement.content}
                    {announcement.content.length > 200 && (
                      <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: '40px',
                        background: 'linear-gradient(to bottom, transparent, #F8FAFC)',
                      }} />
                    )}
                  </div>
                  {announcement.content.length > 200 && (
                    <button
                      onClick={() => setEditingId(editingId === announcement.id ? null : announcement.id)}
                      style={{
                        marginTop: theme.spacing[2],
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#4A67FF',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      {editingId === announcement.id ? 'Show less' : 'Read more'}
                    </button>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[2], flexShrink: 0 }}>
                {!announcement.is_published && (
                  <Button
                    variant="primary"
                    onClick={() => handlePublish(announcement.id)}
                    disabled={loading}
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      padding: '8px 16px',
                      minWidth: '120px',
                    }}
                    className="rounded-lg bg-[#4A67FF] hover:bg-[#3B5BDB]"
                  >
                    <Icon name="send" size={16} /> Publish
                  </Button>
                )}
                <Button
                  variant="ghost"
                  onClick={() => setEditingId(editingId === announcement.id ? null : announcement.id)}
                  disabled={loading}
                  style={{
                    fontSize: '13px',
                    fontWeight: 500,
                    padding: '8px 16px',
                    minWidth: '120px',
                  }}
                  className="rounded-lg hover:bg-slate-100"
                >
                  <Icon name="edit" size={16} /> {editingId === announcement.id ? 'Cancel' : 'Edit'}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDelete(announcement.id)}
                  disabled={loading}
                  style={{
                    fontSize: '13px',
                    fontWeight: 500,
                    padding: '8px 16px',
                    minWidth: '120px',
                  }}
                  className="rounded-lg hover:bg-red-600"
                >
                  <Icon name="trash" size={16} /> Delete
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

