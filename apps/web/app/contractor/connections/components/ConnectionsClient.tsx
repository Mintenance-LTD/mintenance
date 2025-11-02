'use client';

import React, { useState } from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Badge as StatusBadge } from '@/components/ui/Badge.unified';
import { Card } from '@/components/ui/Card.unified';

interface ConnectionRequest {
  id: string;
  requester: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  status: string;
  createdAt: string;
}

interface MutualConnection {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  connectedAt: string;
}

interface ConnectionsClientProps {
  connectionRequests: ConnectionRequest[];
  mutualConnections: MutualConnection[];
}

export function ConnectionsClient({
  connectionRequests: initialRequests,
  mutualConnections: initialConnections,
}: ConnectionsClientProps) {
  const [activeTab, setActiveTab] = useState<'requests' | 'connections'>('requests');
  const [connectionRequests, setConnectionRequests] = useState(initialRequests);
  const [mutualConnections] = useState(initialConnections);

  const handleAcceptRequest = async (requestId: string) => {
    try {
      const response = await fetch('/api/contractor/accept-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId }),
      });

      if (response.ok) {
        setConnectionRequests(connectionRequests.filter(req => req.id !== requestId));
      }
    } catch (error) {
      console.error('Failed to accept connection:', error);
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    try {
      const response = await fetch('/api/contractor/decline-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId }),
      });

      if (response.ok) {
        setConnectionRequests(connectionRequests.filter(req => req.id !== requestId));
      }
    } catch (error) {
      console.error('Failed to decline connection:', error);
    }
  };

  const requestColumns: Column<ConnectionRequest>[] = [
    {
      key: 'requester',
      label: 'Requester',
      render: (request) => (
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
              fontSize: theme.typography.fontSize.sm,
            }}
          >
            {request.requester.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontWeight: theme.typography.fontWeight.semibold }}>
              {request.requester.name}
            </span>
            <span style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary }}>
              {request.requester.email}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Role',
      align: 'center' as const,
      render: (request) => (
        <span
          style={{
            padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
            borderRadius: '12px',
            backgroundColor: theme.colors.backgroundSecondary,
            fontSize: theme.typography.fontSize.xs,
            fontWeight: theme.typography.fontWeight.medium,
            textTransform: 'capitalize',
          }}
        >
          {request.requester.role}
        </span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Requested',
      render: (request) =>
        new Date(request.createdAt).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
    },
    {
      key: 'status',
      label: 'Status',
      align: 'center' as const,
      render: (request) => <StatusBadge status={request.status} size="sm" />,
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'right' as const,
      render: (request) => (
        <div style={{ display: 'flex', gap: theme.spacing[2], justifyContent: 'flex-end' }}>
          <Button variant="primary" size="sm" onClick={() => handleAcceptRequest(request.id)}>
            Accept
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleDeclineRequest(request.id)}>
            Decline
          </Button>
        </div>
      ),
    },
  ];

  const connectionColumns: Column<MutualConnection>[] = [
    {
      key: 'user',
      label: 'Connection',
      render: (connection) => (
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
              fontSize: theme.typography.fontSize.sm,
            }}
          >
            {connection.user.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontWeight: theme.typography.fontWeight.semibold }}>
              {connection.user.name}
            </span>
            <span style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary }}>
              {connection.user.email}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Role',
      align: 'center' as const,
      render: (connection) => (
        <span
          style={{
            padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
            borderRadius: '12px',
            backgroundColor: theme.colors.backgroundSecondary,
            fontSize: theme.typography.fontSize.xs,
            fontWeight: theme.typography.fontWeight.medium,
            textTransform: 'capitalize',
          }}
        >
          {connection.user.role}
        </span>
      ),
    },
    {
      key: 'connectedAt',
      label: 'Connected Since',
      render: (connection) =>
        new Date(connection.connectedAt).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
    },
    {
      key: 'status',
      label: 'Status',
      align: 'center' as const,
      render: () => <StatusBadge status="active" size="sm" />,
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'right' as const,
      render: () => (
        <Button variant="outline" size="sm">
          View Profile
        </Button>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[6] }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: theme.spacing[4] }}>
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
        <Button variant="primary" size="sm">
          <Icon name="plus" size={16} color="#FFFFFF" />
          Invite Contractor
        </Button>
      </header>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: theme.spacing[4],
        }}
      >
        <Card.Metric
          label="Total Connections"
          value={mutualConnections.length.toString()}
          subtitle="Active network"
          icon="users"
          color={theme.colors.primary}
        />

        <Card.Metric
          label="Pending Requests"
          value={connectionRequests.length.toString()}
          subtitle="Awaiting response"
          icon="userPlus"
          color={theme.colors.warning || '#F59E0B'}
        />

        <Card.Metric
          label="This Month"
          value={(mutualConnections.filter(c => {
            const connectedDate = new Date(c.connectedAt);
            const monthAgo = new Date();
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return connectedDate >= monthAgo;
          }).length).toString()}
          subtitle="New connections"
          icon="trendingUp"
          color={theme.colors.success}
        />
      </section>

      <nav style={{ display: 'flex', gap: theme.spacing[3], borderBottom: `1px solid ${theme.colors.border}` }}>
        <button
          onClick={() => setActiveTab('requests')}
          style={{
            padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
            borderBottom: activeTab === 'requests' ? `2px solid ${theme.colors.primary}` : '2px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'requests' ? theme.colors.primary : theme.colors.textSecondary,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: activeTab === 'requests' ? theme.typography.fontWeight.semibold : theme.typography.fontWeight.medium,
            cursor: 'pointer',
          }}
        >
          Requests ({connectionRequests.length})
        </button>
        <button
          onClick={() => setActiveTab('connections')}
          style={{
            padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
            borderBottom: activeTab === 'connections' ? `2px solid ${theme.colors.primary}` : '2px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'connections' ? theme.colors.primary : theme.colors.textSecondary,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: activeTab === 'connections' ? theme.typography.fontWeight.semibold : theme.typography.fontWeight.medium,
            cursor: 'pointer',
          }}
        >
          Connected ({mutualConnections.length})
        </button>
      </nav>

      {activeTab === 'requests' ? (
        <DataTable
          data={connectionRequests}
          columns={requestColumns}
          title="Connection Requests"
          emptyMessage="No pending requests. When contractors reach out to connect, you can accept or decline right here."
        />
      ) : (
        <DataTable
          data={mutualConnections}
          columns={connectionColumns}
          title="Your Network"
          emptyMessage="Build your network by inviting contractors you collaborate with frequently."
        />
      )}
    </div>
  );
}
