jest.mock('@expo/vector-icons/Ionicons', () => {
  return function MockIonicons() {
    return null;
  };
});

import AppNavigator from '../AppNavigator';

describe('AppNavigator', () => {
  it('exports a component', () => {
    expect(AppNavigator).toBeDefined();
    expect(typeof AppNavigator).toBe('function');
  });
});
