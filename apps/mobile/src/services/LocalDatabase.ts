/**
 * LocalDatabase — facade
 * All implementation lives in services/local-db/
 */

export type { LocalDatabaseConfig, SyncMetadata } from './local-db/types';
export { LocalDatabaseService, LocalDatabase } from './local-db/LocalDatabaseService';
