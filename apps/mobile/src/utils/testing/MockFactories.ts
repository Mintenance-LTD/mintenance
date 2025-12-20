// ============================================================================
// MOCK FACTORIES
// Factory system for creating mock objects and test data
// ============================================================================

// ============================================================================
// MOCK FACTORY SYSTEM
// ============================================================================

export interface MockFactory<T> {
  create(overrides?: Partial<T>): T;
  createMany(count: number, overrides?: Partial<T>): T[];
  setState(state: Partial<T>): void;
  getState(): Partial<T>;
}

export function createMockFactory<T extends Record<string, any>>(
  defaults: { [K in keyof T]: () => T[K] }
): MockFactory<T> {
  let state: Partial<T> = {};

  return {
    create(overrides: Partial<T> = {}): T {
      const result = {} as T;

      // Apply defaults
      for (const [key, defaultFn] of Object.entries(defaults)) {
        result[key as keyof T] = defaultFn();
      }

      // Apply state overrides
      Object.assign(result, state);

      // Apply parameter overrides
      Object.assign(result, overrides);

      return result;
    },

    createMany(count: number, overrides: Partial<T> = {}): T[] {
      return Array.from({ length: count }, () => this.create(overrides));
    },

    setState(newState: Partial<T>): void {
      state = { ...state, ...newState };
    },

    getState(): Partial<T> {
      return { ...state };
    },
  };
}

// ============================================================================
// MOCK DATA GENERATOR
// ============================================================================

export class MockDataGenerator {
  private static firstNames = [
    'John', 'Jane', 'Mike', 'Sarah', 'David', 'Lisa', 'Chris', 'Anna',
    'Mark', 'Emma', 'Paul', 'Rachel', 'Steve', 'Amanda', 'Brian', 'Jessica'
  ];

  private static lastNames = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller',
    'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez'
  ];

  private static jobCategories = [
    'plumbing', 'electrical', 'carpentry', 'painting', 'roofing',
    'landscaping', 'cleaning', 'renovation', 'hvac', 'appliance_repair'
  ];

  private static locations = [
    { city: 'New York', state: 'NY', lat: 40.7128, lng: -74.0060 },
    { city: 'Los Angeles', state: 'CA', lat: 34.0522, lng: -118.2437 },
    { city: 'Chicago', state: 'IL', lat: 41.8781, lng: -87.6298 },
    { city: 'Houston', state: 'TX', lat: 29.7604, lng: -95.3698 },
    { city: 'Phoenix', state: 'AZ', lat: 33.4484, lng: -112.0740 }
  ];

  static generateUsers(count: number): any[] {
    return Array.from({ length: count }, (_, i) => ({
      id: `user_${i + 1}`,
      email: `user${i + 1}@example.com`,
      firstName: this.firstNames[Math.floor(Math.random() * this.firstNames.length)],
      lastName: this.lastNames[Math.floor(Math.random() * this.lastNames.length)],
      role: Math.random() > 0.5 ? 'contractor' : 'homeowner', // 50% chance for better balance
      phone: `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
      profileImageUrl: `https://api.dicebear.com/6.x/personas/svg?seed=user${i + 1}`,
      bio: 'Generated test user bio',
      rating: Math.round((Math.random() * 2 + 3) * 10) / 10, // 3.0 - 5.0
      totalJobsCompleted: Math.floor(Math.random() * 50),
      isAvailable: Math.random() > 0.3,
      createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    }));
  }

  static generateJobs(count: number): any[] {
    return Array.from({ length: count }, (_, i) => {
      const location = this.locations[Math.floor(Math.random() * this.locations.length)];
      const category = this.jobCategories[Math.floor(Math.random() * this.jobCategories.length)];

      return {
        id: `job_${i + 1}`,
        title: `${category.charAt(0).toUpperCase() + category.slice(1)} Job ${i + 1}`,
        description: `Professional ${category} work needed. This is a test job description for ${category} services.`,
        location: {
          address: `${location.city}, ${location.state}`,
          latitude: location.lat + (Math.random() - 0.5) * 0.1,
          longitude: location.lng + (Math.random() - 0.5) * 0.1,
          city: location.city,
          state: location.state,
        },
        homeownerId: null, // Will be set by relationships
        contractorId: Math.random() > 0.7 ? null : `contractor_${Math.floor(Math.random() * 5) + 1}`,
        status: ['posted', 'assigned', 'in_progress', 'completed'][Math.floor(Math.random() * 4)],
        budget: Math.floor(Math.random() * 5000) + 500,
        category,
        subcategory: `${category}_repair`,
        priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
        photos: [`https://picsum.photos/400/300?random=${i + 1}`],
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });
  }

  static generateBids(count: number, jobs: any[], contractors: any[]): any[] {
    if (jobs.length === 0 || contractors.length === 0) {
      // If no contractors provided, generate some temporary ones for the bids
      if (contractors.length === 0 && jobs.length > 0) {
        contractors = this.generateUsers(Math.max(3, count)).filter(u => u.role === 'contractor');
        // If still no contractors due to randomness, force create some
        if (contractors.length === 0) {
          contractors = Array.from({ length: Math.max(3, count) }, (_, i) => ({
            id: `temp_contractor_${i + 1}`,
            role: 'contractor',
            firstName: 'Contractor',
            lastName: `${i + 1}`,
            email: `contractor${i + 1}@example.com`,
          }));
        }
      } else {
        return [];
      }
    }

    return Array.from({ length: count }, (_, i) => {
      const job = jobs[Math.floor(Math.random() * jobs.length)];
      const contractor = contractors[Math.floor(Math.random() * contractors.length)];

      return {
        id: `bid_${Math.random().toString(36).substring(2, 8)}`,
        jobId: job.id,
        contractorId: contractor.id,
        amount: Math.floor(job.budget * (0.8 + Math.random() * 0.4)), // 80% - 120% of job budget
        description: `Professional bid for ${job.title}. Includes materials and labor.`,
        status: ['pending', 'accepted', 'rejected'][Math.floor(Math.random() * 3)],
        createdAt: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });
  }

  static generateMessages(count: number, users: any[], jobs: any[]): any[] {
    if (users.length === 0) {
      return [];
    }

    return Array.from({ length: count }, (_, i) => {
      const sender = users[Math.floor(Math.random() * users.length)];
      const receiver = users[Math.floor(Math.random() * users.length)];
      const job = jobs.length > 0 ? jobs[Math.floor(Math.random() * jobs.length)] : null;

      return {
        id: `msg_${Math.random().toString(36).substring(2, 8)}`,
        jobId: job?.id || null,
        senderId: sender.id,
        receiverId: receiver.id,
        messageText: `Test message ${i + 1}: This is a sample message between users.`,
        content: `Test message ${i + 1}: This is a sample message between users.`,
        messageType: 'text',
        attachmentUrl: Math.random() > 0.8 ? `https://picsum.photos/200/200?random=${i + 10}` : null,
        read: Math.random() > 0.3,
        timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        syncedAt: new Date().toISOString(),
      };
    });
  }

  static generateLocation(): any {
    const location = this.locations[Math.floor(Math.random() * this.locations.length)];
    return {
      latitude: location.lat + (Math.random() - 0.5) * 0.1,
      longitude: location.lng + (Math.random() - 0.5) * 0.1,
      city: location.city,
      state: location.state,
      country: 'US',
      address: `${Math.floor(Math.random() * 9999) + 1} Main St`,
      zipCode: `${Math.floor(Math.random() * 90000) + 10000}`,
    };
  }

  static generateDeviceInfo(): any {
    const platforms = ['ios', 'android'];
    const platform = platforms[Math.floor(Math.random() * platforms.length)];

    // Generate realistic screen dimensions
    const screenDimensions = platform === 'ios'
      ? { width: 390, height: 844 } // iPhone dimensions
      : { width: 360, height: 780 }; // Android dimensions

    return {
      platform,
      version: `${Math.floor(Math.random() * 5) + 10}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`,
      model: platform === 'ios'
        ? ['iPhone 12', 'iPhone 13', 'iPhone 14', 'iPad Pro'][Math.floor(Math.random() * 4)]
        : ['Samsung Galaxy S21', 'Google Pixel 6', 'OnePlus 9'][Math.floor(Math.random() * 3)],
      isDevice: true,
      manufacturer: platform === 'ios' ? 'Apple' : ['Samsung', 'Google', 'OnePlus'][Math.floor(Math.random() * 3)],
      screenWidth: screenDimensions.width + Math.floor(Math.random() * 100) - 50, // Add some variation
      screenHeight: screenDimensions.height + Math.floor(Math.random() * 100) - 50,
    };
  }
}
