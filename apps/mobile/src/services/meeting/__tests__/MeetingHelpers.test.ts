import {
  mapAppointmentToMeeting,
  mapDatabaseToMeeting,
  type AppointmentRow,
} from '../MeetingHelpers';
import type { DatabaseMeetingRow } from '../types';

// Fixed clock so every `new Date().toISOString()` fallback is deterministic.
const FIXED_NOW = '2026-06-05T12:00:00.000Z';

describe('MeetingHelpers', () => {
  beforeAll(() => {
    jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(FIXED_NOW);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  // ---- helpers to build minimal valid rows ----
  const baseAppointment = (
    overrides: Partial<AppointmentRow> = {}
  ): AppointmentRow => ({
    id: 'apt-1',
    contractor_id: 'c-1',
    client_id: 'cl-1',
    job_id: 'j-1',
    title: 'Quote visit',
    appointment_date: '2026-06-10',
    start_time: '09:30:00',
    end_time: '10:30:00',
    duration_minutes: 45,
    location_type: 'onsite',
    location_address: '12 Baker St',
    status: 'confirmed',
    notes: 'Bring ladder',
    created_at: '2026-06-01T08:00:00.000Z',
    updated_at: '2026-06-02T08:00:00.000Z',
    client: null,
    contractor: null,
    job: null,
    ...overrides,
  });

  describe('mapAppointmentToMeeting', () => {
    it('synthesises scheduled_datetime from appointment_date + start_time', () => {
      const result = mapAppointmentToMeeting(baseAppointment());
      expect(result.scheduled_datetime).toBe('2026-06-10T09:30:00');
    });

    it('maps location_type "phone" to consultation', () => {
      const result = mapAppointmentToMeeting(
        baseAppointment({ location_type: 'phone' })
      );
      expect(result.meeting_type).toBe('consultation');
    });

    it('maps location_type "remote" to consultation', () => {
      const result = mapAppointmentToMeeting(
        baseAppointment({ location_type: 'remote' })
      );
      expect(result.meeting_type).toBe('consultation');
    });

    it('maps any other location_type to site_visit', () => {
      expect(
        mapAppointmentToMeeting(baseAppointment({ location_type: 'onsite' }))
          .meeting_type
      ).toBe('site_visit');
      expect(
        mapAppointmentToMeeting(baseAppointment({ location_type: null }))
          .meeting_type
      ).toBe('site_visit');
    });

    it('passes through direct fields and known nullable values', () => {
      const result = mapAppointmentToMeeting(baseAppointment());
      expect(result.id).toBe('apt-1');
      expect(result.contractor_id).toBe('c-1');
      expect(result.job_id).toBe('j-1');
      expect(result.homeowner_id).toBe('cl-1');
      expect(result.status).toBe('confirmed');
      expect(result.address).toBe('12 Baker St');
      expect(result.duration).toBe(45);
      expect(result.notes).toBe('Bring ladder');
      expect(result.created_at).toBe('2026-06-01T08:00:00.000Z');
      expect(result.updated_at).toBe('2026-06-02T08:00:00.000Z');
    });

    it('falls back job_id and homeowner_id to empty string when null', () => {
      const result = mapAppointmentToMeeting(
        baseAppointment({ job_id: null, client_id: null })
      );
      expect(result.job_id).toBe('');
      expect(result.homeowner_id).toBe('');
    });

    it('defaults status to "scheduled" when null', () => {
      const result = mapAppointmentToMeeting(baseAppointment({ status: null }));
      expect(result.status).toBe('scheduled');
    });

    it('uses job lat/lng when job present, else 0', () => {
      const withJob = mapAppointmentToMeeting(
        baseAppointment({
          job: { id: 'j-1', title: 'Roof', latitude: 51.5, longitude: -0.1 },
        })
      );
      expect(withJob.latitude).toBe(51.5);
      expect(withJob.longitude).toBe(-0.1);

      const noJob = mapAppointmentToMeeting(baseAppointment({ job: null }));
      expect(noJob.latitude).toBe(0);
      expect(noJob.longitude).toBe(0);
    });

    it('falls back lat/lng to 0 when job present but coords null', () => {
      const result = mapAppointmentToMeeting(
        baseAppointment({
          job: { id: 'j-1', title: 'Roof', latitude: null, longitude: null },
        })
      );
      expect(result.latitude).toBe(0);
      expect(result.longitude).toBe(0);
    });

    it('prefers location_address, then job.location, then undefined for address', () => {
      // location_address wins
      expect(
        mapAppointmentToMeeting(
          baseAppointment({
            location_address: 'Primary',
            job: { id: 'j', title: 't', location: 'JobLoc' },
          })
        ).address
      ).toBe('Primary');

      // falls back to job.location
      expect(
        mapAppointmentToMeeting(
          baseAppointment({
            location_address: null,
            job: { id: 'j', title: 't', location: 'JobLoc' },
          })
        ).address
      ).toBe('JobLoc');

      // both missing -> undefined
      expect(
        mapAppointmentToMeeting(
          baseAppointment({ location_address: null, job: null })
        ).address
      ).toBeUndefined();

      // address null and job has no location -> undefined
      expect(
        mapAppointmentToMeeting(
          baseAppointment({
            location_address: null,
            job: { id: 'j', title: 't' },
          })
        ).address
      ).toBeUndefined();
    });

    it('defaults duration to 60 when duration_minutes null', () => {
      const result = mapAppointmentToMeeting(
        baseAppointment({ duration_minutes: null })
      );
      expect(result.duration).toBe(60);
    });

    it('defaults notes to undefined when null', () => {
      const result = mapAppointmentToMeeting(baseAppointment({ notes: null }));
      expect(result.notes).toBeUndefined();
    });

    it('falls back created_at / updated_at to current ISO when null', () => {
      const result = mapAppointmentToMeeting(
        baseAppointment({ created_at: null, updated_at: null })
      );
      expect(result.created_at).toBe(FIXED_NOW);
      expect(result.updated_at).toBe(FIXED_NOW);
    });

    it('builds homeowner object when client present, filling nullable fields', () => {
      const result = mapAppointmentToMeeting(
        baseAppointment({
          client: {
            id: 'cl-1',
            first_name: 'Jane',
            last_name: 'Doe',
            email: 'jane@example.com',
            phone: '0700',
            profile_image_url: 'http://img',
          },
        })
      );
      expect(result.homeowner).toEqual({
        id: 'cl-1',
        email: 'jane@example.com',
        first_name: 'Jane',
        last_name: 'Doe',
        role: 'homeowner',
        created_at: FIXED_NOW,
        updated_at: FIXED_NOW,
        phone: '0700',
        profile_image_url: 'http://img',
      });
    });

    it('coerces client nullable fields to empty string / undefined', () => {
      const result = mapAppointmentToMeeting(
        baseAppointment({
          client: {
            id: 'cl-1',
            first_name: null,
            last_name: null,
            email: null,
            phone: null,
            profile_image_url: null,
          },
        })
      );
      expect(result.homeowner).toMatchObject({
        email: '',
        first_name: '',
        last_name: '',
        phone: undefined,
        profile_image_url: undefined,
      });
    });

    it('leaves homeowner undefined when client null', () => {
      const result = mapAppointmentToMeeting(baseAppointment({ client: null }));
      expect(result.homeowner).toBeUndefined();
    });

    it('builds contractor object when contractor present', () => {
      const result = mapAppointmentToMeeting(
        baseAppointment({
          contractor: {
            id: 'c-1',
            first_name: 'Bob',
            last_name: 'Smith',
            email: 'bob@example.com',
            phone: '0800',
            profile_image_url: 'http://c-img',
          },
        })
      );
      expect(result.contractor).toEqual({
        id: 'c-1',
        email: 'bob@example.com',
        first_name: 'Bob',
        last_name: 'Smith',
        role: 'contractor',
        created_at: FIXED_NOW,
        updated_at: FIXED_NOW,
        phone: '0800',
        profile_image_url: 'http://c-img',
      });
    });

    it('coerces contractor nullable fields and undefined optionals', () => {
      const result = mapAppointmentToMeeting(
        baseAppointment({
          contractor: {
            id: 'c-1',
            first_name: null,
            last_name: null,
            email: null,
          },
        })
      );
      expect(result.contractor).toMatchObject({
        email: '',
        first_name: '',
        last_name: '',
        phone: undefined,
        profile_image_url: undefined,
      });
    });

    it('leaves contractor undefined when contractor null', () => {
      const result = mapAppointmentToMeeting(
        baseAppointment({ contractor: null })
      );
      expect(result.contractor).toBeUndefined();
    });

    it('builds job summary when job present, coercing null title to empty', () => {
      expect(
        mapAppointmentToMeeting(
          baseAppointment({ job: { id: 'j-1', title: 'Fix sink' } })
        ).job
      ).toEqual({ id: 'j-1', title: 'Fix sink' });

      expect(
        mapAppointmentToMeeting(
          baseAppointment({ job: { id: 'j-1', title: null } })
        ).job
      ).toEqual({ id: 'j-1', title: '' });
    });

    it('leaves job undefined when job null', () => {
      const result = mapAppointmentToMeeting(baseAppointment({ job: null }));
      expect(result.job).toBeUndefined();
    });
  });

  describe('mapDatabaseToMeeting', () => {
    const baseDb = (
      overrides: Partial<DatabaseMeetingRow> = {}
    ): DatabaseMeetingRow => ({
      id: 'm-1',
      job_id: 'j-1',
      homeowner_id: 'h-1',
      contractor_id: 'c-1',
      scheduled_datetime: '2026-06-10T09:30:00.000Z',
      status: 'scheduled',
      meeting_type: 'site_visit',
      latitude: 51.5,
      longitude: -0.12,
      address: '12 Baker St',
      duration: 60,
      notes: 'note',
      created_at: '2026-06-01T08:00:00.000Z',
      updated_at: '2026-06-02T08:00:00.000Z',
      ...overrides,
    });

    it('maps all direct top-level fields through unchanged', () => {
      const result = mapDatabaseToMeeting(baseDb());
      expect(result).toMatchObject({
        id: 'm-1',
        job_id: 'j-1',
        homeowner_id: 'h-1',
        contractor_id: 'c-1',
        scheduled_datetime: '2026-06-10T09:30:00.000Z',
        status: 'scheduled',
        meeting_type: 'site_visit',
        latitude: 51.5,
        longitude: -0.12,
        address: '12 Baker St',
        duration: 60,
        notes: 'note',
        created_at: '2026-06-01T08:00:00.000Z',
        updated_at: '2026-06-02T08:00:00.000Z',
      });
    });

    it('leaves homeowner/contractor/job undefined when absent', () => {
      const result = mapDatabaseToMeeting(baseDb());
      expect(result.homeowner).toBeUndefined();
      expect(result.contractor).toBeUndefined();
      expect(result.job).toBeUndefined();
    });

    it('builds homeowner with provided timestamps', () => {
      const result = mapDatabaseToMeeting(
        baseDb({
          homeowner: {
            id: 'h-1',
            email: 'h@x.com',
            first_name: 'H',
            last_name: 'O',
            created_at: '2025-01-01T00:00:00.000Z',
            updated_at: '2025-02-01T00:00:00.000Z',
            phone: '01',
            profile_image_url: 'img',
          },
        })
      );
      expect(result.homeowner).toEqual({
        id: 'h-1',
        email: 'h@x.com',
        first_name: 'H',
        last_name: 'O',
        role: 'homeowner',
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-02-01T00:00:00.000Z',
        phone: '01',
        profile_image_url: 'img',
      });
    });

    it('falls back homeowner timestamps to now when missing', () => {
      const result = mapDatabaseToMeeting(
        baseDb({
          homeowner: {
            id: 'h-1',
            email: 'h@x.com',
            first_name: 'H',
            last_name: 'O',
          },
        })
      );
      expect(result.homeowner?.created_at).toBe(FIXED_NOW);
      expect(result.homeowner?.updated_at).toBe(FIXED_NOW);
    });

    it('builds contractor with provided timestamps and rating', () => {
      const result = mapDatabaseToMeeting(
        baseDb({
          contractor: {
            id: 'c-1',
            email: 'c@x.com',
            first_name: 'C',
            last_name: 'R',
            created_at: '2025-01-01T00:00:00.000Z',
            updated_at: '2025-02-01T00:00:00.000Z',
            phone: '02',
            profile_image_url: 'cimg',
            rating: 4.8,
          },
        })
      );
      expect(result.contractor).toMatchObject({
        id: 'c-1',
        role: 'contractor',
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-02-01T00:00:00.000Z',
        rating: 4.8,
      });
    });

    it('falls back contractor timestamps to now when missing', () => {
      const result = mapDatabaseToMeeting(
        baseDb({
          contractor: {
            id: 'c-1',
            email: 'c@x.com',
            first_name: 'C',
            last_name: 'R',
          },
        })
      );
      expect(result.contractor?.created_at).toBe(FIXED_NOW);
      expect(result.contractor?.updated_at).toBe(FIXED_NOW);
    });

    it('builds job summary when job present', () => {
      const result = mapDatabaseToMeeting(
        baseDb({
          job: {
            id: 'j-1',
            title: 'Fix boiler',
            description: 'd',
            status: 'open',
            budget: 100,
          },
        })
      );
      expect(result.job).toEqual({ id: 'j-1', title: 'Fix boiler' });
    });
  });
});
