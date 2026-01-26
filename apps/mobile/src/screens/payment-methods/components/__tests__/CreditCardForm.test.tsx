import React from 'react';
import { fireEvent, render } from '../../../../test-utils';
import { CreditCardForm } from '../CreditCardForm';

describe('CreditCardForm', () => {
  it('updates fields and toggles save card', () => {
    const onUpdateDetails = jest.fn();
    const onToggleSaveCard = jest.fn();

    const formatCardNumber = (text: string) => `formatted-${text}`;
    const formatExpiry = (text: string) => `formatted-${text}`;

    const { getByPlaceholderText, getByText } = render(
      <CreditCardForm
        cardDetails={{ holderName: '', number: '', expiry: '', cvv: '' }}
        saveCard={false}
        onUpdateDetails={onUpdateDetails}
        onToggleSaveCard={onToggleSaveCard}
        formatCardNumber={formatCardNumber}
        formatExpiry={formatExpiry}
      />
    );

    fireEvent.changeText(getByPlaceholderText('Esther Howard'), 'Alex Mason');
    expect(onUpdateDetails).toHaveBeenCalledWith({ holderName: 'Alex Mason' });

    fireEvent.changeText(getByPlaceholderText('4716 9627 1635 8047'), '4242');
    expect(onUpdateDetails).toHaveBeenCalledWith({ number: 'formatted-4242' });

    fireEvent.changeText(getByPlaceholderText('02/30'), '1230');
    expect(onUpdateDetails).toHaveBeenCalledWith({ expiry: 'formatted-1230' });

    fireEvent.changeText(getByPlaceholderText('000'), '123');
    expect(onUpdateDetails).toHaveBeenCalledWith({ cvv: '123' });

    fireEvent.press(getByText('Save Card'));
    expect(onToggleSaveCard).toHaveBeenCalledTimes(1);
  });
});
