/**
 * Text extraction utilities for parsing OpenAI text responses
 * when JSON parsing fails.
 */

/**
 * Extract a number matching a regex pattern from text.
 */
export function extractNumberFromText(
  text: string,
  pattern: RegExp
): number | null {
  const match = text.match(pattern);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Extract a list of strings matching a regex pattern from text.
 */
export function extractListFromText(text: string, pattern: RegExp): string[] {
  const match = text.match(pattern);
  if (!match) return [];

  return match[1]
    .split(/[,\n\u2022\-*]/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(0, 6);
}

/**
 * Determine severity level from a concern description string.
 */
export function determineSeverity(concern: string): 'Low' | 'Medium' | 'High' {
  const lowerConcern = concern.toLowerCase();
  if (
    lowerConcern.includes('electrical') ||
    lowerConcern.includes('fire') ||
    lowerConcern.includes('toxic')
  ) {
    return 'High';
  }
  if (
    lowerConcern.includes('injury') ||
    lowerConcern.includes('damage') ||
    lowerConcern.includes('leak')
  ) {
    return 'Medium';
  }
  return 'Low';
}

/**
 * Extract safety concerns from a text response.
 */
export function extractSafetyConcerns(text: string): {
  concern: string;
  severity: 'Low' | 'Medium' | 'High';
  description: string;
}[] {
  const match = text.match(
    /safety.{0,20}concerns?[:\s]*([^\n]*(?:\n(?!detected|safety|recommended|complexity|tools|duration)[^\n]*)*)/i
  );
  if (!match) {
    return [
      {
        concern: 'Standard safety precautions',
        severity: 'Medium',
        description:
          'Follow appropriate safety protocols for this maintenance work',
      },
    ];
  }

  const concerns = match[1]
    .split(/[,\n\u2022\-*]/)
    .map((c) => c.trim())
    .filter((c) => c.length > 0);

  return concerns.slice(0, 3).map((concern) => ({
    concern: concern.length > 50 ? `${concern.substring(0, 50)}...` : concern,
    severity: determineSeverity(concern),
    description: `Address this safety concern: ${concern}`,
  }));
}

/**
 * Extract complexity level from text.
 */
export function extractComplexity(text: string): 'Low' | 'Medium' | 'High' {
  const match = text.match(/complexity[:\s]*(low|medium|high)/i);
  if (match) {
    const complexity = match[1].toLowerCase();
    return (complexity.charAt(0).toUpperCase() + complexity.slice(1)) as
      | 'Low'
      | 'Medium'
      | 'High';
  }
  return 'Medium';
}

/**
 * Extract estimated duration from text.
 */
export function extractDuration(text: string): string {
  const match = text.match(/duration[:\s]*([^\n]*)/i);
  return match ? match[1].trim() : '2-4 hours';
}
