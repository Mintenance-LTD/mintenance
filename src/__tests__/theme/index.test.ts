import { 
  theme, 
  getStatusColor, 
  getPriorityColor, 
  getCategoryColor, 
  getColor,
  getSpacing,
  getFontSize,
  getShadow
} from '../../theme';

describe('Theme System', () => {
  describe('theme object', () => {
    it('has all required color properties', () => {
      expect(theme.colors.primary).toBe('#0F172A');
      expect(theme.colors.secondary).toBe('#10B981');
      expect(theme.colors.success).toBe('#34C759');
      expect(theme.colors.error).toBe('#FF3B30');
      expect(theme.colors.warning).toBe('#FF9500');
      expect(theme.colors.info).toBe('#007AFF');
    });

    it('has surface and background colors', () => {
      expect(theme.colors.surface).toBe('#FFFFFF');
      expect(theme.colors.background).toBe('#FFFFFF');
      expect(theme.colors.surfaceSecondary).toBe('#F8FAFC');
    });

    it('has text color hierarchy', () => {
      expect(theme.colors.textPrimary).toBe('#1F2937');
      expect(theme.colors.textSecondary).toBe('#4B5563');
      expect(theme.colors.textTertiary).toBe('#6B7280');
    });

    it('has consistent typography scale', () => {
      expect(theme.typography.fontSize.xs).toBe(10);
      expect(theme.typography.fontSize.sm).toBe(12);
      expect(theme.typography.fontSize.base).toBe(14);
      expect(theme.typography.fontSize.lg).toBe(16);
      expect(theme.typography.fontSize.xl).toBe(18);
      expect(theme.typography.fontSize['2xl']).toBe(20);
      expect(theme.typography.fontSize['3xl']).toBe(24);
    });

    it('has font weight scale', () => {
      expect(theme.typography.fontWeight.regular).toBe('400');
      expect(theme.typography.fontWeight.medium).toBe('500');
      expect(theme.typography.fontWeight.semibold).toBe('600');
      expect(theme.typography.fontWeight.bold).toBe('700');
    });

    it('has spacing scale', () => {
      expect(theme.spacing[1]).toBe(4);
      expect(theme.spacing[2]).toBe(8);
      expect(theme.spacing[3]).toBe(12);
      expect(theme.spacing[4]).toBe(16);
      expect(theme.spacing[5]).toBe(20);
      expect(theme.spacing[6]).toBe(24);
      expect(theme.spacing[8]).toBe(32);
    });

    it('has border radius scale', () => {
      expect(theme.borderRadius.sm).toBe(4);
      expect(theme.borderRadius.base).toBe(8);
      expect(theme.borderRadius.lg).toBe(12);
      expect(theme.borderRadius.xl).toBe(16);
      expect(theme.borderRadius['2xl']).toBe(24);
      expect(theme.borderRadius.full).toBe(9999);
    });

    it('has shadow definitions', () => {
      expect(theme.shadows.sm).toEqual({
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
      });

      expect(theme.shadows.base).toEqual({
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
      });

      expect(theme.shadows.lg).toEqual({
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 6.27,
        elevation: 8,
      });
    });
  });

  describe('getStatusColor', () => {
    it('returns correct colors for job statuses', () => {
      expect(getStatusColor('posted')).toBe('#007AFF');
      expect(getStatusColor('assigned')).toBe('#FF9500');
      expect(getStatusColor('in_progress')).toBe('#FF9500');
      expect(getStatusColor('completed')).toBe('#34C759');
    });

    it('returns default color for unknown status', () => {
      expect(getStatusColor('unknown_status' as any)).toBe('#4B5563');
    });
  });

  describe('getPriorityColor', () => {
    it('returns correct colors for job priorities', () => {
      expect(getPriorityColor('low')).toBe('#10B981');
      expect(getPriorityColor('medium')).toBe('#F59E0B');
      expect(getPriorityColor('high')).toBe('#EF4444');
    });

    it('returns default color for unknown priority', () => {
      expect(getPriorityColor('unknown_priority' as any)).toBe('#4B5563');
    });
  });

  describe('getColor', () => {
    it('retrieves nested color values by path', () => {
      expect(getColor('primary')).toBe('#0F172A');
      expect(getColor('success')).toBe('#34C759');
      expect(getColor('textPrimary')).toBe('#1F2937');
    });

    it('returns undefined for invalid color paths', () => {
      expect(getColor('nonexistent')).toBeUndefined();
      expect(getColor('invalid.path')).toBeUndefined();
    });
  });

  describe('getSpacing', () => {
    it('retrieves spacing values', () => {
      expect(getSpacing(4)).toBe(16);
      expect(getSpacing(8)).toBe(32);
      expect(getSpacing(1)).toBe(4);
    });
  });

  describe('getFontSize', () => {
    it('retrieves font size values', () => {
      expect(getFontSize('base')).toBe(theme.typography.fontSize.base);
      expect(getFontSize('lg')).toBe(theme.typography.fontSize.lg);
      expect(getFontSize('xl')).toBe(theme.typography.fontSize.xl);
    });
  });

  describe('getShadow', () => {
    it('retrieves shadow values', () => {
      expect(getShadow('sm')).toEqual(theme.shadows.sm);
      expect(getShadow('base')).toEqual(theme.shadows.base);
    });
  });

  describe('getCategoryColor', () => {
    it('returns correct colors for categories', () => {
      expect(getCategoryColor('plumbing')).toBe('#3B82F6');
      expect(getCategoryColor('electrical')).toBe('#F59E0B');
      expect(getCategoryColor('hvac')).toBe('#10B981');
    });

    it('returns default color for unknown category', () => {
      expect(getCategoryColor('unknown')).toBe('#4B5563');
    });

    it('handles case insensitive categories', () => {
      expect(getCategoryColor('PLUMBING')).toBe('#3B82F6');
      expect(getCategoryColor('ELECTRICAL')).toBe('#F59E0B');
    });

    it('handles spaced categories by removing spaces', () => {
      expect(getCategoryColor('electrical work')).toBe('#3C3C43'); // becomes 'electricalwork' - no match, returns default
      expect(getCategoryColor('electrical')).toBe('#FF9500'); // direct match
    });
  });

  describe('component variants', () => {
    it('has button variants', () => {
      expect(theme.components.button.primary).toEqual({
        backgroundColor: '#0F172A',
        color: '#FFFFFF',
        borderColor: '#0F172A',
      });

      expect(theme.components.button.secondary).toEqual({
        backgroundColor: 'transparent',
        color: '#0F172A',
        borderColor: '#0F172A',
      });
    });
  });

  describe('accessibility support', () => {
    it('has high contrast colors for accessibility', () => {
      // Ensure text colors have sufficient contrast
      expect(theme.colors.textPrimary).toBe('#1F2937'); // Dark text
      expect(theme.colors.surface).toBe('#FFFFFF'); // Light background
      
      // Error states should be distinguishable
      expect(theme.colors.error).toBe('#FF3B30');
      expect(theme.colors.success).toBe('#34C759');
    });
  });

  describe('consistency checks', () => {
    it('has consistent color usage', () => {
      // Primary color should be used consistently
      expect(theme.components.button.primary.backgroundColor).toBe('#0F172A');
      expect(theme.components.button.secondary.borderColor).toBe('#0F172A');
    });
  });
});
