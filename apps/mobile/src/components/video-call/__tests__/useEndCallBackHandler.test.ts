/**
 * Pins the 2026-07-31 back-button audit P0-1 fix: the video-call
 * hardware-back listener must be REMOVED on unmount. The pre-fix code
 * discarded the subscription, so the always-return-true handler
 * swallowed every Android back press app-wide after the call ended.
 */
import { renderHook } from '@testing-library/react-native';
import { Alert, BackHandler } from 'react-native';
import { useEndCallBackHandler } from '../useEndCallBackHandler';

describe('useEndCallBackHandler', () => {
  const remove = jest.fn();
  let capturedHandler: (() => boolean) | null = null;

  beforeEach(() => {
    jest.clearAllMocks();
    capturedHandler = null;
    jest
      .spyOn(BackHandler, 'addEventListener')
      .mockImplementation((_event, handler) => {
        capturedHandler = handler as () => boolean;
        return { remove } as ReturnType<typeof BackHandler.addEventListener>;
      });
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  });

  it('registers on mount and removes the subscription on unmount', () => {
    const { unmount } = renderHook(() => useEndCallBackHandler(jest.fn()));

    expect(BackHandler.addEventListener).toHaveBeenCalledWith(
      'hardwareBackPress',
      expect.any(Function)
    );
    expect(remove).not.toHaveBeenCalled();

    unmount();
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('intercepts back (returns true) and offers End Call via the fresh endCall', () => {
    const endCall = jest.fn();
    renderHook(() => useEndCallBackHandler(endCall));

    expect(capturedHandler).not.toBeNull();
    expect(capturedHandler!()).toBe(true);

    expect(Alert.alert).toHaveBeenCalledWith(
      'End Call',
      expect.any(String),
      expect.arrayContaining([
        expect.objectContaining({ text: 'End Call', onPress: endCall }),
      ])
    );
  });

  it('re-registers with the new callback when endCall identity changes', () => {
    const first = jest.fn();
    const second = jest.fn();
    const { rerender } = renderHook(
      ({ cb }: { cb: () => void }) => useEndCallBackHandler(cb),
      { initialProps: { cb: first } }
    );

    rerender({ cb: second });

    expect(remove).toHaveBeenCalledTimes(1);
    expect(BackHandler.addEventListener).toHaveBeenCalledTimes(2);

    capturedHandler!();
    const lastAlertButtons = (Alert.alert as jest.Mock).mock.calls.at(-1)![2];
    expect(lastAlertButtons).toEqual(
      expect.arrayContaining([expect.objectContaining({ onPress: second })])
    );
  });
});
