/**
 * ReferralCard (mobile) — R7 #8 of docs/RETENTION_ROADMAP_2026.md.
 *
 * Mobile counterpart of apps/web/components/referrals/ReferralCard.tsx.
 * Homeowner generates + shares a neighbour-referral link pinned to their
 * postcode prefix. Uses the system Share sheet so iOS / Android can hand
 * off to Messages, WhatsApp, etc.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Share,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { mobileApiClient as apiClient } from '../../../utils/mobileApiClient';
import { theme } from '../../../theme';

interface ReferralPayload {
  referral: {
    code: string;
    postcode_prefix: string;
  };
  shareUrl: string;
}

interface ApplyPayload {
  balancePence: number;
}

export const ReferralCard: React.FC<{ defaultPostcode?: string }> = ({
  defaultPostcode,
}) => {
  const [postcode, setPostcode] = useState(defaultPostcode || '');
  const [loading, setLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [postcodePrefix, setPostcodePrefix] = useState<string | null>(null);
  const [balancePence, setBalancePence] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get<ApplyPayload>('/api/referrals/apply');
        if (typeof res?.balancePence === 'number') {
          setBalancePence(res.balancePence);
        }
      } catch {
        /* ignore */
      }
    })();
  }, []);

  async function generate() {
    if (!postcode.trim()) {
      Alert.alert('Missing postcode', 'Enter your postcode first.');
      return;
    }
    setLoading(true);
    try {
      const res = await apiClient.post<ReferralPayload>(
        '/api/referrals/create',
        { postcode: postcode.trim() }
      );
      setShareUrl(res.shareUrl);
      setPostcodePrefix(res.referral.postcode_prefix);
    } catch (err) {
      Alert.alert(
        'Could not generate link',
        err instanceof Error ? err.message : 'Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function share() {
    if (!shareUrl) return;
    try {
      await Share.share({
        message: `I've been using Mintenance for home repairs — here's £20 off your first job: ${shareUrl}`,
        url: shareUrl,
      });
    } catch {
      /* ignore cancel */
    }
  }

  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: 14,
        padding: 16,
        marginHorizontal: 16,
        marginTop: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
      }}
    >
      <View
        style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}
      >
        <Ionicons
          name='people-circle-outline'
          size={20}
          color={theme.colors.primary}
        />
        <Text
          style={{
            marginLeft: 6,
            fontSize: 16,
            fontWeight: '700',
            color: theme.colors.textPrimary,
          }}
        >
          £20 off for your neighbour
        </Text>
      </View>
      <Text
        style={{
          fontSize: 13,
          color: theme.colors.textSecondary,
          marginBottom: 12,
        }}
      >
        Share with someone on your road. When they book their first job, we
        credit £20 to both of you.
      </Text>

      {balancePence > 0 && (
        <View
          style={{
            backgroundColor: theme.colors.primaryLight,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 10,
            marginBottom: 12,
          }}
        >
          <Text style={{ color: theme.colors.primary, fontSize: 13 }}>
            You have £{(balancePence / 100).toFixed(2)} of neighbour credit
            ready to use.
          </Text>
        </View>
      )}

      {!shareUrl ? (
        <View>
          <TextInput
            value={postcode}
            onChangeText={setPostcode}
            placeholder='Your postcode, e.g. M14 5AB'
            placeholderTextColor={theme.colors.textSecondary}
            autoCapitalize='characters'
            style={{
              borderWidth: 1,
              borderColor: theme.colors.border,
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 10,
              color: theme.colors.textPrimary,
              marginBottom: 10,
            }}
          />
          <TouchableOpacity
            onPress={generate}
            disabled={loading}
            style={{
              backgroundColor: theme.colors.primary,
              paddingVertical: 12,
              borderRadius: 10,
              alignItems: 'center',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.surface} />
            ) : (
              <Text style={{ color: theme.colors.surface, fontWeight: '700' }}>
                Generate link
              </Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          <Text
            style={{
              fontSize: 12,
              color: theme.colors.textSecondary,
              marginBottom: 4,
            }}
          >
            Pinned to {postcodePrefix} — only neighbours in that area can use
            it.
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: theme.colors.background,
              borderRadius: 10,
              padding: 10,
              marginBottom: 10,
            }}
          >
            <Text
              numberOfLines={1}
              style={{ flex: 1, color: theme.colors.textPrimary, fontSize: 12 }}
            >
              {shareUrl}
            </Text>
          </View>
          <TouchableOpacity
            onPress={share}
            style={{
              backgroundColor: theme.colors.primary,
              paddingVertical: 12,
              borderRadius: 10,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
            }}
          >
            <Ionicons
              name='share-outline'
              size={18}
              color={theme.colors.surface}
            />
            <Text
              style={{
                color: theme.colors.surface,
                fontWeight: '700',
                marginLeft: 8,
              }}
            >
              Share
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};
