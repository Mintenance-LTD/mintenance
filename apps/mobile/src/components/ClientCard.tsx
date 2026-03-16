import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
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

const STATUS_COLORS: Record<string, string> = {
  active: theme.colors.primary,
  prospect: theme.colors.accent,
  inactive: theme.colors.textSecondary,
  former: theme.colors.error,
};

const CLIENT_TYPE_ICONS: Record<string, string> = {
  residential: 'home',
  commercial: 'business',
  industrial: 'construct',
  government: 'library',
};

export const ClientCard: React.FC<ClientCardProps> = ({
  client,
  onPress,
  onCall,
  onMessage,
  onEmail,
}) => {
  const getRiskLevel = (score: number) => {
    if (score >= 70) return { level: 'High', color: theme.colors.error };
    if (score >= 40) return { level: 'Medium', color: theme.colors.accent };
    return { level: 'Low', color: theme.colors.primary };
  };

  const risk = getRiskLevel(client.churn_risk_score);
  const clientName = `${client.first_name} ${client.last_name}`;
  const statusColor = STATUS_COLORS[client.relationship_status] || theme.colors.textSecondary;
  const clientTypeIcon = CLIENT_TYPE_ICONS[client.client_type] || 'person';
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
              name={clientTypeIcon as keyof typeof Ionicons.glyphMap}
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
              { backgroundColor: statusColor },
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
        <TouchableOpacity style={styles.actionButton}>
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
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  clientInfo: {
    flex: 1,
    marginRight: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  clientName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginLeft: 4,
  },
  clientEmail: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  clientPhone: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textInverse,
  },
  riskBadge: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  riskText: {
    fontSize: 12,
    fontWeight: '500',
  },
  metrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingVertical: 8,
  },
  metric: {
    alignItems: 'center',
    flex: 1,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 12,
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
    marginBottom: 12,
    paddingTop: 8,
  },
  lastActivityText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginLeft: 4,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
