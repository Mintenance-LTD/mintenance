/**
 * TeamAccess - Manage team member access to a property
 */
import React, { useState, useRef } from 'react';
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
import { useAuth } from '../../../contexts/AuthContext';
import { me } from '../../../design-system/mint-editorial';

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
  const { user } = useAuth();
  const saving = useRef(false);
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'manager' | 'viewer'>('viewer');

  const {
    data: members = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['property-team', user?.id, propertyId],
    queryFn: async () => {
      const res = await mobileApiClient.get<
        { members: TeamMember[] } | TeamMember[]
      >(`/api/properties/${propertyId}/team`);
      const rows = Array.isArray(res) ? res : res?.members;
      if (!Array.isArray(rows)) throw new Error('Records could not be loaded');
      return rows;
    },
  });

  const inviteMutation = useMutation({
    onSettled: () => {
      saving.current = false;
    },
    mutationFn: async () => {
      const result = await mobileApiClient.post<{ member: { id: string } }>(
        `/api/properties/${propertyId}/team`,
        {
          email: email.trim().toLowerCase(),
          role,
        }
      );
      if (!result.member?.id)
        throw new Error('Invitation could not be confirmed');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['property-team', user?.id, propertyId],
      });
      setEmail('');
      setShowForm(false);
      Alert.alert(
        'Invite recorded',
        'Ask the invitee to sign in with this email address and accept it from Properties. No email has been sent.',
        [{ text: 'OK' }]
      );
    },
    onError: (err: unknown) => {
      // 2026-05-23 audit: the API returns 402 with
      // { requiresSubscription, feature, message } when a non-Agency
      // homeowner tries to invite team members. Previously we showed
      // a generic "Failed to invite team member" alert that hid the
      // upgrade path. Detect the subscription gate and surface a
      // clear CTA pointing at the subscription screen.
      type ApiErr = {
        status?: number;
        response?: {
          status?: number;
          data?: {
            requiresSubscription?: boolean;
            message?: string;
            feature?: string;
            error?: string;
          };
        };
        data?: {
          requiresSubscription?: boolean;
          message?: string;
        };
      };
      const apiErr = err as ApiErr;
      const status = apiErr.response?.status ?? apiErr.status;
      const data = apiErr.response?.data ?? apiErr.data;
      if (status === 402 || data?.requiresSubscription) {
        Alert.alert(
          'Agency plan required',
          data?.message ||
            'Team member invites require an Agency subscription. Upgrade to unlock shared property access.',
          [
            { text: 'Not now', style: 'cancel' },
            {
              text: 'View plans',
              onPress: () => {
                // Mobile NavigationContainer is global — the
                // subscription tile lives on the Profile stack.
                // Soft-fail if for any reason the route can't be
                // resolved (older app build / web embed).
                try {
                  Linking.openURL('mintenance://profile/subscription');
                } catch {
                  // no-op — user can navigate manually
                }
              },
            },
          ]
        );
        return;
      }
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to invite team member.'
      );
    },
  });

  const removeMutation = useMutation({
    onError: () =>
      Alert.alert(
        'Removal failed',
        'The record could not be removed. Please retry.'
      ),
    mutationFn: async (memberId: string) => {
      const result = await mobileApiClient.delete<{ success: boolean }>(
        `/api/properties/${propertyId}/team?memberId=${memberId}`
      );
      if (result.success !== true)
        throw new Error('Removal could not be confirmed');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['property-team', user?.id, propertyId],
      });
    },
  });

  const handleInvite = () => {
    if (!email.trim()) {
      Alert.alert('Required', 'Please enter an email address.');
      return;
    }
    if (saving.current) return;
    saving.current = true;
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

  if (isLoading)
    return (
      <View style={styles.container}>
        <Text>Loading members…</Text>
      </View>
    );
  if (isError)
    return (
      <View style={styles.container}>
        <Text>Could not load members.</Text>
        <TouchableOpacity
          accessibilityRole='button'
          onPress={() => void refetch()}
        >
          <Text>Retry members</Text>
        </TouchableOpacity>
      </View>
    );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>TEAM ACCESS</Text>
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
            value={email}
            onChangeText={setEmail}
            placeholder='Email address'
            placeholderTextColor={me.ink3}
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
          <Ionicons name='people-outline' size={20} color={me.ink3} />
          <Text style={styles.emptyText}>No team members</Text>
        </View>
      ) : (
        members.map((m) => (
          <View key={m.id} style={styles.memberRow}>
            <View style={styles.avatarWrap}>
              <Ionicons name='person' size={16} color={me.ink2} />
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
                color={me.errFg}
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
  roleRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  roleChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: me.bg2,
  },
  roleChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: me.ink2,
  },
  roleChipTextActive: { color: me.onBrand },
  createBtn: {
    backgroundColor: me.brand,
    borderRadius: 20,
    paddingVertical: 10,
    alignItems: 'center',
  },
  createBtnText: { color: me.onBrand, fontSize: 14, fontWeight: '600' },
  emptyWrap: { alignItems: 'center', paddingVertical: 16, gap: 8 },
  emptyText: { fontSize: 14, color: me.ink3 },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: me.line,
  },
  avatarWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: me.bg2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  memberInfo: { flex: 1 },
  memberEmail: {
    fontSize: 14,
    fontWeight: '600',
    color: me.ink,
  },
  metaRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  roleBadgeText: { fontSize: 11, fontWeight: '600' },
  pendingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: me.warnBg,
  },
  pendingText: { fontSize: 11, fontWeight: '600', color: me.warnFg },
});
