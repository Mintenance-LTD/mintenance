import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { ServiceArea } from '../services/ServiceAreasService';

interface ServiceAreaCardProps {
  serviceArea: ServiceArea;
  onPress: () => void;
  onEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}

export const ServiceAreaCard: React.FC<ServiceAreaCardProps> = ({
  serviceArea,
  onPress,
  onEdit,
  onToggleActive,
  onDelete,
}) => {
  const getAreaTypeIcon = (type: string) => {
    switch (type) {
      case 'radius':
        return 'radio-button-on';
      case 'polygon':
        return 'shapes';
      case 'postal_codes':
        return 'mail';
      case 'cities':
        return 'location';
      default:
        return 'map';
    }
  };

  const getAreaTypeLabel = (type: string) => {
    switch (type) {
      case 'radius':
        return 'Radius Coverage';
      case 'polygon':
        return 'Custom Boundary';
      case 'postal_codes':
        return 'Postal Codes';
      case 'cities':
        return 'City Coverage';
      default:
        return type;
    }
  };

  const formatDistance = (km?: number) => {
    if (!km) return 'N/A';
    return km < 1 ? `${Math.round(km * 1000)}m` : `${km}km`;
  };

  const formatCurrency = (amount: number) => {
    return `£${amount.toFixed(2)}`;
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.header}>
        <View style={styles.areaInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.areaName}>{serviceArea.area_name}</Text>
            {serviceArea.is_primary_area && (
              <View style={styles.primaryBadge}>
                <Text style={styles.primaryText}>PRIMARY</Text>
              </View>
            )}
          </View>
          {serviceArea.description && (
            <Text style={styles.description}>{serviceArea.description}</Text>
          )}
        </View>

        <View style={styles.statusContainer}>
          <View
            style={[
              styles.statusIndicator,
              {
                backgroundColor: serviceArea.is_active
                  ? theme.colors.success
                  : theme.colors.textSecondary,
              },
            ]}
          />
          <Text
            style={[
              styles.statusText,
              {
                color: serviceArea.is_active
                  ? theme.colors.success
                  : theme.colors.textSecondary,
              },
            ]}
          >
            {serviceArea.is_active ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>

      <View style={styles.detailsRow}>
        <View style={styles.areaType}>
          <Ionicons
            name={getAreaTypeIcon(serviceArea.area_type) as any}
            size={16}
            color={theme.colors.primary}
          />
          <Text style={styles.areaTypeText}>
            {getAreaTypeLabel(serviceArea.area_type)}
          </Text>
        </View>

        <View style={styles.priority}>
          <Ionicons name='flag' size={14} color={theme.colors.warning} />
          <Text style={styles.priorityText}>
            Priority {serviceArea.priority_level}
          </Text>
        </View>
      </View>

      {serviceArea.area_type === 'radius' && (
        <View style={styles.radiusInfo}>
          <Text style={styles.radiusText}>
            Coverage: {formatDistance(serviceArea.radius_km)} radius
            {serviceArea.max_distance_km &&
              ` • Max: ${formatDistance(serviceArea.max_distance_km)}`}
          </Text>
        </View>
      )}

      {(serviceArea.area_type === 'postal_codes' ||
        serviceArea.area_type === 'cities') && (
        <View style={styles.listInfo}>
          <Text style={styles.listText}>
            {serviceArea.area_type === 'postal_codes'
              ? `${serviceArea.postal_codes?.length || 0} postal codes`
              : `${serviceArea.cities?.length || 0} cities`}
          </Text>
        </View>
      )}

      <View style={styles.pricingRow}>
        <View style={styles.pricingItem}>
          <Text style={styles.pricingLabel}>Base Travel</Text>
          <Text style={styles.pricingValue}>
            {formatCurrency(serviceArea.base_travel_charge)}
          </Text>
        </View>

        <View style={styles.pricingItem}>
          <Text style={styles.pricingLabel}>Per KM</Text>
          <Text style={styles.pricingValue}>
            {formatCurrency(serviceArea.per_km_rate)}
          </Text>
        </View>

        <View style={styles.pricingItem}>
          <Text style={styles.pricingLabel}>Min Job</Text>
          <Text style={styles.pricingValue}>
            {formatCurrency(serviceArea.minimum_job_value)}
          </Text>
        </View>

        <View style={styles.pricingItem}>
          <Text style={styles.pricingLabel}>Response</Text>
          <Text style={styles.pricingValue}>
            {serviceArea.response_time_hours}h
          </Text>
        </View>
      </View>

      {(serviceArea.weekend_surcharge > 0 ||
        serviceArea.evening_surcharge > 0 ||
        serviceArea.emergency_available) && (
        <View style={styles.surchargesRow}>
          {serviceArea.weekend_surcharge > 0 && (
            <View style={styles.surchargeChip}>
              <Text style={styles.surchargeText}>
                Weekend +{serviceArea.weekend_surcharge}%
              </Text>
            </View>
          )}
          {serviceArea.evening_surcharge > 0 && (
            <View style={styles.surchargeChip}>
              <Text style={styles.surchargeText}>
                Evening +{serviceArea.evening_surcharge}%
              </Text>
            </View>
          )}
          {serviceArea.emergency_available && (
            <View style={[styles.surchargeChip, styles.emergencyChip]}>
              <Text style={[styles.surchargeText, styles.emergencyText]}>
                Emergency +{serviceArea.emergency_surcharge}%
              </Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={onEdit}>
          <Ionicons name='pencil' size={16} color={theme.colors.primary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={onToggleActive}>
          <Ionicons
            name={serviceArea.is_active ? 'pause' : 'play'}
            size={16}
            color={
              serviceArea.is_active
                ? theme.colors.warning
                : theme.colors.success
            }
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={onDelete}
        >
          <Ionicons name='trash' size={16} color={theme.colors.error} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    marginBottom: 12,
    ...theme.shadows.base,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  areaInfo: {
    flex: 1,
    marginRight: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  areaName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginRight: 8,
  },
  primaryBadge: {
    backgroundColor: theme.colors.secondary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  primaryText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
  },
  description: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  areaType: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  areaTypeText: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    marginLeft: 6,
  },
  priority: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priorityText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginLeft: 4,
  },
  radiusInfo: {
    marginBottom: 12,
  },
  radiusText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  listInfo: {
    marginBottom: 12,
  },
  listText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    marginBottom: 8,
  },
  pricingItem: {
    alignItems: 'center',
    flex: 1,
  },
  pricingLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  pricingValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  surchargesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 6,
  },
  surchargeChip: {
    backgroundColor: theme.colors.surfaceSecondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  emergencyChip: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderColor: theme.colors.error,
  },
  surchargeText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  emergencyText: {
    color: theme.colors.error,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.base,
    backgroundColor: theme.colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
});
