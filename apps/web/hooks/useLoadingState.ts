'use client';

import { useState, useCallback, useEffect } from 'react';

interface LoadingState {
  isLoading: boolean;
  error: string | null;
  data: any;
}

interface UseLoadingStateOptions {
  initialData?: any;
  onError?: (error: string) => void;
  onSuccess?: (data: any) => void;
}

export const useLoadingState = (options: UseLoadingStateOptions = {}) => {
  const [state, setState] = useState<LoadingState>({
    isLoading: false,
    error: null,
    data: options.initialData || null,
  });

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({
      ...prev,
      isLoading: loading,
      error: loading ? null : prev.error, // Clear error when starting to load
    }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({
      ...prev,
      error,
      isLoading: false,
    }));
    
    if (error && options.onError) {
      options.onError(error);
    }
  }, [options.onError]);

  const setData = useCallback((data: any) => {
    setState(prev => ({
      ...prev,
      data,
      isLoading: false,
      error: null,
    }));
    
    if (options.onSuccess) {
      options.onSuccess(data);
    }
  }, [options.onSuccess]);

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      data: options.initialData || null,
    });
  }, [options.initialData]);

  const execute = useCallback(async <T>(
    asyncFunction: () => Promise<T>,
    options: { 
      onSuccess?: (data: T) => void;
      onError?: (error: string) => void;
      showLoading?: boolean;
    } = {}
  ) => {
    const { onSuccess, onError, showLoading = true } = options;
    
    try {
      if (showLoading) {
        setLoading(true);
      }
      
      const result = await asyncFunction();
      
      setData(result);
      
      if (onSuccess) {
        onSuccess(result);
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setError(errorMessage);
      
      if (onError) {
        onError(errorMessage);
      }
      
      throw error;
    }
  }, [setLoading, setData, setError]);

  return {
    ...state,
    setLoading,
    setError,
    setData,
    reset,
    execute,
  };
};

// Hook for managing multiple loading states
export const useMultipleLoadingStates = <T extends Record<string, any>>(
  initialStates: T
) => {
  const [states, setStates] = useState<T>(initialStates);

  const setLoading = useCallback(<K extends keyof T>(
    key: K,
    loading: boolean
  ) => {
    setStates(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        isLoading: loading,
        error: loading ? null : prev[key].error,
      },
    }));
  }, []);

  const setError = useCallback(<K extends keyof T>(
    key: K,
    error: string | null
  ) => {
    setStates(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        error,
        isLoading: false,
      },
    }));
  }, []);

  const setData = useCallback(<K extends keyof T>(
    key: K,
    data: any
  ) => {
    setStates(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        data,
        isLoading: false,
        error: null,
      },
    }));
  }, []);

  const execute = useCallback(async <K extends keyof T>(
    key: K,
    asyncFunction: () => Promise<any>,
    options: { 
      onSuccess?: (data: any) => void;
      onError?: (error: string) => void;
      showLoading?: boolean;
    } = {}
  ) => {
    const { onSuccess, onError, showLoading = true } = options;
    
    try {
      if (showLoading) {
        setLoading(key, true);
      }
      
      const result = await asyncFunction();
      
      setData(key, result);
      
      if (onSuccess) {
        onSuccess(result);
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setError(key, errorMessage);
      
      if (onError) {
        onError(errorMessage);
      }
      
      throw error;
    }
  }, [setLoading, setData, setError]);

  return {
    states,
    setLoading,
    setError,
    setData,
    execute,
  };
};

// Hook for debounced loading states
export const useDebouncedLoadingState = (
  delay: number = 300,
  options: UseLoadingStateOptions = {}
) => {
  const [isLoading, setIsLoading] = useState(false);
  const [debouncedLoading, setDebouncedLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedLoading(isLoading);
    }, delay);

    return () => clearTimeout(timer);
  }, [isLoading, delay]);

  const setLoading = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  return {
    isLoading: debouncedLoading,
    setLoading,
  };
};

// Hook for optimistic updates with loading states
export const useOptimisticLoadingState = <T>(
  initialData: T,
  options: UseLoadingStateOptions = {}
) => {
  const [state, setState] = useState<{
    data: T;
    isLoading: boolean;
    error: string | null;
    optimisticData: T | null;
  }>({
    data: initialData,
    isLoading: false,
    error: null,
    optimisticData: null,
  });

  const updateOptimistically = useCallback((newData: T) => {
    setState(prev => ({
      ...prev,
      optimisticData: newData,
    }));
  }, []);

  const execute = useCallback(async (
    asyncFunction: () => Promise<T>,
    optimisticUpdate?: T
  ) => {
    try {
      setState(prev => ({
        ...prev,
        isLoading: true,
        error: null,
        optimisticData: optimisticUpdate || null,
      }));

      const result = await asyncFunction();

      setState(prev => ({
        ...prev,
        data: result,
        isLoading: false,
        optimisticData: null,
      }));

      if (options.onSuccess) {
        options.onSuccess(result);
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        optimisticData: null,
      }));

      if (options.onError) {
        options.onError(errorMessage);
      }

      throw error;
    }
  }, [options]);

  return {
    data: state.optimisticData || state.data,
    isLoading: state.isLoading,
    error: state.error,
    updateOptimistically,
    execute,
  };
};
