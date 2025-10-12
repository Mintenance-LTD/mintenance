'use client';

import React, { useState } from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';

interface Connection {
  id: string;
  first_name: string;
  last_name: string;
  company?: string;
  specialty?: string;
  relationship_status?: string;
  last_interaction?: string;
}

interface ConnectionRequest {
  id: string;
  first_name: string;
  last_name: string;
  company?: string;
  note?: string;
}

interface ConnectionsClientProps {
  connectionRequests: ConnectionRequest[];
  mutualConnections: Connection[];
}

export function ConnectionsClient({
  connectionRequests: initialRequests,
  mutualConnections: initialConnections,
}: ConnectionsClientProps) {
  const [activeTab, setActiveTab] = useState<'requests' | 'connections'>('requests');
  const [connectionRequests] = useState(initialRequests);
  const [mutualConnections] = useState(initialConnections);

  const renderEmptyState = (title: string, description: string) => (
    <div style={{ textAlign: 'center', padding: `${theme.spacing[12]} 0`, color: theme.colors.textSecondary }}>
      <div style={{ marginBottom: theme.spacing[4], display: 'flex', justifyContent: 'center' }}>
        <Icon name="users" size={48} color={theme.colors.textQuaternary} />
      </div>
      <h3 style={{ fontSize: theme.typography.fontSize.xl, marginBottom: theme.spacing[2], color: theme.colors.textPrimary }}>
        {title}
      </h3>
      <p style={{ maxWidth: '320px', margin: '0 auto' }}>{description}</p>
    </div>
  );

  return (
    <div style={{ padding: theme.spacing[6], maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: theme.spacing[6] }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1
            style={{
              fontSize: theme.typography.fontSize['3xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary,
              marginBottom: theme.spacing[2],
            }}
          >
            Professional Connections
          </h1>
          <p style={{ color: theme.colors.textSecondary, fontSize: theme.typography.fontSize.sm }}>
            Keep track of trusted contractors and manage collaboration requests.
          </p>
        </div>
        <button
          type="button"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: theme.spacing[2],
            padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
            borderRadius: '12px',
            border: `1px solid ${theme.colors.primary}`,
            backgroundColor: theme.colors.surface,
            color: theme.colors.primary,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.semibold,
            cursor: 'pointer',
          }}
        >
          <Icon name="plus" size={16} color={theme.colors.primary} />
          Invite Contractor
        </button>
      </header>

      <div style={{ display: 'flex', gap: theme.spacing[3] }}>
        <button
          onClick={() => setActiveTab('requests')}
          style={{
            flex: 1,
            padding: theme.spacing[4],
            backgroundColor: activeTab === 'requests' ? theme.colors.backgroundSecondary : theme.colors.surface,
            color: activeTab === 'requests' ? theme.colors.primary : theme.colors.textSecondary,
            border: `1px solid ${activeTab === 'requests' ? theme.colors.primary : theme.colors.border}`,
            borderRadius: theme.borderRadius.lg,
            fontSize: theme.typography.fontSize.base,
            fontWeight: theme.typography.fontWeight.semibold,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: theme.spacing[2],
          }}
        >
          <Icon name="users" size={16} color={activeTab === 'requests' ? theme.colors.primary : theme.colors.textSecondary} />
          Requests ({connectionRequests.length})
        </button>
        <button
          onClick={() => setActiveTab('connections')}
          style={{
            flex: 1,
            padding: theme.spacing[4],
            backgroundColor: activeTab === 'connections' ? theme.colors.backgroundSecondary : theme.colors.surface,
            color: activeTab === 'connections' ? theme.colors.primary : theme.colors.textSecondary,
            border: `1px solid ${activeTab === 'connections' ? theme.colors.primary : theme.colors.border}`,
            borderRadius: theme.borderRadius.lg,
            fontSize: theme.typography.fontSize.base,
            fontWeight: theme.typography.fontWeight.semibold,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: theme.spacing[2],
          }}
        >
          <Icon name="users" size={16} color={activeTab === 'connections' ? theme.colors.primary : theme.colors.textSecondary} />
          Connected ({mutualConnections.length})
        </button>
      </div>

      <section
        style={{
          backgroundColor: theme.colors.surface,
          borderRadius: '20px',
          padding: theme.spacing[6],
          border: `1px solid ${theme.colors.border}`,
          minHeight: '420px',
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing[4],
        }}
      >
        {activeTab === 'requests' ? (
          connectionRequests.length === 0 ? (
            renderEmptyState('No connection requests yet', 'When contractors reach out to connect, you can accept or decline right here.')
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[3] }}>
              {connectionRequests.map((request) => (
                <div
                  key={request.id}
                  style={{
                    padding: theme.spacing[4],
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: theme.spacing[4],
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[3] }}>
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '16px',
                        backgroundColor: theme.colors.backgroundSecondary,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: theme.typography.fontWeight.semibold,
                        color: theme.colors.primary,
                      }}
                    >
                      {(request.first_name?.[0] ?? '') + (request.last_name?.[0] ?? '')}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontWeight: theme.typography.fontWeight.semibold, color: theme.colors.textPrimary }}>
                        {request.first_name} {request.last_name}
                      </span>
                      <span style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary }}>
                        {request.company ?? 'Independent contractor'}
                      </span>
                      {request.note && (
                        <span style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary }}>
                          "{request.note}"
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2] }}>
                    <button
                      type="button"
                      style={{
                        padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
                        borderRadius: '12px',
                        border: `1px solid ${theme.colors.primary}`,
                        backgroundColor: theme.colors.surface,
                        color: theme.colors.primary,
                        fontSize: theme.typography.fontSize.xs,
                        fontWeight: theme.typography.fontWeight.semibold,
                        cursor: 'pointer',
                      }}
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      style={{
                        padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
                        borderRadius: '12px',
                        border: `1px solid ${theme.colors.border}`,
                        backgroundColor: theme.colors.surface,
                        color: theme.colors.textSecondary,
                        fontSize: theme.typography.fontSize.xs,
                        fontWeight: theme.typography.fontWeight.semibold,
                        cursor: 'pointer',
                      }}
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : mutualConnections.length === 0 ? (
          renderEmptyState('Build your network', 'Invite contractors you collaborate with frequently to keep them one tap away.')
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: theme.spacing[4] }}>
            {mutualConnections.map((connection) => (
              <div
                key={connection.id}
                style={{
                  borderRadius: '16px',
                  border: `1px solid ${theme.colors.border}`,
                  padding: theme.spacing[4],
                  backgroundColor: theme.colors.backgroundSecondary,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: theme.spacing[3],
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[3] }}>
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '14px',
                      backgroundColor: theme.colors.surface,
                      border: `1px solid ${theme.colors.border}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: theme.typography.fontWeight.semibold,
                      color: theme.colors.primary,
                    }}
                  >
                    {(connection.first_name?.[0] ?? '') + (connection.last_name?.[0] ?? '')}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontWeight: theme.typography.fontWeight.semibold, color: theme.colors.textPrimary }}>
                      {connection.first_name} {connection.last_name}
                    </span>
                    <span style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary }}>
                      {connection.company ?? 'Independent'}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2], color: theme.colors.textSecondary, fontSize: theme.typography.fontSize.xs }}>
                  <Icon name="briefcase" size={14} color={theme.colors.textSecondary} />
                  {connection.specialty ?? 'General contracting'}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2], fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary }}>
                  <Icon name="activity" size={14} color={theme.colors.success} />
                  Last interaction {connection.last_interaction ? connection.last_interaction : 'recently'}
                </div>

                <button
                  type="button"
                  style={{
                    alignSelf: 'flex-start',
                    padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
                    borderRadius: '12px',
                    border: `1px solid ${theme.colors.border}`,
                    backgroundColor: theme.colors.surface,
                    color: theme.colors.textSecondary,
                    fontSize: theme.typography.fontSize.xs,
                    fontWeight: theme.typography.fontWeight.semibold,
                    cursor: 'pointer',
                  }}
                >
                  View profile
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
