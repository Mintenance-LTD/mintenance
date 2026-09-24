import { Platform, Share } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../config/supabase';
import { API_BASE_URL } from './mobileApiClient';

/** The contract endpoint returns binary PDF data, never a JSON URL. */
export async function saveContractPdf(
  contractId: string
): Promise<'saved' | 'shared' | 'cancelled'> {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      contractId
    )
  ) {
    throw new Error('Invalid contract');
  }
  if (!FileSystem.cacheDirectory)
    throw new Error('File storage is unavailable');
  const uri = `${FileSystem.cacheDirectory}contract-${contractId}-${Date.now()}.pdf`;
  const { data } = await supabase.auth.getSession();
  let token = data.session?.access_token;
  if (!token) throw new Error('Please sign in again to download the contract');
  const download = (accessToken: string) =>
    FileSystem.downloadAsync(
      `${API_BASE_URL}/api/contracts/${contractId}/pdf`,
      uri,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
  try {
    let result = await download(token);
    if (result.status === 401) {
      const refreshed = await supabase.auth.refreshSession();
      token = refreshed.data.session?.access_token;
      if (refreshed.error || !token)
        throw new Error('Please sign in again to download the contract');
      result = await download(token);
    }
    if (result.status !== 200)
      throw new Error('Unable to download the contract PDF. Please try again.');
    const bytes = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    if (!bytes.startsWith('JVBERi0'))
      throw new Error('The server did not return a valid PDF');
    if (Platform.OS === 'android') {
      const permission =
        await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (!permission.granted) return 'cancelled';
      const destination =
        await FileSystem.StorageAccessFramework.createFileAsync(
          permission.directoryUri,
          `Contract-${contractId}.pdf`,
          'application/pdf'
        );
      await FileSystem.writeAsStringAsync(destination, bytes, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return 'saved';
    }
    const shareResult = await Share.share({ url: uri, title: 'Contract PDF' });
    return shareResult.action === Share.dismissedAction
      ? 'cancelled'
      : 'shared';
  } finally {
    await FileSystem.deleteAsync(uri, { idempotent: true }).catch(
      () => undefined
    );
  }
}
