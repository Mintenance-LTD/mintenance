import AppNavigator from '../AppNavigator';

jest.mock('@expo/vector-icons/Ionicons', () => {
  return function MockIonicons() {
    return null;
  };
});

describe('AppNavigator', () => {
  it('exports a component', () => {
    expect(AppNavigator).toBeDefined();
    expect(typeof AppNavigator).toBe('function');
  });
});
