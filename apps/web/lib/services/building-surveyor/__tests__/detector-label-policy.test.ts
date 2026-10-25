import { describe, expect, it, vi } from 'vitest';
import { buildEvidenceSummary } from '../evidence-processor';
import { buildSystemPrompt } from '../prompt-builder';
import {
  interpretDetectorLabel,
  mapClassIndexToDamageType,
  mapClassNameToDamageType,
} from '../tools/damage-type-mapping';
import { runDetectTool } from '../tools/DetectTool';
import { RoboflowDetectionService } from '../RoboflowDetectionService';

vi.mock('../RoboflowDetectionService', () => ({
  RoboflowDetectionService: { detect: vi.fn() },
}));
const detection = (className: string) => ({
  id: className,
  className,
  confidence: 85,
  boundingBox: { x: 1, y: 1, width: 5, height: 5 },
  imageUrl: 'https://example.com/photo.jpg',
});

describe('detector label policy', () => {
  it.each(['window', 'Window', 'roof', 'pipe', 'normal wall', 'good_bolt'])(
    'keeps %s as context',
    (label) => {
      expect(interpretDetectorLabel(label)).toEqual({
        kind: 'context',
        damageType: null,
      });
    }
  );
  it.each([
    ['Broken Window', 'window_broken'],
    [' Damaged_Roof ', 'roof_damage'],
    ['pipe_leak', 'pipe_leak'],
    ['Spalling', 'general_damage'],
    ['Rust on radiator', 'general_damage'],
  ])('maps %s conservatively', (label, target) => {
    expect(mapClassNameToDamageType(label)).toBe(target);
  });
  it('does not turn composite or unknown labels into diagnoses', () => {
    expect(interpretDetectorLabel('crack-mold-damp-spalling-cor').kind).toBe(
      'review'
    );
    expect(mapClassNameToDamageType('future_class')).toBeNull();
    expect(mapClassIndexToDamageType(46)).toBeNull(); // Historical Window class.
    expect(mapClassIndexToDamageType(1)).toBe('window_broken');
    expect(mapClassIndexToDamageType(999)).toBeNull();
  });
  it('excludes context from detected damage types and preserves confidence scale', async () => {
    vi.mocked(RoboflowDetectionService.detect).mockResolvedValue([
      detection('window'),
      detection('Broken Window'),
    ]);
    const run = await runDetectTool({
      imageUrls: ['https://example.com/photo.jpg'],
    });
    expect(run.result.damageTypesDetected).toEqual(['window_broken']);
    expect(run.summary.confidence).toBe(85);
  });
  it('marks context and unresolved labels in generator evidence', () => {
    const summary = buildEvidenceSummary(
      [detection('window'), detection('Other'), detection('Broken Window')],
      null
    );
    expect(summary).toContain('context only; not defect evidence');
    expect(summary).toContain('unresolved label; requires review');
    expect(summary).toContain('candidate window_broken');
    expect(summary).toContain('No detection does not establish');
  });
  it('main AI prompt requires visual evidence and keeps insufficient evidence distinct from healthy', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain(
      'Missing annotations or no detector result do not mean "healthy"'
    );
    expect(prompt).toContain(
      'Bounding boxes and class names alone cannot establish severity'
    );
  });
});
