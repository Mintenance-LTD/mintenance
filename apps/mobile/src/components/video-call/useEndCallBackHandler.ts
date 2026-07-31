import { useEffect } from 'react';
import { Alert, BackHandler } from 'react-native';

/**
 * Android hardware-back interceptor for the video-call UI, scoped to
 * the component's lifetime.
 *
 * This MUST stay an effect with a cleanup: the previous inline
 * setupBackHandler() discarded its remove() closure, so the
 * always-return-true listener outlived the call screen and swallowed
 * every hardware back press app-wide until the app was killed (it also
 * captured a stale endCall). 2026-07-31 back-button audit P0-1.
 */
export function useEndCallBackHandler(endCall: () => void): void {
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        Alert.alert('End Call', 'Are you sure you want to end this call?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'End Call', onPress: endCall, style: 'destructive' },
        ]);
        return true;
      }
    );
    return () => subscription.remove();
  }, [endCall]);
}
