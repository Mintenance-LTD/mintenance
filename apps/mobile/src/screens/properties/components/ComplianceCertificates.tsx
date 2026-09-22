/**
 * ComplianceCertificates - Track compliance certificates for a property
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useAuth } from '../../../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { mobileApiClient } from '../../../utils/mobileApiClient';
import { me } from '../../../design-system/mint-editorial';

interface Certificate {
  id: string;
  cert_type: string;
  certificate_number?: string;
  issued_date?: string;
  expiry_date?: string;
  issuer_name?: string;
  status: 'valid' | 'expiring' | 'expired' | 'missing';
  // Property Rooms Slice 4 (2026-05-21): optional link to a room.
  // The compliance API returns the joined room row when present so
  // the chip can read `Kitchen` directly without a second query.
  property_room_id?: string | null;
  property_room?: {
    id: string;
    name: string;
    room_type: string;
  } | null;
}

interface Props {
  propertyId: string;
}

// 2026-05-24 audit-25 P2: live compliance_certificates.cert_type CHECK
// accepts 9 values (verified via pg_constraint). The summary used to
// hard-code only the first 5, so landlords could have legionella /
// fire-safety / asbestos / PAT-testing records on the property and
// the summary widget would silently hide them — same for the
// "missing" checklist. All 9 are surfaced now.
const CERT_LABELS: Record<string, string> = {
  gas_safety: 'Gas Safety',
  eicr: 'Electrical (EICR)',
  epc: 'EPC',
  smoke_alarm: 'Smoke Alarm',
  co_detector: 'CO Detector',
  legionella: 'Legionella Risk Assessment',
  fire_safety: 'Fire Safety',
  asbestos: 'Asbestos Survey',
  pat_testing: 'PAT Testing',
};

export const ComplianceCertificates: React.FC<Props> = ({ propertyId }) => {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const {
    data: certificates = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['compliance', propertyId, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const response = await mobileApiClient.get<
        { certificates: Certificate[] } | Certificate[]
      >(`/api/properties/${propertyId}/compliance`);
      const rows = Array.isArray(response) ? response : response?.certificates;
      if (
        !Array.isArray(rows) ||
        rows.some(
          (row) =>
            !row ||
            typeof row.id !== 'string' ||
            typeof row.cert_type !== 'string'
        )
      )
        throw new Error('Certificate response was incomplete');
      return rows;
    },
  });
  const visible = certificates.filter((cert) =>
    [
      cert.cert_type,
      cert.certificate_number,
      cert.issuer_name,
      CERT_LABELS[cert.cert_type],
    ].some((value) => value?.toLowerCase().includes(query.trim().toLowerCase()))
  );
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>CERTIFICATE RECORDS</Text>
      {isLoading ? (
        <Text>Loading certificate records...</Text>
      ) : error ? (
        <TouchableOpacity
          accessibilityRole='button'
          accessibilityLabel='Retry loading certificates'
          onPress={() => refetch()}
        >
          <Text>Could not load certificates. Tap to retry.</Text>
        </TouchableOpacity>
      ) : (
        <>
          <Text>
            {certificates.length} recorded for this property. Applicability has
            not been assessed.
          </Text>
          <TextInput
            accessibilityLabel='Search certificates'
            value={query}
            onChangeText={setQuery}
            placeholder='Type, number or issuer'
            style={styles.search}
          />
          {visible.length === 0 ? (
            <Text>
              {certificates.length
                ? 'No certificates match your search.'
                : 'No certificate records have been added.'}
            </Text>
          ) : (
            visible.map((cert) => (
              <View key={cert.id} style={styles.certRow}>
                <View style={styles.certInfo}>
                  <Text style={styles.certType}>
                    {CERT_LABELS[cert.cert_type] || cert.cert_type}
                  </Text>
                  <Text style={styles.certDate}>
                    Number: {cert.certificate_number || 'Not recorded'}
                  </Text>
                  <Text style={styles.certDate}>
                    Issuer: {cert.issuer_name || 'Not recorded'}
                  </Text>
                  <Text style={styles.certDate}>
                    Issued: {cert.issued_date || 'Not recorded'}
                  </Text>
                  <Text style={styles.certDate}>
                    Expiry: {cert.expiry_date || 'Not recorded'}
                  </Text>
                  {cert.property_room?.name ? (
                    <Text style={styles.certRoom}>
                      Room: {cert.property_room.name}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  search: {
    borderWidth: 1,
    borderColor: me.line,
    borderRadius: 8,
    padding: 12,
    marginVertical: 12,
    color: me.ink,
  },
  container: {
    backgroundColor: me.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    ...me.shadow.card,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: me.ink3,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  summaryBadge: {
    flex: 1,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  summaryCount: { fontSize: 20, fontWeight: '700' },
  summaryLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  certRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: me.line,
  },
  statusDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  certInfo: { flex: 1 },
  certType: {
    fontSize: 15,
    fontWeight: '600',
    color: me.ink,
  },
  certRoom: {
    fontSize: 12,
    fontWeight: '400',
    color: me.ink3,
  },
  certDate: { fontSize: 12, color: me.ink3, marginTop: 2 },
  certMissing: {
    fontSize: 12,
    color: me.ink3,
    fontStyle: 'italic',
    marginTop: 2,
  },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: '700' },
});
