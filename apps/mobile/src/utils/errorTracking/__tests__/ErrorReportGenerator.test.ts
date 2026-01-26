import { ErrorReportGenerator } from '../ErrorReportGenerator';

describe('ErrorReportGenerator', () => {
  it('exports a generator class', () => {
    expect(ErrorReportGenerator).toBeDefined();
    expect(typeof ErrorReportGenerator).toBe('function');
  });
});
