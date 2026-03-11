import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

export interface ClientData {
  id: string;
  client_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  client_type: 'residential' | 'commercial' | 'industrial' | 'government';
  relationship_status: 'prospect' | 'active' | 'inactive' | 'former';
  total_jobs: number;
  total_revenue: number;
  last_job_date?: string;
  satisfaction_score?: number;
  payment_history_score: number;
  churn_risk_score: number;
  created_at: string;
}

interface ClientCardProps {
  client: ClientData;
  onPress: () => void;
  onCall?: () => void;
  onMessage?: () => void;
  onEmail?: () => void;
}

export const ClientCard: React.FC<ClientCardProps> = ({
  client,
  onPress,
  onCall,
  onMessage,
  onEmail,
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return theme.colors.success;
      case 'prospect':
        return theme.colors.warning;
      case 'inactive':
        return theme.colors.textSecondary;
      case 'former':
        return theme.colors.error;
      default:
        return theme.colors.textSecondary;
    }
  };

  const getClientTypeIcon = (type: string) => {
    switch (type) {
      case 'residential':
        return 'home';
      case 'commercial':
        return 'business';
      case 'industrial':
        return 'construct';
      case 'government':
        return 'library';
      default:
        return 'person';
    }
  };

  const getRiskLevel = (score: number) => {
    if (score >= 70) return { level: 'High', color: theme.colors.error };
    if (score >= 40) return { level: 'Medium', color: theme.colors.warning };
    return { level: 'Low', color: theme.colors.success };
  };

  const risk = getRiskLevel(client.churn_risk_score);
  const clientName = `${client.first_name} ${client.last_name}`;
  const lastJobDays = client.last_job_date
    ? Math.floor(
        (new Date().getTime() - new Date(client.last_job_date).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.header}>
        <View style={styles.clientInfo}>
          <View style={styles.nameRow}>
            <Ionicons
              name={getClientTypeIcon(client.client_type) as keyof typeof Ionicons.glyphMap}
              size={16}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.clientName}>{clientName}</Text>
          </View>
          <Text style={styles.clientEmail}>{client.email}</Text>
          {client.phone && (
            <Text style={styles.clientPhone}>{client.phone}</Text>
          )}
        </View>

        <View style={styles.statusContainer}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(client.relationship_status) },
            ]}
          >
            <Text style={styles.statusText}>
              {client.relationship_status.toUpperCase()}
            </Text>
          </View>
          {client.churn_risk_score > 0 && (
            <View style={[styles.riskBadge, { borderColor: risk.color }]}>
              <Text style={[styles.riskText, { color: risk.color }]}>
                {risk.level} Risk
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.metrics}>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{client.total_jobs}</Text>
          <Text style={styles.metricLabel}>Jobs</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>
            £{client.total_revenue.toLocaleString()}
          </Text>
          <Text style={styles.metricLabel}>Revenue</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>
            {client.payment_history_score}%
          </Text>
          <Text style={styles.metricLabel}>Pay Score</Text>
        </View>
        {client.satisfaction_score !== undefined && (
          <View style={styles.metric}>
            <View style={styles.rating}>
              <Text style={styles.metricValue}>
                {client.satisfaction_score.toFixed(1)}
              </Text>
              <Ionicons name='star' size={12} color={theme.colors.accent} />
            </View>
            <Text style={styles.metricLabel}>Rating</Text>
          </View>
        )}
      </View>

      {lastJobDays !== null && (
        <View style={styles.lastActivity}>
          <Ionicons
            name='time-outline'
            size={14}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.lastActivityText}>
            Last job {lastJobDays === 0 ? 'today' : `${lastJobDays} days ago`}
          </Text>
        </View>
      )}

      <View style={styles.actions}>
        {onCall && (
          <TouchableOpacity style={styles.actionButton} onPress={onCall}>
            <Ionicons name='call' size={16} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
        {onMessage && (
          <TouchableOpacity style={styles.actionButton} onPress={onMessage}>
            <Ionicons
              name='chatbubble'
              size={16}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
        )}
        {onEmail && (
          <TouchableOpacity style={styles.actionButton} onPress={onEmail}>
            <Ionicons name='mail' size={16} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[styles.actionButton, styles.moreButton]}>
          <Ionicons
            name='ellipsis-horizontal'
            size={16}
            color={theme.colors.textSecondary}
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[4],
    marginBottom: theme.spacing[3],
    ...theme.shadows.base,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing[3],
  },
  clientInfo: {
    flex: 1,
    marginRight: theme.spacing[3],
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing[1],
  },
  clientName: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginLeft: theme.spacing[1],
  },
  clientEmail: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  clientPhone: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing[1],
  },
  statusText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textInverse,
  },
  riskBadge: {
    paddingHorizontal: theme.spacing[1],
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
  },
  riskText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
  },
  metrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing[3],
    paddingVertical: theme.spacing[2],
  },
  metric: {
    alignItems: 'center',
    flex: 1,
  },
  metricValue: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  lastActivity: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing[3],
    paddingTop: theme.spacing[2],
  },
  lastActivityText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing[1],
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing[2],
  },
  actionButton: {
    width: theme.spacing[8],
    height: theme.spacing[8],
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreButton: {
    backgroundColor: theme.colors.surfaceSecondary,
  },
});
