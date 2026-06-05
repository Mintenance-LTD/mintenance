/**
 * ClientValidationService unit tests
 *
 * Pure validation logic — no external dependencies to mock. Every public
 * method and every error branch is exercised with valid, invalid, boundary
 * and null/undefined inputs.
 */

import { ClientValidationService } from '../ClientValidationService';
import type {
  CreateClientRequest,
  UpdateClientRequest,
  ClientAddress,
  ClientPreferences,
} from '../types';

const validAddress = (): ClientAddress => ({
  street: '123 Main St',
  city: 'London',
  state: 'Greater London',
  zipCode: 'SW1A 1AA',
  country: 'United Kingdom',
});

const validCreateRequest = (): CreateClientRequest => ({
  contractorId: 'contractor-1',
  type: 'individual',
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
  source: 'referral',
  address: validAddress(),
});

describe('ClientValidationService', () => {
  let service: ClientValidationService;

  beforeEach(() => {
    service = new ClientValidationService();
  });

  // Helper to capture thrown validation message
  const expectValidationError = async (
    fn: () => Promise<void> | void,
    fragment: string
  ) => {
    let message = '';
    try {
      await fn();
      throw new Error('Expected validation to throw, but it did not');
    } catch (err) {
      message = (err as Error).message;
    }
    expect(message).toContain('Validation failed:');
    expect(message).toContain(fragment);
  };

  describe('validateCreateClientRequest', () => {
    it('resolves for a fully valid request', async () => {
      await expect(
        service.validateCreateClientRequest(validCreateRequest())
      ).resolves.toBeUndefined();
    });

    it('resolves with all optional fields populated and valid', async () => {
      const req: CreateClientRequest = {
        ...validCreateRequest(),
        phone: '+1 (415) 555-1234',
        companyName: 'Acme Co',
        tags: ['vip', 'repeat'],
        preferences: {
          communicationMethod: 'email',
          urgencyPreference: 'flexible',
          paymentMethod: 'card',
          budgetRange: [100, 500],
          serviceTypes: ['plumbing'],
        },
      };
      await expect(
        service.validateCreateClientRequest(req)
      ).resolves.toBeUndefined();
    });

    it('rejects missing contractorId', async () => {
      const req = { ...validCreateRequest(), contractorId: '' };
      await expectValidationError(
        () => service.validateCreateClientRequest(req),
        'Contractor ID is required'
      );
    });

    it('rejects missing firstName', async () => {
      const req = { ...validCreateRequest(), firstName: '' };
      await expectValidationError(
        () => service.validateCreateClientRequest(req),
        'First name is required'
      );
    });

    it('rejects whitespace-only firstName', async () => {
      const req = { ...validCreateRequest(), firstName: '   ' };
      await expectValidationError(
        () => service.validateCreateClientRequest(req),
        'First name is required'
      );
    });

    it('rejects missing lastName', async () => {
      const req = { ...validCreateRequest(), lastName: '' };
      await expectValidationError(
        () => service.validateCreateClientRequest(req),
        'Last name is required'
      );
    });

    it('rejects whitespace-only lastName', async () => {
      const req = { ...validCreateRequest(), lastName: '\t\n' };
      await expectValidationError(
        () => service.validateCreateClientRequest(req),
        'Last name is required'
      );
    });

    it('rejects missing email', async () => {
      const req = { ...validCreateRequest(), email: '' };
      await expectValidationError(
        () => service.validateCreateClientRequest(req),
        'Email is required'
      );
    });

    it('rejects whitespace-only email', async () => {
      const req = { ...validCreateRequest(), email: '   ' };
      await expectValidationError(
        () => service.validateCreateClientRequest(req),
        'Email is required'
      );
    });

    it('rejects missing type', async () => {
      const req = { ...validCreateRequest() };
      // @ts-expect-error testing missing required field
      req.type = undefined;
      await expectValidationError(
        () => service.validateCreateClientRequest(req),
        'Client type is required'
      );
    });

    it('rejects missing source', async () => {
      const req = { ...validCreateRequest(), source: '' };
      await expectValidationError(
        () => service.validateCreateClientRequest(req),
        'Source is required'
      );
    });

    it('rejects whitespace-only source', async () => {
      const req = { ...validCreateRequest(), source: '  ' };
      await expectValidationError(
        () => service.validateCreateClientRequest(req),
        'Source is required'
      );
    });

    it('rejects invalid email format', async () => {
      const req = { ...validCreateRequest(), email: 'not-an-email' };
      await expectValidationError(
        () => service.validateCreateClientRequest(req),
        'Invalid email format'
      );
    });

    it('rejects invalid phone format when phone provided', async () => {
      const req = { ...validCreateRequest(), phone: '123' };
      await expectValidationError(
        () => service.validateCreateClientRequest(req),
        'Invalid phone number format'
      );
    });

    it('accepts a 10-digit phone', async () => {
      const req = { ...validCreateRequest(), phone: '4155551234' };
      await expect(
        service.validateCreateClientRequest(req)
      ).resolves.toBeUndefined();
    });

    it('accepts an 11-digit phone', async () => {
      const req = { ...validCreateRequest(), phone: '14155551234' };
      await expect(
        service.validateCreateClientRequest(req)
      ).resolves.toBeUndefined();
    });

    it('rejects missing address', async () => {
      const req = { ...validCreateRequest() };
      // @ts-expect-error testing missing required field
      req.address = undefined;
      await expectValidationError(
        () => service.validateCreateClientRequest(req),
        'Address is required'
      );
    });

    it('rejects firstName longer than 50 chars', async () => {
      const req = { ...validCreateRequest(), firstName: 'a'.repeat(51) };
      await expectValidationError(
        () => service.validateCreateClientRequest(req),
        'First name must be 50 characters or less'
      );
    });

    it('accepts firstName at the 50-char boundary', async () => {
      const req = { ...validCreateRequest(), firstName: 'a'.repeat(50) };
      await expect(
        service.validateCreateClientRequest(req)
      ).resolves.toBeUndefined();
    });

    it('rejects lastName longer than 50 chars', async () => {
      const req = { ...validCreateRequest(), lastName: 'b'.repeat(51) };
      await expectValidationError(
        () => service.validateCreateClientRequest(req),
        'Last name must be 50 characters or less'
      );
    });

    it('rejects companyName longer than 100 chars', async () => {
      const req = { ...validCreateRequest(), companyName: 'c'.repeat(101) };
      await expectValidationError(
        () => service.validateCreateClientRequest(req),
        'Company name must be 100 characters or less'
      );
    });

    it('accepts companyName at the 100-char boundary', async () => {
      const req = { ...validCreateRequest(), companyName: 'c'.repeat(100) };
      await expect(
        service.validateCreateClientRequest(req)
      ).resolves.toBeUndefined();
    });

    it('rejects more than 10 tags', async () => {
      const req = {
        ...validCreateRequest(),
        tags: Array.from({ length: 11 }, (_, i) => `t${i}`),
      };
      await expectValidationError(
        () => service.validateCreateClientRequest(req),
        'Maximum 10 tags allowed'
      );
    });

    it('accepts exactly 10 tags', async () => {
      const req = {
        ...validCreateRequest(),
        tags: Array.from({ length: 10 }, (_, i) => `t${i}`),
      };
      await expect(
        service.validateCreateClientRequest(req)
      ).resolves.toBeUndefined();
    });

    it('rejects a tag longer than 20 chars', async () => {
      const req = { ...validCreateRequest(), tags: ['x'.repeat(21)] };
      await expectValidationError(
        () => service.validateCreateClientRequest(req),
        'Each tag must be 20 characters or less'
      );
    });

    it('accepts an empty tags array', async () => {
      const req = { ...validCreateRequest(), tags: [] };
      await expect(
        service.validateCreateClientRequest(req)
      ).resolves.toBeUndefined();
    });

    it('aggregates multiple errors into one message', async () => {
      const req = {
        ...validCreateRequest(),
        firstName: '',
        lastName: '',
        email: 'bad',
      };
      let message = '';
      try {
        await service.validateCreateClientRequest(req);
      } catch (err) {
        message = (err as Error).message;
      }
      expect(message).toContain('First name is required');
      expect(message).toContain('Last name is required');
      expect(message).toContain('Invalid email format');
      // comma-joined
      expect(message.split(', ').length).toBeGreaterThanOrEqual(3);
    });

    it('validates the nested address when present', async () => {
      const req = {
        ...validCreateRequest(),
        address: { ...validAddress(), city: '' },
      };
      await expectValidationError(
        () => service.validateCreateClientRequest(req),
        'City is required'
      );
    });

    it('validates nested preferences when present', async () => {
      const req: CreateClientRequest = {
        ...validCreateRequest(),
        preferences: {
          communicationMethod:
            'carrier-pigeon' as ClientPreferences['communicationMethod'],
        },
      };
      await expectValidationError(
        () => service.validateCreateClientRequest(req),
        'Invalid communication method'
      );
    });
  });

  describe('validateUpdateClientRequest', () => {
    it('resolves for a valid single-field update', async () => {
      const req: UpdateClientRequest = {
        id: 'c1',
        updates: { firstName: 'New' },
      };
      await expect(
        service.validateUpdateClientRequest(req)
      ).resolves.toBeUndefined();
    });

    it('rejects missing id', async () => {
      const req: UpdateClientRequest = {
        id: '',
        updates: { firstName: 'New' },
      };
      await expectValidationError(
        () => service.validateUpdateClientRequest(req),
        'Client ID is required'
      );
    });

    it('rejects empty updates object', async () => {
      const req: UpdateClientRequest = { id: 'c1', updates: {} };
      await expectValidationError(
        () => service.validateUpdateClientRequest(req),
        'At least one field must be updated'
      );
    });

    it('throws when updates object is missing (impl accesses updates.* without a guard)', async () => {
      // Documents real behaviour: the "at least one field" branch pushes an error
      // but execution continues to `request.updates.firstName`, which throws a
      // TypeError on an undefined `updates` before the aggregated Error is raised.
      const req = { id: 'c1' } as unknown as UpdateClientRequest;
      await expect(service.validateUpdateClientRequest(req)).rejects.toThrow(
        /Cannot read properties of undefined/
      );
    });

    it('rejects empty-string firstName update', async () => {
      const req: UpdateClientRequest = { id: 'c1', updates: { firstName: '' } };
      await expectValidationError(
        () => service.validateUpdateClientRequest(req),
        'First name cannot be empty'
      );
    });

    it('rejects whitespace-only firstName update', async () => {
      const req: UpdateClientRequest = {
        id: 'c1',
        updates: { firstName: '   ' },
      };
      await expectValidationError(
        () => service.validateUpdateClientRequest(req),
        'First name cannot be empty'
      );
    });

    it('rejects firstName update longer than 50 chars', async () => {
      const req: UpdateClientRequest = {
        id: 'c1',
        updates: { firstName: 'a'.repeat(51) },
      };
      await expectValidationError(
        () => service.validateUpdateClientRequest(req),
        'First name must be 50 characters or less'
      );
    });

    it('rejects empty-string lastName update', async () => {
      const req: UpdateClientRequest = { id: 'c1', updates: { lastName: '' } };
      await expectValidationError(
        () => service.validateUpdateClientRequest(req),
        'Last name cannot be empty'
      );
    });

    it('rejects lastName update longer than 50 chars', async () => {
      const req: UpdateClientRequest = {
        id: 'c1',
        updates: { lastName: 'b'.repeat(51) },
      };
      await expectValidationError(
        () => service.validateUpdateClientRequest(req),
        'Last name must be 50 characters or less'
      );
    });

    it('rejects empty-string email update', async () => {
      const req: UpdateClientRequest = { id: 'c1', updates: { email: '' } };
      // empty triggers both "cannot be empty" and "invalid format"
      await expectValidationError(
        () => service.validateUpdateClientRequest(req),
        'Email cannot be empty'
      );
    });

    it('rejects invalid email format update', async () => {
      const req: UpdateClientRequest = { id: 'c1', updates: { email: 'bad' } };
      await expectValidationError(
        () => service.validateUpdateClientRequest(req),
        'Invalid email format'
      );
    });

    it('accepts a valid email update', async () => {
      const req: UpdateClientRequest = {
        id: 'c1',
        updates: { email: 'ok@example.com' },
      };
      await expect(
        service.validateUpdateClientRequest(req)
      ).resolves.toBeUndefined();
    });

    it('rejects invalid phone update', async () => {
      const req: UpdateClientRequest = { id: 'c1', updates: { phone: '12' } };
      await expectValidationError(
        () => service.validateUpdateClientRequest(req),
        'Invalid phone number format'
      );
    });

    it('accepts an empty-string phone update (falsy skips phone validation)', async () => {
      const req: UpdateClientRequest = { id: 'c1', updates: { phone: '' } };
      await expect(
        service.validateUpdateClientRequest(req)
      ).resolves.toBeUndefined();
    });

    it('accepts a valid phone update', async () => {
      const req: UpdateClientRequest = {
        id: 'c1',
        updates: { phone: '4155551234' },
      };
      await expect(
        service.validateUpdateClientRequest(req)
      ).resolves.toBeUndefined();
    });

    it('rejects companyName update longer than 100 chars', async () => {
      const req: UpdateClientRequest = {
        id: 'c1',
        updates: { companyName: 'c'.repeat(101) },
      };
      await expectValidationError(
        () => service.validateUpdateClientRequest(req),
        'Company name must be 100 characters or less'
      );
    });

    it('accepts a present companyName update within the length limit', async () => {
      const req: UpdateClientRequest = {
        id: 'c1',
        updates: { companyName: 'Acme Co' },
      };
      await expect(
        service.validateUpdateClientRequest(req)
      ).resolves.toBeUndefined();
    });

    it('accepts an empty-string companyName update (falsy skips length check)', async () => {
      const req: UpdateClientRequest = {
        id: 'c1',
        updates: { companyName: '' },
      };
      // updates has a key, so "at least one field" passes; companyName falsy => no length check
      await expect(
        service.validateUpdateClientRequest(req)
      ).resolves.toBeUndefined();
    });

    it('validates nested address on update', async () => {
      const req: UpdateClientRequest = {
        id: 'c1',
        updates: { address: { ...validAddress(), street: '' } },
      };
      await expectValidationError(
        () => service.validateUpdateClientRequest(req),
        'Street address is required'
      );
    });

    it('rejects more than 10 tags on update', async () => {
      const req: UpdateClientRequest = {
        id: 'c1',
        updates: { tags: Array.from({ length: 11 }, (_, i) => `t${i}`) },
      };
      await expectValidationError(
        () => service.validateUpdateClientRequest(req),
        'Maximum 10 tags allowed'
      );
    });

    it('rejects a tag longer than 20 chars on update', async () => {
      const req: UpdateClientRequest = {
        id: 'c1',
        updates: { tags: ['x'.repeat(21)] },
      };
      await expectValidationError(
        () => service.validateUpdateClientRequest(req),
        'Each tag must be 20 characters or less'
      );
    });

    it('validates nested preferences on update', async () => {
      const req: UpdateClientRequest = {
        id: 'c1',
        updates: {
          preferences: {
            paymentMethod: 'bitcoin' as ClientPreferences['paymentMethod'],
          },
        },
      };
      await expectValidationError(
        () => service.validateUpdateClientRequest(req),
        'Invalid payment method'
      );
    });
  });

  describe('validateLifecycleTransition', () => {
    it.each([
      ['lead', 'prospect'],
      ['lead', 'customer'],
      ['prospect', 'customer'],
      ['prospect', 'lead'],
      ['customer', 'repeat_customer'],
      ['customer', 'advocate'],
      ['customer', 'prospect'],
      ['repeat_customer', 'advocate'],
      ['repeat_customer', 'customer'],
      ['advocate', 'repeat_customer'],
    ])('allows %s -> %s', (from, to) => {
      expect(() => service.validateLifecycleTransition(from, to)).not.toThrow();
    });

    it('rejects an invalid transition', () => {
      expect(() =>
        service.validateLifecycleTransition('lead', 'advocate')
      ).toThrow('Invalid lifecycle transition from lead to advocate');
    });

    it('rejects a transition from an unknown stage', () => {
      expect(() =>
        service.validateLifecycleTransition('unknown', 'lead')
      ).toThrow('Invalid lifecycle transition from unknown to lead');
    });

    it('rejects a self-transition that is not allowed', () => {
      expect(() =>
        service.validateLifecycleTransition('advocate', 'advocate')
      ).toThrow('Invalid lifecycle transition from advocate to advocate');
    });
  });

  describe('validateInteractionData', () => {
    const validInteraction = () => ({
      type: 'call',
      subject: 'Follow up',
      description: 'Discussed the quote',
    });

    it('resolves for valid interaction data', () => {
      expect(() =>
        service.validateInteractionData(validInteraction())
      ).not.toThrow();
    });

    it('resolves with a valid non-negative duration', () => {
      expect(() =>
        service.validateInteractionData({ ...validInteraction(), duration: 30 })
      ).not.toThrow();
    });

    it('rejects missing type', () => {
      expect(() =>
        service.validateInteractionData({ ...validInteraction(), type: '' })
      ).toThrow('Interaction type is required');
    });

    it('rejects missing subject', () => {
      expect(() =>
        service.validateInteractionData({ ...validInteraction(), subject: '' })
      ).toThrow('Subject is required');
    });

    it('rejects whitespace-only subject', () => {
      expect(() =>
        service.validateInteractionData({
          ...validInteraction(),
          subject: '   ',
        })
      ).toThrow('Subject is required');
    });

    it('rejects missing description', () => {
      expect(() =>
        service.validateInteractionData({
          ...validInteraction(),
          description: '',
        })
      ).toThrow('Description is required');
    });

    it('rejects subject longer than 100 chars', () => {
      expect(() =>
        service.validateInteractionData({
          ...validInteraction(),
          subject: 's'.repeat(101),
        })
      ).toThrow('Subject must be 100 characters or less');
    });

    it('rejects description longer than 1000 chars', () => {
      expect(() =>
        service.validateInteractionData({
          ...validInteraction(),
          description: 'd'.repeat(1001),
        })
      ).toThrow('Description must be 1000 characters or less');
    });

    it('rejects negative duration', () => {
      expect(() =>
        service.validateInteractionData({ ...validInteraction(), duration: -1 })
      ).toThrow('Duration cannot be negative');
    });

    it('accepts a zero duration', () => {
      expect(() =>
        service.validateInteractionData({ ...validInteraction(), duration: 0 })
      ).not.toThrow();
    });
  });

  describe('validateFollowUpTaskData', () => {
    const futureDate = () =>
      new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
    const pastDate = () =>
      new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString();

    const validTask = () => ({
      type: 'call',
      title: 'Call client',
      description: 'Discuss renewal',
      dueDate: futureDate(),
      priority: 'high',
    });

    it('resolves for valid task data', () => {
      expect(() => service.validateFollowUpTaskData(validTask())).not.toThrow();
    });

    it('rejects missing type', () => {
      expect(() =>
        service.validateFollowUpTaskData({ ...validTask(), type: '' })
      ).toThrow('Task type is required');
    });

    it('rejects missing title', () => {
      expect(() =>
        service.validateFollowUpTaskData({ ...validTask(), title: '' })
      ).toThrow('Title is required');
    });

    it('rejects whitespace-only title', () => {
      expect(() =>
        service.validateFollowUpTaskData({ ...validTask(), title: '  ' })
      ).toThrow('Title is required');
    });

    it('rejects missing description', () => {
      expect(() =>
        service.validateFollowUpTaskData({ ...validTask(), description: '' })
      ).toThrow('Description is required');
    });

    it('rejects missing dueDate', () => {
      expect(() =>
        service.validateFollowUpTaskData({ ...validTask(), dueDate: '' })
      ).toThrow('Due date is required');
    });

    it('rejects missing priority', () => {
      expect(() =>
        service.validateFollowUpTaskData({ ...validTask(), priority: '' })
      ).toThrow('Priority is required');
    });

    it('rejects title longer than 100 chars', () => {
      expect(() =>
        service.validateFollowUpTaskData({
          ...validTask(),
          title: 't'.repeat(101),
        })
      ).toThrow('Title must be 100 characters or less');
    });

    it('rejects description longer than 500 chars', () => {
      expect(() =>
        service.validateFollowUpTaskData({
          ...validTask(),
          description: 'd'.repeat(501),
        })
      ).toThrow('Description must be 500 characters or less');
    });

    it('rejects a due date in the past', () => {
      expect(() =>
        service.validateFollowUpTaskData({
          ...validTask(),
          dueDate: pastDate(),
        })
      ).toThrow('Due date must be in the future');
    });
  });

  describe('address validation (via create request)', () => {
    const withAddress = (
      overrides: Partial<ClientAddress>
    ): CreateClientRequest => ({
      ...validCreateRequest(),
      address: { ...validAddress(), ...overrides },
    });

    it('rejects missing street', async () => {
      await expectValidationError(
        () => service.validateCreateClientRequest(withAddress({ street: '' })),
        'Street address is required'
      );
    });

    it('rejects missing city', async () => {
      await expectValidationError(
        () => service.validateCreateClientRequest(withAddress({ city: '   ' })),
        'City is required'
      );
    });

    it('rejects missing state', async () => {
      await expectValidationError(
        () => service.validateCreateClientRequest(withAddress({ state: '' })),
        'State is required'
      );
    });

    it('rejects missing zipCode', async () => {
      await expectValidationError(
        () => service.validateCreateClientRequest(withAddress({ zipCode: '' })),
        'ZIP code is required'
      );
    });

    it('rejects missing country', async () => {
      await expectValidationError(
        () => service.validateCreateClientRequest(withAddress({ country: '' })),
        'Country is required'
      );
    });

    it('rejects street longer than 100 chars', async () => {
      await expectValidationError(
        () =>
          service.validateCreateClientRequest(
            withAddress({ street: 's'.repeat(101) })
          ),
        'Street address must be 100 characters or less'
      );
    });

    it('rejects city longer than 50 chars', async () => {
      await expectValidationError(
        () =>
          service.validateCreateClientRequest(
            withAddress({ city: 'c'.repeat(51) })
          ),
        'City must be 50 characters or less'
      );
    });

    it('rejects state longer than 50 chars', async () => {
      await expectValidationError(
        () =>
          service.validateCreateClientRequest(
            withAddress({ state: 's'.repeat(51) })
          ),
        'State must be 50 characters or less'
      );
    });

    it('rejects zipCode longer than 20 chars', async () => {
      await expectValidationError(
        () =>
          service.validateCreateClientRequest(
            withAddress({ zipCode: 'z'.repeat(21) })
          ),
        'ZIP code must be 20 characters or less'
      );
    });

    it('rejects country longer than 50 chars', async () => {
      await expectValidationError(
        () =>
          service.validateCreateClientRequest(
            withAddress({ country: 'c'.repeat(51) })
          ),
        'Country must be 50 characters or less'
      );
    });
  });

  describe('preferences validation (via create request)', () => {
    const withPrefs = (
      prefs: Partial<ClientPreferences>
    ): CreateClientRequest => ({
      ...validCreateRequest(),
      preferences: prefs,
    });

    it.each(['email', 'phone', 'sms', 'app'] as const)(
      'accepts valid communicationMethod %s',
      async (method) => {
        await expect(
          service.validateCreateClientRequest(
            withPrefs({ communicationMethod: method })
          )
        ).resolves.toBeUndefined();
      }
    );

    it('rejects invalid communicationMethod', async () => {
      await expectValidationError(
        () =>
          service.validateCreateClientRequest(
            withPrefs({
              communicationMethod:
                'fax' as ClientPreferences['communicationMethod'],
            })
          ),
        'Invalid communication method'
      );
    });

    it('rejects invalid urgencyPreference', async () => {
      await expectValidationError(
        () =>
          service.validateCreateClientRequest(
            withPrefs({
              urgencyPreference:
                'whenever' as ClientPreferences['urgencyPreference'],
            })
          ),
        'Invalid urgency preference'
      );
    });

    it('accepts valid urgencyPreference', async () => {
      await expect(
        service.validateCreateClientRequest(
          withPrefs({ urgencyPreference: 'immediate' })
        )
      ).resolves.toBeUndefined();
    });

    it('rejects invalid paymentMethod', async () => {
      await expectValidationError(
        () =>
          service.validateCreateClientRequest(
            withPrefs({
              paymentMethod: 'crypto' as ClientPreferences['paymentMethod'],
            })
          ),
        'Invalid payment method'
      );
    });

    it('rejects a budgetRange without exactly 2 values', async () => {
      await expectValidationError(
        () =>
          service.validateCreateClientRequest(
            withPrefs({ budgetRange: [100] as unknown as [number, number] })
          ),
        'Budget range must have exactly 2 values'
      );
    });

    it('rejects negative budget values', async () => {
      await expectValidationError(
        () =>
          service.validateCreateClientRequest(
            withPrefs({ budgetRange: [-5, 100] })
          ),
        'Budget values cannot be negative'
      );
    });

    it('rejects min greater than max budget', async () => {
      await expectValidationError(
        () =>
          service.validateCreateClientRequest(
            withPrefs({ budgetRange: [500, 100] })
          ),
        'Minimum budget cannot be greater than maximum budget'
      );
    });

    it('accepts a valid budgetRange', async () => {
      await expect(
        service.validateCreateClientRequest(
          withPrefs({ budgetRange: [100, 500] })
        )
      ).resolves.toBeUndefined();
    });

    it('rejects serviceTypes that are not an array', async () => {
      await expectValidationError(
        () =>
          service.validateCreateClientRequest(
            withPrefs({ serviceTypes: 'plumbing' as unknown as string[] })
          ),
        'Service types must be an array'
      );
    });

    it('rejects more than 20 service types', async () => {
      await expectValidationError(
        () =>
          service.validateCreateClientRequest(
            withPrefs({
              serviceTypes: Array.from({ length: 21 }, (_, i) => `s${i}`),
            })
          ),
        'Maximum 20 service types allowed'
      );
    });

    it('accepts exactly 20 service types', async () => {
      await expect(
        service.validateCreateClientRequest(
          withPrefs({
            serviceTypes: Array.from({ length: 20 }, (_, i) => `s${i}`),
          })
        )
      ).resolves.toBeUndefined();
    });

    it('accepts empty preferences object', async () => {
      await expect(
        service.validateCreateClientRequest(withPrefs({}))
      ).resolves.toBeUndefined();
    });
  });

  describe('email format validation (via create request)', () => {
    it.each(['user@example.com', 'first.last@sub.domain.co.uk', 'a@b.cd'])(
      'accepts valid email %s',
      async (email) => {
        await expect(
          service.validateCreateClientRequest({
            ...validCreateRequest(),
            email,
          })
        ).resolves.toBeUndefined();
      }
    );

    it.each([
      'plainaddress',
      '@no-local.com',
      'no-at-sign.com',
      'no@domain',
      'spaces in@email.com',
      'two@@at.com',
    ])('rejects invalid email %s', async (email) => {
      await expectValidationError(
        () =>
          service.validateCreateClientRequest({
            ...validCreateRequest(),
            email,
          }),
        'Invalid email format'
      );
    });
  });

  describe('phone format validation (via create request)', () => {
    it.each(['1234567890', '(415) 555-1234', '+1 415 555 1234', '14155551234'])(
      'accepts valid phone %s',
      async (phone) => {
        await expect(
          service.validateCreateClientRequest({
            ...validCreateRequest(),
            phone,
          })
        ).resolves.toBeUndefined();
      }
    );

    it.each(['123', '123456789', '123456789012', 'abc'])(
      'rejects invalid phone %s',
      async (phone) => {
        await expectValidationError(
          () =>
            service.validateCreateClientRequest({
              ...validCreateRequest(),
              phone,
            }),
          'Invalid phone number format'
        );
      }
    );
  });
});
