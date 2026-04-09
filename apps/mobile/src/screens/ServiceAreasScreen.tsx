import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Switch,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../navigation/types';
import type { ServiceArea } from '../services/ServiceAreasService';
import { DeleteConfirmationModal } from '../components/service-areas/DeleteConfirmationModal';
import { CreateServiceAreaModal } from '../components/service-areas/CreateServiceAreaModal';
import { useServiceAreas } from '../hooks/useServiceAreas';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { theme } from '../theme';

const HIT = { top: 8, bottom: 8, left: 8, right: 8 };

interface Props {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'ServiceAreas'>;
}

export const ServiceAreasScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const {
    serviceAreas,
    loading,
    refreshing,
    selectedArea,
    deleteModalVisible,
    setDeleteModalVisible,
    createModalVisible,
    setCreateModalVisible,
    handleRefresh,
    handleCreateServiceArea,
    handleToggleActive,
    handleDeletePress,
    handleDeleteConfirm,
  } = useServiceAreas();

  // Derive profile address from user object for pre-filling the create modal
  const profileAddress = user
    ? {
        address: user.address,
        city: user.city,
        postcode: user.postcode,
        latitude: user.latitude,
        longitude: user.longitude,
      }
    : undefined;

  if (loading) return <LoadingSpinner message='Loading service areas...' />;

  const activeCount = serviceAreas.filter((a) => a.is_active).length;
  const avgRadius =
    serviceAreas.length > 0
      ? Math.round(
          serviceAreas.reduce((s, a) => s + (a.radius_km ?? 0), 0) /
            serviceAreas.length
        )
      : 0;

  const locationLabel = (area: ServiceArea): string => {
    if (area.cities?.length) return area.cities[0] ?? 'No location';
    if (area.center_latitude != null && area.center_longitude != null)
      return `${area.center_latitude.toFixed(2)}, ${area.center_longitude.toFixed(2)}`;
    return 'No location';
  };

  const DetailRow = ({ icon, text }: { icon: string; text: string }) => (
    <View style={s.detailRow}>
      <Ionicons
        name={icon as never}
        size={14}
        color={theme.colors.textSecondary}
      />
      <Text style={s.detailText} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );

  const renderCard = ({ item }: { item: ServiceArea }) => {
    const active = item.is_active;
    const hasTravel = item.base_travel_charge > 0 || item.per_km_rate > 0;
    return (
      <View style={s.card}>
        <View
          style={[
            s.accent,
            {
              backgroundColor: active
                ? theme.colors.primary
                : theme.colors.textTertiary,
            },
          ]}
        />
        <View style={s.cardBody}>
          <View style={s.cardHead}>
            <Text style={s.areaName} numberOfLines={1}>
              {item.area_name}
            </Text>
            <View style={[s.badge, active ? s.badgeOn : s.badgeOff]}>
              <Text
                style={[s.badgeTxt, { color: active ? '#059669' : '#9CA3AF' }]}
              >
                {active ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
          <DetailRow
            icon='resize-outline'
            text={`${item.radius_km ?? 0} km radius`}
          />
          <DetailRow icon='location-outline' text={locationLabel(item)} />
          {hasTravel && (
            <DetailRow
              icon='car-outline'
              text={`\u00A3${item.base_travel_charge} base + \u00A3${item.per_km_rate}/km`}
            />
          )}
          <View style={s.actions}>
            <Switch
              value={active}
              onValueChange={() => handleToggleActive(item)}
              trackColor={{
                false: theme.colors.border,
                true: theme.colors.primary,
              }}
              thumbColor='#FFF'
            />
            <TouchableOpacity
              onPress={() => handleDeletePress(item)}
              style={s.delBtn}
              hitSlop={HIT}
            >
              <Ionicons
                name='trash-outline'
                size={18}
                color={theme.colors.textTertiary}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={s.empty}>
      {/* Hero icon */}
      <View style={s.emptyIconCircle}>
        <Ionicons name='location' size={36} color={theme.colors.primary} />
      </View>

      <Text style={s.emptyLabel}>STRATEGIC COVERAGE</Text>
      <Text style={s.emptyTitle}>Set your service areas</Text>
      <Text style={s.emptyDesc}>
        Define the precise radius where you provide maintenance expertise. We'll
        only match you with properties within your bounds.
      </Text>

      {/* CTA */}
      <TouchableOpacity
        style={s.emptyBtn}
        onPress={() => setCreateModalVisible(true)}
        activeOpacity={0.8}
      >
        <Ionicons
          name='navigate-outline'
          size={18}
          color='#FFFFFF'
          style={{ marginRight: 8 }}
        />
        <Text style={s.emptyBtnTxt}>Define Service Radius</Text>
      </TouchableOpacity>
      <Text style={s.emptySubtitle}>
        You can add multiple zones or city-specific hubs
      </Text>

      {/* Bento grid highlights */}
      <View style={s.bentoGrid}>
        <View style={s.bentoCard}>
          <Ionicons
            name='compass-outline'
            size={22}
            color={theme.colors.primary}
          />
          <Text style={s.bentoTitle}>Precise Targeting</Text>
          <Text style={s.bentoDesc}>
            Minimize travel time with zip-code level accuracy.
          </Text>
        </View>
        <View style={s.bentoCard}>
          <Ionicons
            name='flash-outline'
            size={22}
            color={theme.colors.primary}
          />
          <Text style={s.bentoTitle}>Smart Routing</Text>
          <Text style={s.bentoDesc}>
            Jobs are grouped to optimize your daily workflow.
          </Text>
        </View>
      </View>
    </View>
  );

  const renderHeader = () => {
    if (!serviceAreas.length) return null;
    return (
      <Text style={s.summary}>
        {serviceAreas.length} area{serviceAreas.length !== 1 ? 's' : ''}
        {' \u00B7 '}
        {activeCount} active{' \u00B7 '}
        {avgRadius} km avg radius
      </Text>
    );
  };

  return (
    <SafeAreaView style={s.root}>
      <StatusBar
        barStyle='dark-content'
        backgroundColor={theme.colors.backgroundSecondary}
      />
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={s.iconBtn}
          hitSlop={HIT}
        >
          <Ionicons
            name='arrow-back'
            size={24}
            color={theme.colors.textPrimary}
          />
        </TouchableOpacity>
        <Text style={s.title}>Service Areas</Text>
        <TouchableOpacity
          onPress={() => setCreateModalVisible(true)}
          style={s.iconBtn}
          hitSlop={HIT}
        >
          <Ionicons name='add' size={26} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={serviceAreas}
        keyExtractor={(i) => i.id}
        renderItem={renderCard}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={serviceAreas.length === 0 ? s.emptyList : s.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.textPrimary}
            colors={[theme.colors.textPrimary]}
          />
        }
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={s.sep} />}
      />

      <DeleteConfirmationModal
        visible={deleteModalVisible}
        selectedArea={selectedArea}
        onClose={() => setDeleteModalVisible(false)}
        onConfirm={handleDeleteConfirm}
      />
      <CreateServiceAreaModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onCreated={() => setCreateModalVisible(false)}
        onCreate={handleCreateServiceArea}
        defaultAddress={profileAddress}
      />
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.backgroundSecondary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iconBtn: { padding: 4 },
  title: { fontSize: 20, fontWeight: '800', color: theme.colors.textPrimary },
  summary: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '500',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  emptyList: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 32 },
  sep: { height: 12 },
  // Card
  card: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  accent: { width: 4 },
  cardBody: { flex: 1, padding: 16 },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  areaName: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  badgeOn: { backgroundColor: '#D1FAE5' },
  badgeOff: { backgroundColor: '#F3F4F6' },
  badgeTxt: { fontSize: 11, fontWeight: '600' },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  detailText: { fontSize: 13, color: theme.colors.textSecondary, flex: 1 },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  delBtn: { padding: 6 },
  // Empty
  empty: { alignItems: 'center', paddingVertical: 32 },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.primary,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  emptyDesc: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
    maxWidth: 280,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.textPrimary,
    alignSelf: 'stretch',
    paddingVertical: 18,
    borderRadius: 20,
  },
  emptyBtnTxt: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  emptySubtitle: {
    fontSize: 13,
    color: theme.colors.textTertiary,
    marginTop: 16,
    textAlign: 'center',
  },
  // Bento highlights
  bentoGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 28,
    alignSelf: 'stretch',
  },
  bentoCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  bentoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginTop: 10,
    marginBottom: 4,
  },
  bentoDesc: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 17,
  },
});

export default ServiceAreasScreen;
