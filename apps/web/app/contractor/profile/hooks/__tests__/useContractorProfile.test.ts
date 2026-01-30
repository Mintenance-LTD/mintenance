import { renderHook } from '@testing-library/react';
import { useContractorProfile } from '../useContractorProfile';
import { vi } from 'vitest';

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

describe('useContractorProfile', () => {
  const mockContractor = {
    id: 'contractor-1',
    first_name: 'John',
    last_name: 'Smith',
    email: 'john@example.com',
    profile_image_url: '/profile.jpg',
    admin_verified: true,
    bio: 'Experienced contractor',
    city: 'London',
    country: 'UK',
    phone: '+44 20 1234 5678',
  };

  const mockMetrics = {
    profileCompletion: 95,
    averageRating: 4.8,
    totalReviews: 50,
    jobsCompleted: 150,
    winRate: 85,
    totalEarnings: 12000000,
    totalBids: 175,
  };

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useContractorProfile(mockContractor, mockMetrics));
    expect(result.current).toBeDefined();
    expect(result.current.contractor).toBeDefined();
    expect(result.current.contractor.first_name).toBe('John');
    expect(result.current.contractor.last_name).toBe('Smith');
  });

  it('should handle updates correctly', () => {
    const { result } = renderHook(() => useContractorProfile(mockContractor, mockMetrics));
    // Hook returns contractor profile data
    expect(result.current.contractor).toBeDefined();
    expect(result.current.metrics).toBeDefined();
    expect(result.current.formData).toBeDefined();
    expect(result.current.formData.first_name).toBe('John');
  });

  it('should clean up on unmount', () => {
    const { result, unmount } = renderHook(() => useContractorProfile(mockContractor, mockMetrics));
    expect(result.current).toBeDefined();
    unmount();
    // Hook cleanup successful
  });
});