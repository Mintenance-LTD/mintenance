/**
 * Production Readiness Orchestrator — facade
 * All implementation lives in utils/production-readiness/
 */

import { ProductionReadinessOrchestrator } from './production-readiness/ProductionReadinessOrchestrator';

export type {
  ProductionReadinessStatus,
  ComponentStatus,
  DeploymentReport,
} from './production-readiness/types';
export { ProductionReadinessOrchestrator } from './production-readiness/ProductionReadinessOrchestrator';

export const productionReadinessOrchestrator =
  new ProductionReadinessOrchestrator();
