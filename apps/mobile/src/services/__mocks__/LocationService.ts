// Mock for LocationService
export class LocationService {
  static async initialize() {
    return Promise.resolve();
  }

  static async getData() {
    return Promise.resolve({ data: [], error: null });
  }

  static async create(data: any) {
    return Promise.resolve({ data: { id: 'mock-id', ...data }, error: null });
  }

  static async update(id: string, data: any) {
    return Promise.resolve({ data: { id, ...data }, error: null });
  }

  static async delete(id: string) {
    return Promise.resolve({ data: { id }, error: null });
  }

  static async getById(id: string) {
    return Promise.resolve({ data: { id }, error: null });
  }
}

export default LocationService;
