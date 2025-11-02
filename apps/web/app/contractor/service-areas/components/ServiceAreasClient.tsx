'use client';

import React, { useState } from 'react';
import { theme } from '@/lib/theme';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { NotificationBanner } from '@/components/ui/NotificationBanner';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Badge as StatusBadge } from '@/components/ui/Badge.unified';
import { Card } from '@/components/ui/Card.unified';
import { ServiceAreasMap } from './ServiceAreasMap';
import { findOverlappingAreas, getOverlapWarningMessage, type ServiceArea as OverlapServiceArea } from '@/lib/maps';

interface ServiceArea {
  id: string;
  location: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  radius_km: number;
  latitude?: number;
  longitude?: number;
  is_active: boolean;
  priority?: number;
}

export function ServiceAreasClient({ serviceAreas: initial }: { serviceAreas: ServiceArea[] }) {
  const [serviceAreas, setServiceAreas] = useState<ServiceArea[]>(initial);
  const [newLocation, setNewLocation] = useState('');
  const [newRadius, setNewRadius] = useState(25);
  const [isAdding, setIsAdding] = useState(false);
  const [notification, setNotification] = useState<{ tone: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'map'>('table');
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);

  const handleAddArea = async () => {
    if (!newLocation.trim()) {
      setNotification({ tone: 'error', message: 'Please enter a location before adding a service area.' });
      return;
    }

    setIsAdding(true);
    try {
      const response = await fetch('/api/contractor/add-service-area', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location: newLocation, radius_km: newRadius }),
      });

      if (!response.ok) throw new Error('Failed to add service area');

      const newArea = await response.json();
      setServiceAreas([...serviceAreas, newArea]);
      setNewLocation('');
      setNewRadius(25);
      setNotification({ tone: 'success', message: 'Service area added successfully.' });
    } catch (error) {
      setNotification({ tone: 'error', message: 'Failed to add service area.' });
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggleActive = async (areaId: string, currentStatus: boolean) => {
    const updated = serviceAreas.map((area) =>
      area.id === areaId ? { ...area, is_active: !currentStatus } : area
    );
    setServiceAreas(updated);

    try {
      await fetch('/api/contractor/toggle-service-area', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ areaId, isActive: !currentStatus }),
      });
    } catch (error) {
      setServiceAreas(serviceAreas);
      setNotification({ tone: 'error', message: 'Failed to update area status.' });
      return;
    }

    setNotification({
      tone: 'info',
      message: `Service area ${!currentStatus ? 'activated' : 'deactivated'}.`,
    });
  };

  const totalCoverage = serviceAreas
    .filter((a) => a.is_active)
    .reduce((sum, a) => sum + Math.PI * a.radius_km * a.radius_km, 0);

  // Detect overlapping service areas
  const overlaps = findOverlappingAreas(
    serviceAreas
      .filter(area => area.latitude && area.longitude)
      .map(area => ({
        id: area.id,
        latitude: area.latitude!,
        longitude: area.longitude!,
        radius_km: area.radius_km,
        city: area.city,
        state: area.state,
        is_active: area.is_active,
      }))
  );

  const areaColumns: Column<ServiceArea>[] = [
    {
      key: 'location',
      label: 'Location',
      render: (area) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2] }}>
          <Icon name="mapPin" size={18} color={theme.colors.primary} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontWeight: theme.typography.fontWeight.semibold }}>
              {area.location}
            </span>
            {area.zipCode && (
              <span style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary }}>
                {area.zipCode}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'radius_km',
      label: 'Coverage Radius',
      align: 'center' as const,
      render: (area) => (
        <span style={{ fontWeight: theme.typography.fontWeight.medium }}>
          {area.radius_km} km
        </span>
      ),
    },
    {
      key: 'coverage',
      label: 'Total Area',
      align: 'center' as const,
      render: (area) => (
        <span style={{ color: theme.colors.textSecondary, fontSize: theme.typography.fontSize.sm }}>
          {(Math.PI * area.radius_km * area.radius_km).toFixed(0)} km²
        </span>
      ),
    },
    {
      key: 'priority',
      label: 'Priority',
      align: 'center' as const,
      render: (area) => (
        <span
          style={{
            padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
            borderRadius: '12px',
            backgroundColor: theme.colors.backgroundSecondary,
            fontSize: theme.typography.fontSize.xs,
            fontWeight: theme.typography.fontWeight.semibold,
          }}
        >
          {area.priority || '-'}
        </span>
      ),
    },
    {
      key: 'is_active',
      label: 'Status',
      align: 'center' as const,
      render: (area) => <StatusBadge status={area.is_active ? 'active' : 'inactive'} size="sm" />,
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'right' as const,
      render: (area) => (
        <Button
          variant={area.is_active ? 'outline' : 'primary'}
          size="sm"
          onClick={() => handleToggleActive(area.id, area.is_active)}
        >
          {area.is_active ? 'Deactivate' : 'Activate'}
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: theme.spacing[6], display: 'flex', flexDirection: 'column', gap: theme.spacing[6] }}>
      {notification && (
        <NotificationBanner
          tone={notification.tone === 'info' ? 'info' : notification.tone === 'success' ? 'success' : 'error'}
          message={notification.message}
          onDismiss={() => setNotification(null)}
        />
      )}

      {/* Overlap Detection Warnings */}
      {overlaps.length > 0 && overlaps.slice(0, 3).map((overlap, index) => (
        <NotificationBanner
          key={`overlap-${index}`}
          tone="warning"
          message={getOverlapWarningMessage(overlap)}
          onDismiss={() => {/* Keep showing until areas are adjusted */}}
        />
      ))}

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
            Service Coverage Areas
          </h1>
          <p style={{ color: theme.colors.textSecondary, fontSize: theme.typography.fontSize.sm }}>
            Define exactly where you accept work so the right homeowners can find you faster.
          </p>
        </div>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: theme.spacing[2],
            padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
            borderRadius: '12px',
            border: `1px solid ${theme.colors.border}`,
            backgroundColor: theme.colors.surface,
            fontSize: theme.typography.fontSize.xs,
            color: theme.colors.textSecondary,
          }}
        >
          <Icon name="mapPin" size={14} color={theme.colors.textSecondary} />
          {serviceAreas.filter((a) => a.is_active).length} active zones
        </span>
      </header>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: theme.spacing[4],
        }}
      >
        <Card.Metric
          label="Total Areas"
          value={serviceAreas.length.toString()}
          subtitle="Including inactive zones"
          icon="mapPin"
          color={theme.colors.primary}
        />

        <Card.Metric
          label="Active Zones"
          value={serviceAreas.filter((a) => a.is_active).length.toString()}
          subtitle="Live regions receiving requests"
          icon="checkCircle"
          color={theme.colors.success}
        />

        <Card.Metric
          label="Total Coverage"
          value={`${totalCoverage.toFixed(0)} km²`}
          subtitle="Based on active radius zones"
          icon="globe"
          color={theme.colors.info}
        />
      </section>

      <section
        style={{
          backgroundColor: theme.colors.surface,
          borderRadius: '20px',
          border: `1px solid ${theme.colors.border}`,
          padding: theme.spacing[6],
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing[4],
        }}
      >
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2
              style={{
                fontSize: theme.typography.fontSize['2xl'],
                fontWeight: theme.typography.fontWeight.bold,
                margin: 0,
              }}
            >
              Add new area
            </h2>
            <p style={{ margin: 0, fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary }}>
              Define a city or postcode and choose how far you travel.
            </p>
          </div>
        </header>
        <div style={{ display: 'flex', gap: theme.spacing[4], flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 320px' }}>
            <Input
              label="Location"
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              placeholder="e.g. London, Birmingham, Manchester"
            />
          </div>
          <div style={{ flex: '0 0 160px' }}>
            <label
              style={{
                display: 'block',
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.medium,
                marginBottom: theme.spacing[2],
              }}
            >
              Radius (km)
            </label>
            <select
              value={newRadius}
              onChange={(e) => setNewRadius(parseInt(e.target.value))}
              style={{
                width: '100%',
                padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.borderRadius.md,
                fontSize: theme.typography.fontSize.base,
              }}
            >
              {[5, 10, 20, 25, 50, 75].map((option) => (
                <option key={option} value={option}>
                  {option} km
                </option>
              ))}
            </select>
          </div>
          <div style={{ flex: '0 0 auto', alignSelf: 'flex-end' }}>
            <Button onClick={handleAddArea} disabled={isAdding} variant="primary">
              {isAdding ? 'Adding...' : 'Add area'}
            </Button>
          </div>
        </div>
      </section>

      {/* View Toggle Buttons */}
      <div style={{ display: 'flex', gap: theme.spacing[2], justifyContent: 'flex-start' }}>
        <Button
          variant={viewMode === 'table' ? 'primary' : 'outline'}
          size="md"
          onClick={() => setViewMode('table')}
          style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2] }}
        >
          <Icon name="list" size={18} />
          Table View
        </Button>
        <Button
          variant={viewMode === 'map' ? 'primary' : 'outline'}
          size="md"
          onClick={() => setViewMode('map')}
          style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2] }}
        >
          <Icon name="map" size={18} />
          Map View
        </Button>
      </div>

      {/* Conditional Rendering: Map or Table */}
      {viewMode === 'map' ? (
        <ServiceAreasMap
          serviceAreas={serviceAreas
            .filter(area => area.latitude && area.longitude)
            .map(area => ({
              id: area.id,
              city: area.city || area.location,
              state: area.state || '',
              zipCode: area.zipCode || null,
              latitude: area.latitude!,
              longitude: area.longitude!,
              radius_km: area.radius_km,
              is_active: area.is_active,
              priority: area.priority,
            }))}
          onAreaClick={(area) => {
            setSelectedAreaId(area.id);
            setViewMode('table'); // Switch to table to show details
          }}
          selectedAreaId={selectedAreaId}
        />
      ) : (
        <DataTable
          data={serviceAreas}
          columns={areaColumns}
          title="Your Service Areas"
          emptyMessage="No service areas defined yet. Add your first area to start receiving job requests in your region."
        />
      )}
    </div>
  );
}
