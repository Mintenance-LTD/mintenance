import { registerRootComponent } from 'expo';
import App from './App';

// Global error handlers for unhandled errors
import { logger } from './src/utils/logger';

// Handle unhandled promise rejections
global.addEventListener('unhandledrejection', (event) => {
  logger.error('Unhandled Promise Rejection', event.reason, {
    service: 'global-error-handler',
    type: 'unhandled-promise-rejection'
  });
  
  // Prevent the default behavior (crashing the app)
  event.preventDefault();
});

// Handle uncaught exceptions
global.addEventListener('error', (event) => {
  logger.error('Uncaught Exception', event.error, {
    service: 'global-error-handler',
    type: 'uncaught-exception'
  });
});

// React Native specific error handling
if (__DEV__) {
  // Log React Native warnings in development
  const originalConsoleWarn = console.warn;
  console.warn = (...args) => {
    logger.warn('React Native Warning', { message: args.join(' ') });
    originalConsoleWarn.apply(console, args);
  };
}

registerRootComponent(App);