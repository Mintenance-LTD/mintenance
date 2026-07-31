import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useRadiusDraft } from '../useRadiusDraft';
import type { ServiceArea } from '../../services/ServiceAreasService';

/**
 * The reported bug (2026-07-22): "when you try to change radius it
 * doesn't save or affect the map".
 *
 * The screen held `const [radiusMode, setRadiusMode] = useState(...)`
 * that was read by exactly one prop and written nowhere else — no API
 * call existed on the whole screen. These tests pin the write path.
 */

const area = (over: Partial<ServiceArea> = {}): ServiceArea =>
  ({
    id: 'area-1',
    // 10 km is the value on the live row; it renders as 6 mi.
    radius_km: 10,
    max_distance_km: undefined,
    is_active: true,
    ...over,
  }) as ServiceArea;

describe('useRadiusDraft', () => {
  it('seeds from the saved row and starts clean', () => {
    const onSave = jest.fn();
    const { result } = renderHook(() =>
      useRadiusDraft({ primary: area(), onSave })
    );

    expect(result.current.standardMiles).toBe(6);
    // max_distance_km is NULL on every pre-existing row, so the extended
    // threshold falls back rather than rendering blank.
    expect(result.current.extendedMiles).toBe(10);
    expect(result.current.dirty).toBe(false);
  });

  it('PATCHes both thresholds — the call that never used to happen', async () => {
    const onSave = jest.fn().mockResolvedValue(true);
    const { result } = renderHook(() =>
      useRadiusDraft({ primary: area(), onSave })
    );

    act(() => result.current.step(2));
    expect(result.current.standardMiles).toBe(8);
    expect(result.current.dirty).toBe(true);

    await act(async () => {
      await result.current.save();
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    const [areaId, patch] = onSave.mock.calls[0];
    expect(areaId).toBe('area-1');
    // 8 mi -> 12.87 km, inside the API's 1..200 window.
    expect(patch.radius_km).toBeCloseTo(12.87, 2);
    expect(patch.max_distance_km).toBeCloseTo(16.09, 2);
  });

  it('edits whichever threshold the pills selected', () => {
    const onSave = jest.fn();
    const { result } = renderHook(() =>
      useRadiusDraft({ primary: area(), onSave })
    );

    act(() => result.current.setMode('extended'));
    act(() => result.current.step(5));

    expect(result.current.extendedMiles).toBe(15);
    expect(result.current.standardMiles).toBe(6);
  });

  it('will not let standard overtake extended', () => {
    const onSave = jest.fn();
    const { result } = renderHook(() =>
      useRadiusDraft({ primary: area(), onSave })
    );

    act(() => result.current.step(50));
    expect(result.current.standardMiles).toBe(result.current.extendedMiles);
  });

  it('clears dirty once the saved row comes back with the new value', async () => {
    const onSave = jest.fn().mockResolvedValue(true);
    const { result, rerender } = renderHook(
      ({ primary }) => useRadiusDraft({ primary, onSave }),
      { initialProps: { primary: area() } }
    );

    act(() => result.current.step(2));
    expect(result.current.dirty).toBe(true);

    // 8 mi round-trips to 12.87 km; the refetch delivers it.
    rerender({ primary: area({ radius_km: 12.87, max_distance_km: 16.09 }) });

    await waitFor(() => expect(result.current.dirty).toBe(false));
    expect(result.current.standardMiles).toBe(8);
  });

  it('keeps the edit on screen when the save fails', async () => {
    const onSave = jest.fn().mockResolvedValue(false);
    const { result } = renderHook(() =>
      useRadiusDraft({ primary: area(), onSave })
    );

    act(() => result.current.step(3));
    await act(async () => {
      await result.current.save();
    });

    // No refetch happened, so the draft must survive for a retry.
    expect(result.current.standardMiles).toBe(9);
    expect(result.current.dirty).toBe(true);
    expect(result.current.saving).toBe(false);
  });

  it('does nothing when there is no area to patch', async () => {
    const onSave = jest.fn();
    const { result } = renderHook(() =>
      useRadiusDraft({ primary: undefined, onSave })
    );

    await act(async () => {
      await result.current.save();
    });

    expect(onSave).not.toHaveBeenCalled();
  });
});
