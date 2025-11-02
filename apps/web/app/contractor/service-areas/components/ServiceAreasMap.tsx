'use client';

import React, { useState, useCallback, useRef } from 'react';
import { GoogleMapContainer } from '@/components/maps';
import {
  createServiceAreaCircle,
  createServiceAreaMarker,
  calculateBounds,
  fitMapToBounds,
  clearMarkers,
  clearCircles,
} from '@/lib/maps';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';

export interface ServiceArea {
  id: string;
  city: string;
  state: string;
  zipCode?: string | null;
  latitude: number;
  longitude: number;
  radius_km: number;
  is_active: boolean;
  priority?: number;
}

interface ServiceAreasMapProps {
  serviceAreas: ServiceArea[];
  onAreaClick?: (area: ServiceArea) => void;
  selectedAreaId?: string | null;
}

/**
 * ServiceAreasMap Component
 * 
 * Visual map showing contractor's service areas as circles
 * Displays coverage zones with color coding (active=green, inactive=gray)
 * Interactive: click on circle or marker to select area
 */
export function ServiceAreasMap({
  serviceAreas,
  onAreaClick,
  selectedAreaId,
}: ServiceAreasMapProps): JSX.Element {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const circlesRef = useRef<google.maps.Circle[]>([]);

  /**
   * Handle map load and create circles/markers for all service areas
   */
  const handleMapLoad = useCallback(
    (mapInstance: google.maps.Map) => {
      setMap(mapInstance);

      // Clear existing markers and circles
      clearMarkers(markersRef.current);
      clearCircles(circlesRef.current);
      markersRef.current = [];
      circlesRef.current = [];

      // Create circles and markers for each service area
      serviceAreas.forEach((area) => {
        // Create coverage circle
        const circle = createServiceAreaCircle(mapInstance, area);

        // Add click handler to circle
        circle.addListener('click', () => {
          onAreaClick?.(area);
        });

        // Highlight selected area
        if (area.id === selectedAreaId) {
          circle.setOptions({
            fillOpacity: 0.4,
            strokeWeight: 4,
          });
        }

        circlesRef.current.push(circle);

        // Create center marker
        const marker = createServiceAreaMarker(
          mapInstance,
          area,
          () => {
            onAreaClick?.(area);
          }
        );

        // Highlight selected marker
        if (area.id === selectedAreaId) {
          marker.setIcon({
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: area.is_active ? '#10B981' : '#9CA3AF',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3,
          });
        }

        markersRef.current.push(marker);
      });

      // Fit map to show all service areas
      if (serviceAreas.length > 0) {
        const bounds = calculateBounds(
          serviceAreas.map((area) => ({
            lat: area.latitude,
            lng: area.longitude,
          }))
        );

        if (bounds) {
          fitMapToBounds(mapInstance, bounds, 100);
        }
      }
    },
    [serviceAreas, onAreaClick, selectedAreaId]
  );

  // Empty state when no service areas
  if (serviceAreas.length === 0) {
    return (
      <div
        style={{
          padding: theme.spacing[12],
          textAlign: 'center',
          backgroundColor: theme.colors.backgroundSecondary,
          borderRadius: theme.borderRadius.lg,
          border: `1px solid ${theme.colors.border}`,
        }}
      >
        <div
          style={{
            width: 80,
            height: 80,
            margin: '0 auto 16px',
            borderRadius: '50%',
            backgroundColor: theme.colors.primaryLight || theme.colors.primary + '20',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="map" size={40} color={theme.colors.primary} />
        </div>
        <h3
          style={{
            fontSize: theme.typography.fontSize.xl,
            fontWeight: theme.typography.fontWeight.semibold,
            color: theme.colors.text,
            marginBottom: theme.spacing[2],
          }}
        >
          No Service Areas Yet
        </h3>
        <p
          style={{
            color: theme.colors.textSecondary,
            fontSize: theme.typography.fontSize.base,
            marginBottom: theme.spacing[4],
          }}
        >
          Add your first service area to see coverage zones on the map
        </p>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: theme.spacing[2],
            padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
            backgroundColor: theme.colors.background,
            borderRadius: theme.borderRadius.md,
            border: `1px solid ${theme.colors.border}`,
          }}
        >
          <Icon name="info" size={16} color={theme.colors.primary} />
          <span style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary }}>
            Tip: Add a location, radius, and it will appear here
          </span>
        </div>
      </div>
    );
  }

  // Calculate center point for initial map position
  const centerPoint = serviceAreas.length > 0
    ? { lat: serviceAreas[0].latitude, lng: serviceAreas[0].longitude }
    : { lat: 51.5074, lng: -0.1278 }; // Fallback to London

  return (
    <div style={{ position: 'relative' }}>
      <GoogleMapContainer
        center={centerPoint}
        zoom={8}
        onMapLoad={handleMapLoad}
        style={{
          width: '100%',
          height: 600,
          borderRadius: theme.borderRadius.lg,
          border: `1px solid ${theme.colors.border}`,
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        }}
      />

      {/* Legend */}
      <div
        style={{
          position: 'absolute',
          top: theme.spacing.md,
          right: theme.spacing.md,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          padding: theme.spacing.md,
          borderRadius: theme.borderRadius.md,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          backdropFilter: 'blur(10px)',
          zIndex: 10,
        }}
      >
        <h4
          style={{
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.semibold,
            color: theme.colors.text,
            marginBottom: theme.spacing[2],
          }}
        >
          Legend
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[2] }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2] }}>
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                backgroundColor: '#10B981',
                border: '2px solid white',
                boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
              }}
            />
            <span style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary }}>
              Active Area
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2] }}>
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                backgroundColor: '#9CA3AF',
                border: '2px solid white',
                boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
              }}
            />
            <span style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary }}>
              Inactive Area
            </span>
          </div>
        </div>
        <div
          style={{
            marginTop: theme.spacing[3],
            paddingTop: theme.spacing[2],
            borderTop: `1px solid ${theme.colors.border}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[1] }}>
            <Icon name="info" size={14} color={theme.colors.primary} />
            <span style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary }}>
              Click area to view details
            </span>
          </div>
        </div>
      </div>

      {/* Coverage Summary */}
      <div
        style={{
          position: 'absolute',
          bottom: theme.spacing.md,
          left: theme.spacing.md,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          padding: theme.spacing.md,
          borderRadius: theme.borderRadius.md,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          backdropFilter: 'blur(10px)',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[3] }}>
          <div>
            <div style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary }}>
              Total Areas
            </div>
            <div
              style={{
                fontSize: theme.typography.fontSize.xl,
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.text,
              }}
            >
              {serviceAreas.length}
            </div>
          </div>
          <div
            style={{
              width: 1,
              height: 32,
              backgroundColor: theme.colors.border,
            }}
          />
          <div>
            <div style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary }}>
              Active
            </div>
            <div
              style={{
                fontSize: theme.typography.fontSize.xl,
                fontWeight: theme.typography.fontWeight.bold,
                color: '#10B981',
              }}
            >
              {serviceAreas.filter((a) => a.is_active).length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

