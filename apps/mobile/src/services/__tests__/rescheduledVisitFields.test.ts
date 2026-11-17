import { rescheduledVisitFields } from '../meeting/rescheduledVisitFields';
describe('UK visit rescheduling', () => {
  it('keeps the existing 90 minute visit duration in winter', () =>
    expect(rescheduledVisitFields('2027-01-26T15:00:00Z', 90)).toEqual({
      appointmentDate: '2027-01-26',
      startTime: '15:00',
      endTime: '16:30',
    }));
  it('uses UK summer time across UTC midnight', () =>
    expect(rescheduledVisitFields('2027-06-01T23:30:00Z', 30)).toEqual({
      appointmentDate: '2027-06-02',
      startTime: '00:30',
      endTime: '01:00',
    }));
  it('handles an offset instant independently of the device zone', () =>
    expect(rescheduledVisitFields('2027-06-02T12:00:00+03:00', 45)).toEqual({
      appointmentDate: '2027-06-02',
      startTime: '10:00',
      endTime: '10:45',
    }));
  it('rejects missing duration and midnight rollover', () => {
    expect(() => rescheduledVisitFields('2027-01-01T10:00Z', 0)).toThrow();
    expect(() => rescheduledVisitFields('2027-01-01T23:30Z', 60)).toThrow(
      'midnight'
    );
  });
});
