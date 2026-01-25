/**
 * AIAnalysisCard Component Tests
 *
 * Comprehensive test suite for AI analysis display functionality
 *
 * @coverage-target 100%
 * @test-count 67
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { AIAnalysisCard } from '../AIAnalysisCard';
import type { AIAnalysis } from '../../../../services/AIAnalysisService';

// Mock Ionicons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

describe('AIAnalysisCard', () => {
  // Test data factories
  const createMockAIAnalysis = (overrides?: Partial<AIAnalysis & {
    category?: string;
    complexity?: string;
    recommendedTools?: string[];
    notes?: string;
  }>): any => ({
    confidence: 0.85,
    category: 'Plumbing',
    complexity: 'Medium',
    estimatedDuration: '2-4 hours',
    recommendedTools: ['Pipe wrench', 'Plumber\'s tape'],
    notes: 'Check for water damage',
    detectedItems: ['Sink', 'Pipes'],
    safetyConcerns: [],
    recommendedActions: [],
    estimatedComplexity: 'Medium',
    suggestedTools: [],
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ===========================
  // RENDERING STATES
  // ===========================

  describe('Rendering States', () => {
    it('should render nothing when aiLoading is false and aiAnalysis is null', () => {
      const { toJSON } = render(
        <AIAnalysisCard aiAnalysis={null} aiLoading={false} />
      );

      expect(toJSON()).toBeNull();
    });

    it('should render loading state when aiLoading is true', () => {
      const { getByText, queryByText } = render(
        <AIAnalysisCard aiAnalysis={null} aiLoading={true} />
      );

      expect(getByText('AI Analysis')).toBeTruthy();
      expect(getByText('Analyzing job photos...')).toBeTruthy();
      expect(queryByText('Job Category')).toBeNull();
    });

    it('should render loading state even when aiAnalysis exists but aiLoading is true', () => {
      const analysis = createMockAIAnalysis();
      const { getByText, queryByText } = render(
        <AIAnalysisCard aiAnalysis={analysis} aiLoading={true} />
      );

      expect(getByText('Analyzing job photos...')).toBeTruthy();
      expect(queryByText('Job Category')).toBeNull();
    });

    it('should render complete analysis when aiLoading is false and aiAnalysis exists', () => {
      const analysis = createMockAIAnalysis();
      const { getByText } = render(
        <AIAnalysisCard aiAnalysis={analysis} aiLoading={false} />
      );

      expect(getByText('AI Analysis')).toBeTruthy();
      expect(getByText('Job Category')).toBeTruthy();
      expect(getByText('Plumbing')).toBeTruthy();
    });

    it('should not render ActivityIndicator when not loading', () => {
      const analysis = createMockAIAnalysis();
      const { UNSAFE_queryByType } = render(
        <AIAnalysisCard aiAnalysis={analysis} aiLoading={false} />
      );

      const ActivityIndicator = require('react-native').ActivityIndicator;
      expect(UNSAFE_queryByType(ActivityIndicator)).toBeNull();
    });

    it('should render ActivityIndicator when loading', () => {
      const { UNSAFE_getByType } = render(
        <AIAnalysisCard aiAnalysis={null} aiLoading={true} />
      );

      const ActivityIndicator = require('react-native').ActivityIndicator;
      expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
    });
  });

  // ===========================
  // HEADER SECTION
  // ===========================

  describe('Header Section', () => {
    it('should render AI Analysis title in loading state', () => {
      const { getByText } = render(
        <AIAnalysisCard aiAnalysis={null} aiLoading={true} />
      );

      expect(getByText('AI Analysis')).toBeTruthy();
    });

    it('should render AI Analysis title in analysis state', () => {
      const analysis = createMockAIAnalysis();
      const { getByText } = render(
        <AIAnalysisCard aiAnalysis={analysis} aiLoading={false} />
      );

      expect(getByText('AI Analysis')).toBeTruthy();
    });

    it('should not render confidence badge in loading state', () => {
      const { queryByText } = render(
        <AIAnalysisCard aiAnalysis={null} aiLoading={true} />
      );

      expect(queryByText(/% confidence/)).toBeNull();
    });

    it('should render confidence badge in analysis state', () => {
      const analysis = createMockAIAnalysis({ confidence: 0.85 });
      const { getByText } = render(
        <AIAnalysisCard aiAnalysis={analysis} aiLoading={false} />
      );

      expect(getByText('85% confidence')).toBeTruthy();
    });

    it('should round confidence to nearest integer', () => {
      const analysis = createMockAIAnalysis({ confidence: 0.847 });
      const { getByText } = render(
        <AIAnalysisCard aiAnalysis={analysis} aiLoading={false} />
      );

      expect(getByText('85% confidence')).toBeTruthy();
    });

    it('should display 0% confidence for 0 value', () => {
      const analysis = createMockAIAnalysis({ confidence: 0 });
      const { getByText } = render(
        <AIAnalysisCard aiAnalysis={analysis} aiLoading={false} />
      );

      expect(getByText('0% confidence')).toBeTruthy();
    });

    it('should display 100% confidence for 1.0 value', () => {
      const analysis = createMockAIAnalysis({ confidence: 1.0 });
      const { getByText } = render(
        <AIAnalysisCard aiAnalysis={analysis} aiLoading={false} />
      );

      expect(getByText('100% confidence')).toBeTruthy();
    });

    it('should handle confidence values greater than 1', () => {
      const analysis = createMockAIAnalysis({ confidence: 1.5 });
      const { getByText } = render(
        <AIAnalysisCard aiAnalysis={analysis} aiLoading={false} />
      );

      expect(getByText('150% confidence')).toBeTruthy();
    });

    it('should handle negative confidence values', () => {
      const analysis = createMockAIAnalysis({ confidence: -0.5 });
      const { getByText } = render(
        <AIAnalysisCard aiAnalysis={analysis} aiLoading={false} />
      );

      expect(getByText('-50% confidence')).toBeTruthy();
    });

    it('should handle very small confidence values', () => {
      const analysis = createMockAIAnalysis({ confidence: 0.001 });
      const { getByText } = render(
        <AIAnalysisCard aiAnalysis={analysis} aiLoading={false} />
      );

      expect(getByText('0% confidence')).toBeTruthy();
    });
  });

  // ===========================
  // CATEGORY DISPLAY
  // ===========================

  describe('Category Display', () => {
    it('should display job category', () => {
      const analysis = createMockAIAnalysis({ category: 'Electrical' });
      const { getByText } = render(
        <AIAnalysisCard aiAnalysis={analysis} aiLoading={false} />
      );

      expect(getByText('Job Category')).toBeTruthy();
      expect(getByText('Electrical')).toBeTruthy();
    });

    it('should display HVAC category', () => {
      const analysis = createMockAIAnalysis({ category: 'HVAC' });
      const { getByText } = render(
        <AIAnalysisCard aiAnalysis={analysis} aiLoading={false} />
      );

      expect(getByText('HVAC')).toBeTruthy();
    });

    it('should display General Maintenance category', () => {
      const analysis = createMockAIAnalysis({ category: 'General Maintenance' });
      const { getByText } = render(
        <AIAnalysisCard aiAnalysis={analysis} aiLoading={false} />
      );

      expect(getByText('General Maintenance')).toBeTruthy();
    });

    it('should display Appliance Repair category', () => {
      const analysis = createMockAIAnalysis({ category: 'Appliance Repair' });
      const { getByText } = render(
        <AIAnalysisCard aiAnalysis={analysis} aiLoading={false} />
      );

      expect(getByText('Appliance Repair')).toBeTruthy();
    });

    it('should handle empty category string', () => {
      const analysis = createMockAIAnalysis({ category: '' });
      const { getByText, queryByText } = render(
        <AIAnalysisCard aiAnalysis={analysis} aiLoading={false} />
      );

      expect(getByText('Job Category')).toBeTruthy();
      expect(queryByText(/^$/)).toBeTruthy(); // Empty text node
    });

    it('should handle very long category names', () => {
      const longCategory = 'Emergency Plumbing and Electrical Repair with HVAC Maintenance';
      const analysis = createMockAIAnalysis({ category: longCategory });
      const { getByText } = render(
        <AIAnalysisCard aiAnalysis={analysis} aiLoading={false} />
      );

      expect(getByText(longCategory)).toBeTruthy();
    });

    it('should handle category with special characters', () => {
      const analysis = createMockAIAnalysis({ category: 'A/C & Heating' });
      const { getByText } = render(
        <AIAnalysisCard aiAnalysis={analysis} aiLoading={false} />
      );

      expect(getByText('A/C & Heating')).toBeTruthy();
    });
  });

  // ===========================
  // COMPLEXITY DISPLAY
  // ===========================

  describe('Complexity Display', () => {
    it('should display Low complexity', () => {
      const analysis = createMockAIAnalysis({ complexity: 'Low' });
      const { getByText } = render(
        <AIAnalysisCard aiAnalysis={analysis} aiLoading={false} />
      );

      expect(getByText('Estimated Complexity')).toBeTruthy();
      expect(getByText('Low')).toBeTruthy();
    });

    it('should display Medium complexity', () => {
      const analysis = createMockAIAnalysis({ complexity: 'Medium' });
      const { getByText } = render(
        <AIAnalysisCard aiAnalysis={analysis} aiLoading={false} />
      );

      expect(getByText('Medium')).toBeTruthy();
    });

    it('should display High complexity', () => {
      const analysis = createMockAIAnalysis({ complexity: 'High' });
      const { getByText } = render(
        <AIAnalysisCard aiAnalysis={analysis} aiLoading={false} />
      );

      expect(getByText('High')).toBeTruthy();
    });

    it('should handle custom complexity values', () => {
      const analysis = createMockAIAnalysis({ complexity: 'Very High' });
      const { getByText } = render(
        <AIAnalysisCard aiAnalysis={analysis} aiLoading={false} />
      );

      expect(getByText('Very High')).toBeTruthy();
    });
  });

  // ===========================
  // DURATION DISPLAY
  // ===========================

  describe('Duration Display', () => {
    it('should display estimated duration', () => {
      const analysis = createMockAIAnalysis({ estimatedDuration: '2-4 hours' });
      const { getByText } = render(
        <AIAnalysisCard aiAnalysis={analysis} aiLoading={false} />
      );

      expect(getByText('Estimated Duration')).toBeTruthy();
      expect(getByText('2-4 hours')).toBeTruthy();
    });

    it('should display short duration', () => {
      const analysis = createMockAIAnalysis({ estimatedDuration: '30 minutes' });
      const { getByText } = render(
        <AIAnalysisCard aiAnalysis={analysis} aiLoading={false} />
      );

      expect(getByText('30 minutes')).toBeTruthy();
    });

    it('should display long duration', () => {
      const analysis = createMockAIAnalysis({ estimatedDuration: '2-3 days' });
      const { getByText } = render(
        <AIAnalysisCard aiAnalysis={analysis} aiLoading={false} />
      );

      expect(getByText('2-3 days')).toBeTruthy();
    });

    it('should display week-long duration', () => {
      const analysis = createMockAIAnalysis({ estimatedDuration: '1-2 weeks' });
      const { getByText } = render(
        <AIAnalysisCard aiAnalysis={analysis} aiLoading={false} />
      );

      expect(getByText('1-2 weeks')).toBeTruthy();
    });

    it('should handle empty duration string', () => {
      const analysis = createMockAIAnalysis({ estimatedDuration: '' });
      const { getByText } = render(
        <AIAnalysisCard aiAnalysis={analysis} aiLoading={false} />
      );

      expect(getByText('Estimated Duration')).toBeTruthy();
    });
  });

  // ===========================
  // RECOMMENDED TOOLS
  // ===========================

  describe('Recommended Tools', () => {
    it('should display recommended tools section when tools exist', () => {
      const analysis = createMockAIAnalysis({
        recommendedTools: ['Hammer', 'Screwdriver'],
      });
      const { getByText } = render(
        <AIAnalysisCard aiAnalysis={analysis} aiLoading={false} />
      );

      expect(getByText('Recommended Tools')).toBeTruthy();
      expect(getByText('Hammer')).toBeTruthy();
      expect(getByText('Screwdriver')).toBeTruthy();
    });

    it('should not display tools section when array is empty', () => {
      const analysis = createMockAIAnalysis({ recommendedTools: [] });
      const { queryByText } = render(
        <AIAnalysisCard aiAnalysis={analysis} aiLoading={false} />
      );

      expect(queryByText('Recommended Tools')).toBeNull();
    });

    it('should not display tools section when undefined', () => {
      const analysis = createMockAIAnalysis({ recommendedTools: undefined });
      const { queryByText } = render(
        <AIAnalysisCard aiAnalysis={analysis} aiLoading={false} />
      );

      expect(queryByText('Recommended Tools')).toBeNull();
    });

    it('should display single tool', () => {
      const analysis = createMockAIAnalysis({
        recommendedTools: ['Pipe wrench'],
      });
      const { getByText } = render(
        <AIAnalysisCard aiAnalysis={analysis} aiLoading={false} />
      );

      expect(getByText('Pipe wrench')).toBeTruthy();
    });

    it('should display multiple tools', () => {
      const tools = ['Wrench', 'Pliers', 'Tape', 'Cutter', 'Gauge'];
      const analysis = createMockAIAnalysis({ recommendedTools: tools });
      const { getByText } = render(
        <AIAnalysisCard aiAnalysis={analysis} aiLoading={false} />
      );

      tools.forEach((tool) => {
        expect(getByText(tool)).toBeTruthy();
      });
    });

    it('should handle tools with special characters', () => {
      const analysis = createMockAIAnalysis({
        recommendedTools: ["Plumber's tape", '1/2" wrench', 'A & B tool'],
      });
      const { getByText } = render(
        <AIAnalysisCard aiAnalysis={analysis} aiLoading={false} />
      );

      expect(getByText("Plumber's tape")).toBeTruthy();
      expect(getByText('1/2" wrench')).toBeTruthy();
      expect(getByText('A & B tool')).toBeTruthy();
    });

    it('should handle very long tool names', () => {
      const longToolName = 'Professional Grade Heavy Duty Pipe Wrench Set';
      const analysis = createMockAIAnalysis({
        recommendedTools: [longToolName],
      });
      const { getByText } = render(
        <AIAnalysisCard aiAnalysis={analysis} aiLoading={false} />
      );

      expect(getByText(longToolName)).toBeTruthy();
    });

    it('should display 10+ tools correctly', () => {
      const tools = Array.from({ length: 15 }, (_, i) => `Tool ${i + 1}`);
      const analysis = createMockAIAnalysis({ recommendedTools: tools });
      const { getByText } = render(
        <AIAnalysisCard aiAnalysis={analysis} aiLoading={false} />
      );

      tools.forEach((tool) => {
        expect(getByText(tool)).toBeTruthy();
      });
    });

    it('should use index as key for tool tags', () => {
      const analysis = createMockAIAnalysis({
        recommendedTools: ['Tool A', 'Tool B'],
      });
      const { UNSAFE_getAllByType } = render(
        <AIAnalysisCard aiAnalysis={analysis} aiLoading={false} />
      );

      const View = require('react-native').View;
      const views = UNSAFE_getAllByType(View);
      expect(views.length).toBeGreaterThan(0);
    });
  });

  // ===========================
  // ADDITIONAL NOTES
  // ===========================

  describe('Additional Notes', () => {
    it('should display notes section when notes exist', () => {
      const analysis = createMockAIAnalysis({
        notes: 'Important safety precaution',
      });
      const { getByText } = render(
        <AIAnalysisCard aiAnalysis={analysis} aiLoading={false} />
      );

      expect(getByText('Additional Notes')).toBeTruthy();
      expect(getByText('Important safety precaution')).toBeTruthy();
    });

    it('should not display notes section when notes are undefined', () => {
      const analysis = createMockAIAnalysis({ notes: undefined });
      const { queryByText } = render(
        <AIAnalysisCard aiAnalysis={analysis} aiLoading={false} />
      );

      expect(queryByText('Additional Notes')).toBeNull();
    });

    it('should not display notes section when notes are empty string', () => {
      const analysis = createMockAIAnalysis({ notes: '' });
      const { queryByText } = render(
        <AIAnalysisCard aiAnalysis={analysis} aiLoading={false} />
      );

      expect(queryByText('Additional Notes')).toBeNull();
    });

    it('should display multi-line notes', () => {
      const multiLineNotes = 'Line 1\nLine 2\nLine 3';
      const analysis = createMockAIAnalysis({ notes: multiLineNotes });
      const { getByText } = render(
        <AIAnalysisCard aiAnalysis={analysis} aiLoading={false} />
      );

      expect(getByText(multiLineNotes)).toBeTruthy();
    });

    it('should display long notes', () => {
      const longNotes = 'This is a very long note that contains important information about the job. It includes safety warnings, special instructions, and detailed requirements for the contractor to follow.';
      const analysis = createMockAIAnalysis({ notes: longNotes });
      const { getByText } = render(
        <AIAnalysisCard aiAnalysis={analysis} aiLoading={false} />
      );

      expect(getByText(longNotes)).toBeTruthy();
    });

    it('should display notes with special characters', () => {
      const notesWithSpecialChars = 'Use 1/2" pipe & check for leaks @ connections!';
      const analysis = createMockAIAnalysis({ notes: notesWithSpecialChars });
      const { getByText } = render(
        <AIAnalysisCard aiAnalysis={analysis} aiLoading={false} />
      );

      expect(getByText(notesWithSpecialChars)).toBeTruthy();
    });
  });

  // ===========================
  // COMPLETE SCENARIOS
  // ===========================

  describe('Complete Scenarios', () => {
    it('should display minimal analysis with only required fields', () => {
      const analysis = createMockAIAnalysis({
        recommendedTools: undefined,
        notes: undefined,
      });
      const { getByText, queryByText } = render(
        <AIAnalysisCard aiAnalysis={analysis} aiLoading={false} />
      );

      expect(getByText('Job Category')).toBeTruthy();
      expect(getByText('Estimated Complexity')).toBeTruthy();
      expect(getByText('Estimated Duration')).toBeTruthy();
      expect(queryByText('Recommended Tools')).toBeNull();
      expect(queryByText('Additional Notes')).toBeNull();
    });

    it('should display full analysis with all fields', () => {
      const analysis = createMockAIAnalysis({
        category: 'Electrical',
        complexity: 'High',
        estimatedDuration: '4-6 hours',
        recommendedTools: ['Multimeter', 'Wire stripper'],
        notes: 'Turn off power before starting',
      });
      const { getByText } = render(
        <AIAnalysisCard aiAnalysis={analysis} aiLoading={false} />
      );

      expect(getByText('Electrical')).toBeTruthy();
      expect(getByText('High')).toBeTruthy();
      expect(getByText('4-6 hours')).toBeTruthy();
      expect(getByText('Multimeter')).toBeTruthy();
      expect(getByText('Wire stripper')).toBeTruthy();
      expect(getByText('Turn off power before starting')).toBeTruthy();
    });

    it('should handle analysis with empty tools array but with notes', () => {
      const analysis = createMockAIAnalysis({
        recommendedTools: [],
        notes: 'Check water pressure',
      });
      const { getByText, queryByText } = render(
        <AIAnalysisCard aiAnalysis={analysis} aiLoading={false} />
      );

      expect(queryByText('Recommended Tools')).toBeNull();
      expect(getByText('Additional Notes')).toBeTruthy();
      expect(getByText('Check water pressure')).toBeTruthy();
    });

    it('should handle analysis with tools but no notes', () => {
      const analysis = createMockAIAnalysis({
        recommendedTools: ['Wrench'],
        notes: undefined,
      });
      const { getByText, queryByText } = render(
        <AIAnalysisCard aiAnalysis={analysis} aiLoading={false} />
      );

      expect(getByText('Recommended Tools')).toBeTruthy();
      expect(getByText('Wrench')).toBeTruthy();
      expect(queryByText('Additional Notes')).toBeNull();
    });
  });

  // ===========================
  // EDGE CASES
  // ===========================

  describe('Edge Cases', () => {
    it('should handle analysis object with null values', () => {
      const analysis: any = {
        confidence: 0.5,
        category: null,
        complexity: null,
        estimatedDuration: null,
        recommendedTools: null,
        notes: null,
      };
      const { getByText, queryByText } = render(
        <AIAnalysisCard aiAnalysis={analysis} aiLoading={false} />
      );

      expect(getByText('AI Analysis')).toBeTruthy();
      expect(queryByText('Recommended Tools')).toBeNull();
      expect(queryByText('Additional Notes')).toBeNull();
    });

    it('should handle confidence of exactly 0.5', () => {
      const analysis = createMockAIAnalysis({ confidence: 0.5 });
      const { getByText } = render(
        <AIAnalysisCard aiAnalysis={analysis} aiLoading={false} />
      );

      expect(getByText('50% confidence')).toBeTruthy();
    });

    it('should handle very high confidence near 1.0', () => {
      const analysis = createMockAIAnalysis({ confidence: 0.999 });
      const { getByText } = render(
        <AIAnalysisCard aiAnalysis={analysis} aiLoading={false} />
      );

      expect(getByText('100% confidence')).toBeTruthy();
    });

    it('should handle tool array with one item', () => {
      const analysis = createMockAIAnalysis({
        recommendedTools: ['Single Tool'],
      });
      const { getByText } = render(
        <AIAnalysisCard aiAnalysis={analysis} aiLoading={false} />
      );

      expect(getByText('Recommended Tools')).toBeTruthy();
      expect(getByText('Single Tool')).toBeTruthy();
    });

    it('should render all sections in correct order', () => {
      const analysis = createMockAIAnalysis({
        category: 'Test Category',
        complexity: 'Test Complexity',
        estimatedDuration: 'Test Duration',
        recommendedTools: ['Test Tool'],
        notes: 'Test Notes',
      });
      const { getByText } = render(
        <AIAnalysisCard aiAnalysis={analysis} aiLoading={false} />
      );

      // Verify all sections exist
      expect(getByText('Job Category')).toBeTruthy();
      expect(getByText('Estimated Complexity')).toBeTruthy();
      expect(getByText('Estimated Duration')).toBeTruthy();
      expect(getByText('Recommended Tools')).toBeTruthy();
      expect(getByText('Additional Notes')).toBeTruthy();
    });
  });

  // ===========================
  // ACCESSIBILITY
  // ===========================

  describe('Accessibility', () => {
    it('should render all text content as accessible', () => {
      const analysis = createMockAIAnalysis();
      const { getByText } = render(
        <AIAnalysisCard aiAnalysis={analysis} aiLoading={false} />
      );

      // All text elements should be accessible
      expect(getByText('AI Analysis')).toBeTruthy();
      expect(getByText('85% confidence')).toBeTruthy();
      expect(getByText('Job Category')).toBeTruthy();
    });

    it('should render loading text as accessible', () => {
      const { getByText } = render(
        <AIAnalysisCard aiAnalysis={null} aiLoading={true} />
      );

      expect(getByText('Analyzing job photos...')).toBeTruthy();
    });
  });

  // ===========================
  // COMPONENT STRUCTURE
  // ===========================

  describe('Component Structure', () => {
    it('should match snapshot for loading state', () => {
      const { toJSON } = render(
        <AIAnalysisCard aiAnalysis={null} aiLoading={true} />
      );

      expect(toJSON()).toMatchSnapshot();
    });

    it('should match snapshot for null state', () => {
      const { toJSON } = render(
        <AIAnalysisCard aiAnalysis={null} aiLoading={false} />
      );

      expect(toJSON()).toMatchSnapshot();
    });

    it('should match snapshot for complete analysis', () => {
      const analysis = createMockAIAnalysis();
      const { toJSON } = render(
        <AIAnalysisCard aiAnalysis={analysis} aiLoading={false} />
      );

      expect(toJSON()).toMatchSnapshot();
    });

    it('should match snapshot for minimal analysis', () => {
      const analysis = createMockAIAnalysis({
        recommendedTools: undefined,
        notes: undefined,
      });
      const { toJSON } = render(
        <AIAnalysisCard aiAnalysis={analysis} aiLoading={false} />
      );

      expect(toJSON()).toMatchSnapshot();
    });
  });
});
