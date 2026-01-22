import React from 'react';
import { fireEvent, render } from '../../../../test-utils';
import { PostCard } from '../PostCard';

describe('PostCard', () => {
  it('renders post content and handles profile press', () => {
    const onUserPress = jest.fn();
    const post = {
      id: 'post-1',
      contractorId: 'user-1',
      content: 'Hello from the job site!',
      hashtags: ['#plumbing'],
      likes: 2,
      comments: 1,
      shares: 0,
      liked: true,
      saved: false,
    };

    const { getByText, getByLabelText } = render(
      <PostCard
        post={post as any}
        contractorName="Alex Mason"
        roleLabel="Plumber"
        timestampLabel="1h"
        isVerified
        onUserPress={onUserPress}
        onHashtagPress={jest.fn()}
        onLikePress={jest.fn()}
        onCommentPress={jest.fn()}
        onSharePress={jest.fn()}
        onSavePress={jest.fn()}
        onOptionsPress={jest.fn()}
      />
    );

    expect(getByText('Hello from the job site!')).toBeDefined();
    fireEvent.press(getByLabelText("View Alex Mason's profile"));
    expect(onUserPress).toHaveBeenCalledWith('user-1');
  });
});
