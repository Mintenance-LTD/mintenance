import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PostDetailClient } from '../PostDetailClient';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock the child components
vi.mock('../../../../components/CommentsSection', () => ({
  CommentsSection: () => <div data-testid="comments-section">Comments</div>,
}));

vi.mock('../../../../components/ShareDialog', () => ({
  ShareDialog: () => <div data-testid="share-dialog">Share</div>,
}));

vi.mock('../../../../components/FollowButton', () => ({
  FollowButton: () => <button data-testid="follow-button">Follow</button>,
}));

const mockPost = {
  id: 'test-post-id',
  title: 'Test Post Title',
  content: 'Test post content',
  created_at: '2024-01-01T00:00:00Z',
  likes_count: 5,
  comments_count: 3,
  shares_count: 2,
  views_count: 100,
  liked: false,
  contractor: {
    id: 'contractor-1',
    first_name: 'John',
    last_name: 'Doe',
    profile_image_url: '/test.jpg',
    city: 'London',
    country: 'UK',
  },
};

describe('PostDetailClient', () => {
  it('should render with required props', () => {
    render(<PostDetailClient post={mockPost} currentUserId="user-1" />);
    expect(screen.getByText('Test Post Title')).toBeDefined();
  });

  it('should display post content', () => {
    render(<PostDetailClient post={mockPost} currentUserId="user-1" />);
    expect(screen.getByText('Test post content')).toBeDefined();
  });

  it('should render without currentUserId', () => {
    render(<PostDetailClient post={mockPost} />);
    expect(screen.getByText('Test Post Title')).toBeDefined();
  });
});
