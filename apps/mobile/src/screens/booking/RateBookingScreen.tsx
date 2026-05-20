import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useToast } from '../../components/ui/Toast';
import { mobileApiClient } from '../../utils/mobileApiClient';
import type { RootStackParamList } from '../../navigation/types';
import { me } from '../../design-system/mint-editorial';

interface Props {
  navigation: NativeStackNavigationProp<RootStackParamList, 'RateBooking'>;
  route: RouteProp<RootStackParamList, 'RateBooking'>;
}

const STAR_LABELS = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

export const RateBookingScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { bookingId } = route.params;

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error(
        'Rating required',
        'Please select a star rating before submitting.'
      );
      return;
    }

    setLoading(true);
    try {
      await mobileApiClient.post(`/api/bookings/${bookingId}/review`, {
        rating,
        comment: comment.trim() || undefined,
      });
      toast.success('Review submitted', 'Thank you for your feedback!');
      navigation.goBack();
    } catch {
      toast.error('Failed to submit review', 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle='dark-content' backgroundColor={me.surface} />
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name='arrow-back' size={24} color={me.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rate Booking</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps='handled'
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>How was your experience?</Text>
          <Text style={styles.cardSubtitle}>
            Your feedback helps us improve the service quality.
          </Text>

          {/* Star Rating */}
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setRating(star)}
                style={styles.starButton}
              >
                <Ionicons
                  name={star <= rating ? 'star' : 'star-outline'}
                  size={40}
                  color={star <= rating ? me.accent : me.line}
                />
              </TouchableOpacity>
            ))}
          </View>

          {rating > 0 && (
            <Text style={styles.ratingLabel}>{STAR_LABELS[rating]}</Text>
          )}

          {/* Comment */}
          <Text style={styles.commentLabel}>COMMENTS (OPTIONAL)</Text>
          <TextInput
            style={styles.commentInput}
            multiline
            numberOfLines={4}
            placeholder='Share your experience with this contractor...'
            placeholderTextColor={me.ink3}
            value={comment}
            onChangeText={setComment}
            maxLength={500}
            textAlignVertical='top'
          />
          <Text style={styles.charCount}>{comment.length}/500</Text>
        </View>

        <TouchableOpacity
          style={[
            styles.submitButton,
            (loading || rating === 0) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={loading || rating === 0}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Submitting\u2026' : 'Submit Review'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: me.bg2 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: me.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: me.line,
  },
  headerButton: { padding: 8, width: 40 },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: me.ink,
  },
  content: { padding: 16 },
  card: {
    backgroundColor: me.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    ...me.shadow.card,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: me.ink,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: me.ink2,
    marginBottom: 20,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  starButton: { padding: 4 },
  ratingLabel: {
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
    color: me.accent,
    marginBottom: 20,
  },
  commentLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: me.ink3,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  commentInput: {
    backgroundColor: me.bg2,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: me.ink,
    minHeight: 100,
  },
  charCount: {
    textAlign: 'right',
    fontSize: 11,
    color: me.ink3,
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: me.ink,
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: {
    color: me.onBrand,
    fontSize: 16,
    fontWeight: '700',
  },
});
