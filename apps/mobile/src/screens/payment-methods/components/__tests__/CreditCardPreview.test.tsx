import React from 'react';
import { render } from '../../../../test-utils';
import { CreditCardPreview } from '../CreditCardPreview';

describe('CreditCardPreview', () => {
  it('renders provided card details', () => {
    const { getByText } = render(
      <CreditCardPreview holderName="Alex Mason" number="4242 4242 4242 4242" expiry="12/30" />
    );

    expect(getByText('VISA')).toBeDefined();
    expect(getByText('4242 4242 4242 4242')).toBeDefined();
    expect(getByText('Alex Mason')).toBeDefined();
    expect(getByText('12/30')).toBeDefined();
  });
});
