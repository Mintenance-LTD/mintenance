/**
 * ServiceAreasScreen — Mint Editorial redesign per
 * redesign-v2 contractor business deck screen 12 "Service Areas".
 *
 * Top half is a visual model of the coverage:
 *   - Serif "Service Areas" headline with "X mi radius around <city>"
 *     sub computed from the primary area.
 *   - `RadiusRingsCard` — Standard / Extended pill chips above a
 *     concentric-rings SVG (representational, not a real map).
 *   - `TravelSurchargeCard` — shows £/mi surcharge applied beyond the
 *     standard radius (display-only; editing stays in
 *     `CreateServiceAreaModal`).
 *
 * Bottom half lists the actual areas backed by `useServiceAreas`. The
 * existing handlers (toggle active, delete, create modal) are
 * unchanged — only the visual layer is redrawn.
 */
import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Switch,
  StatusBar,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../navigation/types';
import type { ServiceArea } from '../services/ServiceAreasService';
import { DeleteConfirmationModal } from '../components/service-areas/DeleteConfirmationModal';
import { CreateServiceAreaModal } from '../components/service-areas/CreateServiceAreaModal';
import { RadiusRingsCard } from '../components/service-areas/RadiusRingsCard';
import { RadiusStepper } from '../components/service-areas/RadiusStepper';
import { TravelSurchargeCard } from '../components/service-areas/TravelSurchargeCard';
import { useServiceAreas } from '../hooks/useServiceAreas';
import { useRadiusDraft } from '../hooks/useRadiusDraft';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { KM_PER_MILE } from '@mintenance/shared';
import { kmToWholeMiles } from '../components/service-areas/radiusModel';
import { me } from '../design-system/mint-editorial';
import { styles as s } from './service-areas/styles';

const HIT = { top: 8, bottom: 8, left: 8, right: 8 };

// 2026-07-20: conversion moved to @mintenance/shared so Service Areas,
// contractor Discover and live travel tracking all convert identically.
// 2026-07-22: the whole-mile wrapper now lives in radiusModel alongside
// the editor's clamping, so the display and the editor round alike.

const fmtGBP = (n: number): string =>
  `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
    handleUpdateRadii,
    handleDeletePress,
    handleDeleteConfirm,
  } = useServiceAreas();

  // Derive headline numbers from the first active area (or first area).
  // Computed before the loading return so the draft hook's order is
  // stable across renders.
  const primary =
    serviceAreas.find((a) => a.is_active && a.is_primary_area) ??
    serviceAreas.find((a) => a.is_active) ??
    serviceAreas[0];

  const radius = useRadiusDraft({ primary, onSave: handleUpdateRadii });

  const profileAddress = user
    ? {
        address: user.address,
        city: user.city,
        postcode: user.postcode,
        latitude: user.latitude,
        longitude: user.longitude,
      }
    : undefined;

  if (loading) return <LoadingSpinner message='Loading service areas…' />;

  const boroughs = collectBoroughs(serviceAreas);
  const primaryCity = primary?.cities?.[0] ?? user?.city ?? 'your area';
  // Read the live draft, not the saved row, so the headline and the
  // rings track the stepper before Save is pressed.
  const primaryRadiusMiles = radius.standardMiles;
  const extendedRadiusMiles = primary ? radius.extendedMiles : 0;
  const surchargeRate = primary?.per_km_rate
    ? primary.per_km_rate * KM_PER_MILE
    : 0;

  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle='dark-content' backgroundColor={me.bg} />

      <View style={s.topNav}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={s.backBtn}
          hitSlop={HIT}
          accessibilityRole='button'
          accessibilityLabel='Go back'
        >
          <Ionicons name='arrow-back' size={20} color={me.ink} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setCreateModalVisible(true)}
          style={s.addBtn}
          hitSlop={HIT}
          accessibilityRole='button'
          accessibilityLabel='Add service area'
        >
          <Ionicons name='add' size={22} color={me.onBrand} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={serviceAreas}
        keyExtractor={(i) => i.id}
        ListHeaderComponent={
          <View>
            <View style={s.screenHeader}>
              <Text style={s.eyebrow}>Service areas</Text>
              <Text style={s.headline}>Service Areas</Text>
              <Text style={s.sub}>
                {primary
                  ? `${primaryRadiusMiles} mi radius around ${primaryCity}`
                  : 'Define where you take work — and how far you travel.'}
              </Text>
            </View>

            {primary ? (
              <View style={{ paddingHorizontal: 20 }}>
                <RadiusRingsCard
                  standardMiles={primaryRadiusMiles}
                  extendedMiles={extendedRadiusMiles}
                  selectedMode={radius.mode}
                  onSelectMode={radius.setMode}
                />
                <RadiusStepper
                  mode={radius.mode}
                  miles={radius.editingMiles}
                  dirty={radius.dirty}
                  saving={radius.saving}
                  onStep={radius.step}
                  onSave={radius.save}
                />
                {surchargeRate > 0 ? (
                  <TravelSurchargeCard
                    thresholdMiles={primaryRadiusMiles}
                    ratePerMile={surchargeRate}
                    formatCurrency={fmtGBP}
                  />
                ) : null}
                {/* Only render when there are boroughs to show, and count
                    exactly those (see collectBoroughs). Radius areas carry no
                    `cities`, so this section stays hidden for them rather
                    than claiming a count above an empty row — adding a zone
                    is still available from the header's + button. */}
                {boroughs.length > 0 ? (
                  <>
                    <Text style={s.sectionEyebrow}>
                      Boroughs you serve · {boroughs.length}
                    </Text>
                    <BoroughChipRow
                      areas={serviceAreas}
                      onAdd={() => setCreateModalVisible(true)}
                    />
                  </>
                ) : null}
                <Text style={s.sectionEyebrow}>Coverage zones</Text>
              </View>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <AreaCard
            area={item}
            onToggle={() => handleToggleActive(item)}
            onDelete={() => handleDeletePress(item)}
          />
        )}
        ListEmptyComponent={
          <EmptyState onAdd={() => setCreateModalVisible(true)} />
        }
        contentContainerStyle={serviceAreas.length === 0 ? s.emptyList : s.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={me.brand}
            colors={[me.brand]}
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

export interface BoroughChip {
  name: string;
  surcharge: number;
  key: string;
}

/**
 * De-duplicated boroughs across all ACTIVE areas.
 *
 * 2026-07-20: exported so the section header counts exactly what the row
 * renders. The header previously read `serviceAreas.length` — the number of
 * *areas* — while the chips come from each area's `cities[]`, which is only
 * populated for `area_type: 'cities'`. A radius area (the default) never
 * fills it, so the screen showed "Boroughs you serve · 1" above an empty row.
 */
export function collectBoroughs(areas: ServiceArea[]): BoroughChip[] {
  const items: BoroughChip[] = [];
  areas.forEach((a) => {
    if (!a.is_active) return;
    const cities = a.cities || [];
    cities.forEach((c) => {
      if (items.find((x) => x.name === c)) return;
      items.push({
        name: c,
        // The "+ £X" surcharge tag is an honest signal that this borough
        // costs more to reach.
        surcharge: a.base_travel_charge ?? 0,
        key: `${a.id}-${c}`,
      });
    });
  });
  return items;
}

const BoroughChipRow: React.FC<{
  areas: ServiceArea[];
  onAdd: () => void;
}> = ({ areas, onAdd }) => {
  // Surface up to 8 boroughs across all active areas.
  const items = collectBoroughs(areas);
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.chipsRow}
    >
      {items.slice(0, 8).map((it) => {
        const surcharged = it.surcharge > 0;
        return (
          <View
            key={it.key}
            style={[s.chip, surcharged ? s.chipSurcharge : s.chipCovered]}
          >
            <Text
              style={[
                s.chipText,
                surcharged ? s.chipTextSurcharge : s.chipTextCovered,
              ]}
            >
              {it.name}
              {surcharged ? ` +£${Math.round(it.surcharge)}` : ''}
            </Text>
          </View>
        );
      })}
      <TouchableOpacity
        style={[s.chip, s.chipAdd]}
        onPress={onAdd}
        accessibilityRole='button'
        accessibilityLabel='Add borough'
      >
        <Ionicons name='add' size={12} color={me.ink2} />
        <Text style={[s.chipText, { color: me.ink2 }]}>Add</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const AreaCard: React.FC<{
  area: ServiceArea;
  onToggle: () => void;
  onDelete: () => void;
}> = ({ area, onToggle, onDelete }) => {
  const active = area.is_active;
  return (
    <View
      style={[
        s.card,
        {
          borderLeftColor: active ? me.brand : me.line,
          borderLeftWidth: 3,
        },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={s.areaName} numberOfLines={1}>
          {area.area_name}
        </Text>
        <Text style={s.areaMeta}>
          {kmToWholeMiles(area.radius_km)} mi radius
          {area.cities?.length ? ` · ${area.cities[0]}` : ''}
        </Text>
      </View>
      <View style={s.cardActions}>
        <Switch
          value={active}
          onValueChange={onToggle}
          trackColor={{ false: me.line, true: me.brand }}
          thumbColor={me.onBrand}
        />
        <TouchableOpacity
          onPress={onDelete}
          hitSlop={HIT}
          accessibilityRole='button'
          accessibilityLabel={`Delete ${area.area_name}`}
        >
          <Ionicons name='trash-outline' size={18} color={me.ink3} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const EmptyState: React.FC<{ onAdd: () => void }> = ({ onAdd }) => (
  <View style={s.empty}>
    <View style={s.emptyIcon}>
      <Ionicons name='location-outline' size={28} color={me.brand} />
    </View>
    <Text style={s.emptyTitle}>Set your service area</Text>
    <Text style={s.emptyDesc}>
      Tell us how far you’ll travel. Mint only matches you with jobs inside your
      radius (with optional surcharge beyond).
    </Text>
    <TouchableOpacity style={s.emptyBtn} onPress={onAdd}>
      <Text style={s.emptyBtnTxt}>Define service radius →</Text>
    </TouchableOpacity>
  </View>
);

export default ServiceAreasScreen;
