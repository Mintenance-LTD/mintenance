import React from 'react';
import { Alert, Modal } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import { ThemedAlertHost } from '../ThemedAlertHost';
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Icon' }));
describe('themed alert compatibility', () => {
  it('only dismisses cancelable notices via Android back and calls onDismiss', () => {
    const dismiss = jest.fn();
    const view = render(<ThemedAlertHost />);
    act(() => Alert.alert('Required', 'Keep open'));
    act(() => view.UNSAFE_getByType(Modal).props.onRequestClose());
    expect(view.getByText('Keep open')).toBeTruthy();
    fireEvent.press(view.getByText('OK'));
    act(() =>
      Alert.alert('Information', 'Dismiss me', undefined, {
        cancelable: true,
        onDismiss: dismiss,
      })
    );
    act(() => view.UNSAFE_getByType(Modal).props.onRequestClose());
    expect(dismiss).toHaveBeenCalledTimes(1);
    view.unmount();
  });
  it('queues notices and invokes only the selected callback', () => {
    const original = Alert.alert;
    const accept = jest.fn();
    const cancel = jest.fn();
    const view = render(<ThemedAlertHost />);
    act(() => {
      Alert.alert('Confirm', 'Continue?', [
        { text: 'Cancel', style: 'cancel', onPress: cancel },
        { text: 'Continue', onPress: accept },
      ]);
      Alert.alert('Saved', 'Your details were saved');
    });
    expect(view.getByText('Continue?')).toBeTruthy();
    fireEvent.press(view.getByText('Cancel'));
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(accept).not.toHaveBeenCalled();
    expect(view.getByText('Your details were saved')).toBeTruthy();
    fireEvent.press(view.getByText('OK'));
    view.unmount();
    expect(Alert.alert).toBe(original);
  });
  it('preserves success navigation callbacks', () => {
    const goBack = jest.fn();
    const view = render(<ThemedAlertHost />);
    act(() =>
      Alert.alert('Verification submitted', 'Pending review', [
        { text: 'Done', onPress: goBack },
      ])
    );
    fireEvent.press(view.getByText('Done'));
    expect(goBack).toHaveBeenCalledTimes(1);
    view.unmount();
  });
});
