
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import { VideoCallService } from '../VideoCallService';

describe('VideoCallService', () => {
  it('exports the component', () => {
    expect(VideoCallService).toBeDefined();
    expect(typeof VideoCallService).toBe('function');
  });
});
