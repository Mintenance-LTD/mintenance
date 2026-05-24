/**
 * PropertyContacts — manage the 4-role property_contacts collection
 * (tenant, keyholder, emergency_contact, managing_agent) on the
 * mobile property detail.
 *
 * 2026-05-24 audit-30 P1: web/landlord already supports all four
 * contact roles via /api/landlord/contacts. Mobile previously only
 * showed property_tenants (invitation flow) via TenantContacts, so
 * keyholders + emergency contacts + managing agents the landlord
 * added on web never reached mobile — and contractors couldn't see
 * them either when they were on-site (see JobAccessCard). This
 * component closes the parity gap; the tenant-invitation flow stays
 * on the separate TenantContacts component because it owns the
 * invitation_token + user_id linkage that property_contacts doesn't
 * have.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mobileApiClient } from '../../../utils/mobileApiClient';
import { me } from '../../../design-system/mint-editorial';

type ContactRole =
  | 'tenant'
  | 'keyholder'
  | 'emergency_contact'
  | 'managing_agent';

interface PropertyContact {
  id: string;
  property_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  contact_role: ContactRole;
  unit_label: string | null;
  notes: string | null;
  is_active: boolean;
}

interface Props {
  propertyId: string;
}

const ROLE_OPTIONS: { id: ContactRole; label: string }[] = [
  { id: 'keyholder', label: 'Keyholder' },
  { id: 'emergency_contact', label: 'Emergency' },
  { id: 'managing_agent', label: 'Managing agent' },
  { id: 'tenant', label: 'Tenant' },
];

const ROLE_LABEL: Record<ContactRole, string> = {
  tenant: 'Tenant',
  keyholder: 'Keyholder',
  emergency_contact: 'Emergency contact',
  managing_agent: 'Managing agent',
};

export const PropertyContacts: React.FC<Props> = ({ propertyId }) => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<ContactRole>('keyholder');

  const { data: contacts = [] } = useQuery({
    queryKey: ['property-contacts', propertyId],
    queryFn: async () => {
      const res = await mobileApiClient.get<{ contacts: PropertyContact[] }>(
        `/api/landlord/contacts?propertyId=${propertyId}`
      );
      return Array.isArray(res?.contacts) ? res.contacts : [];
    },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ['property-contacts', propertyId],
    });

  const createMutation = useMutation({
    mutationFn: async () => {
      await mobileApiClient.post('/api/landlord/contacts', {
        property_id: propertyId,
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        contact_role: role,
      });
    },
    onSuccess: () => {
      invalidate();
      setName('');
      setEmail('');
      setPhone('');
      setRole('keyholder');
      setShowForm(false);
    },
    onError: (err: unknown) =>
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to add contact.'
      ),
  });

  const deleteMutation = useMutation({
    mutationFn: async (contactId: string) => {
      await mobileApiClient.delete(`/api/landlord/contacts/${contactId}`);
    },
    onSuccess: invalidate,
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await mobileApiClient.patch(`/api/landlord/contacts/${id}`, {
        is_active: isActive,
      });
    },
    onSuccess: invalidate,
  });

  const handleCreate = () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a name.');
      return;
    }
    createMutation.mutate();
  };

  const handleDelete = (id: string, contactName: string) => {
    Alert.alert('Remove contact', `Remove "${contactName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => deleteMutation.mutate(id),
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>ACCESS & CONTACTS</Text>
        <TouchableOpacity onPress={() => setShowForm(!showForm)}>
          <Ionicons
            name={showForm ? 'close' : 'person-add-outline'}
            size={22}
            color={me.brand}
          />
        </TouchableOpacity>
      </View>

      {showForm && (
        <View style={styles.form}>
          <View style={styles.roleRow}>
            {ROLE_OPTIONS.map((opt) => {
              const active = role === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  onPress={() => setRole(opt.id)}
                  style={[styles.rolePill, active && styles.rolePillActive]}
                  accessibilityRole='button'
                  accessibilityState={{ selected: active }}
                >
                  <Text
                    style={[
                      styles.rolePillText,
                      active && styles.rolePillTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder='Full name *'
            placeholderTextColor={me.ink3}
          />
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder='Email address'
            placeholderTextColor={me.ink3}
            keyboardType='email-address'
            autoCapitalize='none'
          />
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder='Phone number'
            placeholderTextColor={me.ink3}
            keyboardType='phone-pad'
          />
          <TouchableOpacity
            style={styles.createBtn}
            onPress={handleCreate}
            disabled={createMutation.isPending}
          >
            <Text style={styles.createBtnText}>
              {createMutation.isPending ? 'Adding...' : 'Add contact'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {contacts.length === 0 && !showForm ? (
        <View style={styles.emptyWrap}>
          <Ionicons name='people-outline' size={20} color={me.ink3} />
          <Text style={styles.emptyText}>
            No keyholder / emergency contacts
          </Text>
        </View>
      ) : (
        contacts.map((c) => (
          <View
            key={c.id}
            style={[
              styles.contactRow,
              !c.is_active && styles.contactRowInactive,
            ]}
          >
            <View style={styles.avatarWrap}>
              <Ionicons name='person' size={18} color={me.ink2} />
            </View>
            <View style={styles.contactInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.contactName}>{c.name}</Text>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText}>
                    {ROLE_LABEL[c.contact_role] ?? c.contact_role}
                  </Text>
                </View>
              </View>
              <View style={styles.linkRow}>
                {c.phone && (
                  <TouchableOpacity
                    onPress={() => Linking.openURL(`tel:${c.phone}`)}
                  >
                    <Text style={styles.contactLink}>{c.phone}</Text>
                  </TouchableOpacity>
                )}
                {c.email && (
                  <TouchableOpacity
                    onPress={() => Linking.openURL(`mailto:${c.email}`)}
                  >
                    <Text style={styles.contactLink}>{c.email}</Text>
                  </TouchableOpacity>
                )}
              </View>
              {!c.is_active && <Text style={styles.inactiveTag}>Inactive</Text>}
            </View>
            <View style={styles.actions}>
              <TouchableOpacity
                onPress={() =>
                  toggleActiveMutation.mutate({
                    id: c.id,
                    isActive: !c.is_active,
                  })
                }
                accessibilityRole='button'
                accessibilityLabel={
                  c.is_active ? 'Mark contact inactive' : 'Mark contact active'
                }
              >
                <Ionicons
                  name={c.is_active ? 'eye-outline' : 'eye-off-outline'}
                  size={18}
                  color={me.ink2}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(c.id, c.name)}>
                <Ionicons name='trash-outline' size={18} color={me.errFg} />
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: me.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: me.line,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: me.ink3,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  form: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: me.bg2,
    borderRadius: 12,
  },
  roleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  rolePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: me.line,
    backgroundColor: me.surface,
  },
  rolePillActive: {
    backgroundColor: me.ink,
    borderColor: me.ink,
  },
  rolePillText: { fontSize: 12, fontWeight: '600', color: me.ink2 },
  rolePillTextActive: { color: me.onBrand },
  input: {
    backgroundColor: me.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: me.ink,
    marginBottom: 10,
  },
  createBtn: {
    backgroundColor: me.brand,
    borderRadius: 20,
    paddingVertical: 10,
    alignItems: 'center',
  },
  createBtnText: { color: me.onBrand, fontSize: 14, fontWeight: '600' },
  emptyWrap: { alignItems: 'center', paddingVertical: 16, gap: 8 },
  emptyText: { fontSize: 14, color: me.ink3 },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: me.line,
  },
  contactRowInactive: {
    opacity: 0.6,
  },
  avatarWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: me.bg2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contactInfo: { flex: 1 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  contactName: { fontSize: 15, fontWeight: '600', color: me.ink },
  roleBadge: {
    backgroundColor: me.brandSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: me.brand,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  linkRow: { flexDirection: 'row', gap: 12, marginTop: 2 },
  contactLink: { fontSize: 13, color: me.brand, fontWeight: '600' },
  inactiveTag: {
    fontSize: 11,
    color: me.ink3,
    marginTop: 2,
    fontStyle: 'italic',
  },
  actions: { flexDirection: 'row', gap: 12, alignItems: 'center' },
});
