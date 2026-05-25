/**
 * JobSignOffScreen — deprecated redirect to PhotoReview.
 *
 * 2026-05-26 audit-52 P2: this screen previously rendered a text-only
 * approve / request-change UX that direct-read job state from Supabase
 * and let the homeowner approve a completion WITHOUT seeing the
 * before/after photo evidence. The server gates still required after
 * photos (confirm-completion route, audit-32) but the UX let the
 * homeowner click Approve based on the contractor's word alone.
 *
 * The canonical surface is HomeownerPhotoReviewScreen (registered as
 * the `PhotoReview` route) which renders the BeforeAfterSlider before
 * exposing approve / request-changes actions, so any caller that
 * still navigates to JobSignOff (older JobDetails quick-action,
 * deep-link, push payload) gets redirected via navigation.replace.
 *
 * Kept the route registered + the screen as a stub so existing
 * navigator references keep type-checking. Once we're confident no
 * production EAS build still navigates here, both can be deleted.
 */
import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { JobsStackParamList } from '../../navigation/types';
import { me } from '../../design-system/mint-editorial';

type Props = NativeStackScreenProps<JobsStackParamList, 'JobSignOff'>;

export const JobSignOffScreen: React.FC<Props> = ({ route, navigation }) => {
  const { jobId } = route.params;

  useEffect(() => {
    // navigation.replace so the back button skips this stub on the
    // return swipe — no flicker of "Sign-off" mid-stack.
    navigation.replace('PhotoReview', { jobId });
  }, [navigation, jobId]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size='large' color={me.brand} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: me.bg2,
  },
});
