import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ErrorView, LoadingSpinner, ScreenHeader } from '../components/shared';
import { useAuth } from '../contexts/AuthContext';
import { me } from '../design-system/mint-editorial';
import type { JobsStackParamList } from '../navigation/types';
import { mobileApiClient } from '../utils/mobileApiClient';

type Proposal = {
  id: string;
  state: string;
  startsAt: string;
  endsAt: string | null;
  durationHours: number | null;
  yourProposal: boolean;
  canRespond: boolean;
  awaitingRole: 'homeowner' | 'contractor';
};
type Window = {
  scheduled_start_date: string | null;
  scheduled_end_date: string | null;
  scheduled_duration_hours: number | null;
  active: boolean;
  proposal: Proposal | null;
};
type WindowChange =
  | {
      uk_start: string;
      uk_end: string | null;
      scheduled_duration_hours?: number;
    }
  | { proposalId: string; decision: 'accepted' | 'declined' | 'withdrawn' };
const ukDisplay = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London',
  dateStyle: 'medium',
  timeStyle: 'short',
});
const format = (date: string) => ukDisplay.format(new Date(date)) + ' UK time';
const ukWallTime = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;

export function JobWorkWindowScreen({
  route,
  navigation,
}: NativeStackScreenProps<JobsStackParamList, 'JobWorkWindow'>) {
  const { user } = useAuth();
  const url =
    '/api/jobs/' + encodeURIComponent(route.params.jobId) + '/schedule';
  const [editing, setEditing] = useState(false);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [duration, setDuration] = useState('');
  const [validation, setValidation] = useState('');
  const schedule = useQuery({
    queryKey: ['work-window', user?.id, route.params.jobId],
    enabled: !!user?.id,
    queryFn: ({ signal }) => mobileApiClient.get<Window>(url, { signal }),
    retry: false,
  });
  const save = useMutation({
    mutationFn: (values: WindowChange) =>
      'proposalId' in values
        ? mobileApiClient.patch(url, values)
        : mobileApiClient.post(url, values),
    onSuccess: async () => {
      setEditing(false);
      await schedule.refetch();
    },
  });
  const current = user?.id ? schedule.data : undefined;
  const proposal = current?.proposal;
  const available =
    !!current?.active &&
    !save.isPending &&
    !schedule.isFetching &&
    !schedule.isError;

  function send() {
    if (!available) return;
    if (
      !ukWallTime.test(start.trim()) ||
      (end.trim() && !ukWallTime.test(end.trim())) ||
      (duration.trim() && !/^[1-9]\d*$/.test(duration.trim()))
    ) {
      setValidation(
        'Use YYYY-MM-DD HH:mm for UK dates and enter a whole number of hours.'
      );
      return;
    }
    setValidation('');
    save.mutate({
      uk_start: start.trim().replace(' ', 'T'),
      uk_end: end.trim().replace(' ', 'T') || null,
      ...(duration.trim()
        ? { scheduled_duration_hours: Number(duration) }
        : {}),
    });
  }

  function respond(decision: 'accepted' | 'declined' | 'withdrawn') {
    if (!available || !proposal) return;
    save.mutate({ proposalId: proposal.id, decision });
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader
        title='Current work window'
        onBackPress={() => navigation.goBack()}
      />
      {user?.id && schedule.isPending ? (
        <LoadingSpinner message='Loading work window…' />
      ) : current ? (
        <ScrollView contentContainerStyle={styles.content}>
          <Text>
            {current.scheduled_start_date
              ? format(current.scheduled_start_date)
              : 'No work window agreed yet.'}
          </Text>
          {current.scheduled_end_date && (
            <Text>Ends {format(current.scheduled_end_date)}</Text>
          )}
          {!!current.scheduled_duration_hours && (
            <Text>
              Estimated duration: {current.scheduled_duration_hours} hours
            </Text>
          )}
          <Text>
            Accepted dates update the job calendar. Signed agreement dates and
            individual visits stay as they are.
          </Text>
          {save.error && (
            <Text accessibilityRole='alert'>{save.error.message}</Text>
          )}
          {schedule.isError && (
            <ErrorView
              message='Could not refresh dates.'
              onRetry={() => {
                void schedule.refetch();
              }}
            />
          )}
          {proposal?.state === 'pending' ? (
            <>
              <Text style={styles.title}>Proposed work window</Text>
              <Text>
                {format(proposal.startsAt)}
                {proposal.endsAt ? ' to ' + format(proposal.endsAt) : ''}
              </Text>
              {!!proposal.durationHours && (
                <Text>Estimated duration: {proposal.durationHours} hours</Text>
              )}
              <Text>
                {proposal.canRespond
                  ? 'Waiting for your response.'
                  : 'Waiting for the ' + proposal.awaitingRole + ' to respond.'}
              </Text>
              {proposal.canRespond && (
                <>
                  <TouchableOpacity
                    accessibilityRole='button'
                    disabled={!available}
                    onPress={() => respond('accepted')}
                  >
                    <Text style={styles.link}>Accept proposed dates</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    accessibilityRole='button'
                    disabled={!available}
                    onPress={() => respond('declined')}
                  >
                    <Text style={styles.link}>Decline proposed dates</Text>
                  </TouchableOpacity>
                </>
              )}
              {proposal.yourProposal && (
                <TouchableOpacity
                  accessibilityRole='button'
                  disabled={!available}
                  onPress={() => respond('withdrawn')}
                >
                  <Text style={styles.link}>Withdraw proposal</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <>
              {proposal && <Text>Latest proposal: {proposal.state}.</Text>}
              {current.active && editing ? (
                <>
                  <Text>
                    Enter dates and times in UK time using YYYY-MM-DD HH:mm.
                  </Text>
                  <TextInput
                    accessibilityLabel='Start date and time (UK)'
                    placeholder='Start · YYYY-MM-DD HH:mm'
                    style={styles.input}
                    value={start}
                    onChangeText={setStart}
                  />
                  <TextInput
                    accessibilityLabel='End date and time (UK)'
                    placeholder='Optional end · YYYY-MM-DD HH:mm'
                    style={styles.input}
                    value={end}
                    onChangeText={setEnd}
                  />
                  <TextInput
                    accessibilityLabel='Estimated duration in hours'
                    placeholder='Optional duration in hours'
                    style={styles.input}
                    value={duration}
                    onChangeText={setDuration}
                    keyboardType='number-pad'
                  />
                  {!!validation && (
                    <Text accessibilityRole='alert'>{validation}</Text>
                  )}
                  <TouchableOpacity
                    accessibilityRole='button'
                    disabled={!available}
                    onPress={send}
                  >
                    <Text style={styles.link}>
                      {save.isPending ? 'Sending…' : 'Send proposal'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    accessibilityRole='button'
                    disabled={save.isPending}
                    onPress={() => setEditing(false)}
                  >
                    <Text style={styles.link}>Cancel</Text>
                  </TouchableOpacity>
                </>
              ) : (
                current.active && (
                  <TouchableOpacity
                    accessibilityRole='button'
                    disabled={!available}
                    onPress={() => {
                      save.reset();
                      setEditing(true);
                    }}
                  >
                    <Text style={styles.link}>Propose new dates</Text>
                  </TouchableOpacity>
                )
              )}
            </>
          )}
        </ScrollView>
      ) : (
        <ErrorView
          message='Unable to load this work window.'
          onRetry={() => {
            if (user?.id) void schedule.refetch();
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: me.bg },
  content: { padding: 20, gap: 14 },
  title: { fontSize: 19, fontWeight: '600', color: me.ink },
  link: { paddingVertical: 8, color: me.brand, fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, color: me.ink },
});
