import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { User } from '@mintenance/types';
import { me } from '../../../design-system/mint-editorial';

interface ProfileCompletenessProps {
  user: User | null;
  completedJobs: number;
}

interface CompletenessField {
  label: string;
  weight: number;
  check: (user: User) => boolean;
}

const FIELDS: CompletenessField[] = [
  { label: 'First name', weight: 15, check: (u) => !!u.first_name?.trim() },
  { label: 'Last name', weight: 15, check: (u) => !!u.last_name?.trim() },
  { label: 'Email', weight: 10, check: (u) => !!u.email?.trim() },
  { label: 'Phone number', weight: 10, check: (u) => !!u.phone?.trim() },
  {
    label: 'Profile photo',
    weight: 15,
    check: (u) => !!(u.profile_image_url?.trim() || u.avatar_url?.trim()),
  },
  { label: 'Bio', weight: 15, check: (u) => !!u.bio?.trim() },
  {
    label: 'Location',
    weight: 10,
    check: (u) => !!(u.city?.trim() || u.location?.trim() || u.address?.trim()),
  },
  {
    label: 'Activity',
    weight: 10,
    check: () => false,
  },
];

function calculateCompleteness(user: User, completedJobs: number): number {
  let total = 0;
  for (const field of FIELDS) {
    if (field.label === 'Activity') {
      if (completedJobs > 0) total += field.weight;
    } else if (field.check(user)) {
      total += field.weight;
    }
  }
  return Math.min(total, 100);
}

export const ProfileCompleteness: React.FC<ProfileCompletenessProps> = ({
  user,
  completedJobs,
}) => {
  const navigation = useNavigation<{ navigate: (screen: string) => void }>();
  const animatedWidth = useRef(new Animated.Value(0)).current;
  const [dismissed, setDismissed] = useState(false);

  const percentage = useMemo(() => {
    if (!user) return 0;
    return calculateCompleteness(user, completedJobs);
  }, [user, completedJobs]);

  const isComplete = percentage >= 100;

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: percentage,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [percentage, animatedWidth]);

  useEffect(() => {
    if (isComplete) {
      const timer = setTimeout(() => setDismissed(true), 3000);
      return () => clearTimeout(timer);
    }
    setDismissed(false);
  }, [isComplete]);

  if (!user || dismissed) return null;

  const fillWidth = animatedWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        {isComplete ? (
          <View style={styles.completeRow}>
            <Ionicons name='checkmark-circle' size={16} color={me.brand} />
            <Text style={styles.completeText}>Profile complete!</Text>
          </View>
        ) : (
          <>
            <Text style={styles.label}>Profile {percentage}% complete</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('EditProfile')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole='link'
              accessibilityLabel='Complete your profile now'
            >
              <Text style={styles.cta}>Complete now &rarr;</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={styles.track}>
        <Animated.View
          style={[
            styles.fill,
            {
              width: fillWidth,
              backgroundColor: isComplete ? me.brand : me.ink,
            },
          ]}
        />
      </View>

      {!isComplete && (
        <Text style={styles.hint}>
          Complete your profile to appear higher in search
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 8,
    padding: 16,
    borderRadius: 16,
    backgroundColor: me.surface,
    ...me.shadow.card,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: me.ink,
  },
  cta: {
    fontSize: 13,
    fontWeight: '600',
    color: me.ink,
  },
  completeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  completeText: {
    fontSize: 14,
    fontWeight: '600',
    color: me.brand,
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: me.bg2,
    overflow: 'hidden',
  },
  fill: {
    height: 6,
    borderRadius: 3,
  },
  hint: {
    fontSize: 12,
    color: me.ink2,
    marginTop: 6,
  },
});
