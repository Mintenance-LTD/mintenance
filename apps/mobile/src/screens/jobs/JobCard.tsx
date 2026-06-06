import React from 'react';
import { View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Job } from '@mintenance/types';
import { ImageCarousel } from '../../components/ui/ImageCarousel';
import { me } from '../../design-system/mint-editorial';
import {
  CATEGORY_ICONS,
  CATEGORY_COLORS,
  STATUS_STYLES,
  JobCardProps,
} from './types';
import { ProgressDots } from './ProgressDots';
import { styles } from './JobCardStyles';
import { normalizePhotoUrls } from '../../utils/photoUrls';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const JobCard: React.FC<JobCardProps> = ({
  item,
  saved,
  onPress,
  onSave,
  onBid,
  bidCount,
  isContractor,
  hasUserBid,
}) => {
  // Sample `now` ONCE and reuse it for both the baseline and the missing-date
  // fallback. Calling Date.now() twice (outer + the `|| Date.now()` fallback)
  // let the inner call run a few microseconds later than the outer, so when
  // both date keys were missing the diff went slightly negative and floored to
  // -1 → "-1d ago" instead of "Today". Math.max(0, …) also guards against a
  // created_at timestamp that is marginally in the future (clock skew).
  const now = Date.now();
  const daysAgo = Math.max(
    0,
    Math.floor(
      (now - new Date(item.created_at || item.createdAt || now).getTime()) /
        (1000 * 3600 * 24)
    )
  );
  // Drop null / undefined / empty-string entries — a broken photos
  // array shouldn't fool the `hasPhotos` check into rendering an
  // ImageCarousel with empty `uri`s (which 404 or hang without
  // triggering expo-image's onError, leaving a gray void).
  const photos = normalizePhotoUrls(item.photos || item.images);
  const hasPhotos = photos.length > 0;

  const rawLocation =
    typeof item.location === 'string' ? item.location : item.city || '';
  const locationStr =
    item.city || rawLocation.split(',').slice(-2, -1)[0]?.trim() || rawLocation;

  const urgency = item.urgency || item.priority || 'medium';
  const isUrgent = urgency === 'high' || urgency === 'emergency';
  const catKey = item.category?.toLowerCase() || 'general';
  const catColor = CATEGORY_COLORS[catKey] ?? CATEGORY_COLORS.general;
  const categoryIcon = CATEGORY_ICONS[catKey] ?? 'construct-outline';
  const timeLabel =
    daysAgo === 0 ? 'Today' : daysAgo === 1 ? '1d ago' : `${daysAgo}d ago`;
  const statusStyle = STATUS_STYLES[item.status] ?? STATUS_STYLES.posted;

  const contractorName = (item as unknown as Record<string, unknown>)
    .contractor_name as string | undefined;

  return (
    <TouchableOpacity
      style={styles.jobCard}
      onPress={onPress}
      activeOpacity={0.9}
      accessibilityRole='button'
      accessibilityLabel={`${item.title}, ${locationStr}`}
      accessibilityHint='Double tap to view job details'
    >
      {/* Photo hero or category placeholder */}
      {hasPhotos ? (
        <View style={styles.heroSection}>
          <ImageCarousel
            images={photos}
            height={140}
            width={SCREEN_WIDTH - 32}
            showDots={photos.length > 1}
            gradientOverlay
            overlayContent={
              <View style={styles.overlayRow}>
                {isUrgent && (
                  <View style={styles.urgentTag}>
                    <Ionicons name='flame' size={11} color={me.onBrand} />
                    <Text style={styles.urgentTagText}>Urgent</Text>
                  </View>
                )}
              </View>
            }
          />
        </View>
      ) : (
        <View
          style={[
            styles.placeholderHero,
            { backgroundColor: catColor?.bg ?? '#F5F5F5' },
          ]}
        >
          <Ionicons
            name={categoryIcon}
            size={36}
            color={catColor?.icon ?? '#616161'}
            style={{ opacity: 0.5 }}
          />
          {isUrgent && (
            <View style={styles.placeholderUrgent}>
              <Ionicons name='flame' size={11} color={me.onBrand} />
              <Text style={styles.urgentTagText}>Urgent</Text>
            </View>
          )}
        </View>
      )}

      {/* Save button overlay */}
      <TouchableOpacity
        style={styles.saveButton}
        onPress={(e) => {
          e.stopPropagation?.();
          onSave();
        }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole='button'
        accessibilityLabel={saved ? 'Remove from saved' : 'Save job'}
      >
        <Ionicons
          name={saved ? 'heart' : 'heart-outline'}
          size={20}
          color={saved ? me.errFg : me.onBrand}
        />
      </TouchableOpacity>

      {/* Status badge -- homeowner only */}
      {!isContractor && statusStyle && (
        <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
          <Ionicons
            name={statusStyle.icon}
            size={11}
            color={statusStyle.text}
          />
          <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>
            {statusStyle.label}
          </Text>
        </View>
      )}

      {/* Card content -- TITLE FIRST (budget removed 2026-05-22) */}
      <View style={styles.cardContent}>
        {/* Title */}
        <Text style={styles.jobTitle} numberOfLines={1}>
          {item.title}
        </Text>

        {/* Meta row: location + time */}
        <View style={styles.cardMeta}>
          {locationStr ? (
            <View style={styles.metaItem}>
              <Ionicons name='location-outline' size={13} color={me.ink2} />
              <Text style={styles.metaText}>{locationStr}</Text>
            </View>
          ) : null}
          <View style={styles.metaItem}>
            <Ionicons name='time-outline' size={13} color={me.ink2} />
            <Text style={styles.metaText}>{timeLabel}</Text>
          </View>
        </View>

        {/* Tags row: category + bid pressure */}
        <View style={styles.tagsRow}>
          <View
            style={[
              styles.categoryTag,
              { backgroundColor: catColor?.bg ?? '#F5F5F5' },
            ]}
          >
            <Ionicons
              name={categoryIcon}
              size={12}
              color={catColor?.text ?? '#616161'}
            />
            <Text
              style={[
                styles.categoryTagText,
                { color: catColor?.text ?? '#616161' },
              ]}
            >
              {item.category
                ? item.category.charAt(0).toUpperCase() + item.category.slice(1)
                : 'General'}
            </Text>
          </View>
          {!!bidCount && bidCount > 0 && (
            <View style={styles.bidBadge}>
              <Ionicons name='people-outline' size={12} color={me.accent} />
              <Text style={styles.bidBadgeText}>
                {bidCount} {bidCount === 1 ? 'bid' : 'bids'}
              </Text>
            </View>
          )}
          {item.status === 'posted' && daysAgo === 0 && (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>New</Text>
            </View>
          )}
        </View>

        {/* Homeowner: Progress dots for assigned/in-progress jobs */}
        {!isContractor &&
          (item.status === 'assigned' || item.status === 'in_progress') && (
            <View style={styles.progressSection}>
              <ProgressDots status={item.status} />
              <View style={styles.progressLabels}>
                <Text style={styles.progressLabelText}>Posted</Text>
                <Text style={styles.progressLabelText}>Assigned</Text>
                <Text style={styles.progressLabelText}>Active</Text>
                <Text style={styles.progressLabelText}>Done</Text>
              </View>
            </View>
          )}

        {/* Homeowner: Assigned contractor info */}
        {!isContractor &&
          contractorName &&
          (item.status === 'assigned' || item.status === 'in_progress') && (
            <View style={styles.contractorRow}>
              <View style={styles.contractorAvatar}>
                <Text style={styles.contractorInitial}>
                  {contractorName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.contractorName}>{contractorName}</Text>
                <Text style={styles.contractorRole}>Assigned Contractor</Text>
              </View>
              <Ionicons name='chatbubble-outline' size={18} color={me.brand} />
            </View>
          )}

        {/* Homeowner: "View Bids" CTA for posted jobs */}
        {!isContractor &&
          item.status === 'posted' &&
          !!bidCount &&
          bidCount > 0 && (
            <TouchableOpacity
              style={styles.viewBidsBtn}
              onPress={onPress}
              activeOpacity={0.8}
            >
              <Ionicons name='people' size={16} color={me.onBrand} />
              <Text style={styles.viewBidsText}>
                View {bidCount} {bidCount === 1 ? 'Bid' : 'Bids'}
              </Text>
            </TouchableOpacity>
          )}

        {/* Contractor: Quick Bid button -- posted jobs only, hide if already bid */}
        {isContractor && item.status === 'posted' && !hasUserBid && (
          <TouchableOpacity
            style={styles.quickBidBtn}
            onPress={(e) => {
              e.stopPropagation?.();
              onBid();
            }}
            activeOpacity={0.8}
            accessibilityRole='button'
            accessibilityLabel={`Quick bid on ${item.title}`}
          >
            <Ionicons name='flash' size={16} color={me.onBrand} />
            <Text style={styles.quickBidText}>Quick Bid</Text>
          </TouchableOpacity>
        )}
        {/* Contractor: Bid Sent indicator */}
        {isContractor && item.status === 'posted' && hasUserBid && (
          <View
            style={[
              styles.quickBidBtn,
              { backgroundColor: me.ink2, opacity: 0.8 },
            ]}
          >
            <Ionicons name='checkmark-circle' size={16} color={me.onBrand} />
            <Text style={styles.quickBidText}>Bid Sent</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};
