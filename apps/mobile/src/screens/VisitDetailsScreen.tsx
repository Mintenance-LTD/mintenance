import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import { ErrorView, LoadingSpinner, ScreenHeader } from '../components/shared';
import { useAuth } from '../contexts/AuthContext';
import { me } from '../design-system/mint-editorial';
import type { JobsStackParamList } from '../navigation/types';
import { mobileApiClient } from '../utils/mobileApiClient';
import { VisitResponse } from './VisitResponse';

type Slot = { date: string; start: string; end: string };
type Visit = {
  id: string;
  title: string;
  date: string;
  time: string;
  endTime: string;
  status: string;
  clientResponse: string;
  clientResponseAt?: string | null;
  canRespond: boolean;
  locationAddress?: string | null;
  job?: { id: string; title: string };
  client?: { name: string };
  history?: { kind: string; previousSlot: Slot | null; slot: Slot }[];
};

const ukDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/London',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const ukTime = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});
const ukDate = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London',
  dateStyle: 'long',
});
const slotLabel = (slot: Slot) =>
  ukDate.format(new Date(slot.date + 'T12:00:00Z')) +
  ' · ' +
  slot.start.slice(0, 5) +
  '–' +
  slot.end.slice(0, 5) +
  ' UK';

export function VisitDetailsScreen({
  route,
  navigation,
}: NativeStackScreenProps<JobsStackParamList, 'VisitDetails'>) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const id = route.params.appointmentId;
  const {
    data: visit,
    isPending,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['visit', user?.id, id],
    enabled: !!user?.id,
    queryFn: async ({ signal }) => {
      const data = await mobileApiClient.get<{ visit: Visit | null }>(
        '/api/appointments?view=visit&id=' + encodeURIComponent(id),
        { signal }
      );
      if (data.visit?.id !== id) throw new Error('Visit unavailable');
      return data.visit;
    },
    retry: false,
  });
  const now = new Date();
  const parts = ukDay.formatToParts(now);
  const today = ['year', 'month', 'day']
    .map((part) => parts.find(({ type }) => type === part)?.value)
    .join('-');
  const ended =
    !!visit &&
    (['completed', 'cancelled', 'no_show'].includes(visit.status) ||
      visit.date < today ||
      (visit.date === today &&
        visit.endTime.slice(0, 5) <= ukTime.format(now)));
  const contractor = user?.role === 'contractor';
  const change = visit?.history?.find(
    (event) =>
      event.kind === 'rescheduled' &&
      event.previousSlot &&
      event.slot.date === visit.date &&
      event.slot.start === visit.time &&
      event.slot.end === visit.endTime
  );

  function openNewVisit() {
    if (!visit) return;
    const params = new URLSearchParams({ newVisit: 'true' });
    if (visit.client?.name) params.set('clientName', visit.client.name);
    if (visit.job) {
      params.set('jobId', visit.job.id);
      params.set('jobTitle', visit.job.title);
    }
    const webUrl =
      process.env.EXPO_PUBLIC_WEB_URL || 'https://www.mintenance.co.uk';
    void WebBrowser.openBrowserAsync(
      new URL('/contractor/scheduling?' + params, webUrl).href
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader
        title='Visit details'
        onBackPress={() => navigation.goBack()}
      />
      {user?.id && isPending ? (
        <LoadingSpinner message='Loading visit…' />
      ) : user?.id && !isError && visit ? (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>{visit.title}</Text>
          <Text>
            {slotLabel({
              date: visit.date,
              start: visit.time,
              end: visit.endTime,
            })}
          </Text>
          <Text>
            {visit.status === 'rescheduled' &&
            visit.clientResponse !== 'confirmed'
              ? 'Not confirmed'
              : visit.status.replaceAll('_', ' ')}
          </Text>
          {change?.previousSlot && (
            <>
              <Text>Previous time · {slotLabel(change.previousSlot)}</Text>
              <Text>Proposed time · {slotLabel(change.slot)}</Text>
            </>
          )}
          {!!visit.locationAddress && <Text>{visit.locationAddress}</Text>}
          <VisitResponse
            id={visit.id}
            date={visit.date}
            start={visit.time}
            end={visit.endTime}
            response={visit.clientResponse}
            past={ended}
            canRespond={
              !ended &&
              visit.canRespond &&
              !contractor &&
              visit.status !== 'in_progress'
            }
            onSaved={() => {
              void refetch();
              void queryClient.invalidateQueries({
                queryKey: ['contractor-schedule', user.id],
              });
            }}
          />
          {visit.clientResponseAt && (
            <Text>
              Response recorded{' '}
              {ukDate.format(new Date(visit.clientResponseAt))}
            </Text>
          )}
          {visit.job && (
            <TouchableOpacity
              accessibilityRole='button'
              onPress={() => {
                if (visit.job)
                  navigation.navigate('JobDetails', { jobId: visit.job.id });
              }}
            >
              <Text style={styles.link}>View job</Text>
            </TouchableOpacity>
          )}
          {contractor && ended && (
            <TouchableOpacity accessibilityRole='button' onPress={openNewVisit}>
              <Text style={styles.link}>Create a new visit on web</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      ) : (
        <ErrorView
          message='Unable to load this visit. Sign in and check access.'
          onRetry={() => {
            if (user?.id) void refetch();
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: me.bg },
  content: { padding: 20, gap: 14 },
  title: { fontSize: 22, fontWeight: '600', color: me.ink },
  link: { paddingVertical: 8, color: me.brand, fontWeight: '600' },
});
