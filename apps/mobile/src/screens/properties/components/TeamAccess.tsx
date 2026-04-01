/**
 * TeamAccess - Manage team member access to a property
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mobileApiClient } from '../../../utils/mobileApiClient';
import { theme } from '../../../theme';

interface TeamMember {
  id: string;
  email: string;
  role: 'admin' | 'manager' | 'viewer';
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
}

interface Props {
  propertyId: string;
}

const ROLE_COLORS: Record<string, string> = {
  admin: '#EF4444',
  manager: '#3B82F6',
  viewer: '#10B981',
};

export const TeamAccess: React.FC<Props> = ({ propertyId }) => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'manager' | 'viewer'>('viewer');

  const { data: members = [] } = useQuery({
    queryKey: ['property-team', propertyId],
    queryFn: async () => {
      const res = await mobileApiClient.get<
        { members: TeamMember[] } | TeamMember[]
      >(`/api/properties/${propertyId}/team`);
      return Array.isArray(res) ? res : res?.members || [];
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async () => {
      await mobileApiClient.post(`/api/properties/${propertyId}/team`, {
        email: email.trim().toLowerCase(),
        role,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['property-team', propertyId],
      });
      setEmail('');
      setShowForm(false);
    },
    onError: () => Alert.alert('Error', 'Failed to invite team member.'),
  });

  const removeMutation = useMutation({
    mutationFn: async (memberId: string) => {
      await mobileApiClient.delete(
        `/api/properties/${propertyId}/team?memberId=${memberId}`
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['property-team', propertyId],
      });
    },
  });

  const handleInvite = () => {
    if (!email.trim()) {
      Alert.alert('Required', 'Please enter an email address.');
      return;
    }
    inviteMutation.mutate();
  };

  const handleRemove = (id: string, memberEmail: string) => {
    Alert.alert('Remove Member', `Remove "${memberEmail}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => removeMutation.mutate(id),
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>TEAM ACCESS</Text>
        <TouchableOpacity onPress={() => setShowForm(!showForm)}>
          <Ionicons
            name={showForm ? 'close' : 'person-add-outline'}
            size={22}
            color={theme.colors.primary}
          />
        </TouchableOpacity>
      </View>

      {showForm && (
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder='Email address'
            placeholderTextColor={theme.colors.textTertiary}
            keyboardType='email-address'
            autoCapitalize='none'
          />
          <View style={styles.roleRow}>
            {(['viewer', 'manager', 'admin'] as const).map((r) => (
              <TouchableOpacity
                key={r}
                style={[
                  styles.roleChip,
                  role === r && { backgroundColor: ROLE_COLORS[r] },
                ]}
                onPress={() => setRole(r)}
              >
                <Text
                  style={[
                    styles.roleChipText,
                    role === r && styles.roleChipTextActive,
                  ]}
                >
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={styles.createBtn}
            onPress={handleInvite}
            disabled={inviteMutation.isPending}
          >
            <Text style={styles.createBtnText}>
              {inviteMutation.isPending ? 'Inviting...' : 'Invite'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {members.length === 0 && !showForm ? (
        <View style={styles.emptyWrap}>
          <Ionicons
            name='people-outline'
            size={20}
            color={theme.colors.textTertiary}
          />
          <Text style={styles.emptyText}>No team members</Text>
        </View>
      ) : (
        members.map((m) => (
          <View key={m.id} style={styles.memberRow}>
            <View style={styles.avatarWrap}>
              <Ionicons
                name='person'
                size={16}
                color={theme.colors.textSecondary}
              />
            </View>
            <View style={styles.memberInfo}>
              <Text style={styles.memberEmail} numberOfLines={1}>
                {m.email}
              </Text>
              <View style={styles.metaRow}>
                <View
                  style={[
                    styles.roleBadge,
                    { backgroundColor: (ROLE_COLORS[m.role] || '#999') + '20' },
                  ]}
                >
                  <Text
                    style={[
                      styles.roleBadgeText,
                      { color: ROLE_COLORS[m.role] || '#999' },
                    ]}
                  >
                    {m.role}
                  </Text>
                </View>
                {m.status === 'pending' && (
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingText}>Pending</Text>
                  </View>
                )}
              </View>
            </View>
            <TouchableOpacity onPress={() => handleRemove(m.id, m.email)}>
              <Ionicons
                name='close-circle-outline'
                size={20}
                color={theme.colors.error}
              />
            </TouchableOpacity>
          </View>
        ))
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
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
    color: theme.colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  form: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 12,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.colors.textPrimary,
    marginBottom: 10,
  },
  roleRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  roleChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  roleChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  roleChipTextActive: { color: '#FFFFFF' },
  createBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 20,
    paddingVertical: 10,
    alignItems: 'center',
  },
  createBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  emptyWrap: { alignItems: 'center', paddingVertical: 16, gap: 8 },
  emptyText: { fontSize: 14, color: theme.colors.textTertiary },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  avatarWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  memberInfo: { flex: 1 },
  memberEmail: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  metaRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  roleBadgeText: { fontSize: 11, fontWeight: '600' },
  pendingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
  },
  pendingText: { fontSize: 11, fontWeight: '600', color: '#F59E0B' },
});
