import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createMockUser, createMockProperty, cleanupTestData } from '../helpers/testUtils';
import { app } from '@/app';

/**
 * Integration Tests: Job API Endpoints
 * Tests the complete API flow for job creation, bid management, and payments
 */

describe('Job API Integration Tests', () => {
  let homeownerToken: string;
  let contractorToken: string;
  let homeownerId: string;
  let contractorId: string;
  let propertyId: string;
  let jobId: string;
  let bidId: string;

  beforeAll(async () => {
    // Create test users
    const homeowner = await createMockUser('homeowner');
    const contractor = await createMockUser('contractor');

    homeownerToken = homeowner.token;
    contractorToken = contractor.token;
    homeownerId = homeowner.id;
    contractorId = contractor.id;

    // Create a test property for the homeowner
    const property = await createMockProperty(homeownerId);
    propertyId = property.id;
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('POST /api/jobs', () => {
    it('should create a new job with valid data', async () => {
      const jobData = {
        title: 'Fix leaking bathroom tap',
        description: 'The bathroom tap has been leaking for a week. Water is dripping constantly and needs urgent repair.',
        category: 'plumbing',
        budget: 150,
        location: '123 Test Street, London',
        property_id: propertyId,
        urgency: 'high',
        requiredSkills: ['plumbing', 'tap-repair'],
      };

      const response = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${homeownerToken}`)
        .set('X-CSRF-Token', 'test-csrf-token')
        .send(jobData)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        title: jobData.title,
        description: jobData.description,
        category: jobData.category,
        budget: jobData.budget,
        status: 'posted',
        homeowner_id: homeownerId,
      });

      jobId = response.body.id;
    });

    it('should reject job creation without authentication', async () => {
      const jobData = {
        title: 'Unauthorized job',
        description: 'This should fail',
      };

      await request(app)
        .post('/api/jobs')
        .send(jobData)
        .expect(401);
    });

    it('should validate required fields', async () => {
      const invalidJob = {
        // Missing required title
        description: 'Job without title',
      };

      const response = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${homeownerToken}`)
        .set('X-CSRF-Token', 'test-csrf-token')
        .send(invalidJob)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          field: 'title',
          message: expect.any(String),
        })
      );
    });

    it('should sanitize input data', async () => {
      const jobWithScript = {
        title: 'Test Job<script>alert("XSS")</script>',
        description: 'Safe description with <b>HTML</b>',
        category: 'plumbing',
        budget: 100,
        property_id: propertyId,
      };

      const response = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${homeownerToken}`)
        .set('X-CSRF-Token', 'test-csrf-token')
        .send(jobWithScript)
        .expect(201);

      // Script tags should be removed
      expect(response.body.title).not.toContain('<script>');
      expect(response.body.description).not.toContain('<b>');
    });

    it('should enforce rate limiting', async () => {
      // Create multiple jobs quickly
      const promises = Array(10).fill(null).map(() =>
        request(app)
          .post('/api/jobs')
          .set('Authorization', `Bearer ${homeownerToken}`)
          .set('X-CSRF-Token', 'test-csrf-token')
          .send({
            title: 'Rate limit test',
            description: 'Testing rate limits',
            category: 'plumbing',
            budget: 100,
            property_id: propertyId,
          })
      );

      const responses = await Promise.all(promises);
      const rateLimited = responses.some(r => r.status === 429);

      expect(rateLimited).toBe(true);
    });
  });

  describe('GET /api/jobs/:id', () => {
    it('should retrieve job details', async () => {
      const response = await request(app)
        .get(`/api/jobs/${jobId}`)
        .set('Authorization', `Bearer ${homeownerToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: jobId,
        title: expect.any(String),
        status: 'posted',
        homeowner_id: homeownerId,
      });
    });

    it('should include related data', async () => {
      const response = await request(app)
        .get(`/api/jobs/${jobId}`)
        .set('Authorization', `Bearer ${homeownerToken}`)
        .expect(200);

      // Should include property info
      expect(response.body).toHaveProperty('property');
      expect(response.body.property).toMatchObject({
        id: propertyId,
        property_name: expect.any(String),
      });

      // Should include bid count
      expect(response.body).toHaveProperty('bidCount');
      expect(typeof response.body.bidCount).toBe('number');
    });

    it('should return 404 for non-existent job', async () => {
      await request(app)
        .get('/api/jobs/non-existent-id')
        .set('Authorization', `Bearer ${homeownerToken}`)
        .expect(404);
    });
  });

  describe('POST /api/jobs/:id/bids', () => {
    it('should allow contractors to submit bids', async () => {
      const bidData = {
        amount: 120,
        description: 'I can fix this tap today. I have 10 years of plumbing experience.',
        estimated_hours: 2,
      };

      const response = await request(app)
        .post(`/api/jobs/${jobId}/bids`)
        .set('Authorization', `Bearer ${contractorToken}`)
        .send(bidData)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        job_id: jobId,
        contractor_id: contractorId,
        amount: bidData.amount,
        status: 'pending',
      });

      bidId = response.body.id;
    });

    it('should prevent homeowners from bidding on their own jobs', async () => {
      const bidData = {
        amount: 100,
        description: 'Self bid',
      };

      await request(app)
        .post(`/api/jobs/${jobId}/bids`)
        .set('Authorization', `Bearer ${homeownerToken}`)
        .send(bidData)
        .expect(403);
    });

    it('should prevent duplicate bids from same contractor', async () => {
      const bidData = {
        amount: 130,
        description: 'Second bid attempt',
      };

      await request(app)
        .post(`/api/jobs/${jobId}/bids`)
        .set('Authorization', `Bearer ${contractorToken}`)
        .send(bidData)
        .expect(409); // Conflict
    });
  });

  describe('GET /api/jobs/:id/bids', () => {
    it('should return all bids for a job', async () => {
      const response = await request(app)
        .get(`/api/jobs/${jobId}/bids`)
        .set('Authorization', `Bearer ${homeownerToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toMatchObject({
        id: expect.any(String),
        amount: expect.any(Number),
        contractor: expect.objectContaining({
          id: expect.any(String),
          first_name: expect.any(String),
        }),
      });
    });

    it('should include contractor details', async () => {
      const response = await request(app)
        .get(`/api/jobs/${jobId}/bids`)
        .set('Authorization', `Bearer ${homeownerToken}`)
        .expect(200);

      const bid = response.body[0];
      expect(bid.contractor).toMatchObject({
        id: expect.any(String),
        first_name: expect.any(String),
        last_name: expect.any(String),
        company_name: expect.any(String),
        rating: expect.any(Number),
      });
    });
  });

  describe('POST /api/jobs/:jobId/bids/:bidId/accept', () => {
    it('should allow homeowner to accept a bid', async () => {
      const response = await request(app)
        .post(`/api/jobs/${jobId}/bids/${bidId}/accept`)
        .set('Authorization', `Bearer ${homeownerToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        bid: {
          id: bidId,
          status: 'accepted',
        },
        job: {
          id: jobId,
          status: 'assigned',
          contractor_id: contractorId,
        },
      });
    });

    it('should reject other bids when one is accepted', async () => {
      // Create another bid
      const contractor2 = await createMockUser('contractor');
      const bid2Response = await request(app)
        .post(`/api/jobs/${jobId}/bids`)
        .set('Authorization', `Bearer ${contractor2.token}`)
        .send({ amount: 140, description: 'Another bid' });

      const bid2Id = bid2Response.body.id;

      // Accept first bid
      await request(app)
        .post(`/api/jobs/${jobId}/bids/${bidId}/accept`)
        .set('Authorization', `Bearer ${homeownerToken}`)
        .expect(200);

      // Check second bid is rejected
      const response = await request(app)
        .get(`/api/jobs/${jobId}/bids/${bid2Id}`)
        .set('Authorization', `Bearer ${homeownerToken}`)
        .expect(200);

      expect(response.body.status).toBe('rejected');
    });

    it('should prevent contractors from accepting bids', async () => {
      await request(app)
        .post(`/api/jobs/${jobId}/bids/${bidId}/accept`)
        .set('Authorization', `Bearer ${contractorToken}`)
        .expect(403);
    });
  });

  describe('POST /api/jobs/:jobId/bids/:bidId/reject', () => {
    it('should allow homeowner to reject a bid', async () => {
      // Create a new job and bid for this test
      const newJobResponse = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${homeownerToken}`)
        .set('X-CSRF-Token', 'test-csrf-token')
        .send({
          title: 'Another repair',
          description: 'Test job for bid rejection',
          category: 'electrical',
          budget: 200,
          property_id: propertyId,
        });

      const newJobId = newJobResponse.body.id;

      const newBidResponse = await request(app)
        .post(`/api/jobs/${newJobId}/bids`)
        .set('Authorization', `Bearer ${contractorToken}`)
        .send({
          amount: 180,
          description: 'I can do this',
        });

      const newBidId = newBidResponse.body.id;

      // Reject the bid
      const response = await request(app)
        .post(`/api/jobs/${newJobId}/bids/${newBidId}/reject`)
        .set('Authorization', `Bearer ${homeownerToken}`)
        .expect(200);

      expect(response.body.bid.status).toBe('rejected');
    });
  });

  describe('Payment API', () => {
    it('should create payment intent', async () => {
      const response = await request(app)
        .post(`/api/jobs/${jobId}/payment/intent`)
        .set('Authorization', `Bearer ${homeownerToken}`)
        .send({ amount: 150 })
        .expect(200);

      expect(response.body).toHaveProperty('clientSecret');
      expect(response.body).toHaveProperty('paymentIntentId');
    });

    it('should create escrow transaction after payment', async () => {
      const response = await request(app)
        .post(`/api/jobs/${jobId}/payment/escrow`)
        .set('Authorization', `Bearer ${homeownerToken}`)
        .send({
          paymentIntentId: 'pi_test_123',
          amount: 150,
        })
        .expect(201);

      expect(response.body).toMatchObject({
        job_id: jobId,
        amount: 150,
        status: 'held',
        payer_id: homeownerId,
        payee_id: contractorId,
      });
    });

    it('should prevent payment for unassigned jobs', async () => {
      // Create job without contractor
      const unassignedJobResponse = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${homeownerToken}`)
        .set('X-CSRF-Token', 'test-csrf-token')
        .send({
          title: 'Unassigned job',
          description: 'No contractor yet',
          category: 'plumbing',
          budget: 100,
          property_id: propertyId,
        });

      const unassignedJobId = unassignedJobResponse.body.id;

      await request(app)
        .post(`/api/jobs/${unassignedJobId}/payment/intent`)
        .set('Authorization', `Bearer ${homeownerToken}`)
        .send({ amount: 100 })
        .expect(400);
    });
  });

  describe('Job Completion', () => {
    it('should mark job as complete', async () => {
      const response = await request(app)
        .post(`/api/jobs/${jobId}/complete`)
        .set('Authorization', `Bearer ${contractorToken}`)
        .expect(200);

      expect(response.body.status).toBe('completed');
    });

    it('should trigger escrow release on completion approval', async () => {
      // Homeowner approves completion
      const response = await request(app)
        .post(`/api/jobs/${jobId}/approve-completion`)
        .set('Authorization', `Bearer ${homeownerToken}`)
        .expect(200);

      expect(response.body.escrow_status).toBe('released');
    });
  });
});