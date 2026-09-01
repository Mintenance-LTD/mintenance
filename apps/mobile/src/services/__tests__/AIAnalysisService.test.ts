import { AIAnalysisService } from '../AIAnalysisService';
import { mobileApiClient } from '../../utils/mobileApiClient';
import type { Job } from '@mintenance/types';
import { aiAnalyzeRequestSchema } from '@mintenance/api-contracts';

jest.mock('../../utils/mobileApiClient', () => ({
  mobileApiClient: { post: jest.fn() },
}));

const post = mobileApiClient.post as jest.MockedFunction<
  typeof mobileApiClient.post
>;

const job = {
  id: 'job-1',
  category: 'plumbing',
  description: 'Leaking sink',
  photos: ['https://cdn.example.com/photo-1.jpg'],
} as Job;

const analysis = {
  confidence: 0.91,
  detectedItems: ['sink'],
  safetyConcerns: [],
  recommendedActions: ['Turn off the water supply'],
  estimatedComplexity: 'Medium' as const,
  suggestedTools: ['wrench'],
  estimatedDuration: '2 hours',
};

describe('AIAnalysisService API contract', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sends the canonical images/context request and returns data', async () => {
    post.mockResolvedValue({ success: true, data: analysis });

    await expect(AIAnalysisService.analyzeJobPhotos(job)).resolves.toEqual(
      analysis
    );
    expect(post).toHaveBeenCalledWith('/api/ai/analyze', {
      images: job.photos,
      context: {
        type: 'job-analysis',
        jobId: job.id,
        category: job.category,
        description: job.description,
      },
    });
    expect(
      aiAnalyzeRequestSchema.safeParse(post.mock.calls[0]?.[1]).success
    ).toBe(true);
  });

  it('returns null without photos and does not call the API', async () => {
    await expect(
      AIAnalysisService.analyzeJobPhotos({ ...job, photos: [] } as Job)
    ).resolves.toBeNull();
    expect(post).not.toHaveBeenCalled();
  });

  it('surfaces API failures instead of returning a simulated analysis', async () => {
    post.mockResolvedValue({
      success: false,
      error: 'Analysis failed',
      message: 'AI services temporarily unavailable',
    });

    await expect(AIAnalysisService.analyzeJobPhotos(job)).rejects.toThrow(
      'AI services temporarily unavailable'
    );
  });
});
