/**
 * ReplyToReviewScreen — R7 #19 of docs/RETENTION_ROADMAP_2026.md.
 *
 * Mobile counterpart of the inline reply form on
 * apps/web/app/contractor/reviews/page.tsx. Posts to
 * /api/contractor/reviews { reviewId, response }. Reply enters 48h
 * moderation queue before becoming public — we show that explicitly.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { mobileApiClient as apiClient } from '../utils/mobileApiClient';
import { theme } from '../theme';
import type { ProfileStackParamList } from '../navigation/types';
import { useUnsavedChanges } from '../hooks/useUnsavedChanges';

type Props = NativeStackScreenProps<ProfileStackParamList, 'ReplyToReview'>;

export const ReplyToReviewScreen: React.FC<Props> = ({ route, navigation }) => {
  const { reviewId, reviewerName, reviewComment, rating } = route.params;
  const [response, setResponse] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const allowExit = useUnsavedChanges(response.trim().length > 0);

  async function submit() {
    const trimmed = response.trim();
    if (trimmed.length < 10) {
      Alert.alert('Your reply needs at least 10 characters.');
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post('/api/contractor/reviews', {
        reviewId,
        response: trimmed,
      });
      Alert.alert(
        'Reply submitted',
        'Homeowners will see your reply after a 48-hour moderation window.'
      );
      allowExit();
      navigation.goBack();
    } catch (err) {
      Alert.alert(
        'Could not post reply',
        err instanceof Error ? err.message : 'Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ padding: 4 }}
          >
            <Ionicons
              name='arrow-back'
              size={22}
              color={theme.colors.textPrimary}
            />
          </TouchableOpacity>
          <Text
            style={{
              marginLeft: 8,
              fontSize: 18,
              fontWeight: '700',
              color: theme.colors.textPrimary,
            }}
          >
            Reply to review
          </Text>
        </View>

        {/* Original review summary */}
        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderRadius: 12,
            padding: 14,
            marginBottom: 16,
          }}
        >
          <Text
            style={{
              fontWeight: '700',
              fontSize: 14,
              color: theme.colors.textPrimary,
            }}
          >
            {reviewerName}
          </Text>
          <View style={{ flexDirection: 'row', marginVertical: 4 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Ionicons
                key={n}
                name={n <= rating ? 'star' : 'star-outline'}
                size={14}
                color={theme.colors.accent}
              />
            ))}
          </View>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: 14,
              lineHeight: 20,
            }}
          >
            {reviewComment}
          </Text>
        </View>

        <Text
          style={{
            fontSize: 13,
            color: theme.colors.textSecondary,
            marginBottom: 6,
          }}
        >
          Your reply
        </Text>
        <TextInput
          value={response}
          onChangeText={setResponse}
          multiline
          numberOfLines={6}
          maxLength={2000}
          placeholder="Acknowledge the feedback, explain anything you'd change, and keep it polite — this stays public."
          placeholderTextColor={theme.colors.textSecondary}
          style={{
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: 10,
            padding: 12,
            minHeight: 120,
            textAlignVertical: 'top',
            color: theme.colors.textPrimary,
          }}
        />
        <Text
          style={{
            fontSize: 11,
            color: theme.colors.textSecondary,
            marginTop: 6,
            marginBottom: 16,
          }}
        >
          Replies become public after a 48-hour moderation window. An admin can
          block a reply that breaks the community rules.
        </Text>

        <TouchableOpacity
          onPress={submit}
          disabled={submitting}
          style={{
            backgroundColor: theme.colors.primary,
            paddingVertical: 12,
            borderRadius: 10,
            alignItems: 'center',
            opacity: submitting ? 0.6 : 1,
          }}
        >
          {submitting ? (
            <ActivityIndicator color={theme.colors.surface} />
          ) : (
            <Text style={{ color: theme.colors.surface, fontWeight: '700' }}>
              Submit reply
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};
