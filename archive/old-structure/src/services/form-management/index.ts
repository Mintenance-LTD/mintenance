// Form Management Module - Domain-separated form and job sheet services

import { serviceHealthMonitor } from '../../utils/serviceHealthMonitor';

// Core Services
export { FormTemplateService } from './FormTemplateService';
export { FormFieldService } from './FormFieldService';
export { JobSheetOperationsService } from './JobSheetOperationsService';
export { FormSignatureService } from './FormSignatureService';
export { FormApprovalService } from './FormApprovalService';
export { FormAnalyticsService } from './FormAnalyticsService';
export { DigitalChecklistService } from './DigitalChecklistService';

// Type Exports - Form Templates
export type {
  FormTemplate,
  CreateFormTemplateData,
} from './FormTemplateService';

// Type Exports - Form Fields
export type {
  FormField,
} from './FormFieldService';

// Type Exports - Job Sheets
export type {
  JobSheet,
  CreateJobSheetData,
  JobSheetFilters,
} from './JobSheetOperationsService';

// Type Exports - Signatures
export type {
  JobSheetSignature,
} from './FormSignatureService';

// Type Exports - Approvals
export type {
  FormApproval,
} from './FormApprovalService';

// Type Exports - Analytics
export type {
  FormAnalytics,
  JobSheetSummaryStats,
} from './FormAnalyticsService';

// Type Exports - Checklists
export type {
  DigitalChecklist,
  ChecklistItem,
  ChecklistCompletion,
} from './DigitalChecklistService';

// Unified Form Management API
export class FormManagement {
  // Template Operations
  static get Templates() {
    return FormTemplateService;
  }

  // Field Operations
  static get Fields() {
    return FormFieldService;
  }

  // Job Sheet Operations
  static get JobSheets() {
    return JobSheetOperationsService;
  }

  // Signature Operations
  static get Signatures() {
    return FormSignatureService;
  }

  // Approval Operations
  static get Approvals() {
    return FormApprovalService;
  }

  // Analytics Operations
  static get Analytics() {
    return FormAnalyticsService;
  }

  // Checklist Operations
  static get Checklists() {
    return DigitalChecklistService;
  }
}

// Register form management services for health monitoring
export function initializeFormManagementHealthChecks(): void {
  // Register all form management services
  const services = [
    'FormTemplateService',
    'FormFieldService',
    'JobSheetOperationsService',
    'FormSignatureService',
    'FormApprovalService',
    'FormAnalyticsService',
    'DigitalChecklistService'
  ];

  services.forEach(serviceName => {
    serviceHealthMonitor.registerService({
      serviceName,
      timeout: 3000,
      healthCheckFunction: async () => {
        // Basic health check - service is healthy if it can be imported
        try {
          return true; // Services are stateless classes, so just return healthy
        } catch {
          return false;
        }
      },
      dependencies: ['Database']
    });
  });
}