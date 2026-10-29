import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  onboardingPersonas,
  PERSONA_LABELS,
  guidesForPersona,
  type OnboardingPersona,
  type FeatureGuide,
} from '@mintenance/shared';
import { useAuth } from '../../contexts/AuthContext';
import { mobileApiClient } from '../../utils/mobileApiClient';
import { useOnboardingTokens } from '../../hooks/useOnboardingTheme';
import { OnboardingModal } from '../../components/onboarding/OnboardingModal';
import { ScreenHeader } from '../../components/shared';
import { useOnboardingAudience } from '../../hooks/useOnboardingAudience';

export function GettingStartedScreen() {
  const { user } = useAuth();
  const audience = useOnboardingAudience();
  if (!user) return null;
  return (
    <AccountGuides
      key={`${user.id}:${audience.audience}`}
      userId={user.id}
      role={user.role}
      initialPersona={audience.audience}
    />
  );
}
function AccountGuides({
  userId,
  role,
  initialPersona,
}: {
  userId: string;
  role: string;
  initialPersona?: string | null;
}) {
  const navigation =
    useNavigation<NavigationProp<Record<string, object | undefined>>>();
  const me = useOnboardingTokens();
  const [replay, setReplay] = useState(false);
  const personas = onboardingPersonas(role);
  const [persona, setPersona] = useState<OnboardingPersona>(
    personas.find((p) => p === initialPersona) ?? personas[0] ?? 'homeowner'
  );
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const guides = guidesForPersona(persona);
  const current = guides.find((g) => g.id === selected) ?? guides[0];
  const nextGuide = guides[guides.findIndex((g) => g.id === current?.id) + 1];
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: me.bg }}>
      <OnboardingModal
        audience={persona}
        visible={replay}
        userRole={role}
        onDismiss={() => setReplay(false)}
        onComplete={() => setReplay(false)}
      />
      <ScreenHeader
        title='Getting started'
        showBack={navigation.canGoBack()}
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <Text style={{ color: me.ink, fontSize: 16 }}>
          Choose the guides for how you use Mintenance. Your account and
          permissions determine which features you can use.
        </Text>
        {['homeowner', 'contractor'].includes(role) && (
          <TouchableOpacity
            accessibilityRole='button'
            onPress={() => setReplay(true)}
            style={{ paddingVertical: 12 }}
          >
            <Text style={{ color: me.ink, textDecorationLine: 'underline' }}>
              Replay the introduction
            </Text>
          </TouchableOpacity>
        )}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {personas.map((p) => (
            <TouchableOpacity
              key={p}
              accessibilityRole='button'
              accessibilityState={{ selected: p === persona }}
              onPress={() => {
                setPersona(p);
                setSelected(null);
              }}
              style={{
                padding: 12,
                minHeight: 44,
                borderRadius: 20,
                backgroundColor: p === persona ? me.brandSoft : me.surface,
              }}
            >
              <Text style={{ color: me.ink }}>{PERSONA_LABELS[p]}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          accessibilityLabel='Find a feature guide'
          value={search}
          onChangeText={setSearch}
          placeholder='Find a feature'
          placeholderTextColor={me.ink2}
          style={{
            backgroundColor: me.surface,
            color: me.ink,
            padding: 14,
            borderRadius: 12,
          }}
        />
        {current && (
          <MobileGuide
            key={`${persona}:${current.id}`}
            userId={userId}
            persona={persona}
            guide={current}
            role={role}
          />
        )}
        {nextGuide && (
          <TouchableOpacity
            accessibilityRole='button'
            onPress={() => setSelected(nextGuide.id)}
            style={{ paddingVertical: 12 }}
          >
            <Text style={{ color: me.ink, textDecorationLine: 'underline' }}>
              Next guide: {nextGuide.title}
            </Text>
          </TouchableOpacity>
        )}
        {guides
          .filter((g) =>
            `${g.title} ${g.steps.join(' ')}`
              .toLowerCase()
              .includes(search.toLowerCase())
          )
          .map((g) => (
            <TouchableOpacity
              accessibilityRole='button'
              key={g.id}
              onPress={() => setSelected(g.id)}
              style={{
                padding: 16,
                borderRadius: 12,
                backgroundColor: me.surface,
              }}
            >
              <Text
                style={{
                  fontFamily: me.font.display,
                  fontSize: 18,
                  color: me.ink,
                }}
              >
                {g.title}
              </Text>
              <Text style={{ marginTop: 6, color: me.ink2 }}>{g.steps[0]}</Text>
            </TouchableOpacity>
          ))}
      </ScrollView>
    </SafeAreaView>
  );
}
function MobileGuide({
  userId,
  persona,
  guide,
  role,
}: {
  userId: string;
  persona: OnboardingPersona;
  guide: FeatureGuide;
  role: string;
}) {
  const navigation =
    useNavigation<NavigationProp<Record<string, object | undefined>>>();
  const me = useOnboardingTokens();
  const journey = `guide-${persona}-${guide.id}`;
  const key = `onboarding:v2:mobile:${userId}:${journey}`;
  const [read, setRead] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const saveInFlight = useRef(false);
  const revision = useRef(0);
  const nativeTarget = ['post-job'].includes(guide.id)
    ? { screen: 'JobsTab', params: { screen: 'JobPosting' } }
    : ['bids', 'completion', 'find-work', 'evidence'].includes(guide.id)
      ? { screen: 'JobsTab', params: { screen: 'JobsList' } }
      : ['messages', 'trade-messages'].includes(guide.id)
        ? { screen: 'MessagingTab', params: { screen: 'MessagesList' } }
        : null;
  async function save() {
    if (saveInFlight.current) return;
    saveInFlight.current = true;
    revision.current++;
    setSaving(true);
    setRead(true);
    try {
      await AsyncStorage.setItem(key, 'pending');
      await mobileApiClient.put('/api/onboarding/progress', {
        journey,
        platform: 'mobile',
        status: 'completed',
        step: guide.steps.length,
      });
      await AsyncStorage.setItem(key, 'read');
      setError(null);
    } catch {
      setError(
        'Could not confirm saved progress. Tap Retry to save it to your account.'
      );
    } finally {
      saveInFlight.current = false;
      setSaving(false);
    }
  }
  useEffect(() => {
    let active = true;
    const loadRevision = revision.current;
    Promise.allSettled([
      AsyncStorage.getItem(key),
      mobileApiClient.get<{
        progress: { journey: string; platform: string; status: string }[];
      }>('/api/onboarding/progress'),
    ]).then(([local, remote]) => {
      if (!active || loadRevision !== revision.current) return;
      const cached = local.status === 'fulfilled' ? local.value : null;
      setRead(
        !!cached ||
          (remote.status === 'fulfilled' &&
            remote.value.progress.some(
              (p) =>
                p.journey === journey &&
                p.platform === 'mobile' &&
                p.status === 'completed'
            ))
      );
      if (cached === 'pending')
        setError('Guide progress is waiting to sync. Tap Retry.');
      else if (remote.status === 'rejected')
        setError(
          'Account progress is unavailable. You can still read the guide.'
        );
    });
    return () => {
      active = false;
    };
  }, [key, journey]);
  async function open() {
    if (nativeTarget && role !== 'admin') {
      navigation.navigate(nativeTarget.screen, nativeTarget.params);
      return;
    }
    if (guide.mobileScreen && role !== 'admin') {
      navigation.navigate(guide.mobileScreen);
      return;
    }
    try {
      const base =
        process.env.EXPO_PUBLIC_WEB_URL ||
        process.env.EXPO_PUBLIC_API_URL ||
        'https://www.mintenance.co.uk';
      await WebBrowser.openBrowserAsync(new URL(guide.href, base).toString());
    } catch {
      Alert.alert(
        'Could not open feature',
        'Please try again from the website.'
      );
    }
  }
  return (
    <View
      style={{
        padding: 20,
        borderRadius: 16,
        backgroundColor: me.brandSoft,
        gap: 12,
      }}
    >
      <Text
        accessibilityRole='header'
        style={{ fontFamily: me.font.display, fontSize: 22, color: me.ink }}
      >
        {guide.title}
      </Text>
      {guide.steps.map((step, index) => (
        <Text key={step} style={{ color: me.ink, fontSize: 16 }}>
          {index + 1}. {step}
        </Text>
      ))}
      <TouchableOpacity
        accessibilityRole='button'
        onPress={() => void open()}
        style={{ paddingVertical: 12 }}
      >
        <Text style={{ color: me.ink, textDecorationLine: 'underline' }}>
          {(nativeTarget || guide.mobileScreen) && role !== 'admin'
            ? 'Open feature'
            : 'Open on the website (sign-in may be needed)'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        accessibilityRole='button'
        disabled={saving}
        onPress={() => void save()}
        style={{ padding: 14, borderRadius: 24, backgroundColor: me.brand }}
      >
        <Text style={{ color: me.onBrand }}>
          {saving
            ? 'Saving…'
            : read
              ? 'Guide read — read again any time'
              : 'Mark guide as read'}
        </Text>
      </TouchableOpacity>
      {error && (
        <View>
          <Text accessibilityRole='alert' style={{ color: me.ink }}>
            {error}
          </Text>
          <TouchableOpacity
            accessibilityRole='button'
            onPress={() => void save()}
          >
            <Text
              style={{
                color: me.ink,
                paddingVertical: 12,
                textDecorationLine: 'underline',
              }}
            >
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      )}
      <Text style={{ color: me.ink2 }}>
        Reading this guide does not complete account setup or grant feature
        access.
      </Text>
    </View>
  );
}
