'use client';

import React from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { Card } from '@/components/ui/Card.unified';
import { Button } from '@/components/ui/Button';
import { AdminAnnouncement } from '@/lib/services/admin/AdminCommunicationService';

interface AnnouncementCardProps {
  announcement: AdminAnnouncement;
  editingId: string | null;
  loading: boolean;
  onPublish: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function AnnouncementCard({
  announcement,
  editingId,
  loading,
  onPublish,
  onEdit,
  onDelete,
}: AnnouncementCardProps) {
  return (
    <Card
      style={{
        padding: theme.spacing[6],
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        transition: 'all 0.2s ease',
        position: 'relative',
        overflow: 'hidden',
      }}
      className='hover:shadow-md'
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
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'start',
          gap: theme.spacing[6],
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Header with Title and Tags */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: theme.spacing[3],
              marginBottom: theme.spacing[4],
              flexWrap: 'wrap',
            }}
          >
            <h3
              style={{
                fontSize: '18px',
                fontWeight: 700,
                color: '#0F172A',
                margin: 0,
                flex: 1,
                minWidth: '200px',
              }}
            >
              {announcement.title}
            </h3>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing[2],
                flexWrap: 'wrap',
              }}
            >
              {/* Published/Draft Tag */}
              {announcement.is_published ? (
                <span
                  style={{
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
                  }}
                >
                  <Icon
                    name='checkCircle'
                    size={12}
                    color='#065F46'
                    aria-hidden='true'
                  />
                  Published
                </span>
              ) : (
                <span
                  style={{
                    padding: '4px 12px',
                    backgroundColor: '#F1F5F9',
                    color: '#475569',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    border: '1px solid #CBD5E1',
                  }}
                >
                  Draft
                </span>
              )}
              {/* Priority Tag */}
              {announcement.priority === 'high' && (
                <span
                  style={{
                    padding: '4px 12px',
                    backgroundColor: '#FEE2E2',
                    color: '#991B1B',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    border: '1px solid #FCA5A5',
                  }}
                >
                  Priority
                </span>
              )}
              {/* Type Tag */}
              <span
                style={{
                  padding: '4px 12px',
                  backgroundColor: '#EFF6FF',
                  color: '#1E40AF',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'capitalize',
                  border: '1px solid #BFDBFE',
                }}
              >
                {announcement.announcement_type}
              </span>
            </div>
          </div>

          {/* Metadata */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing[4],
              marginBottom: theme.spacing[4],
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                fontSize: '13px',
                color: '#64748B',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Icon name='users' size={14} color='#64748B' aria-hidden='true' />
              Target: {announcement.target_audience.replace('_', ' ')}
            </span>
            {announcement.expires_at && (
              <span
                style={{
                  fontSize: '13px',
                  color: '#64748B',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Icon
                  name='clock'
                  size={14}
                  color='#64748B'
                  aria-hidden='true'
                />
                Expires:{' '}
                {new Date(announcement.expires_at).toLocaleDateString('en-GB')}
              </span>
            )}
          </div>

          {/* Rich Text Preview */}
          <div
            style={{
              padding: theme.spacing[4],
              backgroundColor: '#F8FAFC',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              marginBottom: theme.spacing[4],
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
            }}
          >
            <div
              style={{
                fontSize: '14px',
                color: '#334155',
                whiteSpace: 'pre-wrap',
                lineHeight: '1.6',
                maxHeight: '120px',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              {announcement.content}
              {announcement.content.length > 200 && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '40px',
                    background:
                      'linear-gradient(to bottom, transparent, #F8FAFC)',
                  }}
                />
              )}
            </div>
            {announcement.content.length > 200 && (
              <button
                onClick={() => onEdit(announcement.id)}
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
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing[2],
            flexShrink: 0,
          }}
        >
          {!announcement.is_published && (
            <Button
              variant='primary'
              onClick={() => onPublish(announcement.id)}
              disabled={loading}
              style={{
                fontSize: '13px',
                fontWeight: 600,
                padding: '8px 16px',
                minWidth: '120px',
              }}
              className='rounded-lg bg-[#4A67FF] hover:bg-[#3B5BDB]'
            >
              <Icon name='send' size={16} aria-hidden='true' /> Publish
            </Button>
          )}
          <Button
            variant='ghost'
            onClick={() => onEdit(announcement.id)}
            disabled={loading}
            style={{
              fontSize: '13px',
              fontWeight: 500,
              padding: '8px 16px',
              minWidth: '120px',
            }}
            className='rounded-lg hover:bg-slate-100'
          >
            <Icon name='edit' size={16} aria-hidden='true' />{' '}
            {editingId === announcement.id ? 'Cancel' : 'Edit'}
          </Button>
          <Button
            variant='destructive'
            onClick={() => onDelete(announcement.id)}
            disabled={loading}
            style={{
              fontSize: '13px',
              fontWeight: 500,
              padding: '8px 16px',
              minWidth: '120px',
            }}
            className='rounded-lg hover:bg-red-600'
          >
            <Icon name='trash' size={16} aria-hidden='true' /> Delete
          </Button>
        </div>
      </div>
    </Card>
  );
}
