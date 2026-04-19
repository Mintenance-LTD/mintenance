/**
 * HomeHealthCtaCard — deferred #6 of R5.
 *
 * Small dashboard card prompting homeowners to subscribe to the
 * £9.99/mo Home Health plan. Self-hides when the user is already
 * subscribed (we check `/api/subscriptions/home-health` GET, which
 * R5 shipped). Tapping jumps to the HomeHealthSubscribe modal.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { mobileApiClient } from '../../../utils/mobileApiClient';
import { theme } from '../../../theme';

interface Response {
  subscription: { status: string } | null;
}

type NavParams = Record<string, object | undefined>;

export const HomeHealthCtaCard: React.FC = () => {
  const navigation = useNavigation<NavigationProp<NavParams>>();
  const [alreadySubscribed, setAlreadySubscribed] = useState<boolean | null>(
    null
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await mobileApiClient.get<Response>(
          '/api/subscriptions/home-health'
        );
        if (!cancelled) {
          const s = res?.subscription?.status;
          setAlreadySubscribed(
            !!s && s !== 'canceled' && s !== 'incomplete_expired'
          );
        }
      } catch {
        if (!cancelled) setAlreadySubscribed(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (alreadySubscribed !== false) return null;

  return (
    <TouchableOpacity
      onPress={() =>
        navigation.navigate('ProfileTab', {
          screen: 'HomeHealthSubscribe',
        })
      }
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: 14,
        padding: 16,
        marginHorizontal: 16,
        marginTop: 12,
        borderWidth: 1,
        borderColor: theme.colors.primaryLight,
        flexDirection: 'row',
        alignItems: 'center',
      }}
      accessibilityRole='button'
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: theme.colors.primaryLight,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12,
        }}
      >
        <Ionicons
          name='shield-checkmark'
          size={22}
          color={theme.colors.primary}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 15,
            fontWeight: '700',
            color: theme.colors.textPrimary,
          }}
        >
          Home Health — £9.99/mo
        </Text>
        <Text
          style={{
            fontSize: 12,
            color: theme.colors.textSecondary,
            marginTop: 2,
          }}
          numberOfLines={2}
        >
          Annual boiler service, smoke alarms, gutter cleans. We schedule it all
          automatically.
        </Text>
      </View>
      <Ionicons
        name='chevron-forward'
        size={20}
        color={theme.colors.textTertiary}
      />
    </TouchableOpacity>
  );
};
