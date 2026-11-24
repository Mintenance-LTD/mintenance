import { Ionicons } from '@expo/vector-icons';
import { randomUUID } from 'expo-crypto';
import { me } from '../../../design-system/mint-editorial';
import { PropertySheet, workspaceStyles as ws } from './PropertyWorkspaceUI';
import React, {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Share,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  INSPECTION_KINDS,
  isInspectionDate,
  isOutsideTenancy,
  inspectionReportPath,
  uploadedPhotoLabel,
  uploadedBeforeTenancy,
  formatTenancyDate,
  tenancyPeriodLabel,
  tenancyStatus,
  readTenancyOverlap,
  readTenancyDateReview,
  createConversationDraftStore,
  type InspectionPage,
  type TenancyFolder,
  type InspectionReport,
  type InspectionDetail,
  type DatedRoomPhoto,
  type TenancyOverlap,
} from '@mintenance/shared';
import { useAuth } from '../../../contexts/AuthContext';
import { mobileApiClient } from '../../../utils/mobileApiClient';
import { PropertyChoice } from '../../../components/properties/PropertyChoice';
const inspectionDrafts = createConversationDraftStore();
type NativeDraft = {
  label: string;
  starts: string;
  kind: string;
  notes: string;
  dateReason: string;
  selected: string[];
  noIssues: boolean;
};

export function TenancyInspections({ propertyId }: { propertyId: string }) {
  const { user } = useAuth();
  return (
    <TenancyWorkspace
      key={`${user?.id ?? ''}/${propertyId}`}
      propertyId={propertyId}
      accountId={user?.id}
    />
  );
}

function TenancyWorkspace({
  propertyId,
  accountId,
}: {
  propertyId: string;
  accountId?: string;
}) {
  const client = useQueryClient();
  const [folder, setFolder] = useState('');
  const [folderPage, setFolderPage] = useState(0);
  const [reportPage, setReportPage] = useState(0);
  const [report, setReport] = useState('');
  const [mode, setMode] = useState<'folder' | 'report' | null>(null);
  const [editing, setEditing] = useState<TenancyFolder | null>(null);
  const [label, setLabel] = useState('');
  const [starts, setStarts] = useState('');
  const [ends, setEnds] = useState('');
  const [kind, setKind] = useState('check_in');
  const [notes, setNotes] = useState('');
  const [dateReason, setDateReason] = useState('');
  const [dateWarning, setDateWarning] = useState(false);
  const [confirmFolderDates, setConfirmFolderDates] = useState(false);
  const [overlap, setOverlap] = useState<TenancyOverlap | null>(null);
  const [noIssues, setNoIssues] = useState(false);
  const [confirmedNoEvidence, setConfirmedNoEvidence] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const base = '/api/properties/' + propertyId;
  const key = ['tenancy-inspections', accountId, propertyId];
  const draftKey =
    accountId && folder
      ? JSON.stringify([accountId, propertyId, folder])
      : null;
  const requestKey = draftKey && draftKey + ':save-request';
  const readDraft = useCallback(
    () => inspectionDrafts.read(draftKey),
    [draftKey]
  );
  const storedDraft = useSyncExternalStore(
    inspectionDrafts.subscribe,
    readDraft
  );
  const draft = storedDraft ? (JSON.parse(storedDraft) as NativeDraft) : null;
  const evidenceReview =
    mode === 'report' &&
    kind !== 'routine' &&
    !notes.trim() &&
    !selected.length &&
    !noIssues;
  const invalidEnd =
    mode === 'folder' &&
    isInspectionDate(starts) &&
    isInspectionDate(ends) &&
    ends < starts;
  useEffect(() => {
    if (mode !== 'report' || !draftKey) return;
    inspectionDrafts.write(
      draftKey,
      label || starts || notes || dateReason || selected.length || noIssues
        ? JSON.stringify({
            label,
            starts,
            kind,
            notes,
            dateReason,
            selected,
            noIssues,
          } satisfies NativeDraft)
        : ''
    );
  }, [
    mode,
    draftKey,
    label,
    starts,
    kind,
    notes,
    dateReason,
    selected,
    noIssues,
  ]);
  const folders = useQuery({
    queryKey: [...key, 'folders', folderPage],
    enabled: !!accountId,
    queryFn: () =>
      mobileApiClient.get<InspectionPage<TenancyFolder>>(
        base + '/tenancies?offset=' + folderPage
      ),
  });
  const reports = useQuery({
    queryKey: [...key, 'reports', folder, reportPage],
    enabled: !!accountId && !!folder,
    queryFn: () =>
      mobileApiClient.get<InspectionPage<InspectionReport>>(
        base + '/inspections?folder=' + folder + '&offset=' + reportPage
      ),
  });
  const tenancy = folders.data?.items.find((item) => item.id === folder);
  const exception =
    mode === 'report' &&
    (dateWarning ||
      (!!tenancy &&
        isInspectionDate(starts) &&
        isOutsideTenancy(starts, tenancy.starts_on, tenancy.ends_on)));
  const detail = useQuery({
    queryKey: [...key, 'detail', report],
    enabled: !!accountId && !!report,
    queryFn: () =>
      mobileApiClient.get<InspectionDetail>(base + '/inspections/' + report),
  });
  const photos = useQuery({
    queryKey: [...key, 'photos'],
    enabled: !!accountId && mode === 'report',
    queryFn: () =>
      mobileApiClient.get<{ photos: DatedRoomPhoto[] }>(base + '/room-photos'),
  });
  const availablePhotos = photos.data?.photos.filter(
    (photo) => !photo.deletion_pending
  );
  const unavailableSelections = availablePhotos
    ? selected.filter((id) => !availablePhotos.some((photo) => photo.id === id))
    : [];
  function begin(next: 'folder' | 'report') {
    setMode(next);
    setEditing(null);
    setLabel('');
    setStarts('');
    setEnds('');
    setNotes('');
    setDateReason('');
    setDateWarning(false);
    setConfirmFolderDates(false);
    setOverlap(null);
    setNoIssues(false);
    setConfirmedNoEvidence(false);
    setSelected([]);
    setError('');
  }
  function resumeDraft() {
    if (!draft) return;
    begin('report');
    setLabel(draft.label);
    setStarts(draft.starts);
    setKind(draft.kind);
    setNotes(draft.notes);
    setDateReason(draft.dateReason);
    setSelected(draft.selected);
    setNoIssues(draft.noIssues);
  }
  async function save() {
    if (
      busy ||
      invalidEnd ||
      (mode === 'report' && unavailableSelections.length > 0) ||
      (evidenceReview && !confirmedNoEvidence)
    )
      return;
    if (exception && !dateReason.trim()) {
      setError('Explain why the inspection falls outside the tenancy dates.');
      return;
    }
    if (
      !label.trim() ||
      !isInspectionDate(starts) ||
      (mode === 'folder' && ends && (!isInspectionDate(ends) || ends < starts))
    ) {
      setError('Enter a name and valid dates in YYYY-MM-DD format.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      if (mode === 'folder') {
        const value = {
          label: label.trim(),
          starts_on: starts,
          ends_on: ends || null,
          ...(overlap ? { overlap_token: overlap.token } : {}),
        };
        if (editing)
          await mobileApiClient.patch(base + '/tenancies', {
            ...value,
            id: editing.id,
            revision: editing.revision,
            ...(confirmFolderDates
              ? { confirm_inspection_date_change: true }
              : {}),
          });
        else {
          const saved = await mobileApiClient.post<{ id: string }>(
            base + '/tenancies',
            value
          );
          setFolder(saved.id);
          setReport('');
        }
      } else {
        const submittedDraft = readDraft();
        const requestId = inspectionDrafts.read(requestKey) || randomUUID();
        inspectionDrafts.write(requestKey, requestId);
        const saved = await mobileApiClient.post<{ id: string }>(
          base + '/inspections',
          {
            folder_id: folder,
            title: label.trim(),
            inspected_on: starts,
            kind,
            notes,
            photo_ids: selected,
            request_id: requestId,
            ...(exception ? { date_exception_reason: dateReason.trim() } : {}),
            ...(noIssues
              ? { outcome: 'no_issues_found' }
              : evidenceReview
                ? { outcome: 'evidence_free' }
                : {}),
          }
        );
        if (!saved?.id) throw new Error('The report save was not confirmed.');
        inspectionDrafts.write(requestKey, (current) =>
          current === requestId ? '' : current
        );
        inspectionDrafts.write(draftKey, (current) =>
          current === submittedDraft ? '' : current
        );
      }
      setMode(null);
      setFolderPage(0);
      setReportPage(0);
      await client.invalidateQueries({ queryKey: key });
    } catch (e) {
      await client.invalidateQueries({ queryKey: key });
      if (e instanceof Error && 'code' in e) {
        if (e.code === 'TENANCY_PERIOD_OVERLAP') {
          const conflict = readTenancyOverlap(
            (e as Error & { details?: { error?: { details?: unknown } } })
              .details?.error?.details
          );
          if (conflict) {
            setOverlap(conflict);
            return;
          }
        }
        if (e.code === 'TENANCY_DATE_CHANGE_EXCLUDES_INSPECTIONS') {
          setConfirmFolderDates(true);
          const review = readTenancyDateReview(
            (e as Error & { details?: { error?: { details?: unknown } } })
              .details?.error?.details
          );
          setError(
            [
              'These dates put saved inspections outside the tenancy period.',
              ...(review?.reports.map(
                (report) =>
                  report.title + ' · ' + formatTenancyDate(report.inspected_on)
              ) ?? []),
              ...(review && review.count > review.reports.length
                ? ['And ' + (review.count - review.reports.length) + ' more.']
                : []),
              'Confirm the change to continue.',
            ].join('\n')
          );
          return;
        }
        if (e.code === 'INSPECTION_SAVE_ALREADY_RECORDED') {
          setError(
            'This save already recorded a report. Open the saved version in the tenancy to review it.'
          );
          return;
        }
        if (e.code === 'INSPECTION_OUTSIDE_TENANCY') {
          setDateWarning(true);
          setError(
            'Explain why the inspection falls outside the current tenancy dates.'
          );
          return;
        }
      }
      setError(
        'Unable to save. Check your property access, the owner’s plan and your connection, then retry.'
      );
    } finally {
      setBusy(false);
    }
  }
  const changeFolder = (value: string) => {
    if (busy) return;
    setFolder(value);
    setReport('');
    setReportPage(0);
    setMode(null);
  };
  return (
    <View style={s.panel}>
      <Text style={s.title}>Tenancy folders & inspections</Text>
      <Text style={s.text}>
        Reports are shared with current property members only.
      </Text>
      {folders.isLoading && (
        <ActivityIndicator accessibilityLabel='Loading tenancy folders' />
      )}
      {folders.isError ? (
        <>
          <Text accessibilityRole='alert'>Inspection records unavailable.</Text>
          <Action
            title='Retry folders'
            onPress={() => void folders.refetch()}
          />
        </>
      ) : (
        folders.data && (
          <>
            <PropertyChoice
              label='Tenancy folder'
              value={folder}
              options={[
                { value: '', label: 'Choose a tenancy' },
                ...folders.data.items.map((f) => ({
                  value: f.id,
                  label:
                    f.label +
                    ' · ' +
                    f.starts_on +
                    ' · ' +
                    tenancyStatus(f) +
                    (f.check_out_recorded ? ' · Check-out recorded' : ''),
                })),
              ]}
              onChange={changeFolder}
            />
            {!folders.data.items.length && <Text>No tenancy folders yet.</Text>}
            {folderPage > 0 && (
              <Action
                title='Previous folders'
                onPress={() => {
                  changeFolder('');
                  setFolderPage((v) => v - 25);
                }}
              />
            )}
            {folders.data.hasMore && (
              <Action
                title='More folders'
                onPress={() => {
                  changeFolder('');
                  setFolderPage((v) => v + 25);
                }}
              />
            )}
            {folders.data.canCreate ? (
              <Action
                title='New tenancy folder'
                onPress={() => begin('folder')}
              />
            ) : (
              <Text style={s.text}>
                Read-only. Creating records requires editing permission and the
                owner’s Landlord or Agency plan.
              </Text>
            )}
          </>
        )
      )}
      {folder && folders.data?.canCreate && !folders.isError && (
        <Action
          title='Edit tenancy folder'
          onPress={() => {
            const current = folders.data?.items.find((f) => f.id === folder);
            if (current) {
              setMode('folder');
              setEditing(current);
              setLabel(current.label);
              setStarts(current.starts_on);
              setEnds(current.ends_on ?? '');
              setError('');
              setConfirmFolderDates(false);
              setOverlap(null);
            }
          }}
        />
      )}
      <View style={{ marginVertical: 4 }}>
        {draft && mode !== 'report' && reports.data?.canCreate && (
          <>
            <Action
              title='Resume draft'
              disabled={busy}
              onPress={resumeDraft}
            />
            <Action
              title='Discard draft'
              disabled={busy}
              onPress={() =>
                Alert.alert(
                  'Discard this tenancy’s inspection draft?',
                  undefined,
                  [
                    { text: 'Keep draft', style: 'cancel' },
                    {
                      text: 'Discard draft',
                      style: 'destructive',
                      onPress: () => {
                        inspectionDrafts.write(draftKey, '');
                        inspectionDrafts.write(requestKey, '');
                      },
                    },
                  ]
                )
              }
            />
          </>
        )}
        <Text style={s.shortcutHint}>
          {!folder
            ? 'Choose or create a tenancy above to start an inspection.'
            : reports.isLoading
              ? 'Checking inspection access…'
              : reports.isError
                ? 'Retry loading reports to check inspection access.'
                : !reports.data?.canCreate
                  ? 'View saved reports below. Creating inspections needs editing access and an eligible owner plan.'
                  : 'Create an inspection for this tenancy'}
        </Text>
        {INSPECTION_KINDS.map((option) => {
          const disabled =
            !folder ||
            !reports.data?.canCreate ||
            reports.isError ||
            folders.isError ||
            (!!draft && mode !== 'report') ||
            busy;
          return (
            <TouchableOpacity
              key={option.value}
              accessibilityRole='button'
              accessibilityLabel={
                option.value === 'routine'
                  ? option.label
                  : option.label + ' inspection'
              }
              accessibilityState={{ disabled }}
              accessibilityHint={
                !folder
                  ? 'Choose a tenancy above first.'
                  : 'Opens the inspection form.'
              }
              disabled={disabled}
              style={[ws.row, disabled && { opacity: 0.55 }]}
              onPress={() => {
                if (disabled) return;
                if (mode !== 'report') begin('report');
                setKind(option.value);
              }}
            >
              <Ionicons
                name={
                  option.value === 'routine'
                    ? 'calendar-outline'
                    : 'clipboard-outline'
                }
                size={23}
                color={disabled ? me.ink3 : me.brand2}
              />
              <Text style={ws.rowText}>{option.label}</Text>
              {!disabled && (
                <Ionicons
                  name='add-circle-outline'
                  size={22}
                  color={me.brand2}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
      {folder && (
        <View>
          {reports.isLoading && (
            <ActivityIndicator accessibilityLabel='Loading reports' />
          )}
          {reports.isError && (
            <>
              <Text accessibilityRole='alert'>Reports unavailable.</Text>
              <Action
                title='Retry reports'
                onPress={() => void reports.refetch()}
              />
            </>
          )}
          {!reports.isError &&
            reports.data?.items.map((r) => (
              <Action
                key={r.id}
                title={
                  r.title +
                  ' · ' +
                  r.inspected_on +
                  (r.corrected_by_report_id ? ' · Corrected' : '')
                }
                onPress={() => {
                  setReport(r.id);
                  setMode(null);
                }}
              />
            ))}
          {reports.data && !reports.data.items.length && (
            <Text>No inspections in this tenancy yet.</Text>
          )}
          {reportPage > 0 && (
            <Action
              title='Previous reports'
              onPress={() => setReportPage((v) => v - 25)}
            />
          )}
          {reports.data?.hasMore && (
            <Action
              title='More reports'
              onPress={() => setReportPage((v) => v + 25)}
            />
          )}
        </View>
      )}
      {mode && (
        <PropertySheet
          title={
            mode === 'folder'
              ? editing
                ? 'Edit tenancy folder'
                : 'Create tenancy folder'
              : 'Create inspection report'
          }
          busy={busy}
          onClose={() => setMode(null)}
        >
          <View style={{ gap: 12 }}>
            <Field
              label={mode === 'folder' ? 'Folder name' : 'Report title'}
              value={label}
              change={setLabel}
              maxLength={mode === 'folder' ? 120 : 160}
            />
            <Field
              label={
                mode === 'folder'
                  ? 'Tenancy starts (YYYY-MM-DD)'
                  : 'Inspection date (YYYY-MM-DD)'
              }
              value={starts}
              change={(value) => {
                setStarts(value);
                setDateWarning(false);
                setConfirmFolderDates(false);
                setOverlap(null);
              }}
              maxLength={10}
            />
            {mode === 'folder' ? (
              <>
                <Field
                  label='Tenancy ends (optional, YYYY-MM-DD)'
                  value={ends}
                  change={(value) => {
                    setEnds(value);
                    setConfirmFolderDates(false);
                    setOverlap(null);
                  }}
                  maxLength={10}
                />
                {invalidEnd && (
                  <Text style={s.error} accessibilityRole='alert'>
                    End date must be on or after {formatTenancyDate(starts)}.
                  </Text>
                )}
                {overlap && (
                  <View>
                    <Text style={s.error} accessibilityRole='alert'>
                      These dates overlap{' '}
                      {overlap.count === 1
                        ? 'another tenancy'
                        : `${overlap.count} tenancies`}{' '}
                      on this property.
                    </Text>
                    {overlap.folders.map((item) => (
                      <Text style={s.text} key={item.id}>
                        {item.label} ·{' '}
                        {tenancyPeriodLabel(item.starts_on, item.ends_on)}
                      </Text>
                    ))}
                    {overlap.count > overlap.folders.length && (
                      <Text style={s.text}>
                        And {overlap.count - overlap.folders.length} more.
                      </Text>
                    )}
                  </View>
                )}
                <Text style={s.text}>
                  Creating a folder does not invite tenants or grant access.
                </Text>
              </>
            ) : (
              <>
                {tenancy && (
                  <Text style={s.text}>
                    Current tenancy dates · {tenancy.starts_on} to{' '}
                    {tenancy.ends_on ?? 'no end date set'}
                  </Text>
                )}
                {exception && (
                  <>
                    <Text style={s.error}>
                      This inspection date is outside the tenancy period.
                    </Text>
                    <Field
                      label='Reason for the date exception'
                      value={dateReason}
                      change={setDateReason}
                      maxLength={1000}
                      multiline
                    />
                  </>
                )}
                <PropertyChoice
                  label='Inspection type'
                  value={kind}
                  options={INSPECTION_KINDS}
                  onChange={setKind}
                />
                <Field
                  label='Observations'
                  value={notes}
                  change={(value) => {
                    setNotes(value);
                    setConfirmedNoEvidence(false);
                  }}
                  maxLength={10000}
                  multiline
                />
                <InspectionToggle
                  checked={noIssues}
                  label='No issues found'
                  onPress={() => {
                    setNoIssues((value) => !value);
                    setConfirmedNoEvidence(false);
                  }}
                />
                <Text style={s.title}>Room photos ({selected.length}/50)</Text>
                <Text style={s.text}>
                  Upload dates do not prove when a photo was taken.
                </Text>
                {photos.isLoading && <ActivityIndicator />}
                {photos.isError && (
                  <Action
                    title='Photos unavailable — retry'
                    onPress={() => void photos.refetch()}
                  />
                )}
                {availablePhotos?.map((photo) => (
                  <TouchableOpacity
                    key={photo.id}
                    accessibilityRole='checkbox'
                    accessibilityLabel={
                      photo.room_type.replace(/_/g, ' ') + ' ' + photo.file_name
                    }
                    accessibilityState={{
                      checked: selected.includes(photo.id),
                    }}
                    style={s.action}
                    onPress={() => {
                      setConfirmedNoEvidence(false);
                      setSelected((ids) =>
                        ids.includes(photo.id)
                          ? ids.filter((id) => id !== photo.id)
                          : ids.length < 50
                            ? [...ids, photo.id]
                            : ids
                      );
                    }}
                  >
                    <Text>
                      {selected.includes(photo.id) ? '☑' : '☐'}{' '}
                      {photo.room_type.replace(/_/g, ' ')} · {photo.file_name}
                    </Text>
                    <Text style={s.text}>
                      {uploadedPhotoLabel(photo.created_at)}
                    </Text>
                    {tenancy &&
                      uploadedBeforeTenancy(
                        photo.created_at,
                        tenancy.starts_on
                      ) && (
                        <Text style={s.text}>Uploaded before this tenancy</Text>
                      )}
                    {photo.attached_to_inspection && (
                      <Text style={s.text}>Used in a saved inspection</Text>
                    )}
                  </TouchableOpacity>
                ))}
                {unavailableSelections.length > 0 && (
                  <>
                    <Text style={s.error}>
                      Some selected photos are no longer available.
                    </Text>
                    <Action
                      title='Remove unavailable photo selections'
                      onPress={() =>
                        setSelected((current) =>
                          current.filter(
                            (id) => !unavailableSelections.includes(id)
                          )
                        )
                      }
                    />
                  </>
                )}
                <Text style={s.text}>
                  Attached photos are protected from deletion in Room Photos.
                </Text>
                {evidenceReview && label.trim() && isInspectionDate(starts) && (
                  <>
                    <Text style={s.error}>
                      This report has no observations or photos. Saved reports
                      cannot be edited.
                    </Text>
                    <InspectionToggle
                      checked={confirmedNoEvidence}
                      label='Save without observations or photos'
                      onPress={() => setConfirmedNoEvidence((value) => !value)}
                    />
                  </>
                )}
              </>
            )}
            {error && (
              <Text accessibilityRole='alert' style={s.error}>
                {error}
              </Text>
            )}
            <Action
              primary
              title={
                busy
                  ? 'Saving…'
                  : mode === 'folder'
                    ? overlap && !confirmFolderDates
                      ? 'Confirm overlap and save'
                      : editing
                        ? confirmFolderDates
                          ? 'Confirm date change'
                          : 'Save folder changes'
                        : 'Create folder'
                    : 'Save shared report'
              }
              disabled={
                busy ||
                invalidEnd ||
                (evidenceReview && !confirmedNoEvidence) ||
                (exception && !dateReason.trim()) ||
                (mode === 'report' &&
                  (photos.isLoading ||
                    photos.isError ||
                    unavailableSelections.length > 0))
              }
              onPress={() => void save()}
            />
            <Action
              title='Cancel'
              disabled={busy}
              onPress={() => setMode(null)}
            />
          </View>
        </PropertySheet>
      )}
      {report && (
        <View>
          {detail.isLoading && <ActivityIndicator />}
          {detail.isError && (
            <>
              <Text accessibilityRole='alert'>Report unavailable.</Text>
              <Action
                title='Retry report'
                onPress={() => void detail.refetch()}
              />
            </>
          )}
          {!detail.isError && detail.data && (
            <NativeReport
              key={report}
              propertyId={propertyId}
              detail={detail.data}
              accountId={accountId ?? ''}
              openReport={setReport}
            />
          )}
        </View>
      )}
    </View>
  );
}
function InspectionToggle({
  label,
  checked,
  onPress,
}: {
  label: string;
  checked: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      accessibilityRole='checkbox'
      accessibilityLabel={label}
      accessibilityState={{ checked }}
      style={s.action}
      onPress={onPress}
    >
      <Text>
        {checked ? '☑' : '☐'} {label}
      </Text>
    </TouchableOpacity>
  );
}
function NativeReport({
  propertyId,
  detail,
  accountId,
  openReport,
}: {
  propertyId: string;
  detail: InspectionDetail;
  accountId: string;
  openReport: (id: string) => void;
}) {
  const [photo, setPhoto] = useState('');
  const image = useQuery({
    queryKey: [
      'inspection-image',
      accountId,
      propertyId,
      detail.report.id,
      photo,
    ],
    enabled: !!photo,
    staleTime: 0,
    gcTime: 0,
    queryFn: () =>
      mobileApiClient.get<{ dataUrl: string }>(
        '/api/properties/' +
          propertyId +
          '/inspections/' +
          detail.report.id +
          '/photos/' +
          photo +
          '?format=base64'
      ),
  });
  const { report, checkIn } = detail;
  const { corrected_by_report_id: correctedBy, corrects_report_id: corrects } =
    report;
  return (
    <View style={s.form}>
      <Text style={s.title}>{detail.report.title}</Text>
      <Text>
        {detail.folder.label} · Inspection date {detail.report.inspected_on}
      </Text>
      {report.tenancy_starts_on && (
        <Text style={s.text}>
          Tenancy dates when saved · {report.tenancy_starts_on} to{' '}
          {report.tenancy_ends_on ?? 'no end date set'}
        </Text>
      )}
      <Text style={s.text}>
        Current tenancy dates · {detail.folder.starts_on} to{' '}
        {detail.folder.ends_on ?? 'no end date set'}
      </Text>
      {report.date_exception_reason && (
        <Text style={s.text}>
          Date exception · {report.date_exception_reason}
        </Text>
      )}
      {correctedBy && (
        <Action
          title='Corrected · View correction'
          onPress={() => openReport(correctedBy)}
        />
      )}
      {corrects && (
        <Action
          title='View previous version'
          onPress={() => openReport(corrects)}
        />
      )}
      {checkIn && (
        <Action
          title='Compare with check-in'
          onPress={() => openReport(checkIn.id)}
        />
      )}
      <Text style={s.text}>
        Inspection date entered by the author. Photo dates below are upload
        dates (UTC).
      </Text>
      {report.outcome === 'no_issues_found' && <Text>No issues found.</Text>}
      {(report.notes || report.outcome !== 'no_issues_found') && (
        <Text>
          {report.notes ||
            (report.outcome === 'evidence_free'
              ? 'Recorded without observations or photos.'
              : 'No written observations recorded.')}
        </Text>
      )}
      <Action
        title='Share member-only report link'
        onPress={() =>
          void Share.share({
            message:
              'https://www.mintenance.co.uk' +
              inspectionReportPath(propertyId, detail.report.id),
          }).catch(() => undefined)
        }
      />
      <PropertyChoice
        label='Report photo'
        value={photo}
        options={[
          { value: '', label: 'Choose a photo' },
          ...detail.photos
            .filter((p) => p.available)
            .map((p) => ({
              value: p.id,
              label: p.room_type.replace(/_/g, ' ') + ' · ' + p.file_name,
            })),
        ]}
        onChange={setPhoto}
      />
      {detail.photos
        .filter((p) => !p.available)
        .map((p) => (
          <Text key={p.id}>
            {p.file_name}: original photo deleted or unavailable.
          </Text>
        ))}
      {photo && image.isLoading && (
        <ActivityIndicator accessibilityLabel='Loading report photo' />
      )}
      {photo && image.isError && (
        <>
          <Text>Photo unavailable.</Text>
          <Action title='Retry photo' onPress={() => void image.refetch()} />
        </>
      )}
      {photo && !image.isError && image.data && (
        <Image
          accessibilityLabel={
            detail.photos.find((p) => p.id === photo)?.file_name ?? 'Room photo'
          }
          source={{ uri: image.data.dataUrl }}
          style={s.image}
          resizeMode='contain'
        />
      )}
      {photo && (
        <Text style={s.text}>
          {uploadedPhotoLabel(
            detail.photos.find((p) => p.id === photo)?.uploaded_at ?? null
          )}
        </Text>
      )}
    </View>
  );
}
function Field({
  label,
  value,
  change,
  maxLength,
  multiline = false,
}: {
  label: string;
  value: string;
  change: (value: string) => void;
  maxLength: number;
  multiline?: boolean;
}) {
  return (
    <View>
      <Text style={s.text}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={change}
        maxLength={maxLength}
        multiline={multiline}
        style={[s.input, multiline && { minHeight: 100 }]}
      />
    </View>
  );
}
function Action({
  title,
  onPress,
  disabled = false,
  primary = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <TouchableOpacity
      accessibilityRole='button'
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        s.action,
        primary && { backgroundColor: me.brand2, borderColor: me.brand2 },
        disabled && { opacity: 0.5 },
      ]}
    >
      <Text
        style={[
          s.actionText,
          primary && { color: me.onBrand, textAlign: 'center' },
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}
const s = StyleSheet.create({
  panel: {
    marginVertical: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#fff',
    gap: 12,
  },
  title: { fontSize: 17, fontWeight: '700', color: '#172e29' },
  text: { fontSize: 13, color: '#475569', lineHeight: 20 },
  shortcutHint: {
    fontSize: 13,
    color: me.ink2,
    lineHeight: 19,
    marginBottom: 8,
  },
  form: {
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    gap: 10,
    marginVertical: 8,
  },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#94a3b8',
    borderRadius: 8,
    padding: 10,
    color: '#111827',
    backgroundColor: '#fff',
  },
  action: {
    minHeight: 44,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    marginVertical: 4,
  },
  actionText: { color: '#115e59', fontWeight: '600' },
  error: { color: '#991b1b' },
  image: { width: '100%', aspectRatio: 4 / 3, backgroundColor: '#f1f5f9' },
});
