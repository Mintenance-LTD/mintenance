/**
 * TenantContacts - Manage tenant contacts for a property
 */
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, StyleSheet, Alert, Platform, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mobileApiClient } from '../../../utils/mobileApiClient';
import { theme } from '../../../theme';

interface Tenant {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  lease_start?: string;
  lease_end?: string;
  notes?: string;
  is_active?: boolean;
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
      return Array.isArray(res) ? res : (res?.tenants || []);
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
    onError: () => Alert.alert('Error', 'Failed to add tenant.'),
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
      { text: 'Remove', style: 'destructive', onPress: () => deleteMutation.mutate(id) },
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
          <Ionicons name={showForm ? 'close' : 'person-add-outline'} size={22} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {showForm && (
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Full name *"
            placeholderTextColor={theme.colors.textTertiary}
          />
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Email address"
            placeholderTextColor={theme.colors.textTertiary}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="Phone number"
            placeholderTextColor={theme.colors.textTertiary}
            keyboardType="phone-pad"
          />
          <TouchableOpacity style={styles.createBtn} onPress={handleCreate} disabled={createMutation.isPending}>
            <Text style={styles.createBtnText}>{createMutation.isPending ? 'Adding...' : 'Add Tenant'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {tenants.length === 0 && !showForm ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="people-outline" size={20} color={theme.colors.textTertiary} />
          <Text style={styles.emptyText}>No tenants added</Text>
        </View>
      ) : (
        tenants.map(t => (
          <View key={t.id} style={styles.tenantRow}>
            <View style={styles.avatarWrap}>
              <Ionicons name="person" size={18} color={theme.colors.textSecondary} />
            </View>
            <View style={styles.tenantInfo}>
              <Text style={styles.tenantName}>{t.name}</Text>
              <View style={styles.contactRow}>
                {t.email && (
                  <TouchableOpacity onPress={() => Linking.openURL(`mailto:${t.email}`)}>
                    <Text style={styles.contactLink}>{t.email}</Text>
                  </TouchableOpacity>
                )}
                {t.phone && (
                  <TouchableOpacity onPress={() => Linking.openURL(`tel:${t.phone}`)}>
                    <Text style={styles.contactLink}>{t.phone}</Text>
                  </TouchableOpacity>
                )}
              </View>
              {t.lease_end && (
                <Text style={styles.leaseDate}>
                  Lease ends {new Date(t.lease_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={() => handleDelete(t.id, t.name)}>
              <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
            </TouchableOpacity>
          </View>
        ))
      )}
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: {
    fontSize: 12, fontWeight: '700', color: theme.colors.textTertiary,
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  form: { marginBottom: 12, padding: 12, backgroundColor: theme.colors.backgroundSecondary, borderRadius: 12 },
  input: {
    backgroundColor: theme.colors.surface, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, color: theme.colors.textPrimary, marginBottom: 10,
  },
  createBtn: {
    backgroundColor: theme.colors.primary, borderRadius: 20, paddingVertical: 10, alignItems: 'center',
  },
  createBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  emptyWrap: { alignItems: 'center', paddingVertical: 16, gap: 8 },
  emptyText: { fontSize: 14, color: theme.colors.textTertiary },
  tenantRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border,
  },
  avatarWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  tenantInfo: { flex: 1 },
  tenantName: { fontSize: 15, fontWeight: '600', color: theme.colors.textPrimary },
  contactRow: { flexDirection: 'row', gap: 12, marginTop: 2 },
  contactLink: { fontSize: 13, color: '#3B82F6' },
  leaseDate: { fontSize: 12, color: theme.colors.textTertiary, marginTop: 2 },
});
