/**
 * Service for dispute process documentation
 */
export class DisputeDocumentationService {
  /**
   * Get dispute process steps
   */
  static getProcessSteps(): Array<{
    step: number;
    title: string;
    description: string;
    estimatedTime: string;
  }> {
    return [
      {
        step: 1,
        title: 'Submit Dispute',
        description: 'Provide details about the issue and upload evidence (photos, documents)',
        estimatedTime: '5 minutes',
      },
      {
        step: 2,
        title: 'Under Review',
        description: 'Our team reviews your dispute and evidence. We may contact you for additional information.',
        estimatedTime: '1-3 days',
      },
      {
        step: 3,
        title: 'Mediation (if needed)',
        description: 'If both parties agree, we can schedule a mediation session to resolve the dispute.',
        estimatedTime: '3-7 days',
      },
      {
        step: 4,
        title: 'Resolution',
        description: 'We make a final decision and process any refunds or payouts accordingly.',
        estimatedTime: '7-14 days total',
      },
    ];
  }

  /**
   * Get dispute resolution times by priority
   */
  static getResolutionTimes(): Record<string, string> {
    return {
      low: '14 days',
      medium: '7 days',
      high: '3 days',
      critical: '24 hours',
    };
  }

  /**
   * Get required evidence types
   */
  static getRequiredEvidence(): string[] {
    return [
      'Photos of the issue',
      'Written description',
      'Communication records (if applicable)',
      'Receipts or invoices (if applicable)',
    ];
  }
}

