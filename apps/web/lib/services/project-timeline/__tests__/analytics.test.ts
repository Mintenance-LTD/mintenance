import { getProjectProgress } from '../analytics-service';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    returns: jest.fn().mockReturnThis(),
    single: jest.fn(),
  },
}));

describe('getProjectProgress', () => {
  test('computes counts with empty milestones', async () => {
    const { supabase } = jest.requireMock('@/lib/supabase');
    supabase.single.mockResolvedValueOnce({ data: null });
    (supabase as any).returns.mockResolvedValueOnce({ data: [] });

    const result = await getProjectProgress('t1');
    expect(result.totalMilestones).toBe(0);
    expect(result.completedMilestones).toBe(0);
    expect(result.upcomingMilestones).toBe(0);
  });
});


