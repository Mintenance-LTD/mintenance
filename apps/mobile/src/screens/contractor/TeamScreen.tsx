/**
 * TeamScreen — R6 #18 of docs/RETENTION_ROADMAP_2026.md.
 *
 * Mobile counterpart of apps/web/app/contractor/team/page.tsx.
 * Live-wired against /api/user/organizations + /api/organizations/:id/members
 * + /invite. If the contractor doesn't yet have a contractor_company org,
 * we nudge them to create one on web (onboarding/company flow is web-only
 * for now).
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Platform,
  RefreshControl,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader, LoadingSpinner } from '../../components/shared';
import { EmptyState } from '../../components/ui/EmptyState';
import { mobileApiClient as apiClient } from '../../utils/mobileApiClient';
import { theme } from '../../theme';
import { InviteTeamMemberSheet, type OrgRole } from './InviteTeamMemberSheet';

interface Org {
  id: string;
  name: string;
  organization_type: string;
  myRole: OrgRole;
}

interface MemberProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  company_name: string | null;
}

interface Member {
  id: string;
  user_id: string;
  org_role: OrgRole;
  status: string;
  created_at: string;
  profile: MemberProfile | null;
}

interface PendingInvite {
  id: string;
  invited_email: string;
  org_role: OrgRole;
  created_at: string;
}

function displayName(m: Member): string {
  const first = m.profile?.first_name || '';
  const last = m.profile?.last_name || '';
  const full = `${first} ${last}`.trim();
  return full || m.profile?.email || 'Teammate';
}

export const TeamScreen: React.FC = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeOrg, setActiveOrg] = useState<Org | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [pending, setPending] = useState<PendingInvite[]>([]);
  const [showInvite, setShowInvite] = useState(false);

  const loadMembers = useCallback(async (orgId: string) => {
    try {
      const res = await apiClient.get<{
        members: Member[];
        pendingInvitations: PendingInvite[];
      }>(`/api/organizations/${orgId}/members`);
      setMembers(res.members || []);
      setPending(res.pendingInvitations || []);
    } catch {
      setMembers([]);
      setPending([]);
    }
  }, []);

  const loadAll = useCallback(async () => {
    try {
      const res = await apiClient.get<{ organizations: Org[] }>(
        '/api/user/organizations'
      );
      const list = res.organizations || [];
      const org =
        list.find((o) => o.organization_type === 'contractor_company') ||
        list[0] ||
        null;
      setActiveOrg(org);
      if (org) await loadMembers(org.id);
    } catch {
      setActiveOrg(null);
    }
  }, [loadMembers]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadAll();
      setLoading(false);
    })();
  }, [loadAll]);

  async function onRefresh() {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }

  async function remove(member: Member) {
    if (!activeOrg) return;
    Alert.alert(
      'Remove member',
      `Remove ${displayName(member)} from ${activeOrg.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.delete<{ success: boolean }>(
                `/api/organizations/${activeOrg.id}/members?userId=${member.user_id}`
              );
              await loadMembers(activeOrg.id);
            } catch (err) {
              Alert.alert(
                'Could not remove',
                err instanceof Error ? err.message : 'Try again.'
              );
            }
          },
        },
      ]
    );
  }

  if (loading) return <LoadingSpinner />;

  if (!activeOrg) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader
          title='Team'
          showBack
          onBack={() => navigation.goBack()}
        />
        <EmptyState
          icon='people-outline'
          title='No team yet'
          subtitle='Create a contractor company to invite teammates. This is set up from the web app.'
        />
      </SafeAreaView>
    );
  }

  const canManage =
    activeOrg.myRole === 'owner' || activeOrg.myRole === 'manager';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle='dark-content'
        backgroundColor={theme.colors.backgroundSecondary}
      />
      <ScreenHeader title='Team' showBack onBack={() => navigation.goBack()} />

      <FlatList
        data={members}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.textPrimary}
            colors={[theme.colors.textPrimary]}
          />
        }
        ListHeaderComponent={
          <Text style={styles.orgSubtitle}>
            {activeOrg.name} · {members.length} member
            {members.length === 1 ? '' : 's'}
            {pending.length > 0
              ? ` · ${pending.length} pending invite${pending.length === 1 ? '' : 's'}`
              : ''}
          </Text>
        }
        ListEmptyComponent={
          <EmptyState
            icon='people-outline'
            title='No members yet'
            subtitle='Invite your first teammate.'
          />
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.avatar}>
              <Ionicons
                name='person'
                size={22}
                color={theme.colors.textSecondary}
              />
            </View>
            <View style={styles.info}>
              <Text style={styles.name} numberOfLines={1}>
                {displayName(item)}
              </Text>
              <Text style={styles.role}>{item.org_role.replace('_', ' ')}</Text>
              {item.profile?.email ? (
                <Text style={styles.email} numberOfLines={1}>
                  {item.profile.email}
                </Text>
              ) : null}
            </View>
            {canManage && item.org_role !== 'owner' && (
              <TouchableOpacity
                onPress={() => remove(item)}
                accessibilityLabel='Remove teammate'
                style={styles.removeBtn}
              >
                <Ionicons
                  name='trash-outline'
                  size={18}
                  color={theme.colors.error}
                />
              </TouchableOpacity>
            )}
          </View>
        )}
        ListFooterComponent={
          pending.length > 0 ? (
            <View style={{ marginTop: 16 }}>
              <Text style={styles.sectionHeader}>Pending invitations</Text>
              {pending.map((p) => (
                <View key={p.id} style={styles.card}>
                  <View style={styles.avatar}>
                    <Ionicons
                      name='mail-outline'
                      size={20}
                      color={theme.colors.textSecondary}
                    />
                  </View>
                  <View style={styles.info}>
                    <Text style={styles.name} numberOfLines={1}>
                      {p.invited_email}
                    </Text>
                    <Text style={styles.role}>
                      {p.org_role.replace('_', ' ')}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null
        }
      />

      {canManage && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowInvite(true)}
          accessibilityLabel='Invite team member'
        >
          <Ionicons
            name='person-add'
            size={24}
            color={theme.colors.textInverse}
          />
        </TouchableOpacity>
      )}

      <InviteTeamMemberSheet
        orgId={activeOrg.id}
        actorRole={activeOrg.myRole}
        visible={showInvite}
        onClose={() => setShowInvite(false)}
        onInvited={() => loadMembers(activeOrg.id)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.backgroundSecondary },
  list: { padding: 16, paddingBottom: 80 },
  orgSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 12,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.textPrimary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: theme.colors.textPrimary },
  role: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  email: { fontSize: 12, color: theme.colors.textTertiary, marginTop: 2 },
  removeBtn: { padding: 6 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.textPrimary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },
});
