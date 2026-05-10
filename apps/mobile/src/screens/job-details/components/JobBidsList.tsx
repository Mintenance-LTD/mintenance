import React from 'react';
import { View, Text } from 'react-native';
import { bidStatusColors } from '../bidStatusColors';
import { styles } from '../jobDetailsStyles';

export interface BidListItem {
  id: string;
  contractorId?: string;
  contractor_id?: string;
  status?: string;
  amount?: number;
  description?: string;
  message?: string;
  contractor?: {
    first_name?: string;
    last_name?: string;
    company_name?: string;
    profile_image_url?: string;
  };
}

/**
 * Bids list visible to the homeowner. Each row shows contractor name,
 * amount, status badge, and the bid description/message.
 * Extracted 2026-05-09 (AUDIT_PUNCH_LIST P2 #44c).
 */
export function JobBidsList({ bids }: { bids: BidListItem[] }) {
  if (bids.length === 0) return null;

  return (
    <View style={styles.sectionPadded}>
      <Text style={styles.sectionLabel}>Bids ({bids.length})</Text>
      {bids.map((bid) => {
        const sc = bidStatusColors(bid.status);
        const contractorName = bid.contractor?.first_name
          ? `${bid.contractor.first_name} ${bid.contractor.last_name || ''}`.trim()
          : bid.contractor?.company_name || 'Contractor';
        return (
          <View key={bid.id} style={styles.bidCard}>
            <View style={styles.bidRow}>
              <Text style={styles.bidContractorName}>{contractorName}</Text>
              <View style={styles.bidAmountRow}>
                <Text style={styles.bidAmount}>
                  £
                  {typeof bid.amount === 'number'
                    ? bid.amount.toFixed(2)
                    : bid.amount}
                </Text>
                <View
                  style={[styles.bidStatusBadge, { backgroundColor: sc.bg }]}
                >
                  <Text style={[styles.bidStatusText, { color: sc.text }]}>
                    {sc.label}
                  </Text>
                </View>
              </View>
            </View>
            {(bid.description || bid.message) && (
              <Text style={styles.bidMessage} numberOfLines={2}>
                {bid.description || bid.message}
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}
