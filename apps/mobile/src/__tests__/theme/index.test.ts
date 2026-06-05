import {
  theme,
  getStatusColor,
  getPriorityColor,
  getCategoryColor,
  getColor,
  getSpacing,
  getFontSize,
  getShadow,
} from '../../theme';

describe('Theme System', () => {
  describe('theme object', () => {
    it('has all required color properties', () => {
      expect(theme.colors.primary).toBe('#0D9488');
      expect(theme.colors.secondary).toBe('#10B981');
      expect(theme.colors.success).toBe('#10B981');
      expect(theme.colors.error).toBe('#EF4444');
      expect(theme.colors.warning).toBe('#F59E0B');
      expect(theme.colors.info).toBe('#3B82F6');
    });

    it('has surface and background colors', () => {
      expect(theme.colors.surface).toBe('#FFFFFF');
      expect(theme.colors.background).toBe('#FFFFFF');
      expect(theme.colors.surfaceSecondary).toBe('#F7F7F7');
    });

    it('has text color hierarchy', () => {
      expect(theme.colors.textPrimary).toBe('#222222');
      expect(theme.colors.textSecondary).toBe('#717171');
      expect(theme.colors.textTertiary).toBe('#B0B0B0');
    });

    it('has consistent typography scale', () => {
      // Test that normalized font sizes are numbers and in correct order
      expect(typeof theme.typography.fontSize.xs).toBe('number');
      expect(typeof theme.typography.fontSize.sm).toBe('number');
      expect(typeof theme.typography.fontSize.base).toBe('number');
      expect(typeof theme.typography.fontSize.lg).toBe('number');
      expect(typeof theme.typography.fontSize.xl).toBe('number');

      // Test font size progression (each size should be larger than previous)
      expect(theme.typography.fontSize.xs).toBeLessThan(
        theme.typography.fontSize.sm
      );
      expect(theme.typography.fontSize.sm).toBeLessThan(
        theme.typography.fontSize.base
      );
      expect(theme.typography.fontSize.base).toBeLessThan(
        theme.typography.fontSize.lg
      );
      expect(theme.typography.fontSize.lg).toBeLessThan(
        theme.typography.fontSize.xl
      );

      // Test raw font sizes match expected static values
      expect(theme.typography.rawFontSize.xs).toBe(11);
      expect(theme.typography.rawFontSize.sm).toBe(13);
      expect(theme.typography.rawFontSize.base).toBe(15);
      expect(theme.typography.rawFontSize.lg).toBe(18);
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
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
      });

      expect(theme.shadows.base).toEqual({
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
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
      expect(getStatusColor('posted')).toBe('#3B82F6');
      expect(getStatusColor('assigned')).toBe('#F59E0B');
      expect(getStatusColor('in_progress')).toBe('#8B5CF6');
      expect(getStatusColor('completed')).toBe('#0D9488');
    });

    it('returns default color for unknown status', () => {
      expect(getStatusColor('unknown_status' as any)).toBe('#475569');
    });
  });

  describe('getPriorityColor', () => {
    it('returns correct colors for job priorities', () => {
      expect(getPriorityColor('low')).toBe('#10B981');
      expect(getPriorityColor('medium')).toBe('#F59E0B');
      expect(getPriorityColor('high')).toBe('#EF4444');
    });

    it('returns default color for unknown priority', () => {
      expect(getPriorityColor('unknown_priority' as any)).toBe('#475569');
    });
  });

  describe('getColor', () => {
    it('retrieves nested color values by path', () => {
      expect(getColor('primary')).toBe('#0F172A');
      expect(getColor('success')).toBe('#10B981');
      expect(getColor('textPrimary')).toBe('#0F172A');
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
      expect(getCategoryColor('plumbing')).toBe('#0EA5E9');
      expect(getCategoryColor('electrical')).toBe('#F59E0B');
      expect(getCategoryColor('hvac')).toBe('#10B981');
    });

    it('returns default color for unknown category', () => {
      expect(getCategoryColor('unknown')).toBe('#475569');
    });

    it('handles case insensitive categories', () => {
      expect(getCategoryColor('PLUMBING')).toBe('#0EA5E9');
      expect(getCategoryColor('ELECTRICAL')).toBe('#F59E0B');
    });

    it('handles spaced categories by removing spaces', () => {
      expect(getCategoryColor('electrical work')).toBe('#475569'); // becomes 'electricalwork' - no match, returns textSecondary
      expect(getCategoryColor('electrical')).toBe('#F59E0B'); // direct match
    });
  });

  describe('component variants', () => {
    it('has button variants', () => {
      expect(theme.components.button.primary).toEqual({
        backgroundColor: '#0D9488',
        color: '#FFFFFF',
        borderColor: '#0D9488',
      });

      expect(theme.components.button.secondary).toEqual({
        backgroundColor: 'transparent',
        color: '#222222',
        borderColor: '#DDDDDD',
      });
    });
  });

  describe('accessibility support', () => {
    it('has high contrast colors for accessibility', () => {
      // Ensure text colors have sufficient contrast
      expect(theme.colors.textPrimary).toBe('#222222'); // Dark text
      expect(theme.colors.surface).toBe('#FFFFFF'); // Light background

      // Error states should be distinguishable
      expect(theme.colors.error).toBe('#EF4444');
      expect(theme.colors.success).toBe('#10B981');
    });
  });

  describe('consistency checks', () => {
    it('has consistent color usage', () => {
      // Primary color should be used consistently
      expect(theme.components.button.primary.backgroundColor).toBe('#0D9488');
      expect(theme.components.button.secondary.borderColor).toBe('#DDDDDD');
    });
  });
});
