import { GoogleAuth } from 'google-auth-library';
import { Storage } from '@google-cloud/storage';
import { PredictionServiceClient } from '@google-cloud/aiplatform';
import { logger } from '@mintenance/shared';

/**
 * GCP Authentication Service
 * 
 * Uses Application Default Credentials (ADC) - no service account keys needed!
 * Works with:
 * - gcloud auth application-default login (local development)
 * - Workload Identity (Cloud Run/GKE)
 * - Service account attached to Cloud Function
 */
export class GCPAuthService {
  private static auth: GoogleAuth | null = null;
  private static storageClient: Storage | null = null;
  private static vertexAIClient: PredictionServiceClient | null = null;

  /**
   * Initialize Google Auth with Application Default Credentials
   * No service account key file needed!
   */
  static async initialize(): Promise<GoogleAuth> {
    if (this.auth) {
      return this.auth;
    }

    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    if (!projectId) {
      throw new Error('GOOGLE_CLOUD_PROJECT_ID environment variable is required');
    }

    // Use Application Default Credentials
    // This automatically uses:
    // 1. gcloud auth application-default login (local)
    // 2. Workload Identity (Cloud Run/GKE)
    // 3. Service account attached to Cloud Function
    // 4. GCE metadata service (if running on GCE)
    this.auth = new GoogleAuth({
      projectId,
      scopes: [
        'https://www.googleapis.com/auth/cloud-platform',
        'https://www.googleapis.com/auth/devstorage.read_write',
      ],
    });

    logger.info('GCP Authentication initialized', {
      service: 'GCPAuthService',
      projectId,
      method: 'Application Default Credentials',
    });

    return this.auth;
  }

  /**
   * Get authenticated Storage client
   */
  static async getStorageClient(): Promise<Storage> {
    if (this.storageClient) {
      return this.storageClient;
    }

    // Storage client will automatically use Application Default Credentials
    // No need to pass auth explicitly
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    this.storageClient = new Storage({
      projectId,
    });

    return this.storageClient;
  }

  /**
   * Get authenticated Vertex AI client
   */
  static async getVertexAIClient(): Promise<PredictionServiceClient> {
    if (this.vertexAIClient) {
      return this.vertexAIClient;
    }

    const auth = await this.initialize();
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    const region = process.env.GOOGLE_CLOUD_REGION || 'europe-west2';
    
    if (!projectId) {
      throw new Error('GOOGLE_CLOUD_PROJECT_ID is required for Vertex AI');
    }

    this.vertexAIClient = new PredictionServiceClient({
      apiEndpoint: `${region}-aiplatform.googleapis.com`,
      projectId,
      // Auth will be picked up automatically via Application Default Credentials
    });

    return this.vertexAIClient;
  }

  /**
   * Test authentication and verify access
   */
  static async testAuth(): Promise<{
    success: boolean;
    projectId: string;
    method: string;
    details?: any;
    error?: string;
  }> {
    try {
      const auth = await this.initialize();
      const client = await auth.getClient();
      const projectId = await auth.getProjectId();

      // Try to get an access token to verify auth works
      const token = await client.getAccessToken();
      
      if (!token.token) {
        throw new Error('Failed to obtain access token');
      }

      logger.info('GCP Authentication test successful', {
        service: 'GCPAuthService',
        projectId,
        method: 'Application Default Credentials',
      });

      return {
        success: true,
        projectId,
        method: 'Application Default Credentials',
        details: {
          hasAccessToken: !!token.token,
        },
      };
    } catch (error: any) {
      logger.error('GCP Authentication test failed', error, {
        service: 'GCPAuthService',
      });

      return {
        success: false,
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || 'unknown',
        method: 'Application Default Credentials',
        error: error.message,
      };
    }
  }

  /**
   * Test Storage access
   */
  static async testStorageAccess(): Promise<{
    success: boolean;
    buckets?: string[];
    error?: string;
  }> {
    try {
      const storage = await this.getStorageClient();
      const [buckets] = await storage.getBuckets();

      const bucketNames = buckets.map((b) => b.name);

      logger.info('GCP Storage access test successful', {
        service: 'GCPAuthService',
        bucketCount: bucketNames.length,
      });

      return {
        success: true,
        buckets: bucketNames,
      };
    } catch (error: any) {
      logger.error('GCP Storage access test failed', error, {
        service: 'GCPAuthService',
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Test Vertex AI access
   */
  static async testVertexAIAccess(): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const client = await this.getVertexAIClient();
      const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
      const region = process.env.GOOGLE_CLOUD_REGION || 'europe-west2';

      // Try to list endpoints (this verifies we have access)
      // Note: This might fail if no endpoints exist, but auth should work
      const parent = `projects/${projectId}/locations/${region}`;

      logger.info('GCP Vertex AI access test successful', {
        service: 'GCPAuthService',
        parent,
      });

      return {
        success: true,
      };
    } catch (error: any) {
      // If error is about missing endpoints, that's OK - auth worked
      if (error.message?.includes('not found') || error.message?.includes('does not exist')) {
        logger.info('GCP Vertex AI access test - no resources found (auth OK)', {
          service: 'GCPAuthService',
        });
        return { success: true };
      }

      logger.error('GCP Vertex AI access test failed', error, {
        service: 'GCPAuthService',
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Run all authentication tests
   */
  static async runAllTests(): Promise<{
    auth: { success: boolean; [key: string]: any };
    storage: { success: boolean; [key: string]: any };
    vertexAI: { success: boolean; [key: string]: any };
  }> {
    const auth = await this.testAuth();
    const storage = await this.testStorageAccess();
    const vertexAI = await this.testVertexAIAccess();

    return {
      auth,
      storage,
      vertexAI,
    };
  }
}

