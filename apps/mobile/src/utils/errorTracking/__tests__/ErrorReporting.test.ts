import { ErrorReporting } from '../ErrorReporting';

describe('ErrorReporting', () => {
  it('creates an instance', () => {
    const service = new ErrorReporting();
    expect(service).toBeDefined();
  });
});
