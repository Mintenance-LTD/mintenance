import '../test-utils/jest-globals';

const createStub = () => global.jest?.fn?.() || (() => {});

export const useHaptics = () => ({
  light: createStub(),
  medium: createStub(),
  heavy: createStub(),
  success: createStub(),
  error: createStub(),
  warning: createStub(),
  buttonPress: createStub(),
  impactLight: createStub(),
  impactMedium: createStub(),
  impactHeavy: createStub(),
});