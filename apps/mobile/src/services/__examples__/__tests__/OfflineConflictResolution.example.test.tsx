import * as OfflineConflictResolutionExample from '../OfflineConflictResolution.example';

describe('OfflineConflictResolution.example', () => {
  it('should export example helpers', () => {
    expect(OfflineConflictResolutionExample).toBeDefined();
    expect(typeof OfflineConflictResolutionExample.UpdateJobWithVersioning).toBe('function');
    expect(typeof OfflineConflictResolutionExample.ConflictResolutionScreen).toBe('function');
  });

  it('should export data mutation helpers', () => {
    expect(typeof OfflineConflictResolutionExample.UpdatePaymentInfo).toBe('function');
    expect(typeof OfflineConflictResolutionExample.UpdateUserPreferences).toBe('function');
    expect(typeof OfflineConflictResolutionExample.UpdateSharedJob).toBe('function');
  });
});
