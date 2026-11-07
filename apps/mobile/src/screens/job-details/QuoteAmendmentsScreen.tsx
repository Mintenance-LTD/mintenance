import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { JobsStackParamList } from '../../navigation/types';
import { me } from '../../design-system/mint-editorial';
import {
  getQuoteAmendments,
  decideQuoteAmendment,
  type AmendmentPage,
  type QuoteAmendment,
  type AmendmentPricing,
  type AmendmentDecision,
} from '../../services/quotes/QuoteAmendments';

const money = (value: number | undefined) =>
  value == null || !Number.isFinite(Number(value))
    ? 'Not recorded'
    : new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP',
      }).format(Number(value));
function Action({
  title,
  onPress,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole='button'
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => {
        if (!disabled) onPress();
      }}
      style={[styles.button, disabled && styles.disabled]}
    >
      <Text style={styles.buttonText}>{title}</Text>
    </Pressable>
  );
}
function Pricing({ label, value }: { label: string; value: AmendmentPricing }) {
  return (
    <View style={styles.section}>
      <Text style={styles.heading}>{label}</Text>
      {value.line_items?.length ? (
        value.line_items.map((item, index) => (
          <Text style={styles.text} key={index}>
            {item.description || 'Description not recorded'}:{' '}
            {item.quantity ?? 'Not recorded'} ×{' '}
            {money(item.unitPrice ?? item.unit_price)} = {money(item.total)}
          </Text>
        ))
      ) : (
        <Text style={styles.text}>No item breakdown recorded.</Text>
      )}
      <Text style={styles.text}>Subtotal: {money(value.subtotal)}</Text>
      <Text style={styles.text}>
        Tax: {money(value.tax_amount)} ({value.tax_rate ?? 'Not recorded'}%)
      </Text>
      <Text style={styles.heading}>Total: {money(value.total_amount)}</Text>
      <Text style={styles.text}>Terms: {value.terms || 'None recorded'}</Text>
    </View>
  );
}
function AmendmentCard({
  item,
  jobId,
  canApprove,
  isContractor,
  onChanged,
}: {
  item: QuoteAmendment;
  jobId: string;
  canApprove: boolean;
  isContractor: boolean;
  onChanged: () => Promise<void>;
}) {
  const [reviewed, setReviewed] = useState(false),
    [note, setNote] = useState(''),
    [busy, setBusy] = useState(false);
  const [error, setError] = useState(''),
    [confirmed, setConfirmed] = useState(''),
    [blocked, setBlocked] = useState(false);
  const [pending, setPending] = useState<AmendmentDecision | null>(null);
  const lock = useRef(false);
  const act = async (action: AmendmentDecision['action']) => {
    if (lock.current || blocked || confirmed || !reviewed) return;
    lock.current = true;
    setBusy(true);
    setError('');
    const decision: AmendmentDecision = pending ?? {
      action,
      expected_version: item.version,
      confirmed: true,
      note,
    };
    setPending(decision);
    try {
      const result = await decideQuoteAmendment(jobId, item.id, decision);
      setPending(null);
      setConfirmed(
        `Recorded: ${result.amendment.status}.${result.warning ? ` ${result.warning}` : ''}`
      );
      await onChanged();
    } catch (err) {
      const status = (err as { statusCode?: number })?.statusCode;
      if (status && status >= 400 && status < 500) {
        setBlocked(true);
        setPending(null);
      }
      setError(
        err instanceof Error
          ? err.message
          : 'Could not confirm the outcome. Retry or refresh the review.'
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const customerAction = canApprove && item.status === 'published';
  const contractorAction =
    isContractor && ['published', 'approved'].includes(item.status);
  const disabled = busy || blocked || !!pending;
  return (
    <View style={styles.card}>
      <Text style={styles.heading}>
        Amendment {item.sequence} — {item.status}
      </Text>
      <Text style={styles.text}>{item.reason}</Text>
      <Pricing
        label='Previously accepted pricing'
        value={item.before_snapshot}
      />
      <Pricing label='Proposed pricing' value={item.after_snapshot} />
      {item.status === 'approved' && (
        <Text style={styles.text}>
          Customer approval is recorded. The accepted price remains unchanged
          until the contractor applies the amendment.
        </Text>
      )}
      {item.status === 'applied' && (
        <Text style={styles.text}>
          Pricing applied. The unsigned contract is back in draft and must be
          reviewed and signed through the normal contract process.
        </Text>
      )}
      {(customerAction || contractorAction) && !confirmed && (
        <View style={styles.section}>
          <Pressable
            accessibilityRole='checkbox'
            accessibilityLabel='I have reviewed the complete pricing'
            accessibilityState={{ checked: reviewed, disabled }}
            disabled={disabled}
            onPress={() => setReviewed(!reviewed)}
            style={styles.button}
          >
            <Text style={styles.buttonText}>
              {reviewed ? '✓ ' : ''}I have reviewed the complete pricing. This
              does not sign a contract or move money.
            </Text>
          </Pressable>
          <Text style={styles.text}>Decision note (optional)</Text>
          <TextInput
            accessibilityLabel='Decision note'
            value={note}
            onChangeText={setNote}
            maxLength={2000}
            multiline
            editable={!disabled}
            style={styles.input}
          />
          {customerAction && (
            <>
              <Action
                title='Approve proposal'
                disabled={!reviewed || disabled}
                onPress={() => void act('approve')}
              />
              <Action
                title='Reject proposal'
                disabled={!reviewed || disabled}
                onPress={() => void act('reject')}
              />
            </>
          )}
          {isContractor && item.status === 'approved' && (
            <Action
              title='Apply approved pricing'
              disabled={!reviewed || disabled}
              onPress={() => void act('apply')}
            />
          )}
          {contractorAction && (
            <Action
              title='Withdraw proposal'
              disabled={!reviewed || disabled}
              onPress={() => void act('withdraw')}
            />
          )}
        </View>
      )}
      {busy && (
        <Text accessibilityLiveRegion='polite' style={styles.text}>
          Saving action…
        </Text>
      )}
      {!!confirmed && (
        <Text accessibilityLiveRegion='polite' style={styles.text}>
          {confirmed}
        </Text>
      )}
      {!!error && (
        <Text accessibilityRole='alert' style={styles.error}>
          {error}
        </Text>
      )}
      {blocked && (
        <Text style={styles.text}>Refresh the review before continuing.</Text>
      )}
      {pending && !blocked && (
        <Action
          title='Retry same action'
          disabled={busy}
          onPress={() => void act(pending.action)}
        />
      )}
      <Text style={styles.heading}>Decision history</Text>
      {item.events.map((event) => (
        <View key={event.version}>
          <Text style={styles.text}>
            {event.action} —{' '}
            {new Date(event.created_at).toLocaleString('en-GB')}
          </Text>
          <Text style={styles.text}>{event.note}</Text>
        </View>
      ))}
    </View>
  );
}
export function QuoteAmendmentsScreen({
  route,
  navigation,
}: NativeStackScreenProps<JobsStackParamList, 'QuoteAmendments'>) {
  const { jobId } = route.params;
  const [data, setData] = useState<AmendmentPage | null>(null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(false),
    [epoch, setEpoch] = useState(0);
  const request = useRef(0),
    active = useRef(false);
  const load = useCallback(
    async (before?: number) => {
      const sequence = ++request.current;
      setLoading(true);
      setError('');
      try {
        const page = await getQuoteAmendments(jobId, before);
        if (!active.current || sequence !== request.current) return;
        setData((current) => ({
          ...page,
          amendments: before
            ? [...(current?.amendments ?? []), ...page.amendments]
            : page.amendments,
        }));
        if (!before) setEpoch((value) => value + 1);
      } catch (err) {
        if (active.current && sequence === request.current)
          setError(
            err instanceof Error
              ? err.message
              : 'Could not load amendments. Try again.'
          );
      } finally {
        if (active.current && sequence === request.current) setLoading(false);
      }
    },
    [jobId]
  );
  useFocusEffect(
    useCallback(() => {
      active.current = true;
      setData(null);
      void load();
      return () => {
        active.current = false;
        request.current++;
      };
    }, [load])
  );
  return (
    <SafeAreaView style={styles.screen}>
      <Action
        title='Back to job'
        onPress={() => navigation.replace('JobDetails', { jobId })}
      />
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps='handled'
          keyboardDismissMode='on-drag'
        >
          <Text accessibilityRole='header' style={styles.title}>
            Quote amendments
          </Text>
          <Text style={styles.text}>
            Review the complete pricing before approving. Approval does not sign
            a contract, charge a card or issue a refund. Application requires an
            unsigned contract without consent or financial records.
          </Text>
          <Action
            title='Refresh review'
            disabled={loading}
            onPress={() => void load()}
          />
          {loading && (
            <Text accessibilityLiveRegion='polite' style={styles.text}>
              Loading amendments…
            </Text>
          )}
          {!!error && (
            <Text accessibilityRole='alert' style={styles.error}>
              {error}
            </Text>
          )}
          {!error && !loading && data?.amendments.length === 0 && (
            <Text style={styles.text}>
              No proposals have been submitted for customer review.
            </Text>
          )}
          {data?.amendments.map((item) => (
            <AmendmentCard
              key={`${item.id}:${item.version}:${epoch}`}
              item={item}
              jobId={jobId}
              canApprove={data.can_approve && !loading && !error}
              isContractor={data.is_contractor && !loading && !error}
              onChanged={load}
            />
          ))}
          {data?.next_before != null && (
            <Action
              title='Load older amendments'
              disabled={loading || !!error}
              onPress={() => void load(data.next_before!)}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: me.surface },
  content: { padding: 16, paddingBottom: 40, gap: 16 },
  title: { fontSize: 24, fontWeight: '700', color: me.ink },
  heading: { fontSize: 18, fontWeight: '600', color: me.ink },
  text: { fontSize: 16, color: me.ink },
  error: { fontSize: 16, color: me.errFg },
  card: {
    padding: 16,
    borderWidth: 1,
    borderColor: me.line,
    borderRadius: 12,
    gap: 12,
  },
  section: { gap: 10 },
  button: {
    minHeight: 48,
    padding: 12,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: me.line,
    borderRadius: 8,
  },
  buttonText: { fontSize: 16, color: me.ink, fontWeight: '600' },
  disabled: { opacity: 0.6 },
  input: {
    minHeight: 90,
    padding: 12,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: me.line,
    borderRadius: 8,
    color: me.ink,
    fontSize: 16,
  },
});
