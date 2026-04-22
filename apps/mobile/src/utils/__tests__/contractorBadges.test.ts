/**
 * Unit tests for the Phase 3 contractor trust-badge ladder
 * utility (§5.5 of the 2026-04-19 mobile onboarding audit).
 *
 * Pure-function tests — no React Native rendering here; the
 * component that consumes the utility (ContractorBadgeStack)
 * is presentational and covered separately if needed.
 *
 * Tests use a frozen `now` so expiry-date assertions are
 * deterministic across CI runs + time zones.
 */

import {
  BADGE_DEFS,
  computeContractorBadges,
  nextUnearnedBadge,
  type ContractorBadgeInput,
} from '../contractorBadges';

const NOW = new Date('2026-06-01T00:00:00Z');
const FUTURE = '2030-01-01';
const PAST = '2020-01-01';

const BLANK: ContractorBadgeInput = {
  admin_verified: null,
  verification_status: 'none',
  background_check_status: null,
  license_type: null,
  license_expiry: null,
  rating: null,
  total_jobs_completed: null,
};

describe('contractorBadges', () => {
  describe('BADGE_DEFS', () => {
    it('has all five audit-spec badges in ladder order', () => {
      expect(BADGE_DEFS.map((b) => b.id)).toEqual([
        'verified',
        'insured',
        'licenced',
        'dbs_checked',
        'preferred_pro',
      ]);
    });

    it('every badge has a label, description, and icon', () => {
      for (const def of BADGE_DEFS) {
        expect(def.label).toBeTruthy();
        expect(def.description).toBeTruthy();
        expect(def.iconName).toBeTruthy();
      }
    });
  });

  describe('computeContractorBadges — Verified', () => {
    it('earns Verified when admin_verified + background_check_status=verified', () => {
      const badges = computeContractorBadges(
        {
          ...BLANK,
          admin_verified: true,
          background_check_status: 'verified',
        },
        NOW
      );
      expect(badges.map((b) => b.id)).toContain('verified');
    });

    it('does NOT earn Verified with only admin_verified', () => {
      const badges = computeContractorBadges(
        { ...BLANK, admin_verified: true, background_check_status: 'pending' },
        NOW
      );
      expect(badges.map((b) => b.id)).not.toContain('verified');
    });

    it('does NOT earn Verified with only background check cleared', () => {
      const badges = computeContractorBadges(
        {
          ...BLANK,
          admin_verified: false,
          background_check_status: 'verified',
        },
        NOW
      );
      expect(badges.map((b) => b.id)).not.toContain('verified');
    });
  });

  describe('computeContractorBadges — Licenced', () => {
    it('earns Licenced when license_type + future expiry', () => {
      const badges = computeContractorBadges(
        { ...BLANK, license_type: 'trade', license_expiry: FUTURE },
        NOW
      );
      expect(badges.map((b) => b.id)).toContain('licenced');
    });

    it('earns Licenced when license_type set and expiry is NULL', () => {
      // Some trades issue lifetime licences — unset expiry ≠ expired.
      const badges = computeContractorBadges(
        { ...BLANK, license_type: 'trade', license_expiry: null },
        NOW
      );
      expect(badges.map((b) => b.id)).toContain('licenced');
    });

    it('does NOT earn Licenced when expiry is in the past', () => {
      const badges = computeContractorBadges(
        { ...BLANK, license_type: 'gas_safe', license_expiry: PAST },
        NOW
      );
      expect(badges.map((b) => b.id)).not.toContain('licenced');
    });

    it('does NOT earn Licenced with expiry set but no license_type', () => {
      const badges = computeContractorBadges(
        { ...BLANK, license_type: null, license_expiry: FUTURE },
        NOW
      );
      expect(badges.map((b) => b.id)).not.toContain('licenced');
    });
  });

  describe('computeContractorBadges — Insured / DBS Checked (future columns)', () => {
    it('does NOT emit Insured when insurance_expiry is undefined (column missing)', () => {
      const badges = computeContractorBadges(BLANK, NOW);
      expect(badges.map((b) => b.id)).not.toContain('insured');
    });

    it('earns Insured when insurance_expiry is in the future', () => {
      const badges = computeContractorBadges(
        { ...BLANK, insurance_expiry: FUTURE },
        NOW
      );
      expect(badges.map((b) => b.id)).toContain('insured');
    });

    it('does NOT earn Insured when insurance_expiry is in the past', () => {
      const badges = computeContractorBadges(
        { ...BLANK, insurance_expiry: PAST },
        NOW
      );
      expect(badges.map((b) => b.id)).not.toContain('insured');
    });

    it('earns DBS Checked when dbs_expiry is in the future', () => {
      const badges = computeContractorBadges(
        { ...BLANK, dbs_expiry: FUTURE },
        NOW
      );
      expect(badges.map((b) => b.id)).toContain('dbs_checked');
    });
  });

  describe('computeContractorBadges — Preferred Pro', () => {
    it('earns Preferred Pro at 10 jobs + 4.5 rating', () => {
      const badges = computeContractorBadges(
        { ...BLANK, total_jobs_completed: 10, rating: 4.5 },
        NOW
      );
      expect(badges.map((b) => b.id)).toContain('preferred_pro');
    });

    it('does NOT earn Preferred Pro at 9 jobs', () => {
      const badges = computeContractorBadges(
        { ...BLANK, total_jobs_completed: 9, rating: 4.9 },
        NOW
      );
      expect(badges.map((b) => b.id)).not.toContain('preferred_pro');
    });

    it('does NOT earn Preferred Pro at 4.4 rating', () => {
      const badges = computeContractorBadges(
        { ...BLANK, total_jobs_completed: 100, rating: 4.4 },
        NOW
      );
      expect(badges.map((b) => b.id)).not.toContain('preferred_pro');
    });
  });

  describe('computeContractorBadges — order + empty', () => {
    it('returns [] for a blank profile', () => {
      expect(computeContractorBadges(BLANK, NOW)).toEqual([]);
    });

    it('returns badges in canonical ladder order, not input order', () => {
      // Earn preferred_pro + verified + licenced; confirm verified
      // comes first, preferred_pro last, regardless of field order
      // in the input object.
      const badges = computeContractorBadges(
        {
          ...BLANK,
          total_jobs_completed: 42,
          rating: 4.9,
          license_type: 'electrical',
          license_expiry: FUTURE,
          admin_verified: true,
          background_check_status: 'verified',
        },
        NOW
      );
      expect(badges.map((b) => b.id)).toEqual([
        'verified',
        'licenced',
        'preferred_pro',
      ]);
    });
  });

  describe('nextUnearnedBadge', () => {
    it('returns the first ladder item for a blank profile (Verified)', () => {
      const next = nextUnearnedBadge(BLANK, NOW);
      expect(next?.id).toBe('verified');
    });

    it('returns Insured once Verified is earned', () => {
      const next = nextUnearnedBadge(
        {
          ...BLANK,
          admin_verified: true,
          background_check_status: 'verified',
        },
        NOW
      );
      expect(next?.id).toBe('insured');
    });

    it('returns null when all badges are earned', () => {
      const next = nextUnearnedBadge(
        {
          ...BLANK,
          admin_verified: true,
          background_check_status: 'verified',
          license_type: 'trade',
          license_expiry: FUTURE,
          insurance_expiry: FUTURE,
          dbs_expiry: FUTURE,
          total_jobs_completed: 100,
          rating: 5,
        },
        NOW
      );
      expect(next).toBeNull();
    });
  });
});
