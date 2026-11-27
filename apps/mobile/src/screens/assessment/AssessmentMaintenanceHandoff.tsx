import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { mobileApiClient } from '../../utils/mobileApiClient';
import { me } from '../../design-system/mint-editorial';

type Ticket = { id: string; org_id: string };
type Availability = {
  canCreate: boolean;
  ticket: Ticket | null;
  reason?: string;
};

interface Props {
  propertyId: string;
  assessmentId: string;
  openTicket: (ticket: Ticket) => void;
}

export function AssessmentMaintenanceHandoff({
  propertyId,
  assessmentId,
  openTicket,
}: Props) {
  const url =
    '/api/properties/' +
    encodeURIComponent(propertyId) +
    '/assessments/' +
    encodeURIComponent(assessmentId) +
    '/portfolio-ticket';
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [version, setVersion] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const saving = useRef(false);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    let active = true;
    setAvailability(null);
    setLoadError(false);
    void mobileApiClient.get<Availability>(url).then(
      (result) => {
        if (active) setAvailability(result);
      },
      (error: { statusCode?: number; status?: number }) => {
        if (!active) return;
        if (
          [401, 402, 403, 404].includes(error?.statusCode ?? error?.status ?? 0)
        ) {
          setAvailability({ canCreate: false, ticket: null });
        } else {
          setLoadError(true);
        }
      }
    );
    return () => {
      active = false;
    };
  }, [url, version]);

  const canSubmit = title.trim().length >= 3 && summary.trim().length >= 10;
  const submit = async () => {
    if (!canSubmit || saving.current || !availability?.canCreate) return;
    saving.current = true;
    setSubmitting(true);
    setSaveError(false);
    try {
      const result = await mobileApiClient.post<{ ticket: Ticket }>(url, {
        title: title.trim(),
        description: summary.trim(),
        priority: 'medium',
      });
      if (!result?.ticket?.id || !result.ticket.org_id)
        throw new Error('Missing ticket receipt');
      setAvailability({ canCreate: false, ticket: result.ticket });
      setEditing(false);
      setTitle('');
      setSummary('');
    } catch {
      setSaveError(true);
    } finally {
      saving.current = false;
      setSubmitting(false);
    }
  };

  if (!availability && !loadError)
    return (
      <ActivityIndicator
        accessibilityLabel='Checking maintenance handoff'
        color={me.brand}
      />
    );
  if (
    !loadError &&
    !availability?.canCreate &&
    !availability?.ticket &&
    !availability?.reason
  )
    return null;

  return (
    <View style={styles.card}>
      <Text style={styles.heading} accessibilityRole='header'>
        Maintenance handoff
      </Text>
      {loadError ? (
        <>
          <Text style={styles.caption} accessibilityRole='alert'>
            Couldn’t check the maintenance handoff.
          </Text>
          <Pressable
            accessibilityRole='button'
            style={styles.action}
            onPress={() => setVersion((v) => v + 1)}
          >
            <Text style={styles.actionText}>Try checking again</Text>
          </Pressable>
        </>
      ) : availability?.ticket ? (
        <>
          <Text style={styles.caption}>
            A linked task is in the Portfolio Inbox.
          </Text>
          <Pressable
            accessibilityRole='button'
            style={styles.action}
            onPress={() => {
              if (availability?.ticket) openTicket(availability.ticket);
            }}
          >
            <Text style={styles.actionText}>Open maintenance task</Text>
          </Pressable>
        </>
      ) : availability?.canCreate ? (
        <>
          <Text style={styles.caption}>
            Use a reviewed finding to create an internal task. It won’t post a
            marketplace job or copy photos.
          </Text>
          {!editing ? (
            <Pressable
              accessibilityRole='button'
              style={styles.action}
              onPress={() => setEditing(true)}
            >
              <Text style={styles.actionText}>
                Create internal maintenance task
              </Text>
            </Pressable>
          ) : (
            <>
              <Text style={styles.label}>Task title</Text>
              <TextInput
                accessibilityLabel='Task title'
                value={title}
                onChangeText={setTitle}
                maxLength={200}
                editable={!submitting}
                style={styles.input}
              />
              <Text style={styles.label}>
                Room, reviewed finding and next action
              </Text>
              <TextInput
                accessibilityLabel='Room, reviewed finding and next action'
                value={summary}
                onChangeText={setSummary}
                maxLength={5000}
                multiline
                textAlignVertical='top'
                editable={!submitting}
                style={[styles.input, styles.multiline]}
              />
              {saveError && (
                <Text accessibilityRole='alert' style={styles.caption}>
                  Couldn’t confirm the task was saved. Your draft is still here.
                  Try again or recheck to find an existing task.
                </Text>
              )}
              <Pressable
                accessibilityRole='button'
                accessibilityState={{
                  disabled: !canSubmit || submitting,
                  busy: submitting,
                }}
                style={[
                  styles.action,
                  (!canSubmit || submitting) && styles.disabled,
                ]}
                disabled={!canSubmit || submitting}
                onPress={() => void submit()}
              >
                <Text style={styles.actionText}>
                  {submitting ? 'Saving task…' : 'Save internal task'}
                </Text>
              </Pressable>
              {saveError && (
                <Pressable
                  accessibilityRole='button'
                  style={styles.secondary}
                  onPress={() => setVersion((v) => v + 1)}
                >
                  <Text style={styles.caption}>Recheck handoff</Text>
                </Pressable>
              )}
              <Pressable
                accessibilityRole='button'
                style={styles.secondary}
                disabled={submitting}
                onPress={() => setEditing(false)}
              >
                <Text style={styles.caption}>Back to assessment</Text>
              </Pressable>
            </>
          )}
        </>
      ) : (
        <Text style={styles.caption}>{availability?.reason}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 18,
    backgroundColor: me.surface,
    borderColor: me.line,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  heading: { color: me.ink, fontSize: 18, fontWeight: '700' },
  caption: { color: me.ink2, fontSize: 14, lineHeight: 20 },
  label: { color: me.ink, fontSize: 14, fontWeight: '600' },
  input: {
    color: me.ink,
    fontSize: 16,
    minHeight: 48,
    borderWidth: 1,
    borderColor: me.line,
    borderRadius: 10,
    padding: 10,
    backgroundColor: me.bg,
  },
  multiline: { minHeight: 100 },
  action: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    padding: 10,
    borderRadius: 10,
    backgroundColor: me.brand,
  },
  actionText: { color: me.onBrand, fontWeight: '700', textAlign: 'center' },
  secondary: { minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  disabled: { opacity: 0.55 },
});
