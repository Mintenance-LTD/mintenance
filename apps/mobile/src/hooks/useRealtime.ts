import { useEffect, useRef } from 'react';
import { RealtimeService, RealtimeCallback } from '../services/RealtimeService';

const useJobUpdates = (jobId: string, callback: RealtimeCallback) => {
  const callbackRef = useRef(callback);

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!jobId) return;

    const unsubscribe = RealtimeService.subscribeToJobUpdates(
      jobId,
      (payload) => callbackRef.current(payload)
    );

    return unsubscribe;
  }, [jobId]);
};

const useContractorBids = (
  contractorId: string,
  callback: RealtimeCallback
) => {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!contractorId) return;

    const unsubscribe = RealtimeService.subscribeToContractorBids(
      contractorId,
      (payload) => callbackRef.current(payload)
    );

    return unsubscribe;
  }, [contractorId]);
};

const useHomeownerJobs = (homeownerId: string, callback: RealtimeCallback) => {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!homeownerId) return;

    const unsubscribe = RealtimeService.subscribeToHomeownerJobs(
      homeownerId,
      (payload) => callbackRef.current(payload)
    );

    return unsubscribe;
  }, [homeownerId]);
};

const useAvailableJobs = (callback: RealtimeCallback) => {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const unsubscribe = RealtimeService.subscribeToAvailableJobs((payload) =>
      callbackRef.current(payload)
    );

    return unsubscribe;
  }, []);
};
