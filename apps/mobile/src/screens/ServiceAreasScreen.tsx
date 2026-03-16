import React from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Switch, StatusBar, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../navigation/types';
import type { ServiceArea } from '../services/ServiceAreasService';
import { DeleteConfirmationModal } from '../components/service-areas/DeleteConfirmationModal';
import { CreateServiceAreaModal } from '../components/service-areas/CreateServiceAreaModal';
import { useServiceAreas } from '../hooks/useServiceAreas';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { theme } from '../theme';

const HIT = { top: 8, bottom: 8, left: 8, right: 8 };

interface Props {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'ServiceAreas'>;
}

export const ServiceAreasScreen: React.FC<Props> = ({ navigation }) => {
  const {
    serviceAreas, loading, refreshing, selectedArea,
    deleteModalVisible, setDeleteModalVisible,
    createModalVisible, setCreateModalVisible,
    handleRefresh, handleCreateServiceArea,
    handleToggleActive, handleDeletePress, handleDeleteConfirm,
  } = useServiceAreas();

  if (loading) return <LoadingSpinner message="Loading service areas..." />;

  const activeCount = serviceAreas.filter((a) => a.is_active).length;
  const avgRadius = serviceAreas.length > 0
    ? Math.round(serviceAreas.reduce((s, a) => s + (a.radius_km ?? 0), 0) / serviceAreas.length)
    : 0;

  const locationLabel = (area: ServiceArea): string => {
    if (area.cities?.length) return area.cities[0];
    if (area.center_latitude != null && area.center_longitude != null)
      return `${area.center_latitude.toFixed(2)}, ${area.center_longitude.toFixed(2)}`;
    return 'No location';
  };

  const DetailRow = ({ icon, text }: { icon: string; text: string }) => (
    <View style={s.detailRow}>
      <Ionicons name={icon as never} size={14} color={theme.colors.textSecondary} />
      <Text style={s.detailText} numberOfLines={1}>{text}</Text>
    </View>
  );

  const renderCard = ({ item }: { item: ServiceArea }) => {
    const active = item.is_active;
    const hasTravel = item.base_travel_charge > 0 || item.per_km_rate > 0;
    return (
      <View style={s.card}>
        <View style={[s.accent, { backgroundColor: active ? theme.colors.primary : theme.colors.textTertiary }]} />
        <View style={s.cardBody}>
          <View style={s.cardHead}>
            <Text style={s.areaName} numberOfLines={1}>{item.area_name}</Text>
            <View style={[s.badge, active ? s.badgeOn : s.badgeOff]}>
              <Text style={[s.badgeTxt, { color: active ? '#059669' : '#9CA3AF' }]}>
                {active ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
          <DetailRow icon="resize-outline" text={`${item.radius_km ?? 0} km radius`} />
          <DetailRow icon="location-outline" text={locationLabel(item)} />
          {hasTravel && (
            <DetailRow icon="car-outline" text={`\u00A3${item.base_travel_charge} base + \u00A3${item.per_km_rate}/km`} />
          )}
          <View style={s.actions}>
            <Switch
              value={active}
              onValueChange={() => handleToggleActive(item)}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor="#FFF"
            />
            <TouchableOpacity onPress={() => handleDeletePress(item)} style={s.delBtn} hitSlop={HIT}>
              <Ionicons name="trash-outline" size={18} color={theme.colors.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={s.empty}>
      <Ionicons name="location-outline" size={48} color={theme.colors.textTertiary} />
      <Text style={s.emptyTitle}>Set your service areas</Text>
      <Text style={s.emptyDesc}>
        Define where you work so homeowners in those areas can find you. You'll get notified about nearby jobs.
      </Text>
      <TouchableOpacity style={s.emptyBtn} onPress={() => setCreateModalVisible(true)}>
        <Text style={s.emptyBtnTxt}>Add Service Area</Text>
      </TouchableOpacity>
    </View>
  );

  const renderHeader = () => {
    if (!serviceAreas.length) return null;
    return (
      <Text style={s.summary}>
        {serviceAreas.length} area{serviceAreas.length !== 1 ? 's' : ''}
        {' \u00B7 '}{activeCount} active{' \u00B7 '}{avgRadius} km avg radius
      </Text>
    );
  };

  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.backgroundSecondary} />
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn} hitSlop={HIT}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.title}>Service Areas</Text>
        <TouchableOpacity onPress={() => setCreateModalVisible(true)} style={s.iconBtn} hitSlop={HIT}>
          <Ionicons name="add" size={26} color={theme.colors.primary} />
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
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh}
            tintColor={theme.colors.textPrimary} colors={[theme.colors.textPrimary]} />
        }
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={s.sep} />}
      />

      <DeleteConfirmationModal
        visible={deleteModalVisible} selectedArea={selectedArea}
        onClose={() => setDeleteModalVisible(false)} onConfirm={handleDeleteConfirm}
      />
      <CreateServiceAreaModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onCreated={() => setCreateModalVisible(false)}
        onCreate={handleCreateServiceArea}
      />
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.backgroundSecondary },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  iconBtn: { padding: 4 },
  title: { fontSize: 18, fontWeight: '600', color: theme.colors.textPrimary },
  summary: {
    fontSize: 13, color: theme.colors.textSecondary, fontWeight: '500',
    paddingHorizontal: 16, paddingBottom: 12,
  },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  emptyList: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 32 },
  sep: { height: 12 },
  // Card
  card: {
    flexDirection: 'row', backgroundColor: theme.colors.surface,
    borderRadius: 12, overflow: 'hidden', ...theme.shadows.base,
  },
  accent: { width: 4 },
  cardBody: { flex: 1, padding: 16 },
  cardHead: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 10,
  },
  areaName: {
    fontSize: 16, fontWeight: '600', color: theme.colors.textPrimary,
    flex: 1, marginRight: 8,
  },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  badgeOn: { backgroundColor: '#D1FAE5' },
  badgeOff: { backgroundColor: '#F3F4F6' },
  badgeTxt: { fontSize: 11, fontWeight: '600' },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  detailText: { fontSize: 13, color: theme.colors.textSecondary, flex: 1 },
  actions: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 10, paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border,
  },
  delBtn: { padding: 6 },
  // Empty
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: {
    fontSize: 18, fontWeight: '600', color: theme.colors.textPrimary,
    marginTop: 16, marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14, color: theme.colors.textSecondary,
    textAlign: 'center', lineHeight: 20, marginBottom: 24,
  },
  emptyBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24, paddingVertical: 14, borderRadius: 28,
  },
  emptyBtnTxt: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});

export default ServiceAreasScreen;
