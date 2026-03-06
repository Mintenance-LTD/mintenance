import * as ImageManipulator from 'expo-image-manipulator';

export type ImagePurpose = 'profile' | 'job' | 'property-assessment' | 'thumbnail' | 'custom';

export interface CompressionPreset {
  maxWidth: number;
  maxHeight: number;
  quality: number;
  format: ImageManipulator.SaveFormat;
  thumbnailSize: number;
  preserveExif: boolean;
}

export interface CompressionOptions {
  purpose?: ImagePurpose;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: ImageManipulator.SaveFormat;
  preserveAspectRatio?: boolean;
  preserveExif?: boolean;
  generateThumbnail?: boolean;
  thumbnailSize?: number;
}

export interface CompressionResult {
  uri: string;
  width: number;
  height: number;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  thumbnailUri?: string;
  exifData?: ExifData;
  error?: string;
}

export interface BatchCompressionResult {
  results: CompressionResult[];
  totalOriginalSize: number;
  totalCompressedSize: number;
  totalCompressionRatio: number;
  successCount: number;
  failureCount: number;
  duration: number;
}

export interface ExifData {
  latitude?: number;
  longitude?: number;
  timestamp?: string;
  orientation?: number;
  make?: string;
  model?: string;
  [key: string]: unknown;
}

export type ProgressCallback = (processed: number, total: number, currentFile: string) => void;

export const COMPRESSION_PRESETS: Record<ImagePurpose, CompressionPreset> = {
  'profile': { maxWidth: 800, maxHeight: 800, quality: 0.7, format: ImageManipulator.SaveFormat.JPEG, thumbnailSize: 200, preserveExif: false },
  'job': { maxWidth: 1200, maxHeight: 1200, quality: 0.8, format: ImageManipulator.SaveFormat.JPEG, thumbnailSize: 200, preserveExif: true },
  'property-assessment': { maxWidth: 1600, maxHeight: 1600, quality: 0.85, format: ImageManipulator.SaveFormat.JPEG, thumbnailSize: 200, preserveExif: true },
  'thumbnail': { maxWidth: 200, maxHeight: 200, quality: 0.6, format: ImageManipulator.SaveFormat.JPEG, thumbnailSize: 200, preserveExif: false },
  'custom': { maxWidth: 1024, maxHeight: 1024, quality: 0.75, format: ImageManipulator.SaveFormat.JPEG, thumbnailSize: 200, preserveExif: false },
};
