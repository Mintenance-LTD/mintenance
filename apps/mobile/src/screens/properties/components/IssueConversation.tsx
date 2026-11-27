import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import {
  parseReportHistory,
  reportHistoryDate,
  reportStatusLabel,
  type ReportStaffFollowup,
} from '@mintenance/shared';
import { useAuth } from '../../../contexts/AuthContext';
import { mobileApiClient } from '../../../utils/mobileApiClient';
import { theme } from '../../../theme';
// Retry identifier only; authorization comes from the authenticated session.
function messageId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    return (c === 'x' ? r : (r & 3) | 8).toString(16);
  });
}
export function IssueConversation({
  reportId,
  caseTitle,
  initiallyOpen = false,
}: {
  reportId: string;
  caseTitle?: string;
  initiallyOpen?: boolean;
}) {
  const { user } = useAuth();
  return user ? (
    <CaseHistory
      key={`${user.id}:${reportId}`}
      reportId={reportId}
      userId={user.id}
      caseTitle={caseTitle}
      initiallyOpen={initiallyOpen}
    />
  ) : null;
}
function CaseHistory({
  reportId,
  userId,
  caseTitle,
  initiallyOpen,
}: {
  reportId: string;
  userId: string;
  caseTitle?: string;
  initiallyOpen: boolean;
}) {
  const [open, setOpen] = useState(initiallyOpen),
    [offset, setOffset] = useState(0),
    [latest, setLatest] = useState(false),
    [body, setBody] = useState(''),
    [pending, setPending] = useState<{ id: string; body: string } | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const mounted = useRef(true),
    sending = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const query = useQuery({
    queryKey: ['issue-conversation', userId, reportId, offset, latest],
    enabled: open,
    retry: false,
    queryFn: async ({ signal }) =>
      parseReportHistory(
        await mobileApiClient.get(
          `/api/report-conversation?reportId=${encodeURIComponent(reportId)}&offset=${offset}&latest=${latest}`,
          { signal, timeout: 15000, retries: 0 }
        )
      ),
  });
  async function send() {
    if (!body.trim() || sending.current) return;
    sending.current = true;
    const message = pending ?? { id: messageId(), body };
    setPending(message);
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await mobileApiClient.post<{ messageId: string }>(
        '/api/report-conversation',
        {
          reportId,
          messageId: message.id,
          body: message.body,
        },
        { timeout: 15000, retries: 0 }
      );
      if (result?.messageId !== message.id)
        throw new Error('Unconfirmed message');
      if (!mounted.current) return;
      setBody('');
      setPending(null);
      setNotice('Message sent. Showing latest updates.');
      if (latest) void query.refetch();
      else setLatest(true);
    } catch {
      if (mounted.current)
        setError('Message not confirmed. Retry to send the same message.');
    } finally {
      sending.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  const data = query.data;
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.button}
        accessibilityRole='button'
        accessibilityLabel={
          caseTitle
            ? `${open ? 'Close' : 'Open'} repair case: ${caseTitle}`
            : 'Shared issue conversation'
        }
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
      >
        <Text style={styles.heading}>
          Shared issue conversation {open ? '−' : '+'}
        </Text>
      </TouchableOpacity>
      {open && (
        <>
          <Text style={styles.heading}>
            {caseTitle || 'Tenant case history'}
          </Text>
          <Text>
            Shared with the resident, managers and assigned contractor. Do not
            include access codes or payment details.
          </Text>
          {query.isPending ? (
            <Text>Loading case history…</Text>
          ) : query.isError ? (
            <Text accessibilityRole='alert'>
              Unable to load case history. Refresh to retry.
            </Text>
          ) : null}
          <TouchableOpacity
            style={styles.button}
            accessibilityRole='button'
            onPress={() => void query.refetch()}
          >
            <Text>Refresh messages</Text>
          </TouchableOpacity>
          {!query.isError && data && (
            <>
              <Text style={styles.heading}>
                Current status: {reportStatusLabel(data.status)}
              </Text>
              {data.summary ? (
                <View style={styles.entry}>
                  <Text style={styles.heading}>
                    Original report: {data.summary.category.replace(/_/g, ' ')}
                  </Text>
                  <Text>
                    Submitted {reportHistoryDate(data.summary.created_at)}
                  </Text>
                  <Text>{data.summary.description}</Text>
                </View>
              ) : (
                <Text>
                  Original report summary unavailable. Refresh to retry.
                </Text>
              )}
              {data.role === 'manager' && data.staffFollowup && (
                <PrivateHandover
                  reportId={reportId}
                  followup={data.staffFollowup}
                  checkingAccess={query.isFetching}
                  onRefresh={async () => {
                    await query.refetch();
                  }}
                />
              )}
              <Text style={styles.heading}>Resident conversation</Text>
              <Text>
                Recorded updates, oldest first within each page. Status changes
                appear as system updates.
              </Text>
              {data.messages.length === 0 && (
                <Text>No recorded updates on this page.</Text>
              )}
              {data.messages.map((m) => (
                <View key={m.id} style={styles.entry}>
                  <Text style={styles.heading}>
                    {m.author_role === 'system'
                      ? 'Status update'
                      : m.author_role}
                  </Text>
                  <Text>{reportHistoryDate(m.created_at)}</Text>
                  <Text>{m.body}</Text>
                </View>
              ))}
              <Text>Page {Math.floor(data.pageOffset / 25) + 1}</Text>
              <View style={styles.pages}>
                <TouchableOpacity
                  style={styles.button}
                  accessibilityRole='button'
                  accessibilityState={{ disabled: data.pageOffset === 0 }}
                  disabled={data.pageOffset === 0}
                  onPress={() => {
                    setLatest(false);
                    setOffset(Math.max(0, data.pageOffset - 25));
                  }}
                >
                  <Text>Older updates</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.button}
                  accessibilityRole='button'
                  accessibilityState={{ disabled: !data.hasMore }}
                  disabled={!data.hasMore}
                  onPress={() => {
                    setLatest(false);
                    setOffset(data.pageOffset + 25);
                  }}
                >
                  <Text>Newer updates</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.button}
                  accessibilityRole='button'
                  onPress={() => {
                    if (latest) void query.refetch();
                    else setLatest(true);
                  }}
                >
                  <Text>Latest updates</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
          <Text>Shared message</Text>
          <TextInput
            style={styles.input}
            accessibilityLabel='Shared message'
            value={body}
            onChangeText={setBody}
            multiline
            maxLength={5000}
            editable={!busy && !pending}
            textAlignVertical='top'
          />
          {!!error && <Text accessibilityRole='alert'>{error}</Text>}
          {!!notice && <Text>{notice}</Text>}
          {pending && !busy && (
            <Text>
              The previous send is unconfirmed. Retry sends the same message
              safely.
            </Text>
          )}
          <TouchableOpacity
            style={styles.button}
            accessibilityRole='button'
            disabled={busy || !body.trim() || !data || query.isError}
            accessibilityState={{
              disabled: busy || !body.trim() || !data || query.isError,
            }}
            onPress={() => void send()}
          >
            <Text>
              {busy ? 'Sending…' : pending ? 'Retry message' : 'Send message'}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const waitingForLabel = {
  manager: 'Property team action',
  tenant: 'Resident response',
  contractor: 'Contractor response',
  approval: 'Approval',
} as const;

function PrivateHandover({
  followup,
  reportId,
  onRefresh,
  checkingAccess,
}: {
  followup: ReportStaffFollowup;
  reportId: string;
  onRefresh: () => Promise<void>;
  checkingAccess: boolean;
}) {
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [blockedRevision, setBlockedRevision] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const inFlight = useRef(false);
  const revision = followup.completionRevision;
  const canSubmit =
    !followup.canManage &&
    !followup.needsReassignment &&
    !followup.completion?.awaitingReview &&
    typeof revision === 'number' &&
    Number.isInteger(revision) &&
    revision >= 0;
  const blocked = blockedRevision !== null && blockedRevision === revision;
  const submitDisabled = busy || blocked || checkingAccess || !note.trim();

  async function submit() {
    if (!canSubmit || submitDisabled || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError('');
    try {
      const reply = await mobileApiClient.post<{ submitted: boolean }>(
        `/api/properties/${encodeURIComponent(followup.propertyId)}/followups`,
        { reportId, revision, note: note.trim() },
        { timeout: 15000, retries: 0 }
      );
      if (reply?.submitted !== true) throw new Error('Completion unconfirmed');
      setNote('');
      setSubmitted(true);
      setBlockedRevision(revision ?? null);
      await onRefresh();
    } catch (cause) {
      const code = (cause as { statusCode?: number } | null)?.statusCode;
      if (code === 401 || code === 403 || code === 404) {
        setAccessDenied(true);
        setNote('');
      } else if (code === 409) {
        setBlockedRevision(revision ?? null);
        setError(
          'This handover changed or you no longer have access. Refresh the case before resubmitting.'
        );
      } else {
        setError(
          'Completion was not confirmed. Your note is still here; try again.'
        );
      }
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  if (accessDenied) {
    return (
      <Text accessibilityRole='alert'>
        You no longer have access to this handover. Refresh the case to confirm.
      </Text>
    );
  }

  const completion = followup.completion;
  const responsible = followup.needsReassignment
    ? 'Needs reassignment'
    : followup.assigneeName || 'Unassigned';
  return (
    <View
      style={styles.entry}
      accessibilityLabel='Private property team handover'
    >
      <Text style={styles.heading}>Property team handover</Text>
      <Text>Not shared with the resident.</Text>
      <Text>Responsible: {responsible}</Text>
      <Text>
        Next action:{' '}
        {completion?.awaitingReview || (submitted && blocked)
          ? 'Owner reviews completion'
          : followup.needsReassignment
            ? 'Owner reassigns this repair'
            : followup.waitingFor
              ? waitingForLabel[followup.waitingFor]
              : 'Not recorded'}
      </Text>
      {followup.dueAt ? (
        <Text>Follow-up due: {reportHistoryDate(followup.dueAt)}</Text>
      ) : null}
      {completion && (
        <View style={styles.entry}>
          <Text style={styles.heading}>
            {completion.awaitingReview
              ? 'Ready for owner review'
              : 'Last completion handover'}
          </Text>
          <Text>
            {completion.submittedBy} ·{' '}
            {reportHistoryDate(completion.submittedAt)}
          </Text>
          <Text>{completion.note}</Text>
        </View>
      )}
      {submitted && (blocked || completion?.awaitingReview) && (
        <Text accessibilityLiveRegion='polite'>
          Completion sent to the owner for review. The report is still open.
        </Text>
      )}
      {canSubmit && !(submitted && blocked) && (
        <>
          <Text style={styles.heading}>Private completion note</Text>
          <TextInput
            accessibilityLabel='Private completion note'
            style={styles.input}
            editable={!busy}
            multiline
            maxLength={5000}
            value={note}
            onChangeText={setNote}
            textAlignVertical='top'
          />
          <TouchableOpacity
            style={styles.button}
            accessibilityRole='button'
            accessibilityLabel='Submit for owner review'
            disabled={submitDisabled}
            accessibilityState={{ disabled: submitDisabled }}
            onPress={() => void submit()}
          >
            <Text>{busy ? 'Submitting…' : 'Submit for owner review'}</Text>
          </TouchableOpacity>
        </>
      )}
      {!!error && <Text accessibilityRole='alert'>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10, paddingVertical: 12 },
  heading: { fontWeight: '600', color: theme.colors.textPrimary },
  button: { minHeight: 48, padding: 12, justifyContent: 'center' },
  entry: {
    gap: 6,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
  },
  pages: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  input: {
    minHeight: 100,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    color: theme.colors.textPrimary,
  },
});
