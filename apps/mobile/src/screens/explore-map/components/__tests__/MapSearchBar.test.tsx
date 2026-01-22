import React from 'react';
import { fireEvent, render } from '../../../../test-utils';
import { MapSearchBar } from '../MapSearchBar';

describe('MapSearchBar', () => {
  it('updates search text', () => {
    const onChangeText = jest.fn();
    const onFilterPress = jest.fn();

    const { getByPlaceholderText, getByDisplayValue } = render(
      <MapSearchBar value="plumber" onChangeText={onChangeText} onFilterPress={onFilterPress} />
    );

    fireEvent.changeText(getByPlaceholderText('Search contractors...'), 'electrician');
    expect(onChangeText).toHaveBeenCalledWith('electrician');

    expect(getByDisplayValue('plumber')).toBeDefined();
  });
});
