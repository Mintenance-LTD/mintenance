import React from 'react';
import { fireEvent, render } from '../../../../test-utils';
import { CreatePostModal } from '../CreatePostModal';

describe('CreatePostModal', () => {
  it('renders modal content and handles actions', () => {
    const onClose = jest.fn();
    const onSubmit = jest.fn();
    const onContentChange = jest.fn();
    const onTypeSelect = jest.fn();

    const { getByText } = render(
      <CreatePostModal
        visible
        content="Test post"
        selectedType="project_showcase"
        isCreating={false}
        onClose={onClose}
        onContentChange={onContentChange}
        onTypeSelect={onTypeSelect}
        onSubmit={onSubmit}
      />
    );

    expect(getByText('Create Post')).toBeDefined();
    fireEvent.press(getByText('Cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.press(getByText('Post'));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
