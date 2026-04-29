// Mock for BidService — exposes the static methods consumed by
// JobService and screens so tests can stub them with jest.fn().
export class BidService {
  static initialize = jest.fn(() => Promise.resolve());
  static getData = jest.fn(() => Promise.resolve({ data: [], error: null }));
  static create = jest.fn((data: any) =>
    Promise.resolve({ data: { id: 'mock-id', ...data }, error: null })
  );
  static update = jest.fn((id: string, data: any) =>
    Promise.resolve({ data: { id, ...data }, error: null })
  );
  static delete = jest.fn((id: string) =>
    Promise.resolve({ data: { id }, error: null })
  );
  static getById = jest.fn((id: string) =>
    Promise.resolve({ data: { id }, error: null })
  );

  // Bid operations (mirror real BidService surface).
  static submitBid = jest.fn();
  static createBid = jest.fn();
  static getBidsByJob = jest.fn();
  static getBidsByJobs = jest.fn();
  static getBidsByContractor = jest.fn();
  static acceptBid = jest.fn();
  static rejectBid = jest.fn();
  static unrejectBid = jest.fn();
  static withdrawBid = jest.fn();
  static updateBid = jest.fn();
  static getBidStatistics = jest.fn();
}

export default BidService;
