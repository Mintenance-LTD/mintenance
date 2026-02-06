
import { VideoCallService } from '../VideoCallService';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

describe('VideoCallService', () => {
  it('exports the component', () => {
    expect(VideoCallService).toBeDefined();
    expect(typeof VideoCallService).toBe('function');
  });
});
