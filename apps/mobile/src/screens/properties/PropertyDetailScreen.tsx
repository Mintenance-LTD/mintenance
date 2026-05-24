import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { LoadingSpinner, ErrorView } from '../../components/shared';
import { useAuth } from '../../contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// 2026-05-23 audit: direct `supabase` access removed — both the
// property fetch (audit-11) and the property-jobs fetch (audit-13)
// now route through the server API for the proper access contract.
import { mobileApiClient } from '../../utils/mobileApiClient';
import type { Property } from '@mintenance/types';
import type { ProfileStackParamList } from '../../navigation/types';
import { Badge } from '../../components/ui/Badge/Badge';
import { me } from '../../design-system/mint-editorial';
import { styles, CATEGORY_ICONS } from './PropertyDetailStyles';
import { PropertyHealthScore } from './components/PropertyHealthScore';
import { SpendingAnalytics } from './components/SpendingAnalytics';
import { RecurringMaintenance } from './components/RecurringMaintenance';
import { TenantContacts } from './components/TenantContacts';
import { PropertyContacts } from './components/PropertyContacts';
import { TeamAccess } from './components/TeamAccess';
import { ComplianceCertificates } from './components/ComplianceCertificates';
import { PropertyRoomsSection } from './components/PropertyRoomsSection';
import { PropertyAccessSection } from './components/PropertyAccessSection';

// 2026-05-23 audit: added 'access' tab. Mobile previously had no
// access-editing surface at all; the homeowner had to switch to web
// to set the lock-box code / access notes / utility locations.
type Tab = 'overview' | 'access' | 'maintenance' | 'manage';

// 2026-05-23 audit: shape the API response into the narrower shape
// PropertyHealthScore + SpendingAnalytics expect (both define their
// own `Job` interface with `budget: number` required). The shared
// `@mintenance/types` Job has `budget?: number` (optional), which
// won't satisfy those downstream consumers — so we keep a local
// shape here that matches the consumer contract exactly.
interface PropertyJobRow {
  id: string;
  status: string;
  budget: number;
  created_at: string;
  category?: string;
  title?: string;
}
interface Props {
  navigation: NativeStackNavigationProp<
    ProfileStackParamList,
    'PropertyDetail'
  >;
  route: RouteProp<ProfileStackParamList, 'PropertyDetail'>;
}

const TABS: {
  key: Tab;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: 'overview', label: 'Overview', icon: 'home-outline' },
  { key: 'access', label: 'Access', icon: 'key-outline' },
  { key: 'maintenance', label: 'Maintenance', icon: 'construct-outline' },
  { key: 'manage', label: 'Manage', icon: 'settings-outline' },
];

export const PropertyDetailScreen: React.FC<Props> = ({
  navigation,
  route,
}) => {
  const { propertyId } = route.params;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [isFavorite, setIsFavorite] = useState(false);

  const {
    data: property,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['property', propertyId],
    queryFn: async () => {
      // 2026-05-23 audit: previously read properties directly via
      // supabase. The properties RLS policy only grants
      // owner/admin/org_member SELECT — team members invited via the
      // /properties/[id]/team flow were getting an empty result here,
      // so shared property viewing didn't work even when the team
      // membership row existed. /api/properties/[id] is service-role
      // backed and checks owner/admin/org/team membership server-side,
      // which is the auth contract this screen actually needs.
      const res = await mobileApiClient.get<{ property: Property } | Property>(
        `/api/properties/${propertyId}`
      );
      const raw =
        (res as { property?: Property })?.property ?? (res as Property);
      if (!raw) throw new Error('Property not found');
      return raw as Property;
    },
    enabled: !!user && !!propertyId,
  });

  const { data: jobsData } = useQuery({
    queryKey: ['property-jobs', propertyId],
    queryFn: async () => {
      // 2026-05-23 audit: previously direct-queried supabase. Live
      // jobs RLS is broad (non-draft visibility) — any authenticated
      // user guessing a property_id could pull its full job history,
      // and team/tenant access wouldn't match the property surface.
      // /api/properties/[id]/jobs is service-role backed and gates on
      // the same owner/admin check the property route uses, so the
      // job history honours the same access contract as the property
      // detail itself.
      try {
        type ApiJobRow = {
          id: string;
          title: string;
          status: string;
          budget: number | string | null;
          category: string | null;
          created_at: string;
          completed_at: string | null;
        };
        const res = await mobileApiClient.get<
          { jobs?: ApiJobRow[] } | ApiJobRow[]
        >(`/api/properties/${propertyId}/jobs`);
        const rows = Array.isArray(res)
          ? res
          : ((res as { jobs?: ApiJobRow[] }).jobs ?? []);
        // Coerce into the shared Job shape so downstream consumers
        // (PropertyHealthScore, SpendingAnalytics) typecheck. budget
        // is NUMERIC from Postgres — arrives as a string via
        // supabase-js — coerce to number so sum/avg math works.
        return rows.map<PropertyJobRow>((r) => {
          const rawBudget = r.budget;
          // budget is NUMERIC from Postgres — string at the
          // supabase-js boundary. PropertyHealthScore /
          // SpendingAnalytics want `budget: number` required, so
          // default missing to 0 (downstream reducers already
          // tolerate 0 — see SpendingAnalytics `j.budget || 0`).
          const numericBudget =
            typeof rawBudget === 'number'
              ? rawBudget
              : rawBudget != null && Number.isFinite(Number(rawBudget))
                ? Number(rawBudget)
                : 0;
          return {
            id: r.id,
            title: r.title,
            status: r.status,
            budget: numericBudget,
            category: r.category ?? undefined,
            created_at: r.created_at,
          };
        });
      } catch {
        return [] as PropertyJobRow[];
      }
    },
    enabled: !!user && !!propertyId,
  });

  const propertyJobs = jobsData || [];
  const completedJobs = propertyJobs.filter((j) => j.status === 'completed');
  const activeJobs = propertyJobs.filter(
    (j) => j.status === 'in_progress' || j.status === 'assigned'
  );
  // 2026-05-22 audit C5: jobs.budget is Postgres NUMERIC, serialised
  // as a string by supabase-js. `sum + (j.budget || 0)` with a string
  // budget silently concatenates and the "Total Spent" tile renders
  // garbage like "0100.00150.00". Coerce defensively.
  const totalSpent = completedJobs.reduce((sum, j) => {
    const raw = j.budget ?? 0;
    const n = typeof raw === 'number' ? raw : Number(raw);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await mobileApiClient.delete(`/api/properties/${propertyId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      navigation.goBack();
    },
    onError: () => {
      Alert.alert(
        'Delete Failed',
        'We could not delete this property. Please try again or contact support.'
      );
    },
  });

  // 2026-05-23 audit-15 P2: previously this screen ran a generic
  // "are you sure" alert then immediately called DELETE — homeowners
  // had no idea what would be preserved (compliance certs, tenancy
  // records, jobs history) vs cascade-deleted (room photos). The
  // server already exposes `/api/properties/[id]/delete-preview`
  // (the web flow uses it) — wire mobile to the same endpoint so the
  // confirmation alert lists real counts.
  type DeletePreview = {
    preserved: Record<string, number>;
    cascaded: Record<string, number>;
    preservedTotal: number;
    cascadedTotal: number;
    retentionNotes?: {
      gas_safety_certificate_years?: number;
      eicr_years?: number;
      tenancy_records_years?: number;
    };
  };
  const PRESERVED_LABELS: Record<string, string> = {
    compliance_certificates: 'compliance certificate',
    property_tenants: 'tenant record',
    property_contacts: 'contact',
    anonymous_reports: 'tenant report',
    recurring_schedules: 'recurring schedule',
    jobs: 'job',
  };
  const CASCADED_LABELS: Record<string, string> = {
    property_room_photos: 'room photo',
  };
  const pluralize = (n: number, singular: string) =>
    `${n} ${singular}${n === 1 ? '' : 's'}`;

  const formatDeletePreview = (preview: DeletePreview): string => {
    const preservedLines = Object.entries(preview.preserved)
      .filter(([, n]) => (n ?? 0) > 0)
      .map(([k, n]) => `• ${pluralize(n, PRESERVED_LABELS[k] ?? k)} retained`);
    const cascadedLines = Object.entries(preview.cascaded)
      .filter(([, n]) => (n ?? 0) > 0)
      .map(
        ([k, n]) =>
          `• ${pluralize(n, CASCADED_LABELS[k] ?? k)} permanently deleted`
      );

    const lines: string[] = [];
    if (preservedLines.length > 0) {
      lines.push('What we keep (for legal / audit reasons):');
      lines.push(...preservedLines);
    }
    if (cascadedLines.length > 0) {
      if (lines.length > 0) lines.push('');
      lines.push('What goes away:');
      lines.push(...cascadedLines);
    }
    if (lines.length === 0) {
      lines.push('No linked records — safe to delete.');
    }
    return lines.join('\n');
  };

  const favoriteMutation = useMutation({
    mutationFn: async () => {
      if (isFavorite) {
        await mobileApiClient.delete(
          `/api/properties/favorites?property_id=${propertyId}`
        );
      } else {
        await mobileApiClient.post('/api/properties/favorites', {
          property_id: propertyId,
        });
      }
    },
    onSuccess: () => {
      setIsFavorite(!isFavorite);
      queryClient.invalidateQueries({ queryKey: ['properties'] });
    },
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleDelete = async () => {
    let previewBody: string;
    try {
      // Fetch the server's authoritative preview rather than guessing
      // counts client-side. Web uses the same endpoint. If preview
      // fails (network blip), fall back to the generic prompt rather
      // than blocking the user from deleting at all — the server still
      // enforces the auth gate on the DELETE call.
      const preview = await mobileApiClient.get<DeletePreview>(
        `/api/properties/${propertyId}/delete-preview`
      );
      previewBody = formatDeletePreview(preview);
    } catch {
      previewBody =
        'We could not load the impact summary. Continuing will permanently delete this property.';
    }

    Alert.alert(
      'Delete this property?',
      `${previewBody}\n\nThis cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(),
        },
      ]
    );
  };

  if (isLoading) return <LoadingSpinner message='Loading property...' />;
  if (error)
    return <ErrorView message='Failed to load property' onRetry={refetch} />;
  if (!property)
    return <ErrorView message='Property not found' onRetry={refetch} />;

  const formatType = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
  const renderOverviewTab = () => (
    <>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{completedJobs.length}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: '#3B82F6' }]}>
            {activeJobs.length}
          </Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: me.brand }]}>
            {'\u00A3'}
            {totalSpent >= 1000
              ? `${(totalSpent / 1000).toFixed(1)}k`
              : totalSpent}
          </Text>
          <Text style={styles.statLabel}>Spent</Text>
        </View>
      </View>

      <PropertyHealthScore jobs={propertyJobs} />

      <SpendingAnalytics jobs={propertyJobs} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>PROPERTY INFORMATION</Text>
        <View style={styles.specGrid}>
          <View style={styles.specTile}>
            <View style={[styles.specTileIcon, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name='business-outline' size={16} color='#3B82F6' />
            </View>
            <Text style={styles.specTileValue}>
              {formatType(property.property_type ?? 'N/A')}
            </Text>
            <Text style={styles.specTileLabel}>Type</Text>
          </View>
          <View style={styles.specTile}>
            <View style={[styles.specTileIcon, { backgroundColor: '#EDE9FE' }]}>
              <Ionicons name='bed-outline' size={16} color='#8B5CF6' />
            </View>
            <Text style={styles.specTileValue}>{property.bedrooms ?? '-'}</Text>
            <Text style={styles.specTileLabel}>Bedrooms</Text>
          </View>
          <View style={styles.specTile}>
            <View style={[styles.specTileIcon, { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name='water-outline' size={16} color='#10B981' />
            </View>
            <Text style={styles.specTileValue}>
              {property.bathrooms ?? '-'}
            </Text>
            <Text style={styles.specTileLabel}>Bathrooms</Text>
          </View>
          <View style={styles.specTile}>
            <View style={[styles.specTileIcon, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name='calendar-outline' size={16} color='#F59E0B' />
            </View>
            <Text style={styles.specTileValue}>
              {property.year_built ?? '-'}
            </Text>
            <Text style={styles.specTileLabel}>Year Built</Text>
          </View>
        </View>
        {property.square_footage != null && (
          <View style={styles.sizeRow}>
            <Ionicons name='resize-outline' size={16} color={me.ink2} />
            <Text style={styles.sizeText}>{property.square_footage} sq ft</Text>
          </View>
        )}
      </View>

      {property.notes && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>NOTES</Text>
          <Text style={styles.notesText}>{property.notes}</Text>
        </View>
      )}

      <PropertyRoomsSection
        propertyId={propertyId}
        editable={property.owner_id === user?.id}
      />

      <View style={styles.section}>
        <View style={styles.jobHistoryHeader}>
          <Text style={styles.sectionTitle}>JOB HISTORY</Text>
          {totalSpent > 0 && (
            <View style={styles.totalSpentBadge}>
              <Text style={styles.totalSpentText}>
                {'\u00A3'}
                {totalSpent.toLocaleString('en-GB')} spent
              </Text>
            </View>
          )}
        </View>
        {propertyJobs.length === 0 ? (
          <View style={styles.emptyJobsWrap}>
            <View style={styles.emptyJobsIcon}>
              <Ionicons name='briefcase-outline' size={20} color={me.ink3} />
            </View>
            <Text style={styles.emptyJobsText}>
              No jobs for this property yet.
            </Text>
          </View>
        ) : (
          propertyJobs.map((job) => {
            const cat =
              CATEGORY_ICONS[(job.category ?? '').toLowerCase()] ??
              CATEGORY_ICONS.general;
            return (
              <TouchableOpacity
                key={job.id}
                style={styles.jobCard}
                onPress={() =>
                  (navigation as ReturnType<typeof Object>).navigate(
                    'JobsTab',
                    {
                      screen: 'JobDetails',
                      params: { jobId: job.id },
                    }
                  )
                }
                accessibilityRole='button'
                accessibilityLabel={`View ${job.title}`}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.jobCatIcon,
                    { backgroundColor: cat?.bg ?? '#F5F5F5' },
                  ]}
                >
                  <Ionicons
                    name={cat?.icon ?? 'construct-outline'}
                    size={18}
                    color={cat?.color ?? '#616161'}
                  />
                </View>
                <View style={styles.jobRowInfo}>
                  <Text style={styles.jobRowTitle} numberOfLines={1}>
                    {job.title}
                  </Text>
                  <Text style={styles.jobRowDate}>
                    {new Date(job.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
                <View style={styles.jobRowRight}>
                  {job.budget ? (
                    <Text style={styles.jobRowBudget}>
                      {'\u00A3'}
                      {job.budget.toLocaleString()}
                    </Text>
                  ) : null}
                  <Badge
                    variant={
                      job.status === 'completed'
                        ? 'success'
                        : job.status === 'in_progress'
                          ? 'primary'
                          : 'warning'
                    }
                    size='sm'
                  >
                    {job.status === 'in_progress'
                      ? 'In Progress'
                      : (job.status ?? '').charAt(0).toUpperCase() +
                        (job.status ?? '').slice(1)}
                  </Badge>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </>
  );

  // 2026-05-23 audit: surface the homeowner-side Access editor.
  // Reads existing access fields off the property record (which
  // /api/properties/[id] now returns since the audit-11 fix routed
  // PropertyDetail through the API).
  const renderAccessTab = () => {
    const p = property as unknown as Record<string, unknown> | null;
    return (
      <PropertyAccessSection
        propertyId={propertyId}
        initial={{
          access_mode:
            (p?.access_mode as
              | 'key_safe'
              | 'smart_lock'
              | 'in_person'
              | null
              | undefined) ?? null,
          key_safe_code:
            (p?.key_safe_code as string | null | undefined) ?? null,
          access_notes: (p?.access_notes as string | null | undefined) ?? null,
          stopcock_location:
            (p?.stopcock_location as string | null | undefined) ?? null,
          gas_isolator_location:
            (p?.gas_isolator_location as string | null | undefined) ?? null,
          consumer_unit_location:
            (p?.consumer_unit_location as string | null | undefined) ?? null,
        }}
      />
    );
  };

  const renderMaintenanceTab = () => (
    <>
      <RecurringMaintenance propertyId={propertyId} />
      <ComplianceCertificates propertyId={propertyId} />
    </>
  );

  const renderManageTab = () => (
    <>
      {/* 2026-05-24 audit-30 P1: PropertyContacts surfaces the 4-role
          (tenant / keyholder / emergency / managing agent) collection
          that the web /landlord/contacts page writes to, so the
          mobile-managed property carries the same "who do I call
          when I arrive" list. TenantContacts remains for the
          tenant-invitation flow (account linkage). */}
      <PropertyContacts propertyId={propertyId} />
      <TenantContacts propertyId={propertyId} />
      <TeamAccess propertyId={propertyId} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ACTIONS</Text>
        <TouchableOpacity
          style={styles.actionRow}
          onPress={() => navigation.navigate('EditProperty', { propertyId })}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#DBEAFE' }]}>
            <Ionicons name='create-outline' size={18} color='#3B82F6' />
          </View>
          <Text style={styles.actionText}>Edit Property</Text>
          <Ionicons name='chevron-forward' size={18} color={me.ink3} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionRow}
          onPress={() =>
            navigation.navigate('PropertyAssessment', {
              propertyId,
              propertyAddress: property.address,
            })
          }
        >
          <View style={[styles.actionIcon, { backgroundColor: '#D1FAE5' }]}>
            <Ionicons name='videocam-outline' size={18} color='#10B981' />
          </View>
          <Text style={styles.actionText}>Property Assessment</Text>
          <Ionicons name='chevron-forward' size={18} color={me.ink3} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionRow} onPress={handleDelete}>
          <View style={[styles.actionIcon, { backgroundColor: me.errBg }]}>
            <Ionicons name='trash-outline' size={18} color='#EF4444' />
          </View>
          <Text style={[styles.actionText, { color: '#EF4444' }]}>
            Delete Property
          </Text>
          <Ionicons name='chevron-forward' size={18} color={me.ink3} />
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle='dark-content' backgroundColor={me.bg} />
      {/* 2026-05-22 Mint Editorial v2: inline editorial header
          (slim back row with right-aligned favourite + edit icons,
          then eyebrow + serif "Property Details" headline +
          property address subtitle). Replaces the shared
          ScreenHeader so the screen reads as editorial paper
          rather than a phone-app navbar. */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole='button'
          accessibilityLabel='Go back'
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name='arrow-back' size={20} color={me.ink} />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => favoriteMutation.mutate()}
            accessibilityLabel={
              isFavorite ? 'Remove from favorites' : 'Add to favorites'
            }
            style={styles.headerBtn}
          >
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={22}
              color={isFavorite ? me.accent : me.ink2}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('EditProperty', { propertyId })}
            accessibilityLabel='Edit property'
            style={styles.headerBtn}
          >
            <Ionicons name='create-outline' size={22} color={me.brand} />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.screenHeader}>
        <Text style={styles.eyebrow}>Property</Text>
        <Text style={styles.headline} accessibilityRole='header'>
          Property Details
        </Text>
        {property?.address ? (
          <Text style={styles.headerSub} numberOfLines={1}>
            {property.address}
          </Text>
        ) : null}
      </View>

      <View style={styles.tabRow}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={tab.icon}
              size={16}
              color={activeTab === tab.key ? me.brand : me.ink3}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === tab.key && styles.tabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={me.brand}
            colors={[me.brand]}
          />
        }
      >
        <View style={styles.addressCard}>
          <Text style={styles.addressSectionLabel}>PROPERTY IDENTITY</Text>
          <View style={styles.addressIconWrap}>
            <Ionicons name='home' size={24} color='#3B82F6' />
          </View>
          <Text style={styles.addressLine1}>{property.property_name}</Text>
          <Text style={styles.addressCity}>{property.address}</Text>
        </View>

        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'access' && renderAccessTab()}
        {activeTab === 'maintenance' && renderMaintenanceTab()}
        {activeTab === 'manage' && renderManageTab()}
      </ScrollView>
    </SafeAreaView>
  );
};

export default PropertyDetailScreen;
