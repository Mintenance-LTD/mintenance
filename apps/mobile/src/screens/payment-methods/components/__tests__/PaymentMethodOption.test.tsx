import React from 'react';
import { fireEvent, render } from '../../../../test-utils';
import { PaymentMethodOption } from '../PaymentMethodOption';

describe('PaymentMethodOption', () => {
  it('renders method and handles selection', () => {
    const onSelect = jest.fn();
    const method = {
      id: 'cash',
      type: 'cash',
      name: 'Cash',
      icon: 'cash',
    };

    const { getByText } = render(
      <PaymentMethodOption method={method as any} isSelected={false} onSelect={onSelect} />
    );

    fireEvent.press(getByText('Cash'));
    expect(onSelect).toHaveBeenCalledWith('cash');
  });
});
