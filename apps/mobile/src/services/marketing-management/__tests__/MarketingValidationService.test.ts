/**
 * MarketingValidationService unit tests.
 * Pure validation logic — exercises every error branch plus the happy path
 * for campaigns, content, and leads (which transitively covers the private
 * audience/objective/channel/email/phone validators).
 */

import { MarketingValidationService } from '../MarketingValidationService';
import type {
  CreateCampaignRequest,
  UpdateCampaignRequest,
  ContentCreationRequest,
} from '../types';

const svc = new MarketingValidationService();

function validCampaign(): CreateCampaignRequest {
  return {
    contractorId: 'c1',
    name: 'Spring Promo',
    type: 'email',
    budget: 5000,
    startDate: '2026-02-01',
    endDate: '2026-03-01',
    targetAudience: {
      demographics: { ageRange: [18, 65], location: ['London'] },
      behaviors: ['browsing'],
      size: 1000,
      reach: 500,
    },
    objectives: [{ type: 'awareness', target: 100, weight: 0.5 }],
    channels: [{ platform: 'email', budget: 2000 }],
  } as unknown as CreateCampaignRequest;
}

function validContent(): ContentCreationRequest {
  return {
    contractorId: 'c1',
    type: 'post',
    title: 'Great offer',
    callToAction: 'Book now',
    platforms: ['facebook'],
    description: 'A short description',
    mediaUrls: ['https://x/1.png'],
    scheduledDate: '2030-01-01',
  } as unknown as ContentCreationRequest;
}

function validLead() {
  return {
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    phone: '07123456789',
    serviceInterest: ['plumbing'],
    urgency: 'high',
  };
}

describe('MarketingValidationService', () => {
  describe('validateCreateCampaignRequest', () => {
    it('resolves for a fully valid request', async () => {
      await expect(
        svc.validateCreateCampaignRequest(validCampaign())
      ).resolves.toBeUndefined();
    });

    it.each([
      ['contractorId', { contractorId: '' }, 'Contractor ID is required'],
      ['name', { name: '   ' }, 'Campaign name is required'],
      ['type', { type: undefined }, 'Campaign type is required'],
      ['budget', { budget: 0 }, 'Budget must be greater than 0'],
      ['startDate', { startDate: '' }, 'Start date is required'],
    ])('rejects when %s is missing/invalid', async (_label, patch, msg) => {
      const req = { ...validCampaign(), ...(patch as object) };
      await expect(
        svc.validateCreateCampaignRequest(req as CreateCampaignRequest)
      ).rejects.toThrow(msg);
    });

    it('rejects when endDate is not after startDate', async () => {
      const req = {
        ...validCampaign(),
        startDate: '2026-03-01',
        endDate: '2026-02-01',
      };
      await expect(
        svc.validateCreateCampaignRequest(req as CreateCampaignRequest)
      ).rejects.toThrow('End date must be after start date');
    });

    it('rejects when name exceeds 100 characters', async () => {
      const req = { ...validCampaign(), name: 'x'.repeat(101) };
      await expect(
        svc.validateCreateCampaignRequest(req as CreateCampaignRequest)
      ).rejects.toThrow('Campaign name must be 100 characters or less');
    });

    it('rejects when budget exceeds the cap', async () => {
      const req = { ...validCampaign(), budget: 2_000_000 };
      await expect(
        svc.validateCreateCampaignRequest(req as CreateCampaignRequest)
      ).rejects.toThrow('Budget cannot exceed $1,000,000');
    });

    it('rejects when there are no objectives or channels', async () => {
      const req = { ...validCampaign(), objectives: [], channels: [] };
      await expect(
        svc.validateCreateCampaignRequest(req as CreateCampaignRequest)
      ).rejects.toThrow(
        /objective is required.*channel is required|At least one/
      );
    });

    it('rejects when target audience is missing', async () => {
      const req = { ...validCampaign(), targetAudience: undefined };
      await expect(
        svc.validateCreateCampaignRequest(
          req as unknown as CreateCampaignRequest
        )
      ).rejects.toThrow('Target audience is required');
    });
  });

  describe('target audience validation (via campaign)', () => {
    async function expectAudienceError(
      audiencePatch: object,
      msg: string | RegExp
    ) {
      const base = validCampaign();
      const req = {
        ...base,
        targetAudience: {
          ...(base.targetAudience as object),
          ...audiencePatch,
        },
      };
      await expect(
        svc.validateCreateCampaignRequest(req as CreateCampaignRequest)
      ).rejects.toThrow(msg);
    }

    it('requires demographics', () =>
      expectAudienceError(
        { demographics: undefined },
        'Demographics are required'
      ));

    it('requires an age range of exactly 2 values', () =>
      expectAudienceError(
        { demographics: { ageRange: [18], location: ['L'] } },
        'Age range must have exactly 2 values'
      ));

    it('rejects an out-of-bounds age range', () =>
      expectAudienceError(
        { demographics: { ageRange: [10, 120], location: ['L'] } },
        'Invalid age range'
      ));

    it('requires at least one location', () =>
      expectAudienceError(
        { demographics: { ageRange: [18, 65], location: [] } },
        'At least one location is required'
      ));

    it('requires behaviors', () =>
      expectAudienceError({ behaviors: undefined }, 'Behaviors are required'));

    it('rejects non-positive size and reach', () =>
      expectAudienceError(
        { size: 0, reach: -1 },
        /Audience size|Audience reach/
      ));
  });

  describe('objective + channel validation (via campaign)', () => {
    it('rejects an invalid objective', async () => {
      const req = {
        ...validCampaign(),
        objectives: [{ type: 'bogus', target: 0, weight: 2 }],
      };
      await expect(
        svc.validateCreateCampaignRequest(
          req as unknown as CreateCampaignRequest
        )
      ).rejects.toThrow(/Objective 1/);
    });

    it('rejects an invalid channel', async () => {
      const req = {
        ...validCampaign(),
        channels: [{ platform: '', budget: 200_000 }],
      };
      await expect(
        svc.validateCreateCampaignRequest(
          req as unknown as CreateCampaignRequest
        )
      ).rejects.toThrow(/Channel 1/);
    });
  });

  describe('validateUpdateCampaignRequest', () => {
    it('resolves for a valid update', async () => {
      const req = { id: '1', updates: { name: 'New name', budget: 100 } };
      await expect(
        svc.validateUpdateCampaignRequest(req as UpdateCampaignRequest)
      ).resolves.toBeUndefined();
    });

    it('rejects when id is missing', async () => {
      const req = { id: '', updates: { name: 'x' } };
      await expect(
        svc.validateUpdateCampaignRequest(req as UpdateCampaignRequest)
      ).rejects.toThrow('Campaign ID is required');
    });

    it('rejects when no fields are updated', async () => {
      const req = { id: '1', updates: {} };
      await expect(
        svc.validateUpdateCampaignRequest(req as UpdateCampaignRequest)
      ).rejects.toThrow('At least one field must be updated');
    });

    it('rejects an empty or overlong name update', async () => {
      await expect(
        svc.validateUpdateCampaignRequest({
          id: '1',
          updates: { name: '  ' },
        } as UpdateCampaignRequest)
      ).rejects.toThrow('Campaign name cannot be empty');
      await expect(
        svc.validateUpdateCampaignRequest({
          id: '1',
          updates: { name: 'x'.repeat(101) },
        } as UpdateCampaignRequest)
      ).rejects.toThrow('100 characters or less');
    });

    it('rejects out-of-range budget updates', async () => {
      await expect(
        svc.validateUpdateCampaignRequest({
          id: '1',
          updates: { budget: 0 },
        } as UpdateCampaignRequest)
      ).rejects.toThrow('Budget must be greater than 0');
      await expect(
        svc.validateUpdateCampaignRequest({
          id: '1',
          updates: { budget: 2_000_000 },
        } as UpdateCampaignRequest)
      ).rejects.toThrow('cannot exceed');
    });

    it('rejects an endDate in the past', async () => {
      const req = { id: '1', updates: { endDate: '2000-01-01' } };
      await expect(
        svc.validateUpdateCampaignRequest(req as UpdateCampaignRequest)
      ).rejects.toThrow('End date must be in the future');
    });

    it('delegates to audience/objective/channel validators on update', async () => {
      const req = {
        id: '1',
        updates: {
          targetAudience: { demographics: undefined, behaviors: undefined },
          objectives: [{ type: 'bad', target: 0, weight: 0 }],
          channels: [{ platform: '', budget: 0 }],
        },
      };
      await expect(
        svc.validateUpdateCampaignRequest(
          req as unknown as UpdateCampaignRequest
        )
      ).rejects.toThrow(/Demographics|Objective 1|Channel 1/);
    });
  });

  describe('validateContentCreationRequest', () => {
    it('passes for valid content', () => {
      expect(() =>
        svc.validateContentCreationRequest(validContent())
      ).not.toThrow();
    });

    it.each([
      ['contractorId', { contractorId: '' }, 'Contractor ID is required'],
      ['type', { type: undefined }, 'Content type is required'],
      ['title', { title: '' }, 'Content title is required'],
      ['callToAction', { callToAction: '' }, 'Call to action is required'],
      ['platforms', { platforms: [] }, 'At least one platform is required'],
      ['title length', { title: 'x'.repeat(101) }, 'Title must be 100'],
      [
        'description length',
        { description: 'x'.repeat(501) },
        'Description must be 500',
      ],
      [
        'cta length',
        { callToAction: 'x'.repeat(51) },
        'Call to action must be 50',
      ],
      [
        'too many media',
        { mediaUrls: new Array(11).fill('u') },
        'Maximum 10 media URLs',
      ],
      [
        'past schedule',
        { scheduledDate: '2000-01-01' },
        'Scheduled date must be in the future',
      ],
    ])('rejects bad %s', (_label, patch, msg) => {
      const req = { ...validContent(), ...(patch as object) };
      expect(() =>
        svc.validateContentCreationRequest(req as ContentCreationRequest)
      ).toThrow(msg);
    });
  });

  describe('validateLeadData', () => {
    it('passes for a valid lead', () => {
      expect(() => svc.validateLeadData(validLead())).not.toThrow();
    });

    it('accepts a lead without a phone number', () => {
      const { phone, ...noPhone } = validLead();
      void phone;
      expect(() =>
        svc.validateLeadData(noPhone as ReturnType<typeof validLead>)
      ).not.toThrow();
    });

    it.each([
      ['firstName', { firstName: '' }, 'First name is required'],
      ['lastName', { lastName: '' }, 'Last name is required'],
      ['email empty', { email: '' }, 'Email is required'],
      ['email format', { email: 'not-an-email' }, 'Invalid email format'],
      ['phone format', { phone: '123' }, 'Invalid phone number format'],
      [
        'serviceInterest',
        { serviceInterest: [] },
        'At least one service interest',
      ],
      ['urgency', { urgency: 'urgent' }, 'Invalid urgency level'],
      [
        'firstName length',
        { firstName: 'x'.repeat(51) },
        'First name must be 50',
      ],
      ['lastName length', { lastName: 'y'.repeat(51) }, 'Last name must be 50'],
    ])('rejects bad %s', (_label, patch, msg) => {
      expect(() => svc.validateLeadData({ ...validLead(), ...patch })).toThrow(
        msg
      );
    });

    it('accepts a 10-digit phone number', () => {
      expect(() =>
        svc.validateLeadData({ ...validLead(), phone: '2025550123' })
      ).not.toThrow();
    });
  });
});
