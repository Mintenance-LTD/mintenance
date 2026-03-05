/**
 * Production Readiness Orchestrator — facade
 * All implementation lives in utils/production-readiness/
 */

export type { ProductionReadinessStatus, ComponentStatus, DeploymentReport } from './production-readiness/types';
export { ProductionReadinessOrchestrator } from './production-readiness/ProductionReadinessOrchestrator';

import { ProductionReadinessOrchestrator } from './production-readiness/ProductionReadinessOrchestrator';

export const productionReadinessOrchestrator = new ProductionReadinessOrchestrator();
export default productionReadinessOrchestrator;
