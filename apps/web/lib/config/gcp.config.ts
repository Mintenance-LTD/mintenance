/**
 * GCP Configuration
 * 
 * Configuration for Google Cloud Platform services used for ML training
 * Uses getters to read from process.env dynamically (supports dotenv loading)
 */
export const gcpConfig = {
  get projectId(): string {
    return process.env.GOOGLE_CLOUD_PROJECT_ID || '';
  },
  
  get region(): string {
    return process.env.GOOGLE_CLOUD_REGION || 'europe-west2';
  },

  get storage() {
    return {
      get trainingDataBucket(): string {
        return process.env.GCP_TRAINING_DATA_BUCKET || 'mintenance-training-data';
      },
      get modelArtifactsBucket(): string {
        return process.env.GCP_MODEL_ARTIFACTS_BUCKET || 'mintenance-model-artifacts';
      },
      get enableVersioning(): boolean {
        return process.env.GCP_ENABLE_VERSIONING === 'true';
      },
    };
  },

  aiPlatform: {
    trainingJobPrefix: 'mintenance-vlm-training',
    modelDisplayName: 'building-surveyor-vlm',
  },

  get compute() {
    return {
      get machineType(): string {
        return process.env.GCP_MACHINE_TYPE || 'n1-standard-8';
      },
      get acceleratorType(): string {
        return process.env.GCP_ACCELERATOR_TYPE || 'nvidia-tesla-v100';
      },
      get acceleratorCount(): number {
        return parseInt(process.env.GCP_ACCELERATOR_COUNT || '1', 10);
      },
    };
  },

  /**
   * Validate configuration
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.projectId) {
      errors.push('GOOGLE_CLOUD_PROJECT_ID is required');
    }

    if (!this.storage.trainingDataBucket) {
      errors.push('GCP_TRAINING_DATA_BUCKET is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },
};

