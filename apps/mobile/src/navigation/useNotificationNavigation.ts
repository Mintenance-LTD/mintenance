import { useCallback, useEffect, useRef } from 'react';
import { NotificationService } from '../services/NotificationService';
import { navigationRef } from './navigationRef';

/** Register after both authentication and the navigation container are ready. */
export function useNotificationNavigation(userId?: string, loading = false) {
  const registered = useRef(false);
  const register = useCallback(() => {
    if (!userId || loading || registered.current || !navigationRef.isReady()) {
      return;
    }
    NotificationService.registerListeners({
      navigate: (screen: string, params?: unknown) =>
        (navigationRef.navigate as (screen: string, params?: unknown) => void)(
          screen,
          params
        ),
      reset: (state: unknown) =>
        navigationRef.reset(state as Parameters<typeof navigationRef.reset>[0]),
      isReady: () => navigationRef.isReady(),
    });
    registered.current = true;
  }, [userId, loading]);

  useEffect(() => {
    register();
    return () => {
      if (registered.current) {
        NotificationService.cleanup();
        registered.current = false;
      }
    };
  }, [register]);

  return register;
}
