import { logger } from '../../utils/logger';
import type { ExifData } from './types';

/** Extract EXIF data from image. Uses expo-media-library when available. */
export async function extractExifData(imageUri: string): Promise<ExifData | undefined> {
  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error expo-media-library types not declared in this project
    const MediaLibrary = await import('expo-media-library');
    const { status } = await MediaLibrary.default.getPermissionsAsync();
    if (status !== 'granted') return undefined;

    if (imageUri.startsWith('ph://') || imageUri.startsWith('content://')) {
      const asset = await MediaLibrary.default.getAssetInfoAsync(imageUri);
      if (asset?.exif) {
        return {
          latitude: asset.exif.GPSLatitude || asset.location?.latitude,
          longitude: asset.exif.GPSLongitude || asset.location?.longitude,
          timestamp: asset.exif.DateTimeOriginal || asset.creationTime,
          deviceMake: asset.exif.Make,
          deviceModel: asset.exif.Model,
          orientation: asset.exif.Orientation,
          altitude: asset.exif.GPSAltitude || asset.location?.altitude,
        };
      }
    }

    if (imageUri.startsWith('file://')) {
      const recentAssets = await MediaLibrary.default.getAssetsAsync({ first: 5, sortBy: ['modificationTime'] });
      for (const asset of recentAssets.assets) {
        const assetInfo = await MediaLibrary.default.getAssetInfoAsync(asset.id);
        if (assetInfo.localUri === imageUri || assetInfo.uri === imageUri) {
          if (assetInfo.exif) {
            return {
              latitude: assetInfo.exif.GPSLatitude || assetInfo.location?.latitude,
              longitude: assetInfo.exif.GPSLongitude || assetInfo.location?.longitude,
              timestamp: assetInfo.exif.DateTimeOriginal || assetInfo.creationTime,
              deviceMake: assetInfo.exif.Make,
              deviceModel: assetInfo.exif.Model,
              orientation: assetInfo.exif.Orientation,
              altitude: assetInfo.exif.GPSAltitude || assetInfo.location?.altitude,
            };
          }
        }
      }
    }

    return undefined;
  } catch (error) {
    logger.warn('EXIF extraction failed', { error });
    return undefined;
  }
}
