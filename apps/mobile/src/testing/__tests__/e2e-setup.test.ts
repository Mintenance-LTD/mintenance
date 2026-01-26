jest.mock('detox', () => ({
  by: {
    id: jest.fn(),
    text: jest.fn(),
    label: jest.fn(),
    type: jest.fn(),
  },
  device: {
    reloadReactNative: jest.fn(),
    uninstallApp: jest.fn(),
    installApp: jest.fn(),
    launchApp: jest.fn(),
    sendToHome: jest.fn(),
    setOrientation: jest.fn(),
    getPlatform: jest.fn(() => 'ios'),
    setURLBlacklist: jest.fn(),
    enableSynchronization: jest.fn(),
  },
  element: jest.fn(() => ({
    tap: jest.fn(),
    typeText: jest.fn(),
    replaceText: jest.fn(),
    clearText: jest.fn(),
    swipe: jest.fn(),
    scrollTo: jest.fn(),
    longPress: jest.fn(),
  })),
  expect: jest.fn(() => ({
    toBeVisible: jest.fn(() => ({
      withTimeout: jest.fn(),
    })),
  })),
  waitFor: jest.fn(() => ({
    toBeVisible: jest.fn(() => ({
      withTimeout: jest.fn(),
    })),
  })),
}), { virtual: true });

import { E2ETestHelper } from '../e2e-setup';

describe('E2ETestHelper', () => {
  it('exports the module', () => {
    expect(E2ETestHelper).toBeDefined();
  });
});
