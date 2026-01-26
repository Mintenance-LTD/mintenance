import React from 'react';
import { fireEvent, render } from '../../../../test-utils';
import { SocialFeedHeader } from '../SocialFeedHeader';

describe('SocialFeedHeader', () => {
  it('renders title and triggers search press', () => {
    const onSearchPress = jest.fn();
    const { getByText, getByLabelText } = render(
      <SocialFeedHeader onSearchPress={onSearchPress} />
    );

    expect(getByText('Community')).toBeDefined();
    fireEvent.press(getByLabelText('Search posts'));
    expect(onSearchPress).toHaveBeenCalledTimes(1);
  });
});
