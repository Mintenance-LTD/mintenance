/**
 * useUnsavedChanges Hook
 *
 * Warns users before navigating away from a screen with unsaved form
 * data. Uses React Navigation's `beforeRemove` event so it covers
 * hardware back, swipe-back, header back, and `navigation.goBack()`
 * calls uniformly.
 *
 * 2026-04-30 audit P1 (Back Buttons Are Common, But Not Consistently
 * Protected) — extended to expose `allowExit()` so success paths can
 * leave without prompting the user. Existing callers that just wanted
 * the discard-prompt behaviour still work unchanged because the
 * return value is optional.
 *
 * Usage:
 *
 *   const allowExit = useUnsavedChanges(isDirty);
 *
 *   const onSubmit = async () => {
 *     await save();
 *     allowExit();           // bypass the prompt
 *     navigation.goBack();   // safe — no Discard alert fires
 *   };
 */

import { useCallback, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export const useUnsavedChanges = (hasUnsavedChanges: boolean) => {
  const navigation = useNavigation();
  const allowExitRef = useRef(false);

  // Reset the bypass flag whenever the form returns to dirty — if the
  // user submitted, then started editing again, the prompt should
  // re-arm.
  useEffect(() => {
    if (hasUnsavedChanges) {
      allowExitRef.current = false;
    }
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      // Caller has explicitly opted to leave (typically right after a
      // successful submit). Don't intercept.
      if (allowExitRef.current) return;

      e.preventDefault();

      Alert.alert(
        'Discard changes?',
        'You have unsaved changes. Are you sure you want to leave?',
        [
          { text: "Don't leave", style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => navigation.dispatch(e.data.action),
          },
        ]
      );
    });

    return unsubscribe;
  }, [navigation, hasUnsavedChanges]);

  return useCallback(() => {
    allowExitRef.current = true;
  }, []);
};
