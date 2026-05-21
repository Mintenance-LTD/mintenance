/**
 * ContractTermsView - Title, description, dates, and terms & conditions
 * Extracted from ContractViewScreen to keep file size manageable.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../../design-system/mint-editorial';

/**
 * Property Rooms Slice 3 — label map mirrors web/contract/ContractScope
 * and the room picker so the homeowner and contractor see the same
 * names everywhere across the lifecycle.
 */
const CONTRACT_ROOM_TYPE_LABELS: Record<string, string> = {
  kitchen: 'Kitchen',
  bathroom: 'Bathroom',
  bedroom: 'Bedroom',
  living_room: 'Living room',
  dining_room: 'Dining room',
  garage: 'Garage',
  garden: 'Garden',
  exterior: 'Exterior',
  roof: 'Roof',
  hallway: 'Hallway',
  office: 'Office',
  utility: 'Utility',
  other: 'Other',
};

interface ContractScopeRoom {
  id?: string;
  name: string;
  room_type: string;
  size_sqm_at_post: number | null;
}

/**
 * Pull `terms.scope.rooms` and narrow to a typed list. Tolerant: bad
 * shapes return [] and the block self-hides — back-compat preserved.
 */
function extractScopeRooms(
  terms: Record<string, unknown> | undefined
): ContractScopeRoom[] {
  const scope = terms?.scope;
  if (!scope || typeof scope !== 'object') return [];
  const rooms = (scope as { rooms?: unknown }).rooms;
  if (!Array.isArray(rooms)) return [];
  return rooms.filter(
    (r): r is ContractScopeRoom =>
      !!r &&
      typeof r === 'object' &&
      typeof (r as { name?: unknown }).name === 'string' &&
      typeof (r as { room_type?: unknown }).room_type === 'string'
  );
}

// Internal-only keys we already hide from the generic key/value list.
const HIDDEN_TERM_KEYS = new Set(['scope']);

interface ContractTermsViewProps {
  title: string | null;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  terms: Record<string, unknown>;
  formatDate: (dateStr: string) => string;
}

export const ContractTermsView: React.FC<ContractTermsViewProps> = ({
  title,
  description,
  start_date,
  end_date,
  terms,
  formatDate,
}) => {
  const scopeRooms = extractScopeRooms(terms);
  const totalScopeSqm = scopeRooms.reduce<number>(
    (sum, r) => sum + (r.size_sqm_at_post ?? 0),
    0
  );
  const anyScopeSqm = scopeRooms.some((r) => r.size_sqm_at_post != null);
  const visibleTerms = terms
    ? Object.entries(terms).filter(([key]) => !HIDDEN_TERM_KEYS.has(key))
    : [];

  return (
    <>
      {title && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Title</Text>
          <Text style={styles.sectionValue}>{title}</Text>
        </View>
      )}

      {description && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Description</Text>
          <Text style={styles.sectionValue}>{description}</Text>
        </View>
      )}

      {(start_date || end_date) && (
        <View style={styles.datesRow}>
          {start_date && (
            <View style={styles.dateItem}>
              <Text style={styles.sectionLabel}>Start Date</Text>
              <Text style={styles.sectionValue}>{formatDate(start_date)}</Text>
            </View>
          )}
          {end_date && (
            <View style={styles.dateItem}>
              <Text style={styles.sectionLabel}>End Date</Text>
              <Text style={styles.sectionValue}>{formatDate(end_date)}</Text>
            </View>
          )}
        </View>
      )}

      {/* Property Rooms Slice 3 — frozen room scope from
          terms.scope.rooms. Self-hides for legacy contracts. */}
      {scopeRooms.length > 0 && (
        <View style={styles.scopeCard}>
          <View style={styles.scopeHeader}>
            <View style={styles.scopeHeaderLeft}>
              <Ionicons name='resize-outline' size={14} color={me.brand} />
              <Text style={styles.scopeTitle}>Rooms in scope</Text>
            </View>
            {anyScopeSqm && totalScopeSqm > 0 ? (
              <Text style={styles.scopeTotal}>
                {totalScopeSqm.toFixed(1)} m² total
              </Text>
            ) : null}
          </View>
          {scopeRooms.map((r, idx) => (
            <View key={r.id ?? `${r.name}-${idx}`} style={styles.scopeRow}>
              <Text style={styles.scopeRowText} numberOfLines={1}>
                <Text style={styles.scopeRowType}>
                  {CONTRACT_ROOM_TYPE_LABELS[r.room_type] ?? r.room_type}
                  {' · '}
                </Text>
                {r.name}
              </Text>
              <Text style={styles.scopeRowSqm}>
                {r.size_sqm_at_post != null
                  ? `${Number(r.size_sqm_at_post).toFixed(1)} m²`
                  : '— m²'}
              </Text>
            </View>
          ))}
        </View>
      )}

      {visibleTerms.length > 0 && (
        <View style={styles.termsCard}>
          <Text style={styles.termsTitle}>Terms & Conditions</Text>
          {visibleTerms.map(([key, value]) => (
            <View key={key} style={styles.termRow}>
              <Text style={styles.termKey}>{key.replace(/_/g, ' ')}</Text>
              <Text style={styles.termValue}>
                {typeof value === 'string' ? value : JSON.stringify(value)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: me.ink3,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  sectionValue: {
    fontSize: 15,
    color: me.ink,
    lineHeight: 22,
  },
  datesRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  dateItem: {
    flex: 1,
  },
  termsCard: {
    backgroundColor: me.bg2,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  termsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: me.ink,
    marginBottom: 12,
  },
  termRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    gap: 8,
  },
  termKey: {
    fontSize: 13,
    fontWeight: '500',
    color: me.ink2,
    textTransform: 'capitalize',
    width: 120,
  },
  termValue: {
    flex: 1,
    fontSize: 13,
    color: me.ink,
  },
  scopeCard: {
    backgroundColor: me.bg2,
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
  },
  scopeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  scopeHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scopeTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: me.ink3,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  scopeTotal: {
    fontSize: 12,
    fontWeight: '700',
    color: me.ink2,
  },
  scopeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  scopeRowText: {
    flex: 1,
    fontSize: 13,
    color: me.ink,
  },
  scopeRowType: {
    color: me.ink3,
  },
  scopeRowSqm: {
    marginLeft: 8,
    fontSize: 13,
    color: me.ink2,
  },
});
