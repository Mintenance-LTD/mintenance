import { withErrorHandling, handleDatabaseOperation, validateRequired } from '../serviceHelper';

describe('serviceHelper', () => {
  it('exports helper functions', () => {
    expect(typeof withErrorHandling).toBe('function');
    expect(typeof handleDatabaseOperation).toBe('function');
    expect(typeof validateRequired).toBe('function');
  });
});
