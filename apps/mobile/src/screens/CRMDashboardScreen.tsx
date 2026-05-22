import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Linking,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type {
  ProfileStackParamList,
  RootTabParamList,
} from '../navigation/types';
import { logger } from '../utils/logger';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import SearchBar from '../components/SearchBar';
import { mobileApiClient } from '../utils/mobileApiClient';
import { goToMessagingThread } from '../navigation/hooks';
import { me } from '../design-system/mint-editorial';
import { styles as s } from './CRMDashboardStyles';
import {
  FILTERS,
  STATUS_DOT,
  type DerivedClient,
  type FilterKey,
} from './CRMDashboardData';

interface CRMDashboardScreenProps {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'CRMDashboard'>;
}

export const CRMDashboardScreen: React.FC<CRMDashboardScreenProps> = ({
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const tabNav = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const [clients, setClients] = useState<DerivedClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      setError(null);
      // Use API endpoint (runs server-side with service_role, bypasses RLS)
      const res = await mobileApiClient.get<{ clients: DerivedClient[] }>(
        '/api/contractor/clients'
      );
      setClients(res.clients || []);
    } catch (err) {
      logger.error('Error loading CRM data', err);
      setError('Failed to load client data. Pull down to retry.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const filtered = clients.filter((c) => {
    if (filter !== 'all' && c.relationship_status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      const n = `${c.first_name} ${c.last_name}`.toLowerCase();
      if (!n.includes(q) && !c.email.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const total = clients.length;
  const active = clients.filter(
    (c) => c.relationship_status === 'active'
  ).length;
  const totalRev = clients.reduce((s, c) => s + c.total_revenue, 0);
  const avgVal = total > 0 ? Math.round(totalRev / total) : 0;

  const handleCall = async (c: DerivedClient) => {
    if (!c.phone) return;
    const url = `tel:${c.phone}`;
    if (await Linking.canOpenURL(url)) Linking.openURL(url);
    else Alert.alert('Error', 'Cannot make phone call');
  };
  const handleMessage = (c: DerivedClient) => {
    // 2026-04-30 audit P1: typed cross-stack helper replaces `as never`.
    goToMessagingThread(tabNav, {
      conversationId: c.id,
      recipientId: c.id,
      recipientName: `${c.first_name} ${c.last_name}`.trim(),
    });
  };
  const handleEmail = async (c: DerivedClient) => {
    const url = `mailto:${c.email}`;
    if (await Linking.canOpenURL(url)) Linking.openURL(url);
    else Alert.alert('Error', 'Cannot open email client');
  };

  const renderCard = ({ item }: { item: DerivedClient }) => {
    const name = `${item.first_name} ${item.last_name}`.trim();
    const dot = STATUS_DOT[item.relationship_status] || '#B0B0B0';
    return (
      <TouchableOpacity
        style={s.card}
        activeOpacity={0.7}
        onPress={() =>
          (navigation.navigate as (...a: unknown[]) => void)('ClientDetail', {
            client: item,
          })
        }
        accessibilityRole='button'
        accessibilityLabel={`View ${name}`}
      >
        <View style={s.cardRow}>
          {item.profile_image_url ? (
            <Image source={{ uri: item.profile_image_url }} style={s.avatar} />
          ) : (
            <View style={s.avatarFb}>
              <Text style={s.initials}>
                {`${item.first_name.charAt(0)}${item.last_name.charAt(0)}`.toUpperCase()}
              </Text>
            </View>
          )}
          <View style={s.info}>
            <View style={s.nameRow}>
              <Text style={s.name} numberOfLines={1}>
                {name}
              </Text>
              <View style={[s.dot, { backgroundColor: dot }]} />
            </View>
            <Text style={s.sub} numberOfLines={1}>
              {item.last_job_title}
            </Text>
          </View>
          <View style={s.badge}>
            <Text style={s.badgeTxt}>
              {'\u00A3'}
              {item.total_revenue.toLocaleString()}
            </Text>
          </View>
        </View>
        <View style={s.actions}>
          {item.phone ? (
            <TouchableOpacity
              style={s.actBtn}
              onPress={() => handleCall(item)}
              accessibilityLabel='Call'
            >
              <Ionicons name='call-outline' size={18} color={me.ink2} />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={s.actBtn}
            onPress={() => handleMessage(item)}
            accessibilityLabel='Message'
          >
            <Ionicons name='chatbubble-outline' size={18} color={me.ink2} />
          </TouchableOpacity>
          {item.email ? (
            <TouchableOpacity
              style={s.actBtn}
              onPress={() => handleEmail(item)}
              accessibilityLabel='Email'
            >
              <Ionicons name='mail-outline' size={18} color={me.ink2} />
            </TouchableOpacity>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  const emptyState = () => (
    <View style={s.empty}>
      <View style={s.emptyIco}>
        <Ionicons name='people-outline' size={48} color={me.ink3} />
      </View>
      <Text style={s.emptyH}>No clients yet</Text>
      <Text style={s.emptyP}>
        Complete your first job to start building your client list
      </Text>
      <TouchableOpacity
        style={s.cta}
        onPress={() => tabNav.navigate('JobsTab', undefined)}
        accessibilityRole='button'
      >
        <Text style={s.ctaTxt}>Find Jobs</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) return <LoadingSpinner message='Loading clients...' />;

  return (
    <View style={s.root}>
      {/* Editorial header \u2014 2026-05-22 Mint Editorial v2:
          replaces the previous centered phone-app navbar
          ("My Clients" middle, back-arrow left, dummy spacer
          right) with the spec's eyebrow + serif headline pattern
          used across BusinessHub / Finance / Invoices / Calendar
          / ServiceAreas. */}
      <View style={[s.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={s.back}
          onPress={() => navigation.goBack()}
          accessibilityRole='button'
          accessibilityLabel='Go back'
        >
          <Ionicons name='arrow-back' size={22} color={me.ink} />
        </TouchableOpacity>
      </View>
      <View style={s.screenHeader}>
        <Text style={s.eyebrow}>Clients</Text>
        <Text style={s.headline} accessibilityRole='header'>
          My Clients
        </Text>
        {total > 0 ? (
          <Text style={s.headerSub}>
            {total} client{total !== 1 ? 's' : ''} \u00B7 {active} active \u00B7
            \u00A3
            {avgVal.toLocaleString()} avg value
          </Text>
        ) : (
          <Text style={s.headerSub}>
            Build relationships with the homeowners you've worked with.
          </Text>
        )}
      </View>

      <View style={s.searchRow}>
        <View style={{ flex: 1 }}>
          <SearchBar
            placeholder='Search clients...'
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <TouchableOpacity
          style={[s.fltBtn, showFilters && s.fltBtnOn]}
          onPress={() => setShowFilters((v) => !v)}
          accessibilityRole='button'
          accessibilityLabel='Toggle filters'
        >
          <Ionicons
            name='options-outline'
            size={20}
            color={showFilters ? me.onBrand : me.ink2}
          />
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View style={s.fltRow}>
          {FILTERS.map((o) => (
            <TouchableOpacity
              key={o.key}
              style={[s.pill, filter === o.key && s.pillOn]}
              onPress={() => setFilter(o.key)}
              accessibilityRole='button'
              accessibilityState={{ selected: filter === o.key }}
            >
              <Text style={[s.pillTxt, filter === o.key && s.pillTxtOn]}>
                {o.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {error && (
        <View style={s.err}>
          <Text style={s.errTxt}>{error}</Text>
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        renderItem={renderCard}
        ListEmptyComponent={
          search || filter !== 'all' ? (
            <View style={s.empty}>
              <Text style={s.emptyH}>No matches</Text>
              <Text style={s.emptyP}>Try adjusting your search or filters</Text>
            </View>
          ) : (
            emptyState()
          )
        }
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={me.ink}
            colors={[me.ink]}
          />
        }
      />
    </View>
  );
};
