import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../../config/supabase';
import { saveContractPdf } from '../saveContractPdf';

jest.mock('../mobileApiClient', () => ({
  API_BASE_URL: 'https://test.example.invalid',
}));
jest.mock('../../config/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      refreshSession: jest.fn(),
    },
  },
}));
jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  EncodingType: { Base64: 'base64' },
  downloadAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
  deleteAsync: jest.fn(),
  StorageAccessFramework: {
    requestDirectoryPermissionsAsync: jest.fn(),
    createFileAsync: jest.fn(),
  },
}));

const id = '00000000-0000-4000-8000-000000000001';
describe('saveContractPdf', () => {
  const originalOS = Platform.OS;
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, 'OS', {
      value: 'android',
      configurable: true,
    });
    jest.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { access_token: 'synthetic-token' } },
      error: null,
    } as never);
    jest
      .mocked(FileSystem.downloadAsync)
      .mockResolvedValue({ status: 200 } as never);
    jest.mocked(FileSystem.readAsStringAsync).mockResolvedValue('JVBERi0xLjcK');
    jest.mocked(FileSystem.deleteAsync).mockResolvedValue(undefined);
    jest
      .mocked(
        FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync
      )
      .mockResolvedValue({
        granted: true,
        directoryUri: 'content://selected-folder',
      });
    jest
      .mocked(FileSystem.StorageAccessFramework.createFileAsync)
      .mockResolvedValue('content://selected-file');
  });
  afterAll(() =>
    Object.defineProperty(Platform, 'OS', {
      value: originalOS,
      configurable: true,
    })
  );

  it('downloads binary with auth and writes to the user-selected folder', async () => {
    expect(await saveContractPdf(id)).toBe('saved');
    expect(FileSystem.downloadAsync).toHaveBeenCalledWith(
      `https://test.example.invalid/api/contracts/${id}/pdf`,
      expect.any(String),
      { headers: { Authorization: 'Bearer synthetic-token' } }
    );
    expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith(
      'content://selected-file',
      'JVBERi0xLjcK',
      { encoding: 'base64' }
    );
    expect(FileSystem.deleteAsync).toHaveBeenCalled();
  });
  it('does not claim a saved file when folder selection is cancelled', async () => {
    jest
      .mocked(
        FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync
      )
      .mockResolvedValue({ granted: false });
    expect(await saveContractPdf(id)).toBe('cancelled');
    expect(FileSystem.writeAsStringAsync).not.toHaveBeenCalled();
    expect(FileSystem.deleteAsync).toHaveBeenCalled();
  });
  it('refreshes an expired session once before retrying the binary request', async () => {
    jest
      .mocked(FileSystem.downloadAsync)
      .mockResolvedValueOnce({ status: 401 } as never);
    jest.mocked(supabase.auth.refreshSession).mockResolvedValue({
      data: { session: { access_token: 'synthetic-refreshed' } },
      error: null,
    } as never);
    expect(await saveContractPdf(id)).toBe('saved');
    expect(FileSystem.downloadAsync).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.any(String),
      { headers: { Authorization: 'Bearer synthetic-refreshed' } }
    );
  });
  it('rejects an error page instead of saving it as a PDF', async () => {
    jest.mocked(FileSystem.readAsStringAsync).mockResolvedValue('PGh0bWw+');
    await expect(saveContractPdf(id)).rejects.toThrow('valid PDF');
    expect(
      FileSystem.StorageAccessFramework.createFileAsync
    ).not.toHaveBeenCalled();
    expect(FileSystem.deleteAsync).toHaveBeenCalled();
  });
  it('preserves failure when the file cannot be written', async () => {
    jest
      .mocked(FileSystem.writeAsStringAsync)
      .mockRejectedValueOnce(new Error('Storage unavailable'));
    await expect(saveContractPdf(id)).rejects.toThrow('Storage unavailable');
    expect(FileSystem.deleteAsync).toHaveBeenCalled();
  });
});
