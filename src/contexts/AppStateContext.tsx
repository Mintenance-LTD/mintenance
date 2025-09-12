import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react';
import { User, Job, Notification } from '../types/schemas';

// ============================================================================
// STATE TYPES
// ============================================================================

export interface AppState {
  // User State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // UI State
  theme: 'light' | 'dark' | 'system';
  notifications: Notification[];
  isOffline: boolean;
  
  // Data State
  jobs: Job[];
  favoriteJobs: string[];
  searchHistory: string[];
  
  // Cache State
  lastSyncTimestamp: number | null;
  cacheVersion: string;
}

export type AppAction =
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_AUTHENTICATED'; payload: boolean }
  | { type: 'SET_THEME'; payload: 'light' | 'dark' | 'system' }
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'CLEAR_NOTIFICATIONS' }
  | { type: 'SET_OFFLINE'; payload: boolean }
  | { type: 'SET_JOBS'; payload: Job[] }
  | { type: 'ADD_JOB'; payload: Job }
  | { type: 'UPDATE_JOB'; payload: { id: string; updates: Partial<Job> } }
  | { type: 'REMOVE_JOB'; payload: string }
  | { type: 'TOGGLE_FAVORITE_JOB'; payload: string }
  | { type: 'ADD_SEARCH_TERM'; payload: string }
  | { type: 'CLEAR_SEARCH_HISTORY' }
  | { type: 'UPDATE_LAST_SYNC'; payload: number }
  | { type: 'SET_CACHE_VERSION'; payload: string }
  | { type: 'RESET_STATE' };

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: AppState = {
  // User State
  user: null,
  isAuthenticated: false,
  isLoading: false,
  
  // UI State
  theme: 'system',
  notifications: [],
  isOffline: false,
  
  // Data State
  jobs: [],
  favoriteJobs: [],
  searchHistory: [],
  
  // Cache State
  lastSyncTimestamp: null,
  cacheVersion: '1.0.0',
};

// ============================================================================
// REDUCER
// ============================================================================

const appStateReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: action.payload !== null,
      };
    
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    
    case 'SET_AUTHENTICATED':
      return {
        ...state,
        isAuthenticated: action.payload,
      };
    
    case 'SET_THEME':
      return {
        ...state,
        theme: action.payload,
      };
    
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [...state.notifications, action.payload],
      };
    
    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload),
      };
    
    case 'CLEAR_NOTIFICATIONS':
      return {
        ...state,
        notifications: [],
      };
    
    case 'SET_OFFLINE':
      return {
        ...state,
        isOffline: action.payload,
      };
    
    case 'SET_JOBS':
      return {
        ...state,
        jobs: action.payload,
      };
    
    case 'ADD_JOB':
      return {
        ...state,
        jobs: [...state.jobs, action.payload],
      };
    
    case 'UPDATE_JOB':
      return {
        ...state,
        jobs: state.jobs.map(job =>
          job.id === action.payload.id
            ? { ...job, ...action.payload.updates }
            : job
        ),
      };
    
    case 'REMOVE_JOB':
      return {
        ...state,
        jobs: state.jobs.filter(job => job.id !== action.payload),
        favoriteJobs: state.favoriteJobs.filter(id => id !== action.payload),
      };
    
    case 'TOGGLE_FAVORITE_JOB':
      const jobId = action.payload;
      const isFavorite = state.favoriteJobs.includes(jobId);
      return {
        ...state,
        favoriteJobs: isFavorite
          ? state.favoriteJobs.filter(id => id !== jobId)
          : [...state.favoriteJobs, jobId],
      };
    
    case 'ADD_SEARCH_TERM':
      const term = action.payload.trim();
      if (!term || state.searchHistory.includes(term)) {
        return state;
      }
      return {
        ...state,
        searchHistory: [term, ...state.searchHistory.slice(0, 9)], // Keep last 10
      };
    
    case 'CLEAR_SEARCH_HISTORY':
      return {
        ...state,
        searchHistory: [],
      };
    
    case 'UPDATE_LAST_SYNC':
      return {
        ...state,
        lastSyncTimestamp: action.payload,
      };
    
    case 'SET_CACHE_VERSION':
      return {
        ...state,
        cacheVersion: action.payload,
      };
    
    case 'RESET_STATE':
      return {
        ...initialState,
        theme: state.theme, // Preserve theme preference
      };
    
    default:
      return state;
  }
};

// ============================================================================
// CONTEXT TYPES
// ============================================================================

interface AppStateContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  
  // Convenience methods
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  setOffline: (offline: boolean) => void;
  addJob: (job: Job) => void;
  updateJob: (id: string, updates: Partial<Job>) => void;
  removeJob: (id: string) => void;
  toggleFavoriteJob: (id: string) => void;
  addSearchTerm: (term: string) => void;
  clearSearchHistory: () => void;
  updateLastSync: () => void;
  resetState: () => void;
  
  // Computed values
  favoriteJobsData: Job[];
  hasNotifications: boolean;
  isJobFavorite: (jobId: string) => boolean;
  getJobById: (jobId: string) => Job | undefined;
}

// ============================================================================
// CONTEXT CREATION
// ============================================================================

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appStateReducer, initialState);

  // ============================================================================
  // CONVENIENCE METHODS
  // ============================================================================

  const setUser = useCallback((user: User | null) => {
    dispatch({ type: 'SET_USER', payload: user });
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  }, []);

  const setTheme = useCallback((theme: 'light' | 'dark' | 'system') => {
    dispatch({ type: 'SET_THEME', payload: theme });
  }, []);

  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    dispatch({
      type: 'ADD_NOTIFICATION',
      payload: { ...notification, id } as Notification,
    });
  }, []);

  const removeNotification = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
  }, []);

  const clearNotifications = useCallback(() => {
    dispatch({ type: 'CLEAR_NOTIFICATIONS' });
  }, []);

  const setOffline = useCallback((offline: boolean) => {
    dispatch({ type: 'SET_OFFLINE', payload: offline });
  }, []);

  const addJob = useCallback((job: Job) => {
    dispatch({ type: 'ADD_JOB', payload: job });
  }, []);

  const updateJob = useCallback((id: string, updates: Partial<Job>) => {
    dispatch({ type: 'UPDATE_JOB', payload: { id, updates } });
  }, []);

  const removeJob = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_JOB', payload: id });
  }, []);

  const toggleFavoriteJob = useCallback((id: string) => {
    dispatch({ type: 'TOGGLE_FAVORITE_JOB', payload: id });
  }, []);

  const addSearchTerm = useCallback((term: string) => {
    dispatch({ type: 'ADD_SEARCH_TERM', payload: term });
  }, []);

  const clearSearchHistory = useCallback(() => {
    dispatch({ type: 'CLEAR_SEARCH_HISTORY' });
  }, []);

  const updateLastSync = useCallback(() => {
    dispatch({ type: 'UPDATE_LAST_SYNC', payload: Date.now() });
  }, []);

  const resetState = useCallback(() => {
    dispatch({ type: 'RESET_STATE' });
  }, []);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const favoriteJobsData = useMemo(() => {
    return state.jobs.filter(job => state.favoriteJobs.includes(job.id));
  }, [state.jobs, state.favoriteJobs]);

  const hasNotifications = useMemo(() => {
    return state.notifications.length > 0;
  }, [state.notifications.length]);

  const isJobFavorite = useCallback((jobId: string) => {
    return state.favoriteJobs.includes(jobId);
  }, [state.favoriteJobs]);

  const getJobById = useCallback((jobId: string) => {
    return state.jobs.find(job => job.id === jobId);
  }, [state.jobs]);

  // ============================================================================
  // CONTEXT VALUE
  // ============================================================================

  const contextValue = useMemo<AppStateContextType>(() => ({
    state,
    dispatch,
    
    // Methods
    setUser,
    setLoading,
    setTheme,
    addNotification,
    removeNotification,
    clearNotifications,
    setOffline,
    addJob,
    updateJob,
    removeJob,
    toggleFavoriteJob,
    addSearchTerm,
    clearSearchHistory,
    updateLastSync,
    resetState,
    
    // Computed values
    favoriteJobsData,
    hasNotifications,
    isJobFavorite,
    getJobById,
  }), [
    state,
    setUser,
    setLoading,
    setTheme,
    addNotification,
    removeNotification,
    clearNotifications,
    setOffline,
    addJob,
    updateJob,
    removeJob,
    toggleFavoriteJob,
    addSearchTerm,
    clearSearchHistory,
    updateLastSync,
    resetState,
    favoriteJobsData,
    hasNotifications,
    isJobFavorite,
    getJobById,
  ]);

  return (
    <AppStateContext.Provider value={contextValue}>
      {children}
    </AppStateContext.Provider>
  );
};

// ============================================================================
// HOOK
// ============================================================================

export const useAppState = (): AppStateContextType => {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
};

// ============================================================================
// SELECTORS
// ============================================================================

export const useAppSelector = <T>(selector: (state: AppState) => T): T => {
  const { state } = useAppState();
  return useMemo(() => selector(state), [selector, state]);
};

// Common selectors
export const useUser = () => useAppSelector(state => state.user);
export const useIsAuthenticated = () => useAppSelector(state => state.isAuthenticated);
export const useIsLoading = () => useAppSelector(state => state.isLoading);
export const useTheme = () => useAppSelector(state => state.theme);
export const useNotifications = () => useAppSelector(state => state.notifications);
export const useIsOffline = () => useAppSelector(state => state.isOffline);
export const useJobs = () => useAppSelector(state => state.jobs);
export const useFavoriteJobs = () => useAppSelector(state => state.favoriteJobs);
export const useSearchHistory = () => useAppSelector(state => state.searchHistory);

export default AppStateProvider;
