// ============================================================================
// ACCESSIBILITY TESTING
// Utilities for testing accessibility compliance
// ============================================================================

import { RenderResult } from '@testing-library/react-native';

export interface TestAccessibilityResult {
  violations: Array<{
    type: 'missing_label' | 'low_contrast' | 'invalid_role' | 'missing_hint';
    element: string;
    severity: 'low' | 'medium' | 'high';
    suggestion: string;
  }>;
  score: number; // 0-100
  passedChecks: number;
  totalChecks: number;
}

export function runAccessibilityChecks(renderResult: RenderResult): TestAccessibilityResult {
  const violations: TestAccessibilityResult['violations'] = [];
  let totalChecks = 0;
  let passedChecks = 0;

  // Check for accessibility labels
  totalChecks++;
  try {
    const unlabeledButtons = renderResult.getAllByRole('button').filter(
      button => !button.props.accessibilityLabel && !button.props.children
    );
    if (unlabeledButtons.length === 0) {
      passedChecks++;
    } else {
      violations.push({
        type: 'missing_label',
        element: 'button',
        severity: 'high',
        suggestion: 'Add accessibilityLabel prop to buttons without text content',
      });
    }
  } catch {
    passedChecks++; // No buttons found, check passes
  }

  // Check for accessibility hints on interactive elements
  totalChecks++;
  try {
    const interactiveElements = [
      ...renderResult.getAllByRole('button'),
      ...renderResult.queryAllByRole('link'),
    ];

    const elementsNeedingHints = interactiveElements.filter(
      element => element.props.onPress && !element.props.accessibilityHint
    );

    if (elementsNeedingHints.length === 0) {
      passedChecks++;
    } else {
      violations.push({
        type: 'missing_hint',
        element: 'interactive',
        severity: 'medium',
        suggestion: 'Add accessibilityHint to interactive elements to explain their action',
      });
    }
  } catch {
    passedChecks++;
  }

  // More accessibility checks would go here...
  // - Color contrast validation
  // - Font size compliance
  // - Touch target size validation
  // - Screen reader compatibility

  const score = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 100;

  return {
    violations,
    score,
    passedChecks,
    totalChecks,
  };
}
