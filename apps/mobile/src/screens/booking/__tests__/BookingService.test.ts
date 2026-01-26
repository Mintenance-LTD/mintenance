import { BookingService } from '../BookingService';

describe('BookingService', () => {
  it('should expose booking operations', () => {
    const service = new BookingService();

    expect(typeof service.loadUserBookings).toBe('function');
    expect(typeof service.cancelBooking).toBe('function');
  });
});
