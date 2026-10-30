import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Share,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  INSPECTION_KINDS,
  isInspectionDate,
  inspectionReportPath,
  uploadedPhotoLabel,
  type InspectionPage,
  type TenancyFolder,
  type InspectionReport,
  type InspectionDetail,
  type DatedRoomPhoto,
} from '@mintenance/shared';
import { useAuth } from '../../../contexts/AuthContext';
import { mobileApiClient } from '../../../utils/mobileApiClient';
import { PropertyChoice } from '../../../components/properties/PropertyChoice';
export function TenancyInspections({ propertyId }: { propertyId: string }) {
  const { user } = useAuth();
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
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const base = '/api/properties/' + propertyId;
  const key = ['tenancy-inspections', user?.id, propertyId];
  const folders = useQuery({
    queryKey: [...key, 'folders', folderPage],
    enabled: !!user,
    queryFn: () =>
      mobileApiClient.get<InspectionPage<TenancyFolder>>(
        base + '/tenancies?offset=' + folderPage
      ),
  });
  const reports = useQuery({
    queryKey: [...key, 'reports', folder, reportPage],
    enabled: !!user && !!folder,
    queryFn: () =>
      mobileApiClient.get<InspectionPage<InspectionReport>>(
        base + '/inspections?folder=' + folder + '&offset=' + reportPage
      ),
  });
  const detail = useQuery({
    queryKey: [...key, 'detail', report],
    enabled: !!user && !!report,
    queryFn: () =>
      mobileApiClient.get<InspectionDetail>(base + '/inspections/' + report),
  });
  const photos = useQuery({
    queryKey: [...key, 'photos'],
    enabled: !!user && mode === 'report',
    queryFn: () =>
      mobileApiClient.get<{ photos: DatedRoomPhoto[] }>(base + '/room-photos'),
  });
  function begin(next: 'folder' | 'report') {
    setMode(next);
    setEditing(null);
    setLabel('');
    setStarts('');
    setEnds('');
    setNotes('');
    setSelected([]);
    setError('');
  }
  async function save() {
    if (busy) return;
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
        };
        if (editing)
          await mobileApiClient.patch(base + '/tenancies', {
            ...value,
            id: editing.id,
            revision: editing.revision,
          });
        else await mobileApiClient.post(base + '/tenancies', value);
      } else
        await mobileApiClient.post(base + '/inspections', {
          folder_id: folder,
          title: label.trim(),
          inspected_on: starts,
          kind,
          notes,
          photo_ids: selected,
        });
      setMode(null);
      setFolderPage(0);
      setReportPage(0);
      await client.invalidateQueries({ queryKey: key });
    } catch {
      await client.invalidateQueries({ queryKey: key });
      setError(
        'Unable to save. Check your property access, the owner’s plan and your connection, then retry.'
      );
    } finally {
      setBusy(false);
    }
  }
  const changeFolder = (value: string) => {
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
                  label: f.label + ' · ' + f.starts_on,
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
            }
          }}
        />
      )}
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
          {!reports.isError && reports.data?.canCreate && (
            <Action title='New inspection' onPress={() => begin('report')} />
          )}
          {!reports.isError &&
            reports.data?.items.map((r) => (
              <Action
                key={r.id}
                title={r.title + ' · ' + r.inspected_on}
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
        <View style={s.form}>
          <Text style={s.title}>
            {mode === 'folder'
              ? 'Create tenancy folder'
              : 'Create shared inspection'}
          </Text>
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
            change={setStarts}
            maxLength={10}
          />
          {mode === 'folder' ? (
            <>
              <Field
                label='Tenancy ends (optional, YYYY-MM-DD)'
                value={ends}
                change={setEnds}
                maxLength={10}
              />
              <Text style={s.text}>
                Creating a folder does not invite tenants or grant access.
              </Text>
            </>
          ) : (
            <>
              <PropertyChoice
                label='Inspection type'
                value={kind}
                options={INSPECTION_KINDS}
                onChange={setKind}
              />
              <Field
                label='Observations'
                value={notes}
                change={setNotes}
                maxLength={10000}
                multiline
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
              {photos.data?.photos.map((photo) => (
                <TouchableOpacity
                  key={photo.id}
                  accessibilityRole='checkbox'
                  accessibilityLabel={
                    photo.room_type.replace(/_/g, ' ') + ' ' + photo.file_name
                  }
                  accessibilityState={{ checked: selected.includes(photo.id) }}
                  style={s.action}
                  onPress={() =>
                    setSelected((ids) =>
                      ids.includes(photo.id)
                        ? ids.filter((id) => id !== photo.id)
                        : ids.length < 50
                          ? [...ids, photo.id]
                          : ids
                    )
                  }
                >
                  <Text>
                    {selected.includes(photo.id) ? '☑' : '☐'}{' '}
                    {photo.room_type.replace(/_/g, ' ')} · {photo.file_name}
                  </Text>
                  <Text style={s.text}>
                    {uploadedPhotoLabel(photo.created_at)}
                  </Text>
                </TouchableOpacity>
              ))}
              <Text style={s.text}>
                Saved reports cannot be rewritten. Record corrections in a new
                report. Photos remain linked to the originals and may become
                unavailable if deleted.
              </Text>
            </>
          )}
          {error && (
            <Text accessibilityRole='alert' style={s.error}>
              {error}
            </Text>
          )}
          <Action
            title={
              busy
                ? 'Saving…'
                : mode === 'folder'
                  ? editing
                    ? 'Save folder changes'
                    : 'Create folder'
                  : 'Save shared report'
            }
            disabled={
              busy ||
              (mode === 'report' && (photos.isLoading || photos.isError))
            }
            onPress={() => void save()}
          />
          <Action
            title='Cancel'
            disabled={busy}
            onPress={() => setMode(null)}
          />
        </View>
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
              accountId={user?.id ?? ''}
            />
          )}
        </View>
      )}
    </View>
  );
}
function NativeReport({
  propertyId,
  detail,
  accountId,
}: {
  propertyId: string;
  detail: InspectionDetail;
  accountId: string;
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
  return (
    <View style={s.form}>
      <Text style={s.title}>{detail.report.title}</Text>
      <Text>
        {detail.folder.label} · Inspection date {detail.report.inspected_on}
      </Text>
      <Text style={s.text}>
        Inspection date entered by the author. Photo dates below are upload
        dates (UTC).
      </Text>
      <Text>{detail.report.notes || 'No written observations recorded.'}</Text>
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
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      accessibilityRole='button'
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[s.action, disabled && { opacity: 0.5 }]}
    >
      <Text style={s.actionText}>{title}</Text>
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
