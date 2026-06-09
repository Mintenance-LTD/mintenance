/**
 * config/sentry — Sentry init + the exported capture/breadcrumb helpers.
 * jest-setup.js globally mocks this module, so we jest.unmock it to exercise
 * the real source. Deps (@sentry, logger, environment) use self-contained
 * mock factories; we import the mocked instances back to assert/mutate them.
 *
 * (Replaces the previous stub that mocked the whole module and exercised none
 * of the real source.)
 */

jest.mock('@sentry/react-native', () => ({
  __esModule: true,
  init: jest.fn(),
  captureMessage: jest.fn(),
  captureException: jest.fn(),
  addBreadcrumb: jest.fn(),
  setUser: jest.fn(),
  setContext: jest.fn(),
}));

jest.mock('../../utils/logger', () => ({
  __esModule: true,
  setSentryFunctions: jest.fn(),
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../environment', () => ({
  __esModule: true,
  config: {
    sentryDsn: 'https://abc@o1.ingest.sentry.io/1',
    environment: 'production',
  },
  isFeatureEnabled: jest.fn(() => true),
}));

jest.unmock('../sentry');

import * as Sentry from '@sentry/react-native';
import { setSentryFunctions, logger } from '../../utils/logger';
import { config, isFeatureEnabled } from '../environment';
import {
  initSentry,
  captureException,
  addBreadcrumb,
  trackUserAction,
} from '../sentry';

const mockInit = Sentry.init as jest.Mock;
const mockSetFns = setSentryFunctions as jest.Mock;
const mockIsEnabled = isFeatureEnabled as unknown as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockIsEnabled.mockReturnValue(true);
  config.sentryDsn = 'https://abc@o1.ingest.sentry.io/1';
  config.environment = 'production';
  delete process.env.EXPO_PUBLIC_SENTRY_DEBUG;
});

describe('initSentry', () => {
  it('installs no-op logger functions when crash reporting is disabled', () => {
    mockIsEnabled.mockReturnValue(false);
    initSentry();
    expect(mockInit).not.toHaveBeenCalled();
    expect(mockSetFns).toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(
      'Sentry disabled',
      expect.any(Object)
    );
  });

  it('skips init when there is no DSN', () => {
    config.sentryDsn = '';
    initSentry();
    expect(mockInit).not.toHaveBeenCalled();
  });

  it('initializes Sentry and wires real logger functions when enabled', () => {
    initSentry();
    expect(mockInit).toHaveBeenCalled();
    const fns = mockSetFns.mock.calls[0][0];
    fns.captureMessage('hi', 'info');
    expect(Sentry.captureMessage).toHaveBeenCalledWith('hi', 'info');
  });

  it('beforeSend drops dev events without the debug flag, keeps prod events', () => {
    initSentry();
    const initArg = mockInit.mock.calls[0][0];
    expect(initArg.beforeSend({ id: 'e1' })).toEqual({ id: 'e1' });

    config.environment = 'development';
    initSentry();
    const devArg = mockInit.mock.calls[1][0];
    expect(devArg.beforeSend({ id: 'e2' })).toBeNull();
  });
});

describe('captureException', () => {
  it('logs locally (no Sentry) in development', () => {
    config.environment = 'development';
    captureException(new Error('boom'), { a: 1 });
    expect(logger.error).toHaveBeenCalled();
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it('logs locally when crash reporting is disabled', () => {
    mockIsEnabled.mockReturnValue(false);
    captureException(new Error('boom'));
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it('sends to Sentry in production when enabled', () => {
    const err = new Error('prod boom');
    captureException(err, { k: 'v' });
    expect(Sentry.captureException).toHaveBeenCalledWith(err, {
      extra: { k: 'v' },
    });
  });
});

describe('addBreadcrumb + trackUserAction', () => {
  it('addBreadcrumb forwards with a default category', () => {
    addBreadcrumb('did a thing');
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'did a thing',
        category: 'app',
        level: 'info',
      })
    );
  });

  it('addBreadcrumb honours an explicit category + data', () => {
    addBreadcrumb('m', 'security', { x: 1 });
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'security', data: { x: 1 } })
    );
  });

  it('trackUserAction records a user-category breadcrumb', () => {
    trackUserAction('tapped_cta', { id: 'b1' });
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'User action: tapped_cta',
        category: 'user',
      })
    );
  });
});
