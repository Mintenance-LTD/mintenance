/**
 * TenantContacts - Manage tenant contacts for a property
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

interface Tenant {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  lease_start?: string;
  lease_end?: string;
  notes?: string;
  is_active?: boolean;
  invitation_sent_at?: string;
  invitation_accepted_at?: string;
  user_id?: string;
}

interface Props {
  propertyId: string;
}

export const TenantContacts: React.FC<Props> = ({ propertyId }) => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const { data: tenants = [] } = useQuery({
    queryKey: ['tenants', propertyId],
    queryFn: async () => {
      const res = await mobileApiClient.get<{ tenants: Tenant[] } | Tenant[]>(
        `/api/properties/${propertyId}/tenants`
      );
      return Array.isArray(res) ? res : res?.tenants || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await mobileApiClient.post(`/api/properties/${propertyId}/tenants`, {
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants', propertyId] });
      setName('');
      setEmail('');
      setPhone('');
      setShowForm(false);
    },
    onError: (err: unknown) =>
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to add tenant.'
      ),
  });

  const deleteMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      await mobileApiClient.delete(
        `/api/properties/${propertyId}/tenants?tenantId=${tenantId}`
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants', propertyId] });
    },
  });

  const handleDelete = (id: string, tenantName: string) => {
    Alert.alert('Remove Tenant', `Remove "${tenantName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => deleteMutation.mutate(id),
      },
    ]);
  };

  const handleCreate = () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a name.');
      return;
    }
    createMutation.mutate();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>TENANTS</Text>
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
              {createMutation.isPending ? 'Adding...' : 'Add Tenant'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {tenants.length === 0 && !showForm ? (
        <View style={styles.emptyWrap}>
          <Ionicons name='people-outline' size={20} color={me.ink3} />
          <Text style={styles.emptyText}>No tenants added</Text>
        </View>
      ) : (
        tenants.map((t) => (
          <View key={t.id} style={styles.tenantRow}>
            <View style={styles.avatarWrap}>
              <Ionicons name='person' size={18} color={me.ink2} />
            </View>
            <View style={styles.tenantInfo}>
              <Text style={styles.tenantName}>{t.name}</Text>
              <View style={styles.contactRow}>
                {t.email && (
                  <TouchableOpacity
                    onPress={() => Linking.openURL(`mailto:${t.email}`)}
                  >
                    <Text style={styles.contactLink}>{t.email}</Text>
                  </TouchableOpacity>
                )}
                {t.phone && (
                  <TouchableOpacity
                    onPress={() => Linking.openURL(`tel:${t.phone}`)}
                  >
                    <Text style={styles.contactLink}>{t.phone}</Text>
                  </TouchableOpacity>
                )}
              </View>
              {t.email && !t.invitation_accepted_at && t.invitation_sent_at && (
                <Text style={styles.inviteStatus}>Invitation sent</Text>
              )}
              {t.invitation_accepted_at && (
                <Text style={styles.inviteAccepted}>Account linked</Text>
              )}
              {t.lease_end && (
                <Text style={styles.leaseDate}>
                  Lease ends{' '}
                  {new Date(t.lease_end).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={() => handleDelete(t.id, t.name)}>
              <Ionicons name='trash-outline' size={18} color={me.errFg} />
            </TouchableOpacity>
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
  tenantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: me.line,
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
  tenantInfo: { flex: 1 },
  tenantName: {
    fontSize: 15,
    fontWeight: '600',
    color: me.ink,
  },
  contactRow: { flexDirection: 'row', gap: 12, marginTop: 2 },
  contactLink: { fontSize: 13, color: '#3B82F6' },
  leaseDate: { fontSize: 12, color: me.ink3, marginTop: 2 },
  inviteStatus: {
    fontSize: 11,
    color: me.warnFg,
    fontWeight: '600',
    marginTop: 2,
  },
  inviteAccepted: {
    fontSize: 11,
    color: me.brand,
    fontWeight: '600',
    marginTop: 2,
  },
});
