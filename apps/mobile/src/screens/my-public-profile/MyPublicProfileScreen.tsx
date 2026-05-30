/**
 * MyPublicProfileScreen — Contractor's preview of how homeowners see
 * them, with one tap to edit.
 *
 * Reference: redesign-v2 / contractor-mobile-audit.html, screen 09
 * "Public profile". Mint Editorial styling — striped cover band,
 * overlapping initials avatar, serif name, trust pill row, stat trio,
 * Services chip rail, Recent work grid.
 *
 * Distinct from ContractorProfileScreen (the homeowner-facing version
 * with "Message Contractor" CTAs) — this is the contractor's own
 * dry-run of their public listing, with an Edit shortcut to
 * BusinessProfile + ContractorCardEditor.
 */
import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../../navigation/types';
import { useAuth } from '../../contexts/AuthContext';
import { mobileApiClient } from '../../utils/mobileApiClient';
import { me } from '../../design-system/mint-editorial';
import { styles } from './styles';

type Nav = NativeStackNavigationProp<ProfileStackParamList, 'MyPublicProfile'>;

interface PortfolioImage {
  url: string;
  caption?: string;
}

interface PortfolioJob {
  id: string;
  title?: string;
  imageUrls: string[];
  caption?: string;
}

interface ContractorPublicShape {
  id: string;
  name: string;
  avatarUrl?: string | null;
  rating?: number;
  reviewCount?: number;
  bio?: string | null;
  company_name?: string | null;
  city?: string | null;
  country?: string | null;
  total_jobs_completed?: number;
  skills?: string[];
  portfolio?: PortfolioJob[];
  portfolio_images?: (string | PortfolioImage)[];
  verified?: boolean;
  insurance?: {
    coverage_amount?: number | null;
    expires_at?: string | null;
  } | null;
}

const initialsFromName = (name: string): string => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return `${first}${last}`.toUpperCase() || '?';
};

const formatInsured = (amount?: number | null): string | null => {
  if (!amount || amount <= 0) return null;
  if (amount >= 1_000_000) {
    const m = amount / 1_000_000;
    return `£${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}m insured`;
  }
  if (amount >= 1_000) {
    return `£${Math.round(amount / 1_000)}k insured`;
  }
  return `£${amount} insured`;
};

const collectPortfolioImages = (data: ContractorPublicShape): string[] => {
  const out: string[] = [];
  for (const job of data.portfolio ?? []) {
    for (const url of job.imageUrls ?? []) out.push(url);
  }
  for (const entry of data.portfolio_images ?? []) {
    if (typeof entry === 'string') out.push(entry);
    else if (entry?.url) out.push(entry.url);
  }
  return Array.from(new Set(out));
};

interface Props {
  navigation: Nav;
}

export const MyPublicProfileScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const userId = user?.id;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['my-public-profile', userId],
    queryFn: async (): Promise<ContractorPublicShape | null> => {
      if (!userId) return null;
      const res = await mobileApiClient.get<{
        contractor: ContractorPublicShape;
      }>(`/api/contractors/${userId}`);
      return res.contractor ?? null;
    },
    enabled: !!userId,
  });

  const portfolioImages = useMemo(
    () => (data ? collectPortfolioImages(data) : []),
    [data]
  );

  const rating =
    typeof data?.rating === 'number' && data.rating > 0
      ? data.rating.toFixed(1)
      : null;
  const reviewCount = data?.reviewCount ?? 0;
  const insuredLabel = formatInsured(data?.insurance?.coverage_amount);
  const location = [data?.city, data?.country].filter(Boolean).join(', ');
  const subline = data?.company_name
    ? location
      ? `${data.company_name} · ${location}`
      : data.company_name
    : location || null;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom, 24) + 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.coverWrap}>
          <View style={styles.cover}>
            <Text style={styles.coverPlaceholder}>VAN · COVER PHOTO</Text>
          </View>
          <Pressable
            onPress={() => navigation.goBack()}
            style={[styles.coverBtn, { top: insets.top + 12, left: 14 }]}
            accessibilityRole='button'
            accessibilityLabel='Go back'
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name='arrow-back' size={18} color={me.ink} />
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate('BusinessProfile')}
            style={[styles.coverEditBtn, { top: insets.top + 12, right: 14 }]}
            accessibilityRole='button'
            accessibilityLabel='Edit profile'
          >
            <Text style={styles.coverEditText}>Edit</Text>
          </Pressable>

          {/* Avatar — overlaps the cover band. */}
          <View style={styles.avatarFrame}>
            {data?.avatarUrl ? (
              <Image
                source={{ uri: data.avatarUrl }}
                style={styles.avatarImg}
              />
            ) : (
              <Text style={styles.avatarInitials}>
                {initialsFromName(data?.name || '')}
              </Text>
            )}
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size='large' color={me.brand} />
          </View>
        ) : error || !data ? (
          <View style={styles.loadingWrap}>
            <Text style={styles.errorText}>
              Couldn’t load your public profile.
            </Text>
            <TouchableOpacity onPress={() => refetch()}>
              <Text style={styles.errorRetry}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.body}>
            <Text style={styles.name}>{data.name || 'Your name'}</Text>
            {subline ? <Text style={styles.subline}>{subline}</Text> : null}

            <View style={styles.pillRow}>
              {rating && (
                <View style={[styles.pill, styles.pillBrand]}>
                  <Text style={styles.pillBrandText}>
                    ★ {rating}
                    {reviewCount > 0 ? ` · ${reviewCount} reviews` : ''}
                  </Text>
                </View>
              )}
              {data.verified && (
                <View style={[styles.pill, styles.pillSoft]}>
                  <Ionicons
                    name='shield-checkmark-outline'
                    size={11}
                    color={me.brand}
                  />
                  <Text style={styles.pillSoftText}>Premium verified</Text>
                </View>
              )}
              {insuredLabel && (
                <View style={[styles.pill, styles.pillNeutral]}>
                  <Text style={styles.pillNeutralText}>{insuredLabel}</Text>
                </View>
              )}
            </View>

            {data.bio ? <Text style={styles.bio}>{data.bio}</Text> : null}

            {/* Stat trio — Jobs / ★ rating / Avg reply (avg reply omitted
                until the API exposes it; render two-up when so). */}
            <View style={styles.statRow}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>
                  {data.total_jobs_completed ?? 0}
                </Text>
                <Text style={styles.statLabel}>Jobs</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{rating ?? '—'}</Text>
                <Text style={styles.statLabel}>★ Rating</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{reviewCount}</Text>
                <Text style={styles.statLabel}>Reviews</Text>
              </View>
            </View>

            {data.skills && data.skills.length > 0 ? (
              <>
                <Text style={styles.sectionEyebrow}>Services I offer</Text>
                <View style={styles.chipRow}>
                  {data.skills.map((skill, i) => (
                    <View key={`${skill}-${i}`} style={styles.chip}>
                      <Text style={styles.chipText}>{skill}</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <Pressable
                onPress={() => navigation.navigate('ContractorCardEditor')}
                style={styles.emptyServices}
              >
                <Text style={styles.emptyServicesText}>
                  + Add the services you offer so customers can find you.
                </Text>
              </Pressable>
            )}

            {portfolioImages.length > 0 ? (
              <>
                <Text style={styles.sectionEyebrow}>
                  Recent work · {portfolioImages.length}
                </Text>
                <View style={styles.gridRow}>
                  {portfolioImages.slice(0, 6).map((url, i) => (
                    <Image
                      key={`${url}-${i}`}
                      source={{ uri: url }}
                      style={styles.gridTile}
                    />
                  ))}
                </View>
              </>
            ) : (
              <Pressable
                onPress={() => navigation.navigate('ContractorCardEditor')}
                style={styles.emptyPortfolio}
              >
                <Ionicons
                  name='images-outline'
                  size={24}
                  color={me.ink3}
                  style={{ marginBottom: 6 }}
                />
                <Text style={styles.emptyPortfolioText}>
                  No portfolio photos yet. Add after-photos from completed jobs
                  to show customers your work.
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default MyPublicProfileScreen;
