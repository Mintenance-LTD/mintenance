import * as SecureStore from 'expo-secure-store';
import { scheduleRequest } from '../scheduleRequestKey';

it('reuses an unconfirmed request across new calls and releases it only after confirmation', async () => {
  const values = new Map<string, string>();
  jest
    .spyOn(SecureStore, 'getItemAsync')
    .mockImplementation(async (key) => values.get(key) ?? null);
  jest
    .spyOn(SecureStore, 'setItemAsync')
    .mockImplementation(async (key, value) => {
      values.set(key, value);
    });
  jest.spyOn(SecureStore, 'deleteItemAsync').mockImplementation(async (key) => {
    values.delete(key);
  });
  const first = await scheduleRequest('actor:property', {
    title: 'Synthetic task',
  });
  const retry = await scheduleRequest('actor:property', {
    title: 'Synthetic task',
  });
  expect(retry.key).toBe(first.key);
  expect(
    (await scheduleRequest('other:property', { title: 'Synthetic task' })).key
  ).not.toBe(first.key);
  await retry.complete();
  expect(
    (await scheduleRequest('actor:property', { title: 'Synthetic task' })).key
  ).not.toBe(first.key);
});
