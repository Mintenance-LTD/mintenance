import React from 'react';
import { AppState, AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { LocalDatabase } from '../services/LocalDatabase';
import { SyncManager } from '../services/SyncManager';
import { restoreQueryClient, persistQueryClient } from '../lib/queryClient';
import { logger } from '../utils/logger';
import { useNetworkState } from './useNetworkState';

export interface AppInitializationState {
  isInitializing: boolean;
  isReady: boolean;
  initializationError: Error | null;
  progress: {
    currentStep: string;
    completedSteps: string[];
    totalSteps: number;
  };
}

export interface InitializationStep {
  name: string;
  description: string;
  execute: () => Promise<void>;
  retryable?: boolean;
  critical?: boolean;
}

const INITIALIZATION_STEPS: InitializationStep[] = [
  {
    name: 'database',
    description: 'Initializing local database',
    execute: async () => {
      await LocalDatabase.init();
    },
    retryable: true,
    critical: true,
  },
  {
    name: 'query_cache',
    description: 'Restoring cached data',
    execute: async () => {
      await restoreQueryClient();
    },
    retryable: true,
    critical: false,
  },
  {
    name: 'sync_manager',
    description: 'Starting sync manager',
    execute: async () => {
      await SyncManager.init();
    },
    retryable: true,
    critical: true,
  },
  {
    name: 'initial_sync',
    description: 'Performing initial data sync',
    execute: async () => {
      // Only sync if online
      const networkState = await NetInfo.fetch();
      if (networkState.isConnected && networkState.isInternetReachable) {
        await SyncManager.syncAll({ 
          strategy: 'background', 
          direction: 'download' 
        });
      }
    },
    retryable: true,
    critical: false,
  },
];

export const useAppInitialization = () => {
  const [state, setState] = React.useState<AppInitializationState>({
    isInitializing: true,
    isReady: false,
    initializationError: null,
    progress: {
      currentStep: '',
      completedSteps: [],
      totalSteps: INITIALIZATION_STEPS.length,
    },
  });

  const { isOnline } = useNetworkState();

  const initializeApp = React.useCallback(async () => {
    logger.info('Starting app initialization');
    
    setState(prev => ({
      ...prev,
      isInitializing: true,
      initializationError: null,
      progress: {
        currentStep: '',
        completedSteps: [],
        totalSteps: INITIALIZATION_STEPS.length,
      },
    }));

    const completedSteps: string[] = [];
    
    try {
      for (const step of INITIALIZATION_STEPS) {
        setState(prev => ({
          ...prev,
          progress: {
            ...prev.progress,
            currentStep: step.description,
          },
        }));

        logger.info(`Executing initialization step: ${step.name}`, {
          description: step.description,
        });

        try {
          await step.execute();
          completedSteps.push(step.name);
          
          setState(prev => ({
            ...prev,
            progress: {
              ...prev.progress,
              completedSteps: [...completedSteps],
            },
          }));

          logger.info(`Initialization step completed: ${step.name}`);
        } catch (error) {
          logger.error(`Initialization step failed: ${step.name}`, error);
          
          if (step.critical) {
            throw new Error(`Critical initialization step failed: ${step.description}`);
          } else {
            logger.warn(`Non-critical step failed, continuing: ${step.name}`, {
              error: (error as Error).message,
            });
          }
        }
      }

      setState({
        isInitializing: false,
        isReady: true,
        initializationError: null,
        progress: {
          currentStep: 'Ready',
          completedSteps,
          totalSteps: INITIALIZATION_STEPS.length,
        },
      });

      logger.info('App initialization completed successfully', {
        completedSteps: completedSteps.length,
        totalSteps: INITIALIZATION_STEPS.length,
      });
    } catch (error) {
      const initError = error as Error;
      
      setState({
        isInitializing: false,
        isReady: false,
        initializationError: initError,
        progress: {
          currentStep: 'Failed',
          completedSteps,
          totalSteps: INITIALIZATION_STEPS.length,
        },
      });

      logger.error('App initialization failed', initError, {
        completedSteps: completedSteps.length,
        totalSteps: INITIALIZATION_STEPS.length,
      });
    }
  }, []);

  const retryInitialization = React.useCallback(async () => {
    logger.info('Retrying app initialization');
    await initializeApp();
  }, [initializeApp]);

  // Initialize on mount
  React.useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  // Handle app state changes
  React.useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && state.isReady) {
        // App became active, persist current query cache
        persistQueryClient().catch(error => {
          logger.error('Failed to persist query cache on app focus:', error);
        });
        
        // Trigger background sync if online
        if (isOnline) {
          SyncManager.syncAll({ 
            strategy: 'background', 
            direction: 'bidirectional' 
          }).catch(error => {
            logger.error('Background sync failed on app focus:', error);
          });
        }
      } else if (nextAppState === 'background' && state.isReady) {
        // App went to background, persist query cache
        persistQueryClient().catch(error => {
          logger.error('Failed to persist query cache on app background:', error);
        });
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
  }, [state.isReady, isOnline]);

  // Network reconnection handler
  React.useEffect(() => {
    if (isOnline && state.isReady) {
      // Trigger sync when coming back online
      SyncManager.syncAll({ 
        strategy: 'background', 
        direction: 'bidirectional' 
      }).catch(error => {
        logger.error('Sync failed after network reconnection:', error);
      });
    }
  }, [isOnline, state.isReady]);

  return {
    ...state,
    retryInitialization,
    
    // Progress helpers
    progressPercentage: Math.round((state.progress.completedSteps.length / state.progress.totalSteps) * 100),
    isStepCompleted: (stepName: string) => state.progress.completedSteps.includes(stepName),
    remainingSteps: INITIALIZATION_STEPS.length - state.progress.completedSteps.length,
  };
};

/**
 * HOC to ensure app is properly initialized before rendering content
 */
export const withAppInitialization = <P extends object>(
  Component: React.ComponentType<P>
) => {
  return React.forwardRef<any, P>((props, ref) => {
    const initialization = useAppInitialization();

    // Note: In actual implementation, these would render proper React Native screens
    if (initialization.isInitializing) {
      // Would render AppInitializationScreen component
      return null;
    }

    if (initialization.initializationError) {
      // Would render InitializationErrorScreen component
      return null;
    }

    if (initialization.isReady) {
      return React.createElement(Component, { ...props, ref });
    }

    return null;
  });
};

/**
 * For actual implementation, these would be proper React Native components.
 * For now, we'll export them as component definitions that can be implemented
 * in the actual screen components.
 */
export const createAppInitializationScreen = () => {
  // This would return a proper React Native component
  // Implementation would be in a separate screen component file
  return null;
};

export const createInitializationErrorScreen = () => {
  // This would return a proper React Native component  
  // Implementation would be in a separate screen component file
  return null;
};