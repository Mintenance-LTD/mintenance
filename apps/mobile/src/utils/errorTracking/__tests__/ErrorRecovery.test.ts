import { ErrorRecovery } from '../ErrorRecovery';

describe('ErrorRecovery', () => {
  it('creates an instance', () => {
    const service = new ErrorRecovery();
    expect(service).toBeDefined();
  });
});
