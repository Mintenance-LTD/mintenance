/**
 * JobAccessCard — shows the assigned contractor the property access
 * details that the homeowner has filled in (key_safe_code, access
 * notes, utility locations). Mirrors what the web contractor page
 * (/contractor/jobs/[id]) already renders.
 *
 * 2026-05-23 audit: this surface didn't exist on mobile — contractors
 * could arrive on-site without the access instructions the web side
 * showed. The job API now returns `propertyAccess` with the same
 * 1h-before-start reveal window for `key_safe_code`, so we just have
 * to render whatever the server provided.
 *
 * Rendering rules:
 *   - Nothing to show → return null (no empty card with a header).
 *   - access_mode label is always rendered when set, so the
 *     contractor knows whether to expect a lock-box / smart-lock /
 *     in-person entry.
 *   - key_safe_code surfaces only when the API returns it (the
 *     server gates by `canRevealKeySafeCode`).
 *   - stopcock / gas / consumer-unit locations render whenever
 *     present — they're useful for emergency response regardless
 *     of the visit timing.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../../design-system/mint-editorial';

export interface PropertyAccess {
  access_mode: 'key_safe' | 'smart_lock' | 'in_person' | string | null;
  key_safe_code: string | null;
  access_notes: string | null;
  stopcock_location: string | null;
  gas_isolator_location: string | null;
  consumer_unit_location: string | null;
}

// 2026-05-24 audit-30 P1: mirror the property_contacts row shape the
// job detail GET returns. Renders below the access section so a
// contractor en route can call the tenant or keyholder if they can't
// get in, and a homeowner / admin can see the same list for context.
export interface PropertyContact {
  id: string;
  name: string;
  contact_role: string;
  phone: string | null;
  email: string | null;
  unit_label: string | null;
  notes: string | null;
}

interface Props {
  access: PropertyAccess | null | undefined;
  contacts?: PropertyContact[] | null;
}

const ROLE_LABEL: Record<string, string> = {
  tenant: 'Tenant',
  keyholder: 'Keyholder',
  emergency_contact: 'Emergency contact',
  managing_agent: 'Managing agent',
};

const MODE_LABEL: Record<string, string> = {
  key_safe: 'Key safe',
  smart_lock: 'Smart lock — see instructions below',
  in_person: 'Homeowner will be home',
};

export const JobAccessCard: React.FC<Props> = ({ access, contacts }) => {
  const contactList = (contacts ?? []).filter(
    (c) => !!c && !!c.name
  ) as PropertyContact[];

  const hasAccessDetail =
    !!access &&
    (!!access.access_mode ||
      !!access.key_safe_code ||
      !!access.access_notes ||
      !!access.stopcock_location ||
      !!access.gas_isolator_location ||
      !!access.consumer_unit_location);

  if (!hasAccessDetail && contactList.length === 0) return null;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.iconWrap}>
          <Ionicons name='key-outline' size={18} color={me.brand} />
        </View>
        <Text style={styles.title}>Access & contacts</Text>
      </View>

      {access?.access_mode ? (
        <View style={styles.row}>
          <Text style={styles.label}>How to get in</Text>
          <Text style={styles.value}>
            {MODE_LABEL[access.access_mode] ?? access.access_mode}
          </Text>
        </View>
      ) : null}

      {access?.key_safe_code ? (
        <View style={styles.row}>
          <Text style={styles.label}>Lock-box code</Text>
          <Text style={styles.code}>{access.key_safe_code}</Text>
        </View>
      ) : access?.access_mode === 'key_safe' ? (
        <View style={styles.row}>
          <Text style={styles.label}>Lock-box code</Text>
          <Text style={styles.muted}>
            Reveals within 1 hour of your scheduled start.
          </Text>
        </View>
      ) : null}

      {access?.access_notes ? (
        <View style={styles.row}>
          <Text style={styles.label}>Notes from the homeowner</Text>
          <Text style={styles.value}>{access.access_notes}</Text>
        </View>
      ) : null}

      {access?.stopcock_location ? (
        <View style={styles.row}>
          <Text style={styles.label}>Stopcock</Text>
          <Text style={styles.value}>{access.stopcock_location}</Text>
        </View>
      ) : null}

      {access?.gas_isolator_location ? (
        <View style={styles.row}>
          <Text style={styles.label}>Gas isolator</Text>
          <Text style={styles.value}>{access.gas_isolator_location}</Text>
        </View>
      ) : null}

      {access?.consumer_unit_location ? (
        <View style={styles.row}>
          <Text style={styles.label}>Consumer unit</Text>
          <Text style={styles.value}>{access.consumer_unit_location}</Text>
        </View>
      ) : null}

      {/* 2026-05-24 audit-30 P1: contacts attached to the property —
          previously the card was titled "Access & contacts" but the
          contacts half was never rendered. */}
      {contactList.length > 0 ? (
        <View style={styles.contactsBlock}>
          <Text style={styles.label}>People at this property</Text>
          {contactList.map((c) => {
            const roleLabel = ROLE_LABEL[c.contact_role] ?? c.contact_role;
            return (
              <View key={c.id} style={styles.contactRow}>
                <View style={styles.contactHeader}>
                  <Text style={styles.contactName}>{c.name}</Text>
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleBadgeText}>{roleLabel}</Text>
                  </View>
                </View>
                {c.unit_label ? (
                  <Text style={styles.contactUnit}>Unit {c.unit_label}</Text>
                ) : null}
                <View style={styles.contactActions}>
                  {c.phone ? (
                    <TouchableOpacity
                      onPress={() => Linking.openURL(`tel:${c.phone}`)}
                      accessibilityRole='button'
                      accessibilityLabel={`Call ${c.name}`}
                    >
                      <Text style={styles.contactLink}>{c.phone}</Text>
                    </TouchableOpacity>
                  ) : null}
                  {c.email ? (
                    <TouchableOpacity
                      onPress={() => Linking.openURL(`mailto:${c.email}`)}
                      accessibilityRole='button'
                      accessibilityLabel={`Email ${c.name}`}
                    >
                      <Text style={styles.contactLink}>{c.email}</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
                {c.notes ? (
                  <Text style={styles.contactNotes}>{c.notes}</Text>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: me.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: me.line,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: me.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: me.ink,
  },
  row: {
    gap: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: me.ink3,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  value: {
    fontSize: 14,
    color: me.ink,
    lineHeight: 20,
  },
  code: {
    fontFamily: 'monospace',
    fontSize: 18,
    fontWeight: '700',
    color: me.brand,
    letterSpacing: 2,
  },
  muted: {
    fontSize: 13,
    color: me.ink3,
    fontStyle: 'italic',
  },
  // 2026-05-24 audit-30 P1: contact rows live under their own block
  // so they're visually separated from the access fields and stack
  // tightly on smaller phones.
  contactsBlock: {
    gap: 10,
  },
  contactRow: {
    gap: 4,
    paddingTop: 8,
    paddingBottom: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: me.line,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  contactName: {
    fontSize: 14,
    fontWeight: '700',
    color: me.ink,
  },
  roleBadge: {
    backgroundColor: me.brandSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: me.brand,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  contactUnit: {
    fontSize: 12,
    color: me.ink3,
  },
  contactActions: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    marginTop: 2,
  },
  contactLink: {
    fontSize: 13,
    color: me.brand,
    fontWeight: '600',
  },
  contactNotes: {
    fontSize: 12,
    color: me.ink2,
    lineHeight: 18,
    marginTop: 2,
  },
});
