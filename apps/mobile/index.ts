import { registerRootComponent } from 'expo';
import App from './App';

// Global error handlers for unhandled errors
import { logger } from './src/utils/logger';

// Handle unhandled promise rejections using React Native's ErrorUtils
// (global.addEventListener is a DOM API, not available in Hermes/React Native)
const globalErrorHandler = ErrorUtils.getGlobalHandler();
ErrorUtils.setGlobalHandler((error, isFatal) => {
  logger.error(isFatal ? 'Fatal Error' : 'Uncaught Exception', error, {
    service: 'global-error-handler',
    type: isFatal ? 'fatal-error' : 'uncaught-exception',
  });
  // Call the default handler so React Native can still show the red screen in dev
  if (globalErrorHandler) {
    globalErrorHandler(error, isFatal);
  }
});

// Enable promise rejection tracking via Hermes or polyfill
if (typeof (global as any).HermesInternal?.enablePromiseRejectionTracker === 'function') {
  (global as any).HermesInternal.enablePromiseRejectionTracker({
    allRejections: true,
    onUnhandled: (id: number, rejection: unknown) => {
      logger.error('Unhandled Promise Rejection', rejection, {
        service: 'global-error-handler',
        type: 'unhandled-promise-rejection',
        promiseId: id,
      });
    },
  });
}

registerRootComponent(App);