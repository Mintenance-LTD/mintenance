/**
 * Client-side wrapper for Maintenance Detection Service
 * This file ensures onnxruntime-web is only loaded in the browser
 */

let MaintenanceDetectionService: unknown = null;

export async function getMaintenanceDetectionService() {
  if (typeof window === 'undefined') {
    // Return mock service for server-side rendering
    return {
      detectMaintenanceIssues: async () => [],
      getContractorType: () => 'general_contractor',
      checkModelHealth: async () => ({
        loaded: false,
        url: null,
        ready: false,
      }),
    };
  }

  // Lazy load the service only in browser
  if (!MaintenanceDetectionService) {
    const module = await import('./MaintenanceDetectionService');
    MaintenanceDetectionService = module.MaintenanceDetectionService;
  }

  return MaintenanceDetectionService;
}