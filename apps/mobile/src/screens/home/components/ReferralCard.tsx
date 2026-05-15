/**
 * ReferralCard (mobile) — R7 #8 of docs/RETENTION_ROADMAP_2026.md.
 *
 * Mobile counterpart of apps/web/components/referrals/ReferralCard.tsx.
 * Homeowner generates + shares a neighbour-referral link pinned to their
 * postcode prefix. Uses the system Share sheet so iOS / Android can hand
 * off to Messages, WhatsApp, etc.
 *
 * Direction A · Mint Editorial — token-styled.
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
import { me } from '../../../design-system/mint-editorial';

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
        backgroundColor: me.surface,
        borderRadius: me.radius.card,
        padding: 16,
        marginHorizontal: 16,
        marginTop: 12,
        borderWidth: 1,
        borderColor: me.line,
      }}
    >
      <View
        style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}
      >
        <Ionicons name='people-circle-outline' size={20} color={me.brand} />
        <Text
          style={{
            marginLeft: 6,
            fontSize: 16,
            fontWeight: '700',
            color: me.ink,
          }}
        >
          £20 off for your neighbour
        </Text>
      </View>
      <Text
        style={{
          fontSize: 13,
          color: me.ink2,
          marginBottom: 12,
        }}
      >
        Share with someone on your road. When they book their first job, we
        credit £20 to both of you.
      </Text>

      {balancePence > 0 && (
        <View
          style={{
            backgroundColor: me.brandSoft,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 10,
            marginBottom: 12,
          }}
        >
          <Text style={{ color: me.brand2, fontSize: 13 }}>
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
            placeholderTextColor={me.ink4}
            autoCapitalize='characters'
            style={{
              borderWidth: 1,
              borderColor: me.line,
              borderRadius: me.radius.input,
              paddingHorizontal: 12,
              paddingVertical: 10,
              color: me.ink,
              marginBottom: 10,
            }}
          />
          <TouchableOpacity
            onPress={generate}
            disabled={loading}
            style={{
              backgroundColor: me.brand,
              paddingVertical: 12,
              borderRadius: me.radius.btn,
              alignItems: 'center',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? (
              <ActivityIndicator color={me.onBrand} />
            ) : (
              <Text style={{ color: me.onBrand, fontWeight: '700' }}>
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
              color: me.ink2,
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
              backgroundColor: me.bg2,
              borderRadius: 10,
              padding: 10,
              marginBottom: 10,
            }}
          >
            <Text
              numberOfLines={1}
              style={{ flex: 1, color: me.ink, fontSize: 12 }}
            >
              {shareUrl}
            </Text>
          </View>
          <TouchableOpacity
            onPress={share}
            style={{
              backgroundColor: me.brand,
              paddingVertical: 12,
              borderRadius: me.radius.btn,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
            }}
          >
            <Ionicons name='share-outline' size={18} color={me.onBrand} />
            <Text
              style={{
                color: me.onBrand,
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
