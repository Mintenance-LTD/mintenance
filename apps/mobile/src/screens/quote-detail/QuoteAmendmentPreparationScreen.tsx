import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CommonActions } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../../navigation/types';
import { useAuth } from '../../contexts/AuthContext';
import {
  getAmendmentSource,
  getAmendmentHistory,
  type AmendmentSource,
} from '../../services/quotes/QuoteAmendmentPreparation';
import type { QuoteRevision } from '../../services/quotes/types';
import {
  AmendmentPriceEditor,
  PreparationAction,
} from './AmendmentPriceEditor';
import { AmendmentProposalCard } from './AmendmentProposalCard';
import { amendmentStyles as s } from './amendmentPreparationStyles';

export function QuoteAmendmentPreparationScreen({
  route,
  navigation,
}: NativeStackScreenProps<ProfileStackParamList, 'QuoteAmendmentPreparation'>) {
  const { quoteId } = route.params;
  const { user } = useAuth();
  const [source, setSource] = useState<AmendmentSource | null>(null),
    [revisions, setRevisions] = useState<QuoteRevision[]>([]);
  const [next, setNext] = useState<number | null>(null),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(''),
    [editing, setEditing] = useState(false),
    [message, setMessage] = useState('');
  const generation = useRef(0),
    lock = useRef(false),
    scroll = useRef<ScrollView>(null);
  const load = useCallback(
    async (before?: number) => {
      if (lock.current) return;
      lock.current = true;
      const request = ++generation.current;
      setLoading(true);
      setError('');
      if (!before) {
        setSource(null);
        setRevisions([]);
        setNext(null);
        setEditing(false);
      }
      try {
        if (!user?.id) throw new Error('Sign in to review your quote history.');
        const [current, page] = await Promise.all([
          before ? Promise.resolve(null) : getAmendmentSource(quoteId),
          getAmendmentHistory(quoteId, before),
        ]);
        if (request !== generation.current) return;
        if (current) setSource(current);
        setRevisions((previous) =>
          before ? [...previous, ...page.revisions] : page.revisions
        );
        setNext(page.next_before);
      } catch (err) {
        if (request === generation.current)
          setError(
            err instanceof Error
              ? err.message
              : 'Could not load quote history. Try again.'
          );
      } finally {
        if (request === generation.current) {
          lock.current = false;
          setLoading(false);
        }
      }
    },
    [quoteId, user?.id]
  );
  useEffect(() => {
    const generationRef = generation;
    lock.current = false;
    setMessage('');
    void load();
    return () => {
      generationRef.current++;
    };
  }, [load]);
  const currentGeneration = generation.current;
  const current =
    source?.is_current === true && source.quote.status === 'accepted';
  const review = () => {
    if (source?.quote.job_id)
      navigation.dispatch(
        CommonActions.navigate('Main', {
          screen: 'JobsTab',
          params: {
            screen: 'QuoteAmendments',
            params: { jobId: source.quote.job_id },
          },
        })
      );
  };
  return (
    <SafeAreaView style={s.screen}>
      <PreparationAction
        title='Back to quote'
        onPress={() => navigation.goBack()}
      />
      <KeyboardAvoidingView
        style={s.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          ref={scroll}
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps='handled'
          keyboardDismissMode='on-drag'
        >
          <Text accessibilityRole='header' style={s.title}>
            Quote amendment preparation
          </Text>
          {loading && (
            <Text accessibilityLiveRegion='polite' style={s.text}>
              Loading quote history…
            </Text>
          )}
          {!!error && (
            <Text accessibilityRole='alert' style={s.error}>
              {error}
            </Text>
          )}
          {!!message && (
            <Text accessibilityLiveRegion='polite' style={s.text}>
              {message}
            </Text>
          )}
          {!editing && (
            <PreparationAction
              title='Refresh quote and history'
              disabled={loading}
              onPress={() => void load()}
            />
          )}
          {source && (
            <View style={s.section}>
              <Text style={s.heading}>{source.quote.title}</Text>
              <Text style={s.text}>
                {source.quote.status === 'accepted'
                  ? 'Accepted source total'
                  : 'Source quote total'}
                :{' '}
                {source.quote.total_amount == null
                  ? 'Not recorded'
                  : `£${Number(source.quote.total_amount).toFixed(2)}`}
              </Text>
              <Text style={s.text}>
                Terms remain unchanged: {source.quote.terms || 'None recorded'}
              </Text>
              {!source.is_current && (
                <Text style={s.text}>
                  This is a historical quote. An applied amendment replaced its
                  pricing; prepare changes from the current quote.
                </Text>
              )}
              {source.quote.status !== 'accepted' && (
                <Text style={s.text}>
                  Amendment preparation requires an accepted quote. Draft prices
                  can be edited from quote details.
                </Text>
              )}
              {current && !editing && (
                <PreparationAction
                  title='Prepare new pricing proposal'
                  disabled={loading || !!error}
                  onPress={() => {
                    setMessage('');
                    setEditing(true);
                    scroll.current?.scrollTo({ y: 0, animated: true });
                  }}
                />
              )}
              {editing && (
                <AmendmentPriceEditor
                  key={`${quoteId}:${user?.id}`}
                  source={source}
                  onSaved={(revision) => {
                    if (currentGeneration !== generation.current) return;
                    setEditing(false);
                    setRevisions((previous) => [
                      revision,
                      ...previous.filter((r) => r.id !== revision.id),
                    ]);
                    setMessage(
                      'Proposal saved. The accepted price is unchanged. Review the recorded breakdown below before submitting it to the customer.'
                    );
                  }}
                  onCancel={() => setEditing(false)}
                  onReload={() => void load()}
                />
              )}
              {!editing && source.quote.job_id && (
                <PreparationAction
                  title='Open customer review and decisions'
                  onPress={review}
                />
              )}
            </View>
          )}
          {!editing && source && (
            <>
              <Text style={s.heading}>Recorded history</Text>
              <Text style={s.text}>
                History starts when recording was enabled. Saved proposals are
                immutable; prepare another proposal to change prices.
              </Text>
              {!error && !loading && revisions.length === 0 && (
                <Text style={s.text}>No revisions recorded yet.</Text>
              )}
              {revisions.map((revision) => (
                <AmendmentProposalCard
                  key={revision.id}
                  revision={revision}
                  jobId={source.quote.job_id}
                  canPublish={current && !loading && !error}
                  onReview={review}
                  onPublished={() => {
                    if (currentGeneration !== generation.current) return;
                    setRevisions((previous) =>
                      previous.map((r) =>
                        r.id === revision.id
                          ? { ...r, amendment: { status: 'published' } }
                          : r
                      )
                    );
                  }}
                />
              ))}
              {next !== null && (
                <PreparationAction
                  title='Load older revisions'
                  disabled={loading || !!error}
                  onPress={() => void load(next)}
                />
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
