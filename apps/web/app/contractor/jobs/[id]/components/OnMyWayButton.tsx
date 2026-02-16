'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Navigation, MapPin, Loader2, CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { logger } from '@mintenance/shared';

interface OnMyWayButtonProps {
  jobId: string;
  contractorId: string;
  appointmentId?: string;
}

interface Trip {
  id: string;
  status: 'en_route' | 'arrived' | 'completed' | 'cancelled';
  started_at: string;
  arrived_at?: string;
}

function getCSRFToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:__Host-csrf-token|csrf-token)=([^;]+)/);
  return match?.[1] || '';
}

export function OnMyWayButton({ jobId, contractorId, appointmentId }: OnMyWayButtonProps) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchActiveTrip = useCallback(async () => {
    try {
      const res = await fetch(`/api/contractor/trips?status=en_route`);
      if (res.ok) {
        const data = await res.json();
        const activeTrip = data.trips?.find(
          (t: Trip & { job_id?: string }) => t.job_id === jobId && t.status === 'en_route'
        );
        if (activeTrip) {
          setTrip(activeTrip);
          return;
        }
      }
      // Also check for arrived trips
      const arrivedRes = await fetch(`/api/contractor/trips?status=arrived`);
      if (arrivedRes.ok) {
        const arrivedData = await arrivedRes.json();
        const arrivedTrip = arrivedData.trips?.find(
          (t: Trip & { job_id?: string }) => t.job_id === jobId && t.status === 'arrived'
        );
        if (arrivedTrip) setTrip(arrivedTrip);
      }
    } catch (err) {
      // Silently fail - trips may not exist yet
    }
  }, [jobId]);

  useEffect(() => {
    fetchActiveTrip();
  }, [fetchActiveTrip]);

  const startTrip = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/contractor/trips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': getCSRFToken(),
        },
        body: JSON.stringify({
          jobId,
          appointmentId: appointmentId || undefined,
          tripType: appointmentId ? 'appointment' : 'job_visit',
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error?.message || errData.error || 'Failed to start trip');
      }

      const data = await res.json();
      setTrip(data.trip);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start trip';
      setError(message);
      logger.error('Error starting trip', err, { service: 'ui' });
    } finally {
      setIsLoading(false);
    }
  };

  const updateTrip = async (status: 'arrived' | 'cancelled') => {
    if (!trip) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/contractor/trips/${trip.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': getCSRFToken(),
        },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error?.message || errData.error || 'Failed to update trip');
      }

      const data = await res.json();
      setTrip(data.trip);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update trip';
      setError(message);
      logger.error('Error updating trip', err, { service: 'ui' });
    } finally {
      setIsLoading(false);
    }
  };

  // Arrived state
  if (trip?.status === 'arrived') {
    return (
      <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="font-semibold text-emerald-900">You have arrived</p>
            <p className="text-sm text-emerald-600">
              Arrived at {trip.arrived_at ? new Date(trip.arrived_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : 'location'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // En route state
  if (trip?.status === 'en_route') {
    const elapsed = Math.round((Date.now() - new Date(trip.started_at).getTime()) / 60000);
    return (
      <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center animate-pulse">
              <Navigation className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-blue-900">On the way</p>
              <p className="text-sm text-blue-600">{elapsed} min elapsed</p>
            </div>
          </div>
          <button
            onClick={() => updateTrip('cancelled')}
            disabled={isLoading}
            className="text-slate-400 hover:text-red-500 transition-colors p-1"
            title="Cancel trip"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <Button
          onClick={() => updateTrip('arrived')}
          disabled={isLoading}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
          ) : (
            <MapPin className="w-5 h-5 mr-2" />
          )}
          I&apos;ve Arrived
        </Button>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </div>
    );
  }

  // Default state - not started
  return (
    <div className="bg-white border-2 border-slate-200 rounded-2xl p-5">
      <div className="mb-3">
        <h3 className="font-semibold text-slate-900">Heading to this job?</h3>
        <p className="text-sm text-slate-500">Let the homeowner and admin know you&apos;re on your way</p>
      </div>
      <Button
        onClick={startTrip}
        disabled={isLoading}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl"
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
        ) : (
          <Navigation className="w-5 h-5 mr-2" />
        )}
        I&apos;m On My Way
      </Button>
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
    </div>
  );
}
