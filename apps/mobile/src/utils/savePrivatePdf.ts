import { Platform, Share } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../config/supabase';
import { API_BASE_URL } from './mobileApiClient';

export async function savePrivatePdf(
  endpoint: string,
  filename: string,
  document: 'contract' | 'inspection'
): Promise<'saved' | 'shared' | 'cancelled'> {
  if (!/^[a-z0-9-]+$/i.test(filename) || !endpoint.startsWith('/api/')) {
    throw new Error('Invalid PDF download');
  }
  if (!FileSystem.cacheDirectory)
    throw new Error('File storage is unavailable');
  const uri = `${FileSystem.cacheDirectory}${filename}-${Date.now()}.pdf`;
  const { data } = await supabase.auth.getSession();
  let token = data.session?.access_token;
  if (!token)
    throw new Error(`Please sign in again to download the ${document}`);
  const download = (accessToken: string) =>
    FileSystem.downloadAsync(`${API_BASE_URL}${endpoint}`, uri, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  try {
    let result = await download(token);
    if (result.status === 401) {
      const refreshed = await supabase.auth.refreshSession();
      token = refreshed.data.session?.access_token;
      if (refreshed.error || !token)
        throw new Error(`Please sign in again to download the ${document}`);
      result = await download(token);
    }
    if (result.status !== 200)
      throw new Error(
        `Unable to download the ${document} PDF. Please try again.`
      );
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
          `${filename}.pdf`,
          'application/pdf'
        );
      await FileSystem.writeAsStringAsync(destination, bytes, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return 'saved';
    }
    const shareResult = await Share.share({
      url: uri,
      title: document === 'contract' ? 'Contract PDF' : 'Inspection PDF',
    });
    return shareResult.action === Share.dismissedAction
      ? 'cancelled'
      : 'shared';
  } finally {
    await FileSystem.deleteAsync(uri, { idempotent: true }).catch(
      () => undefined
    );
  }
}
