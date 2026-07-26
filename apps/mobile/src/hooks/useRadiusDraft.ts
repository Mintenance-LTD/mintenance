/**
 * useRadiusDraft — local edit buffer for a service area's two coverage
 * thresholds, plus the save call.
 *
 * The screen previously held a `radiusMode` useState that was read by
 * exactly one prop and written nowhere else, so the Standard / Extended
 * pills could not save. This replaces it with a real draft: the pills
 * choose which threshold the stepper edits, the stepper mutates the
 * draft, and Save writes both to the API.
 *
 * The draft re-seeds whenever the underlying row changes. That covers
 * the post-save refetch (server values land, dirty clears) and a
 * pull-to-refresh mid-edit.
 */
import { useCallback, useEffect, useState } from 'react';
import type { ServiceArea } from '../services/ServiceAreasService';
import {
  clampRadiusMiles,
  defaultExtendedMiles,
  kmToWholeMiles,
  milesToKmForApi,
  type RadiusMode,
} from '../components/service-areas/radiusModel';

interface Params {
  primary: ServiceArea | undefined;
  onSave: (
    areaId: string,
    patch: { radius_km: number; max_distance_km: number }
  ) => Promise<boolean>;
}

export const useRadiusDraft = ({ primary, onSave }: Params) => {
  const savedStandard = kmToWholeMiles(primary?.radius_km);
  // `max_distance_km` is nullable and was NULL on every live row before
  // this editor shipped, so fall back to a derived reach rather than
  // showing a blank threshold.
  const savedExtended = primary?.max_distance_km
    ? kmToWholeMiles(primary.max_distance_km)
    : defaultExtendedMiles(savedStandard);

  const [mode, setMode] = useState<RadiusMode>('standard');
  const [standardMiles, setStandardMiles] = useState(savedStandard);
  const [extendedMiles, setExtendedMiles] = useState(savedExtended);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStandardMiles(savedStandard);
    setExtendedMiles(savedExtended);
  }, [savedStandard, savedExtended]);

  const step = useCallback(
    (delta: number) => {
      if (mode === 'standard') {
        setStandardMiles((current) =>
          clampRadiusMiles('standard', current + delta, extendedMiles)
        );
      } else {
        setExtendedMiles((current) =>
          clampRadiusMiles('extended', current + delta, standardMiles)
        );
      }
    },
    [mode, standardMiles, extendedMiles]
  );

  const dirty =
    standardMiles !== savedStandard || extendedMiles !== savedExtended;

  const save = useCallback(async () => {
    if (!primary?.id || saving) return;
    setSaving(true);
    try {
      await onSave(primary.id, {
        radius_km: milesToKmForApi(standardMiles),
        max_distance_km: milesToKmForApi(extendedMiles),
      });
    } finally {
      setSaving(false);
    }
  }, [primary?.id, saving, onSave, standardMiles, extendedMiles]);

  return {
    mode,
    setMode,
    standardMiles,
    extendedMiles,
    editingMiles: mode === 'standard' ? standardMiles : extendedMiles,
    dirty,
    saving,
    step,
    save,
  };
};

export default useRadiusDraft;
