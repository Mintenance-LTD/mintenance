
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import { ServiceAreasList } from '../ServiceAreasList';

describe('ServiceAreasList', () => {
  it('exports the component', () => {
    expect(ServiceAreasList).toBeDefined();
    expect(typeof ServiceAreasList).toBe('function');
  });
});
