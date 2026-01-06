// Main types export file - using shared types from @mintenance/types
// This file provides backward compatibility during migration

export * from '@mintenance/types';
export * from './compat';

// Re-export database types if they exist
export * from './database';
