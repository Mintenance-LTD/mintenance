/**
 * Continuum Memory Persistence
 *
 * Database operations for memory level state and update history.
 */

import { logger } from '@mintenance/shared';
import { serverSupabase } from '../../../../api/supabaseServer';
import type { MemoryLevel, MemoryParameters } from '../types';

/**
 * Record shape returned from continuum_memory_states for initialization
 */
interface ExistingMemoryState {
  memory_level: number;
  parameters_jsonb: MemoryParameters;
  last_update_step: number | null;
  last_updated: string;
  update_count: number | null;
}

/**
 * Load existing memory states for an agent from the database
 */
export async function loadExistingMemoryStates(
  agentName: string
): Promise<ExistingMemoryState[] | null> {
  const { data: existingStates, error } = await serverSupabase
    .from('continuum_memory_states')
    .select('*')
    .eq('agent_name', agentName)
    .order('memory_level', { ascending: true });

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows returned, which is fine for first initialization
    logger.error('Failed to load existing memory states', {
      service: 'ContinuumMemorySystem',
      agentName,
      error: error.message,
    });
  }

  return existingStates as ExistingMemoryState[] | null;
}

/**
 * Save memory level to database
 */
export async function saveMemoryLevel(
  agentName: string,
  level: MemoryLevel
): Promise<void> {
  try {
    const { error } = await serverSupabase
      .from('continuum_memory_states')
      .upsert(
        {
          agent_name: agentName,
          memory_level: level.level,
          parameters_jsonb: level.parameters,
          chunk_size: level.chunkSize,
          frequency: level.frequency,
          last_update_step: level.lastUpdateStep,
          last_updated: level.lastUpdateTime.toISOString(),
          update_count: level.updateCount,
        },
        {
          onConflict: 'agent_name,memory_level',
        }
      );

    if (error) {
      logger.error('Failed to save memory level', {
        service: 'ContinuumMemorySystem',
        error: error.message,
        level: level.level,
      });
    }
  } catch (error) {
    logger.error('Error saving memory level', error, {
      service: 'ContinuumMemorySystem',
      level: level.level,
    });
  }
}

/**
 * Log update history entry for a memory level
 */
export async function logUpdateHistory(
  agentName: string,
  level: MemoryLevel,
  errorReduction: number,
  currentStep: number
): Promise<void> {
  try {
    // Get memory state ID
    const { data: state } = await serverSupabase
      .from('continuum_memory_states')
      .select('id')
      .eq('agent_name', agentName)
      .eq('memory_level', level.level)
      .single();

    if (state) {
      await serverSupabase.from('memory_update_history').insert({
        memory_state_id: state.id,
        update_count: level.updateCount,
        last_update_time: level.lastUpdateTime.toISOString(),
        update_frequency: level.frequency,
        error_reduction: errorReduction,
        step: currentStep,
      });
    }
  } catch (error) {
    logger.error('Failed to log update history', error, {
      service: 'ContinuumMemorySystem',
    });
  }
}
