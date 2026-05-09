import type { Ionicons } from '@expo/vector-icons';
import type { SearchResult } from '../../../services/AISearchService';
import { theme } from '../../../theme';

/**
 * Per-result-type icon + colour palette for AISearchScreen result rows.
 * Extracted 2026-05-09 (AUDIT_PUNCH_LIST P2 #44e).
 */

interface TypeConfig {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
}

const DEFAULT_TYPE_CONFIG: TypeConfig = {
  icon: 'search-outline',
  color: theme.colors.textSecondary,
  bg: theme.colors.backgroundSecondary,
};

const RESULT_TYPE_CONFIG: Record<string, TypeConfig> = {
  job: { icon: 'briefcase-outline', color: '#3B82F6', bg: '#DBEAFE' },
  contractor: {
    icon: 'person-outline',
    color: theme.colors.primary,
    bg: theme.colors.primaryLight,
  },
  service: { icon: 'construct-outline', color: '#8B5CF6', bg: '#EDE9FE' },
};

export function getTypeConfig(type: SearchResult['type']): TypeConfig {
  return RESULT_TYPE_CONFIG[type] ?? DEFAULT_TYPE_CONFIG;
}
