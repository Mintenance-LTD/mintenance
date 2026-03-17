/**
 * ComplianceCertificates - Track compliance certificates for a property
 */
import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { mobileApiClient } from '../../../utils/mobileApiClient';
import { theme } from '../../../theme';

interface Certificate {
  id: string;
  cert_type: string;
  certificate_number?: string;
  issued_date?: string;
  expiry_date?: string;
  issuer_name?: string;
  status: 'valid' | 'expiring' | 'expired' | 'missing';
}

interface Props {
  propertyId: string;
}

const CERT_LABELS: Record<string, string> = {
  gas_safety: 'Gas Safety',
  eicr: 'Electrical (EICR)',
  epc: 'EPC',
  smoke_alarm: 'Smoke Alarm',
  co_detector: 'CO Detector',
};

const STATUS_CONFIG: Record<string, { color: string; icon: keyof typeof Ionicons.glyphMap; bg: string }> = {
  valid: { color: '#10B981', icon: 'checkmark-circle', bg: '#D1FAE5' },
  expiring: { color: '#F59E0B', icon: 'alert-circle', bg: '#FEF3C7' },
  expired: { color: '#EF4444', icon: 'close-circle', bg: '#FEE2E2' },
  missing: { color: '#9CA3AF', icon: 'help-circle', bg: '#F3F4F6' },
};

export const ComplianceCertificates: React.FC<Props> = ({ propertyId }) => {
  const { data: certificates = [] } = useQuery({
    queryKey: ['compliance', propertyId],
    queryFn: async () => {
      try {
        const res = await mobileApiClient.get<{ certificates: Certificate[] } | Certificate[]>(
          `/api/properties/${propertyId}/compliance`
        );
        return Array.isArray(res) ? res : (res?.certificates || []);
      } catch {
        return [];
      }
    },
  });

  // Build a full list with all cert types
  const allCertTypes = Object.keys(CERT_LABELS);
  const certMap = new Map(certificates.map(c => [c.cert_type, c]));
  const fullList = allCertTypes.map(type => {
    const existing = certMap.get(type);
    if (existing) return existing;
    return { id: type, cert_type: type, status: 'missing' as const };
  });

  const validCount = fullList.filter(c => c.status === 'valid').length;
  const expiringCount = fullList.filter(c => c.status === 'expiring').length;
  const expiredCount = fullList.filter(c => c.status === 'expired').length;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>COMPLIANCE</Text>

      {/* Summary badges */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryBadge, { backgroundColor: '#D1FAE5' }]}>
          <Text style={[styles.summaryCount, { color: '#10B981' }]}>{validCount}</Text>
          <Text style={[styles.summaryLabel, { color: '#10B981' }]}>Valid</Text>
        </View>
        <View style={[styles.summaryBadge, { backgroundColor: '#FEF3C7' }]}>
          <Text style={[styles.summaryCount, { color: '#F59E0B' }]}>{expiringCount}</Text>
          <Text style={[styles.summaryLabel, { color: '#F59E0B' }]}>Expiring</Text>
        </View>
        <View style={[styles.summaryBadge, { backgroundColor: '#FEE2E2' }]}>
          <Text style={[styles.summaryCount, { color: '#EF4444' }]}>{expiredCount}</Text>
          <Text style={[styles.summaryLabel, { color: '#EF4444' }]}>Expired</Text>
        </View>
      </View>

      {fullList.map(cert => {
        const config = STATUS_CONFIG[cert.status] || STATUS_CONFIG.missing;
        return (
          <View key={cert.id} style={styles.certRow}>
            <View style={[styles.statusDot, { backgroundColor: config.bg }]}>
              <Ionicons name={config.icon} size={18} color={config.color} />
            </View>
            <View style={styles.certInfo}>
              <Text style={styles.certType}>{CERT_LABELS[cert.cert_type] || cert.cert_type}</Text>
              {cert.expiry_date ? (
                <Text style={styles.certDate}>
                  Expires {new Date(cert.expiry_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
              ) : (
                <Text style={styles.certMissing}>Not on file</Text>
              )}
            </View>
            <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
              <Text style={[styles.statusText, { color: config.color }]}>
                {cert.status.charAt(0).toUpperCase() + cert.status.slice(1)}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface, borderRadius: 16, padding: 16, marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  sectionTitle: {
    fontSize: 12, fontWeight: '700', color: theme.colors.textTertiary,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12,
  },
  summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  summaryBadge: {
    flex: 1, borderRadius: 12, padding: 10, alignItems: 'center',
  },
  summaryCount: { fontSize: 20, fontWeight: '700' },
  summaryLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  certRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border,
  },
  statusDot: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  certInfo: { flex: 1 },
  certType: { fontSize: 15, fontWeight: '600', color: theme.colors.textPrimary },
  certDate: { fontSize: 12, color: theme.colors.textTertiary, marginTop: 2 },
  certMissing: { fontSize: 12, color: theme.colors.textTertiary, fontStyle: 'italic', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: '700' },
});
