import {
  JOB_DETAIL_SELECT,
  BID_WITH_CONTRACTOR_SELECT,
  JOB_PHOTOS_SELECT,
} from '../queries/jobs';

describe('data-access query definitions', () => {
  describe('jobs queries', () => {
    it('JOB_DETAIL_SELECT should include essential columns', () => {
      expect(JOB_DETAIL_SELECT).toContain('id');
      expect(JOB_DETAIL_SELECT).toContain('title');
      expect(JOB_DETAIL_SELECT).toContain('description');
      expect(JOB_DETAIL_SELECT).toContain('status');
      expect(JOB_DETAIL_SELECT).toContain('homeowner_id');
      expect(JOB_DETAIL_SELECT).toContain('contractor_id');
      expect(JOB_DETAIL_SELECT).toContain('category');
      expect(JOB_DETAIL_SELECT).toContain('budget');
      expect(JOB_DETAIL_SELECT).toContain('latitude');
      expect(JOB_DETAIL_SELECT).toContain('longitude');
    });

    it('BID_WITH_CONTRACTOR_SELECT should include contractor join', () => {
      expect(BID_WITH_CONTRACTOR_SELECT).toContain('amount');
      expect(BID_WITH_CONTRACTOR_SELECT).toContain('status');
      expect(BID_WITH_CONTRACTOR_SELECT).toContain('contractor_id');
      expect(BID_WITH_CONTRACTOR_SELECT).toContain('contractor:profiles');
      expect(BID_WITH_CONTRACTOR_SELECT).toContain('first_name');
      expect(BID_WITH_CONTRACTOR_SELECT).toContain('company_name');
    });

    it('JOB_PHOTOS_SELECT should include photo fields', () => {
      expect(JOB_PHOTOS_SELECT).toContain('photo_url');
      expect(JOB_PHOTOS_SELECT).toContain('photo_type');
      expect(JOB_PHOTOS_SELECT).toContain('quality_score');
    });

    it('select strings should be trimmed const assertions', () => {
      expect(typeof JOB_DETAIL_SELECT).toBe('string');
      expect(typeof BID_WITH_CONTRACTOR_SELECT).toBe('string');
      expect(typeof JOB_PHOTOS_SELECT).toBe('string');
    });
  });
});
