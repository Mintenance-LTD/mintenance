import * as ImageManipulator from 'expo-image-manipulator';
import { logger } from '../../utils/logger';

export async function generateThumbnail(imageUri: string, size = 200): Promise<string> {
  try {
    const thumbnail = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: size, height: size } }],
      { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
    );
    return thumbnail.uri;
  } catch (error) {
    logger.error('Thumbnail generation failed', error as Error);
    throw error;
  }
}

export async function generateMultipleThumbnails(
  imageUri: string,
  sizes: number[] = [100, 200, 400]
): Promise<{ size: number; uri: string }[]> {
  try {
    return await Promise.all(sizes.map(async (size) => ({ size, uri: await generateThumbnail(imageUri, size) })));
  } catch (error) {
    logger.error('Multiple thumbnail generation failed', error as Error);
    throw error;
  }
}
