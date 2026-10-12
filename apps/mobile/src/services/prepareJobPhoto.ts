import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import type { ImagePickerAsset } from 'expo-image-picker';

/** Materialise gallery assets as local JPEGs below the multipart gateway limit. */
export async function prepareJobPhoto(photo: ImagePickerAsset) {
  const resize =
    photo.width >= photo.height
      ? { width: Math.min(photo.width || 2048, 2048) }
      : { height: Math.min(photo.height || 2048, 2048) };
  const prepared = await ImageManipulator.manipulateAsync(
    photo.uri,
    [{ resize }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
  );
  const info = await FileSystem.getInfoAsync(prepared.uri);
  if (!info.exists || !('size' in info) || info.size > 3 * 1024 * 1024) {
    await FileSystem.deleteAsync(prepared.uri, { idempotent: true }).catch(
      () => {}
    );
    throw new Error(
      'This photo could not be prepared for upload. Try a smaller image or take a new photo.'
    );
  }
  return prepared.uri;
}
