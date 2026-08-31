import { describe, expect, it } from 'vitest';
import { collectEvidence } from '../stages/collect-evidence';

describe('collectEvidence', () => {
  it('excludes legacy detector and segmentation evidence from production', async () => {
    const evidence = await collectEvidence(
      ['https://example.com/photo.jpg'],
      1000,
      1000,
      {
        roboflowDetections: [
          {
            id: 'legacy-detector-result',
            className: 'crack',
            confidence: 99,
            boundingBox: { x: 0, y: 0, width: 10, height: 10 },
            imageUrl: 'https://example.com/photo.jpg',
          },
        ],
        visionAnalysis: null,
        sam3Segmentation: {
          success: true,
          damage_types: {},
        },
      }
    );

    expect(evidence).toEqual({
      roboflowDetections: [],
      visionAnalysis: null,
      sam3Segmentation: undefined,
      hasMachineEvidence: false,
    });
  });
});
