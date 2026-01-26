import { AccessibilityManager } from '../AccessibilityManager';

describe('AccessibilityManager', () => {
  it('exports the manager class', () => {
    expect(AccessibilityManager).toBeDefined();
    expect(typeof AccessibilityManager).toBe('function');
  });
});
