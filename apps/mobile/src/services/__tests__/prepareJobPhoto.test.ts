import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { prepareJobPhoto } from '../prepareJobPhoto';
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: 'jpeg' },
}));
jest.mock('expo-file-system/legacy', () => ({
  getInfoAsync: jest.fn(),
  deleteAsync: jest.fn(async () => {}),
}));
beforeEach(() => {
  jest.clearAllMocks();
  (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue({
    uri: 'file:///prepared.jpg',
  });
  (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
    exists: true,
    size: 1200000,
  });
});
it('materialises a large gallery content URI as a bounded JPEG', async () => {
  expect(
    await prepareJobPhoto({
      uri: 'content://gallery/123',
      width: 6000,
      height: 4000,
    } as any)
  ).toBe('file:///prepared.jpg');
  expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
    'content://gallery/123',
    [{ resize: { width: 2048 } }],
    { compress: 0.8, format: 'jpeg' }
  );
});
it('does not send files above the gateway budget', async () => {
  (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
    exists: true,
    size: 4000000,
  });
  await expect(
    prepareJobPhoto({
      uri: 'file:///original.png',
      width: 3000,
      height: 4000,
    } as any)
  ).rejects.toThrow('could not be prepared');
  expect(FileSystem.deleteAsync).toHaveBeenCalledWith('file:///prepared.jpg', {
    idempotent: true,
  });
});
