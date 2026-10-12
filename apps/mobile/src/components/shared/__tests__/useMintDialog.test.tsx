import React from 'react';
import { Button } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { useMintDialog } from '../useMintDialog';

it('requires explicit confirmation before a destructive action and dismisses after cancel', () => {
  const confirm = jest.fn();
  function Fixture() {
    const { alert, dialog } = useMintDialog();
    return (
      <>
        <Button
          title='Open notice'
          testID='open-notice'
          onPress={() =>
            alert(
              'Sign out?',
              'Your saved biometric sign-in will be removed.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign out', style: 'destructive', onPress: confirm },
              ]
            )
          }
        />
        {dialog}
      </>
    );
  }
  const view = render(<Fixture />);
  fireEvent.press(view.getByTestId('open-notice'));
  expect(confirm).not.toHaveBeenCalled();
  fireEvent.press(view.getByText('Cancel'));
  expect(view.queryByText('Sign out?')).toBeNull();
  expect(confirm).not.toHaveBeenCalled();
  fireEvent.press(view.getByTestId('open-notice'));
  fireEvent.press(view.getByText('Sign out'));
  expect(confirm).toHaveBeenCalledTimes(1);
  expect(view.queryByText('Sign out?')).toBeNull();
});
