import { SocialFeedUtils } from '../SocialFeedUtils';

describe('SocialFeedUtils', () => {
  it('normalizes feed post defaults', () => {
    const result = SocialFeedUtils.normalizeFeedPost({
      id: 'post-1',
      content: 'Test post content',
      type: 'general',
      created_at: new Date().toISOString(),
      contractor_id: 'contractor-1',
    } as any);

    expect(result.likes).toBe(0);
    expect(result.comments).toBe(0);
    expect(result.shares).toBe(0);
    expect(result.liked).toBe(false);
    expect(result.saved).toBe(false);
  });

  it('extracts hashtags from content', () => {
    const hashtags = SocialFeedUtils.extractHashtags('Hello #mintenance #ProTips');
    expect(hashtags).toEqual(['#mintenance', '#ProTips']);
  });
});
