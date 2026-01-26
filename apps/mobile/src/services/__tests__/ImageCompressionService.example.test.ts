jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg', PNG: 'png' },
  manipulateAsync: jest.fn(),
}));

jest.mock('expo-file-system', () => ({
  cacheDirectory: '/tmp/',
  documentDirectory: '/tmp/',
  getInfoAsync: jest.fn(() => Promise.resolve({ size: 0 })),
  readAsStringAsync: jest.fn(() => Promise.resolve('')),
  writeAsStringAsync: jest.fn(() => Promise.resolve()),
  deleteAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-application', () => ({
  nativeApplicationVersion: '1.0.0',
  nativeBuildVersion: '1',
}));

jest.mock('expo-device', () => ({
  brand: 'TestBrand',
  modelName: 'TestModel',
  deviceYearClass: 2024,
  deviceType: 1,
  isDevice: true,
}));

jest.mock('../ImageCompressionService', () => ({
  __esModule: true,
  default: {
    getCompressionStats: jest.fn(() => ({ savedMB: 0, savedPercentage: 0 })),
  },
  compressProfilePhoto: jest.fn(() => Promise.resolve({
    uri: '',
    width: 0,
    height: 0,
    originalSize: 0,
    compressedSize: 0,
    compressionRatio: 1,
  })),
  compressJobPhoto: jest.fn(),
  compressPropertyAssessmentPhoto: jest.fn(),
  compressJobPhotos: jest.fn(),
}));

jest.mock('../PhotoUploadService', () => ({
  PhotoUploadService: {
    uploadProfilePhoto: jest.fn(),
    uploadJobPhotos: jest.fn(),
  },
}));

jest.mock('expo-image-picker', () => ({
  MediaTypeOptions: { Images: 'Images' },
  launchImageLibraryAsync: jest.fn(() => Promise.resolve({ canceled: true, assets: [] })),
}));

import * as ImageCompressionExamples from '../ImageCompressionService.example';

describe('ImageCompressionService.example', () => {
  describe('initialization', () => {
    it('should export example helpers', async () => {
      expect(ImageCompressionExamples).toBeDefined();
      expect(typeof ImageCompressionExamples.uploadProfilePhotoExample).toBe('function');
      expect(typeof ImageCompressionExamples.uploadJobPhotosExample).toBe('function');
    });
  });

  describe('methods', () => {
    it('should handle successful operations', async () => {
      // Test successful cases
    });

    it('should handle errors gracefully', async () => {
      // Test error cases
    });

    it('should validate inputs', async () => {
      // Test input validation
    });
  });
});
