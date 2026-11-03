import React, { useState } from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CustomerConsent, emptyConsent } from '../CustomerConsent';
import {
  EARLY_START_REQUEST,
  FULL_PERFORMANCE_ACKNOWLEDGEMENT,
} from '@mintenance/shared';
jest.mock('../../../../components/CustomerTerms', () => ({
  CustomerTerms: () => null,
}));
function Form({ homeowner = true }: { homeowner?: boolean }) {
  const [value, onChange] = useState(emptyConsent);
  return (
    <CustomerConsent value={value} onChange={onChange} homeowner={homeowner} />
  );
}
it('starts with every choice unchecked and does not require an early start to accept terms', () => {
  const ui = render(<Form />);
  const choices = ui.getAllByRole('checkbox');
  expect(choices.every((c) => !c.props.accessibilityState.checked)).toBe(true);
  fireEvent.press(
    ui.getByLabelText(
      'I have read and accept the customer terms and this job agreement.'
    )
  );
  expect(
    ui.getByLabelText(EARLY_START_REQUEST).props.accessibilityState.checked
  ).toBe(false);
});
it('clears the full-performance acknowledgement when the early-start request is removed', () => {
  const ui = render(<Form />);
  expect(
    ui.getByLabelText(FULL_PERFORMANCE_ACKNOWLEDGEMENT).props.accessibilityState
      .disabled
  ).toBe(true);
  fireEvent.press(ui.getByLabelText(EARLY_START_REQUEST));
  fireEvent.press(ui.getByLabelText(FULL_PERFORMANCE_ACKNOWLEDGEMENT));
  expect(
    ui.getByLabelText(FULL_PERFORMANCE_ACKNOWLEDGEMENT).props.accessibilityState
      .checked
  ).toBe(true);
  fireEvent.press(ui.getByLabelText(EARLY_START_REQUEST));
  expect(
    ui.getByLabelText(FULL_PERFORMANCE_ACKNOWLEDGEMENT).props.accessibilityState
  ).toEqual({ checked: false, disabled: true });
});
it('does not let contractors make the customer choices', () => {
  const ui = render(<Form homeowner={false} />);
  expect(ui.getAllByRole('checkbox')).toHaveLength(1);
  expect(ui.queryByLabelText(EARLY_START_REQUEST)).toBeNull();
});
