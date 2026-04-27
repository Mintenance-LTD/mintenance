import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Bid } from '../services/BidService';
import { theme } from '../theme';
import { styles } from './BidReviewStyles';
import { formatCurrency } from '../utils/formatCurrency';
import type { RootStackParamList } from '../navigation/types';

interface QuoteLineItem {
  description: string;
  type?: string;
  quantity: number;
  unitPrice: number;
  total: number;
}
type QuoteData = {
  line_items?: QuoteLineItem[];
  tax_rate?: number;
  tax_amount?: number;
  total_amount?: number;
};

function renderStars(rating: number) {
  const stars = [];
  const full = Math.floor(rating);
  for (let i = 0; i < full; i++)
    stars.push(
      <Ionicons key={i} name='star' size={14} color={theme.colors.accent} />
    );
  if (rating % 1 !== 0)
    stars.push(
      <Ionicons
        key='half'
        name='star-half'
        size={14}
        color={theme.colors.accent}
      />
    );
  for (let i = 0; i < 5 - Math.ceil(rating); i++)
    stars.push(
      <Ionicons
        key={`e${i}`}
        name='star-outline'
        size={14}
        color={theme.colors.textTertiary}
      />
    );
  return stars;
}

interface Props {
  bid: Bid;
  quoteData?: QuoteData;
}

export const BidReviewCard: React.FC<Props> = ({ bid, quoteData }) => {
  // Type the navigation against the root stack so we can navigate to Modal/ContractorProfile
  // without traversing parent chains. React Navigation walks up the tree itself when the
  // target screen lives on an ancestor navigator.
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const contractor = bid.contractor;
  const avatarUri =
    contractor?.profile_picture || contractor?.profile_image_url;
  const truncatedBio = contractor?.bio
    ? contractor.bio.length > 100
      ? `${contractor.bio.slice(0, 100)}...`
      : contractor.bio
    : null;

  // Single source of truth for opening the contractor profile so the
  // tap zone on "View Full Profile →" and the broader header tap both
  // route through the same code path. Uses `navigation.getParent()`
  // explicitly (matching the working `View Profile` button on
  // ContractorAssignment.tsx — the bid card on the job detail page)
  // because direct `navigation.navigate('Modal', …)` from a nested
  // navigator wasn't always firing in earlier user reports — RN
  // walks the tree but parent traversal is more deterministic.
  const openContractorProfile = React.useCallback(() => {
    if (!contractor?.id) return;
    const parent = navigation.getParent?.() as
      | { navigate: (name: string, params?: unknown) => void }
      | undefined;
    if (parent) {
      parent.navigate('Modal', {
        screen: 'ContractorProfile',
        params: { contractorId: contractor.id },
      });
    } else {
      // Fallback — same target via the closest navigator. Works in tests
      // where useNavigation returns a leaf navigator with no parent.
      navigation.navigate('Modal', {
        screen: 'ContractorProfile',
        params: { contractorId: contractor.id },
      });
    }
  }, [contractor?.id, navigation]);

  return (
    <View style={styles.bidCard}>
      <ScrollView
        style={styles.cardScroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Contractor header */}
        <TouchableOpacity
          style={styles.contractorHeader}
          onPress={openContractorProfile}
          activeOpacity={0.7}
        >
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons
                name='person-circle-outline'
                size={48}
                color={theme.colors.textSecondary}
              />
            </View>
          )}
          <View style={styles.contractorInfo}>
            <Text style={styles.contractorName}>
              {contractor
                ? `${contractor.first_name} ${contractor.last_name}`
                : 'Contractor'}
            </Text>
            {contractor?.company_name ? (
              <Text style={styles.companyName}>{contractor.company_name}</Text>
            ) : null}
            {contractor?.rating != null ? (
              <View style={styles.ratingRow}>
                <View style={styles.stars}>
                  {renderStars(contractor.rating)}
                </View>
                <Text style={styles.ratingText}>
                  {contractor.rating.toFixed(1)} (
                  {contractor.reviews_count || 0} reviews)
                </Text>
              </View>
            ) : (
              <View style={styles.newBadge}>
                <Ionicons
                  name='sparkles'
                  size={12}
                  color={theme.colors.primary}
                />
                <Text style={styles.newBadgeText}>New on Mintenance</Text>
              </View>
            )}
            {contractor?.city ? (
              <View style={styles.locationRow}>
                <Ionicons
                  name='location-outline'
                  size={13}
                  color={theme.colors.textTertiary}
                />
                <Text style={styles.locationText}>{contractor.city}</Text>
              </View>
            ) : null}
          </View>
        </TouchableOpacity>
        {/* Dedicated, full-width tap zone for "View Full Profile" so the
            link is independently pressable (defends against the
            ScrollView pan-responder swallowing taps inside the header
            TouchableOpacity above). */}
        <TouchableOpacity
          onPress={openContractorProfile}
          activeOpacity={0.6}
          hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
          accessibilityRole='link'
          accessibilityLabel='View full contractor profile'
        >
          <Text style={styles.viewProfileLink}>View Full Profile →</Text>
        </TouchableOpacity>

        {truncatedBio ? (
          <Text style={styles.bioText}>{truncatedBio}</Text>
        ) : null}

        {/* Quote breakdown or flat amount */}
        {quoteData?.line_items?.length ? (
          <View style={styles.quoteBreakdown}>
            <Text style={styles.quoteBreakdownTitle}>Itemised Quote</Text>
            {quoteData.line_items.map((item, idx) => (
              <View key={idx} style={styles.lineItemRow}>
                <View style={styles.lineItemInfo}>
                  <Text style={styles.lineItemDesc}>{item.description}</Text>
                  <Text style={styles.lineItemQty}>
                    {item.quantity} x {formatCurrency(item.unitPrice ?? 0)}
                  </Text>
                </View>
                <Text style={styles.lineItemTotal}>
                  {formatCurrency(
                    item.total || item.quantity * (item.unitPrice || 0)
                  )}
                </Text>
              </View>
            ))}
            <View style={styles.quoteSummary}>
              <View style={styles.quoteSummaryRow}>
                <Text style={styles.quoteSummaryLabel}>Subtotal</Text>
                <Text style={styles.quoteSummaryValue}>
                  {formatCurrency(
                    quoteData.line_items.reduce((s, i) => s + (i.total || 0), 0)
                  )}
                </Text>
              </View>
              {(quoteData.tax_amount ?? 0) > 0 && (
                <View style={styles.quoteSummaryRow}>
                  <Text style={styles.quoteSummaryLabel}>
                    VAT ({quoteData.tax_rate || 20}%)
                  </Text>
                  <Text style={styles.quoteSummaryValue}>
                    {formatCurrency(quoteData.tax_amount || 0)}
                  </Text>
                </View>
              )}
              <View style={styles.quoteTotalRow}>
                <Text style={styles.quoteTotalLabel}>Total</Text>
                <Text style={styles.quoteTotalValue}>
                  {formatCurrency(bid.amount)}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.amountSection}>
            <Text style={styles.amountLabel}>Bid Amount</Text>
            <Text style={styles.amountValue}>{formatCurrency(bid.amount)}</Text>
          </View>
        )}

        {/* Stats */}
        {(contractor?.hourly_rate != null ||
          contractor?.years_experience != null) && (
          <View style={styles.statsRow}>
            {contractor?.hourly_rate != null && (
              <View style={styles.statChip}>
                <Ionicons
                  name='cash-outline'
                  size={14}
                  color={theme.colors.primary}
                />
                <Text style={styles.statText}>
                  {formatCurrency(contractor.hourly_rate)}/hr
                </Text>
              </View>
            )}
            {contractor?.years_experience != null && (
              <View style={styles.statChip}>
                <Ionicons
                  name='construct-outline'
                  size={14}
                  color={theme.colors.accent}
                />
                <Text style={styles.statText}>
                  {contractor.years_experience} yrs exp
                </Text>
              </View>
            )}
          </View>
        )}

        {bid.estimated_duration && (
          <View style={styles.detailRow}>
            <View style={styles.detailIconWrap}>
              <Ionicons name='time-outline' size={16} color='#3B82F6' />
            </View>
            <Text style={styles.detailText}>
              Estimated: {bid.estimated_duration}
            </Text>
          </View>
        )}
        {bid.availability && (
          <View style={styles.detailRow}>
            <View
              style={[
                styles.detailIconWrap,
                { backgroundColor: theme.colors.primaryLight },
              ]}
            >
              <Ionicons
                name='calendar-outline'
                size={16}
                color={theme.colors.primary}
              />
            </View>
            <Text style={styles.detailText}>Available: {bid.availability}</Text>
          </View>
        )}

        <View style={styles.proposalSection}>
          <Text style={styles.proposalLabel}>Proposal</Text>
          <Text style={styles.proposalText}>{bid.message}</Text>
        </View>
      </ScrollView>
    </View>
  );
};
