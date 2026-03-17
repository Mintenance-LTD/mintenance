import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Job } from '@mintenance/types';
import { ImageCarousel } from '../../components/ui/ImageCarousel';
import { theme } from '../../theme';
import { CATEGORY_ICONS, CATEGORY_COLORS, STATUS_STYLES, JobCardProps } from './types';
import { ProgressDots } from './ProgressDots';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const JobCard: React.FC<JobCardProps> = ({
  item,
  saved,
  onPress,
  onSave,
  onBid,
  bidCount,
  isContractor,
}) => {
  const daysAgo = Math.floor(
    (Date.now() - new Date(item.created_at || item.createdAt || Date.now()).getTime()) / (1000 * 3600 * 24)
  );
  const photos = item.photos || item.images || [];
  const hasPhotos = photos.length > 0;

  const rawLocation = typeof item.location === 'string' ? item.location : item.city || '';
  const locationStr = item.city || rawLocation.split(',').slice(-2, -1)[0]?.trim() || rawLocation;

  const budget = item.budget || item.budget_min || 0;
  const budgetMax = item.budget_max || 0;
  const urgency = item.urgency || item.priority || 'medium';
  const isUrgent = urgency === 'high' || urgency === 'emergency';
  const catKey = item.category?.toLowerCase() || 'general';
  const catColor = CATEGORY_COLORS[catKey] || CATEGORY_COLORS.general;
  const categoryIcon = CATEGORY_ICONS[catKey] || 'construct-outline';
  const timeLabel = daysAgo === 0 ? 'Today' : daysAgo === 1 ? '1d ago' : `${daysAgo}d ago`;
  const statusStyle = STATUS_STYLES[item.status];

  const contractorName = (item as unknown as Record<string, unknown>).contractor_name as string | undefined;

  const formatBudget = (amt: number) => {
    if (amt >= 1000) return `\u00A3${(amt / 1000).toFixed(amt % 1000 === 0 ? 0 : 1)}k`;
    return `\u00A3${amt.toLocaleString()}`;
  };

  return (
    <TouchableOpacity
      style={styles.jobCard}
      onPress={onPress}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${budget > 0 ? `\u00A3${budget.toLocaleString()}` : 'Budget TBD'}, ${locationStr}`}
      accessibilityHint="Double tap to view job details"
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
                    <Ionicons name="flame" size={11} color={theme.colors.textInverse} />
                    <Text style={styles.urgentTagText}>Urgent</Text>
                  </View>
                )}
              </View>
            }
          />
        </View>
      ) : (
        <View style={[styles.placeholderHero, { backgroundColor: catColor.bg }]}>
          <Ionicons name={categoryIcon} size={36} color={catColor.icon} style={{ opacity: 0.5 }} />
          {isUrgent && (
            <View style={styles.placeholderUrgent}>
              <Ionicons name="flame" size={11} color={theme.colors.textInverse} />
              <Text style={styles.urgentTagText}>Urgent</Text>
            </View>
          )}
        </View>
      )}

      {/* Save button overlay */}
      <TouchableOpacity
        style={styles.saveButton}
        onPress={(e) => { e.stopPropagation?.(); onSave(); }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel={saved ? 'Remove from saved' : 'Save job'}
      >
        <Ionicons name={saved ? 'heart' : 'heart-outline'} size={20} color={saved ? theme.colors.error : theme.colors.textInverse} />
      </TouchableOpacity>

      {/* Status badge -- homeowner only */}
      {!isContractor && statusStyle && (
        <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
          <Ionicons name={statusStyle.icon} size={11} color={statusStyle.text} />
          <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>{statusStyle.label}</Text>
        </View>
      )}

      {/* Card content -- BUDGET FIRST */}
      <View style={styles.cardContent}>
        {/* Budget -- large and prominent */}
        <Text style={styles.budgetText}>
          {budget > 0
            ? budgetMax > 0 && budgetMax !== budget
              ? `${formatBudget(budget)} \u2013 ${formatBudget(budgetMax)}`
              : `\u00A3${budget.toLocaleString()}`
            : 'Budget TBD'}
        </Text>

        {/* Title */}
        <Text style={styles.jobTitle} numberOfLines={1}>{item.title}</Text>

        {/* Meta row: location + time */}
        <View style={styles.cardMeta}>
          {locationStr ? (
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={13} color={theme.colors.textSecondary} />
              <Text style={styles.metaText}>{locationStr}</Text>
            </View>
          ) : null}
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={13} color={theme.colors.textSecondary} />
            <Text style={styles.metaText}>{timeLabel}</Text>
          </View>
        </View>

        {/* Tags row: category + bid pressure */}
        <View style={styles.tagsRow}>
          <View style={[styles.categoryTag, { backgroundColor: catColor.bg }]}>
            <Ionicons name={categoryIcon} size={12} color={catColor.text} />
            <Text style={[styles.categoryTagText, { color: catColor.text }]}>
              {item.category ? item.category.charAt(0).toUpperCase() + item.category.slice(1) : 'General'}
            </Text>
          </View>
          {!!bidCount && bidCount > 0 && (
            <View style={styles.bidBadge}>
              <Ionicons name="people-outline" size={12} color={theme.colors.accent} />
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
        {!isContractor && (item.status === 'assigned' || item.status === 'in_progress') && (
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
        {!isContractor && contractorName && (item.status === 'assigned' || item.status === 'in_progress') && (
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
            <Ionicons name="chatbubble-outline" size={18} color={theme.colors.primary} />
          </View>
        )}

        {/* Homeowner: "View Bids" CTA for posted jobs */}
        {!isContractor && item.status === 'posted' && !!bidCount && bidCount > 0 && (
          <TouchableOpacity
            style={styles.viewBidsBtn}
            onPress={onPress}
            activeOpacity={0.8}
          >
            <Ionicons name="people" size={16} color={theme.colors.textInverse} />
            <Text style={styles.viewBidsText}>
              View {bidCount} {bidCount === 1 ? 'Bid' : 'Bids'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Contractor: Quick Bid button -- posted jobs only */}
        {isContractor && item.status === 'posted' && (
          <TouchableOpacity
            style={styles.quickBidBtn}
            onPress={(e) => { e.stopPropagation?.(); onBid(); }}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`Quick bid on ${item.title}`}
          >
            <Ionicons name="flash" size={16} color={theme.colors.textInverse} />
            <Text style={styles.quickBidText}>Quick Bid</Text>
            {budget > 0 && (
              <Text style={styles.quickBidAmount}>{`\u00B7 \u00A3${budget.toLocaleString()}`}</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  jobCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: { elevation: 2 },
    }),
  },
  heroSection: { borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' },
  placeholderHero: {
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderUrgent: {
    position: 'absolute',
    bottom: 8,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.error,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 3,
  },
  overlayRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  urgentTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.error,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 3,
  },
  urgentTagText: { fontSize: 11, fontWeight: '700', color: theme.colors.textInverse },
  saveButton: {
    position: 'absolute',
    top: 8,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  statusBadge: {
    position: 'absolute',
    top: 8,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    zIndex: 5,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardContent: { padding: 16 },
  budgetText: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  cardMeta: { flexDirection: 'row', gap: 14, marginBottom: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 12, color: theme.colors.textSecondary },
  tagsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  categoryTagText: { fontSize: 12, fontWeight: '600' },
  bidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.accentLight,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  bidBadgeText: { fontSize: 12, fontWeight: '600', color: theme.colors.accent },
  newBadge: {
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  newBadgeText: { fontSize: 12, fontWeight: '700', color: theme.colors.primary },
  progressSection: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  progressLabelText: {
    fontSize: 10,
    color: theme.colors.textTertiary,
    fontWeight: '500',
  },
  contractorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 12,
    padding: 12,
  },
  contractorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contractorInitial: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  contractorName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  contractorRole: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  viewBidsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 12,
  },
  viewBidsText: {
    color: theme.colors.textInverse,
    fontSize: 15,
    fontWeight: '700',
  },
  quickBidBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 12,
  },
  quickBidText: {
    color: theme.colors.textInverse,
    fontSize: 15,
    fontWeight: '700',
  },
  quickBidAmount: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '600',
  },
});
