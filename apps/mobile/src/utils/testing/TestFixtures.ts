// ============================================================================
// TEST FIXTURES
// Test data builder and pre-configured test scenarios
// ============================================================================

import { MockDataGenerator } from './MockFactories';

// ============================================================================
// TEST DATA BUILDER
// ============================================================================

export class TestDataBuilder {
  private entities: Map<string, any[]> = new Map();
  private relationships: Map<string, { from: string; to: string; field: string }[]> = new Map();

  constructor() {
    this.entities = new Map();
    this.relationships = new Map();
  }

  // Fluent API methods for individual entities
  user(userData: any): this {
    if (!this.entities.has('users')) {
      this.entities.set('users', []);
    }
    this.entities.get('users')!.push(userData);
    return this;
  }

  job(jobData: any): this {
    if (!this.entities.has('jobs')) {
      this.entities.set('jobs', []);
    }
    this.entities.get('jobs')!.push(jobData);
    return this;
  }

  bid(bidData: any): this {
    if (!this.entities.has('bids')) {
      this.entities.set('bids', []);
    }
    this.entities.get('bids')!.push(bidData);
    return this;
  }

  message(messageData: any): this {
    if (!this.entities.has('messages')) {
      this.entities.set('messages', []);
    }
    this.entities.get('messages')!.push(messageData);
    return this;
  }

  bids(bidsData: any[]): this {
    if (!this.entities.has('bids')) {
      this.entities.set('bids', []);
    }
    bidsData.forEach(bidData => {
      this.entities.get('bids')!.push(bidData);
    });
    return this;
  }

  // Batch generation methods
  addUsers(count: number): this {
    const users = MockDataGenerator.generateUsers(count);
    this.entities.set('users', users);
    return this;
  }

  addJobs(count: number): this {
    const jobs = MockDataGenerator.generateJobs(count);
    this.entities.set('jobs', jobs);
    return this;
  }

  addBids(count: number): this {
    const users = this.entities.get('users') || [];
    const jobs = this.entities.get('jobs') || [];
    const contractors = users.filter((u: any) => u.role === 'contractor');

    const bids = MockDataGenerator.generateBids(count, jobs, contractors);
    this.entities.set('bids', bids);
    return this;
  }

  addMessages(count: number): this {
    const users = this.entities.get('users') || [];
    const jobs = this.entities.get('jobs') || [];

    const messages = MockDataGenerator.generateMessages(count, users, jobs);
    this.entities.set('messages', messages);
    return this;
  }

  withRelationship(from: string, to: string, field: string): this {
    if (!this.relationships.has(from)) {
      this.relationships.set(from, []);
    }
    this.relationships.get(from)!.push({ from, to, field });
    return this;
  }

  withScenario(scenarioName: string): this {
    switch (scenarioName) {
      case 'basic_job_workflow':
        return this
          .addUsers(5)
          .addJobs(3)
          .addBids(8)
          .addMessages(15)
          .withRelationship('jobs', 'users', 'homeowner_id')
          .withRelationship('bids', 'jobs', 'job_id')
          .withRelationship('bids', 'users', 'contractor_id');

      case 'active_marketplace':
        return this
          .addUsers(20)
          .addJobs(10)
          .addBids(30)
          .addMessages(50);

      case 'job_with_multiple_bids':
        return this
          .addUsers(6) // 1 homeowner + 5 contractors
          .addJobs(1)
          .addBids(5)
          .addMessages(10)
          .withRelationship('jobs', 'users', 'homeowner_id')
          .withRelationship('bids', 'jobs', 'job_id')
          .withRelationship('bids', 'users', 'contractor_id');

      case 'empty_marketplace':
        return this
          .addUsers(2)
          .addJobs(0)
          .addBids(0)
          .addMessages(0);

      case 'high_activity':
        return this
          .addUsers(50)
          .addJobs(25)
          .addBids(100)
          .addMessages(200);

      case 'active_bidding':
        return this
          .addUsers(15)
          .addJobs(8)
          .addBids(40)
          .addMessages(30);

      case 'completed_jobs':
        return this
          .addUsers(10)
          .addJobs(12)
          .addBids(20)
          .addMessages(50);

      case 'messaging_active':
        return this
          .addUsers(8)
          .addJobs(5)
          .addBids(10)
          .addMessages(75);

      default:
        return this;
    }
  }

  build(): Record<string, any[]> {
    const result: Record<string, any[]> = {};

    // Apply relationships
    this.relationships.forEach((relations, entityType) => {
      relations.forEach(relation => {
        const fromEntities = this.entities.get(relation.from);
        const toEntities = this.entities.get(relation.to);

        if (fromEntities && toEntities) {
          fromEntities.forEach((entity: any) => {
            if (toEntities.length > 0) {
              const randomTarget = toEntities[Math.floor(Math.random() * toEntities.length)];
              entity[relation.field] = randomTarget.id;
            }
          });
        }
      });
    });

    // Build final result
    this.entities.forEach((entities, type) => {
      result[type] = [...entities];
    });

    return result;
  }

  getUsers(): any[] {
    return this.entities.get('users') || [];
  }

  getJobs(): any[] {
    return this.entities.get('jobs') || [];
  }

  getBids(): any[] {
    return this.entities.get('bids') || [];
  }

  getMessages(): any[] {
    return this.entities.get('messages') || [];
  }

  // Static methods for test convenience
  static generateRealistic(): any {
    const builder = new TestDataBuilder();
    return builder
      .addUsers(8)
      .addJobs(5)
      .addBids(15)
      .addMessages(25)
      .build();
  }

  static createScenario(scenarioName: string): any {
    const builder = new TestDataBuilder();
    return builder.withScenario(scenarioName).build();
  }
}
